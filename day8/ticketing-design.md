# TicketHub Design Document

---

## 1. Requirements

### Functional Requirements
- **User Registration & Authentication** – Users can sign up, log in, and manage their profile.
- **Event Browsing** – Browse concerts and events, filter by date, venue, genre.
- **Seat Map & Selection** – View venue seating maps, select specific seats.
- **Seat Hold (Lock)** – Temporarily reserve selected seats before checkout.
- **Ticket Purchase** – Complete payment and receive e‑tickets.
- **Order History** – View past orders and download tickets.
- **Admin Management** – Organizers can create events, define venues, set pricing, and release tickets.

### Non‑Functional Requirements
- **Scalability** – Support up to **10 k concurrent users** on a normal day and **200 k concurrent users** during a flash‑sale.
- **Availability** – 99.9 % uptime; graceful degradation under extreme load.
- **Consistency & Fairness** – Strong consistency for seat inventory to guarantee that no two users can obtain the same seat; fairness in seat allocation during high‑traffic sales.
- **Performance** – Page load ≤ 2 s; API latency ≤ 150 ms for browsing, ≤ 300 ms for seat‑lock, ≤ 500 ms for checkout.
- **Security** – PCI‑DSS compliance for payments, OAuth2/JWT authentication, HTTPS everywhere.
- **Observability** – Centralized logging, metrics, tracing; alert on lock‑contention spikes.

---

## 2. Traffic Estimates

### Normal Day
- **Registered users**: 2 M (static base).
- **Daily visitors**: 50 k.
- **Pages per visitor**: 10 → **500 k page views**.
- **Tickets sold**: 5 k.
- **API calls** (rough estimate):
  - Browsing events: 1 per visit → 50 k calls.
  - Seat map fetch: 0.5 per visit → 25 k calls.
  - Seat lock & checkout (for purchases): 3 calls per ticket → 15 k calls.
- **Peak QPS**: ~300 req/s.

### Big‑Sale (Popular Concert)
- **Visitors attempting purchase**: 200 k within the first 10 min.
- **Seats available**: 20 k.
- **Lock‑checkout flow**: 3 API calls per attempt → 600 k calls in 10 min → **1 000 req/s** sustained peak (burst could reach 2 k req/s).
- **Additional browsing**: negligible compared to lock/checkout traffic.

**Comparison**: The flash‑sale generates roughly **3–4×** higher QPS than the normal peak and **10×** the overall request volume over a short window, demanding robust scaling, low‑latency locking, and fair queuing.

---

## 3. API Specification (REST)

| Method | Endpoint | Description | Payload |
|--------|----------|-------------|---------|
| `POST` | `/api/v1/auth/register` | Register a new user | `{ "email": "", "password": "" }` |
| `POST` | `/api/v1/auth/login` | Obtain JWT | `{ "email": "", "password": "" }` |
| `GET`  | `/api/v1/events` | List upcoming events (filters supported) | – |
| `GET`  | `/api/v1/events/{eventId}/seats` | Retrieve current seat map & availability | – |
| `POST` | `/api/v1/seats/lock` | Atomically lock a set of seats for a short window (default 5 min) | `{ "eventId": "", "seatIds": ["A1", "A2"] }` |
| `POST` | `/api/v1/orders/checkout` | Pay and finalize the locked seats | `{ "lockId": "", "paymentToken": "" }` |
| `GET`  | `/api/v1/orders/{orderId}` | Get order details and ticket download links | – |
| `POST` | `/api/v1/admin/events` | Admin creates an event, venue, pricing, seat inventory | `{ "name": "", "venueId": "", "date": "", "prices": {...} }` |
| `GET`  | `/api/v1/admin/venues/{venueId}` | View venue layout | – |

The **`/api/v1/seats/lock`** endpoint is the core guard against double‑booking.

---

## 4. Data Model

```mermaid
erDiagram
    USER ||--o{ ORDER : places
    ORDER ||--|{ ORDER_ITEM : contains
    EVENT ||--|{ SEAT : offers
    SEAT ||--|| LOCK : "has at most one"
    USER {
        uuid id PK
        string email
        string password_hash
    }
    EVENT {
        uuid id PK
        string name
        datetime start_time
        uuid venue_id FK
    }
    SEAT {
        uuid id PK
        uuid venue_id FK
        string row
        int number
        enum status {available, locked, sold}
    }
    LOCK {
        uuid id PK
        uuid seat_id FK UNIQUE
        uuid user_id FK
        datetime expires_at
    }
    ORDER {
        uuid id PK
        uuid user_id FK
        datetime created_at
        enum status {pending, paid, cancelled}
    }
    ORDER_ITEM {
        uuid id PK
        uuid order_id FK
        uuid seat_id FK
        decimal price
    }
```

**Key constraints**
- `LOCK.seat_id` is **unique** and only present while `expires_at > now()`. This guarantees a single active lock per seat.
- `SEAT.status` is updated to `locked` when a lock row exists and to `sold` after successful checkout.
- All checkout steps occur inside a **serializable transaction** that:
  1. Verifies the lock belongs to the requesting user and is still valid.
  2. Updates `SEAT.status` to `sold`.
  3. Inserts `ORDER` and `ORDER_ITEM` rows.
  4. Deletes the corresponding `LOCK` row.
  The transaction commits only if no concurrent transaction has modified the same seat, thus preventing double‑booking.

---

## 5. Architecture

```mermaid
flowchart TD
    subgraph Client
        UI[Browser / Mobile App]
    end
    subgraph Edge
        CDN[CDN]
        WAF[Web Application Firewall]
    end
    subgraph API
        LB[Load Balancer]
        API[API Service (Go)]
        Auth[Auth Service]
        Payment[Payment Service]
    end
    subgraph Data
        PG[(PostgreSQL)]
        Redis[(Redis Cache & Redlock)]
        ES[(Elasticsearch)]
    end
    subgraph Infra
        MQ[(Kafka)]
        Log[Log Aggregator]
        Mon[Prometheus & Grafana]
    end
    UI --> CDN --> WAF --> LB --> API
    API --> Auth
    API --> Payment
    API --> PG
    API --> Redis
    API --> ES
    API --> MQ
    PG --> Redis
    MQ --> Log
    MQ --> Mon
    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
    class CDN,WAF,LB,API,Auth,Payment,PG,Redis,ES,MQ,Log,Mon external;
```
**Survival during the big sale**
- **Horizontal scaling** of the API service behind the load balancer provides additional capacity.
- **Redis Redlock** offers ultra‑fast distributed locking, off‑loading most contention from PostgreSQL.
- **Read‑through cache** for seat‑availability reduces DB reads for browsing users.
- **Kafka** buffers asynchronous tasks (email receipts, analytics) so the critical checkout path remains short.
- **Autoscaling** policies (CPU, QPS) spin up extra API and Redis nodes when the 10‑minute burst spikes.
- **Circuit breakers & rate limiting** protect downstream services (payment gateway) from overload.

---

## 6. Trade‑offs

1. **Redis‑based Lock vs. Pure DB Row‑Level Lock**
   - *Pros*: Sub‑millisecond lock acquisition, scales horizontally, reduces DB lock contention.
   - *Cons*: Adds operational complexity; requires careful TTL management to avoid stale locks.
   - *Mitigation*: Fallback to DB unique constraint if Redis lock acquisition fails.

2. **Monolithic API Service vs. Fully Decoupled Microservices**
   - *Pros*: Simpler transaction management (single DB transaction across lock, order, payment), easier debugging.
   - *Cons*: Limits independent scaling of the payment component and can become a bottleneck under extreme load.
   - *Future direction*: Extract payment handling into its own microservice once traffic patterns stabilize.

---

## 7. Reflection

The toughest concept was **building a fair, low‑latency locking mechanism** that could survive a 200 k‑user flash sale.  I experimented with pure PostgreSQL row locks, which caused noticeable contention, and then introduced Redis Redlock with short TTLs.  Simulating concurrent lock requests helped me tune the lock‑acquire retry logic and understand the trade‑off between speed and reliability.

Feedback on the capstone highlighted a need for richer **observability**.  I will integrate OpenTelemetry across the API, Redis, and Kafka layers, exposing dashboards that show lock‑wait times and checkout latency, enabling rapid diagnosis during spikes.

Next, I plan to study **event‑driven architectures** more deeply, turning the checkout flow into a series of idempotent events (LockCreated, PaymentSuccessful, TicketIssued).  This would further improve scalability and resilience, especially for future features like real‑time seat‑availability streams.

---

*Prepared by Antigravity – Day 8 assignment*