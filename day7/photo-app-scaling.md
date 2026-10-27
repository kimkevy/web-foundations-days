# SnapShare System Scaling Plan

This document outlines the architectural scaling plan for **SnapShare**, a photo-sharing application where users upload photos and scroll a feed of photos from accounts they follow.

---

## 1. Assumptions and Daily Active Users (DAU)

### Baseline Facts
- **Registered Users:** 10,000,000 (10 million)
- **Daily Active Percentage:** 10%
- **Upload Rate:** 1 photo per active user per day
- **Feed Browsing Rate:** 50 feed page views per active user per day
- **Original Photo Size:** 2 MB average
- **Generated Thumbnail Size:** 50 KB average
- **Total Storage per Photo:** $2\text{ MB} + 0.05\text{ MB} = 2.05\text{ MB}$
- **Seconds per Day:** $24\text{ hours} \times 60\text{ minutes} \times 60\text{ seconds} = 86,400\text{ seconds}$
- **Peak Factor:** 5× average load

### Daily Active Users (DAU)
$$\text{DAU} = 10,000,000 \times 10\% = 1,000,000 \text{ active users/day}$$

---

## 2. Capacity Estimates: Throughput and Storage

### A. Uploads per Second (Writes)
- **Daily Uploads:** $1,000,000 \text{ users} \times 1 \text{ upload/day} = 1,000,000 \text{ uploads/day}$
- **Average Uploads/sec:** 
  $$\frac{1,000,000 \text{ uploads}}{86,400 \text{ seconds}} \approx 11.57 \text{ uploads/sec} \ (\approx 12 \text{ uploads/sec})$$
- **Peak Uploads/sec (5× factor):**
  $$11.57 \times 5 \approx 57.87 \text{ uploads/sec} \ (\approx 58 \text{ uploads/sec})$$

### B. Feed Views per Second (Reads)
- **Daily Feed Views:** $1,000,000 \text{ users} \times 50 \text{ feed views/day} = 50,000,000 \text{ views/day}$
- **Average Feed Views/sec:**
  $$\frac{50,000,000 \text{ views}}{86,400 \text{ seconds}} \approx 578.7 \text{ views/sec} \ (\approx 579 \text{ views/sec})$$
- **Peak Feed Views/sec (5× factor):**
  $$578.7 \times 5 \approx 2,893.5 \text{ views/sec} \ (\approx 2,894 \text{ views/sec})$$

### C. Photo Storage per Year
- **Daily Storage Consumed:**
  $$1,000,000 \text{ photos/day} \times 2.05 \text{ MB} = 2,050,000 \text{ MB/day} = 2.05 \text{ TB/day}$$
- **Annual Storage Consumed (365 days):**
  $$2.05 \text{ TB/day} \times 365 \text{ days} \approx 748.25 \text{ TB/year} \ (\approx 0.75 \text{ PB/year})$$

---

## 3. Read-Heavy vs. Write-Heavy System Assessment

SnapShare is overwhelmingly a **read-heavy system**:
- **Read-to-Write Ratio:** $50 \text{ feed views} : 1 \text{ photo upload} = 50:1$.
- **Design Implications:**
  - The architecture must prioritize aggressive multi-layer caching (CDN for static photo/thumbnail binary assets and in-memory caches like Redis/Memcached for user feeds and metadata).
  - The database layer must separate write and read paths using database replication (primary database handles writes, while horizontal read replicas handle read traffic).
  - Heavy read optimizations (such as feed pre-computation and pagination caching) prevent relational bottlenecks on the database.

---

## 4. Why Photos Belong in Object Storage, Not Databases

Storing raw media binaries (BLOBs) inside relational databases introduces critical system failure modes:
1. **Database Bloat & Cost:** High I/O overhead and massive storage volume (over 748 TB/year) inflate database backup size, slow down replication, and waste expensive database-tier SSD disk space.
2. **Memory Cache Pollution:** Large media files evict critical database query indexes and buffer cache pages from RAM.
3. **Connection Exhaustion:** Streaming multi-megabyte payloads holds active database connection threads open for extended periods, starving lightweight metadata queries.

**Where they belong instead:** Photos and thumbnails belong in dedicated **Distributed Object Storage** (such as AWS S3, Google Cloud Storage, or MinIO). Object storage is specifically architected for virtually limitless, highly durable, low-cost static binary storage, paired with presigned URLs and direct CDN integration. The relational database stores only lightweight metadata and URI pointers to the object store (e.g. `s3://snapshare-media/photos/2026/10/img_1042.jpg`).

---

## 5. System Architecture Diagram

```text
               +----------------------------------------------------+
               |                     User Client                    |
               +----------------------------------------------------+
                   | (Upload Photo / Fetch Feed)      | (Get Image Asset)
                   v                                  v
        +----------------------+             +----------------------+
        |    Load Balancer     |             |         CDN          |
        +----------------------+             | (Content Delivery    |
                   |                         |      Network)        |
                   v                         +----------------------+
        +----------------------+                        | (Cache Miss)
        |  App Server Cluster  |                        v
        |    (Stateless API)   |             +----------------------+
        +----------------------+             |    Object Storage    |
          |       |          |               | (S3 / Blob Storage)  |
          |       |          +-------------> |   Original Photos    |
          |       |    (Presigned URL Upload)|    & Thumbnails      |
          |       |                          +----------------------+
          |       |                                     ^
          |       v                                     | (Write Thumbnail)
          |  +--------------------+                     |
          |  |  In-Memory Cache   |                     |
          |  |  (Feed / Session)  |                     |
          |  +--------------------+                     |
          |                                             |
          | (Write Metadata)    (Read Metadata)         |
          v                           v                 |
    +---------------+           +---------------+       |
    | Primary DB    |---------->| Read Replica  |       |
    | (SQL Writes)  | (Replicate| (SQL Reads)   |       |
    +---------------+           +---------------+       |
          |                                             |
          | (Publish "Process Thumbnail" Job)           |
          v                                             |
    +---------------+                                   |
    | Message Queue |                                   |
    | (Kafka/Rabbit)|                                   |
    +---------------+                                   |
          |                                             |
          v (Consume Job)                               |
    +---------------+                                   |
    | Worker Server |-----------------------------------+
    | (Async Resizer|  (Fetch Original Photo, Generate
    +---------------+   Thumbnail, Upload & Update DB)
```

---

## 6. Component Explanations

- **CDN (Content Delivery Network):** Caches photos and thumbnails geographically close to end users to deliver images with minimal latency and offload bandwidth from origin servers.
- **Load Balancer:** Evenly distributes incoming user HTTP requests across multiple application servers to prevent any single server from becoming a bottleneck and to ensure high availability.
- **App Servers:** Stateless application compute nodes that execute core business logic, authenticate user sessions, orchestrate uploads, and assemble personalized timeline feeds.
- **Cache (e.g., Redis):** In-memory data store that caches pre-computed user feeds and frequently accessed metadata to serve read requests with sub-millisecond response times.
- **Primary Database:** Single source of truth that processes all state-changing writes (e.g., user profiles, follows, photo metadata, likes) with strict ACID transactional consistency.
- **Read Replica Database:** Horizontally scalable database replica that continuously synchronizes from the primary database to handle high-throughput query and feed read traffic.
- **Object Storage (e.g., S3):** Highly durable, scalable, and cost-effective distributed storage system designed to store raw photo and thumbnail binary files.
- **Message Queue (e.g., RabbitMQ / Kafka):** Decouples time-consuming background tasks from the synchronous request path by buffering asynchronous thumbnail generation jobs.
- **Worker Server:** Background compute service that consumes jobs from the message queue to download original photos, resize them into optimized thumbnails, and store results back in object storage.

---

## 7. Step-by-Step Photo Upload Flow

1. **Initiate Upload:** The user client sends a `POST /photos/upload-intent` request with image metadata (file size, format) to the Load Balancer, which routes it to an available App Server.
2. **Authorize & Issue URL:** The App Server validates user permissions, generates a unique photo ID, creates a pending database metadata record, and returns a secure, time-limited presigned upload URL pointing directly to Object Storage.
3. **Direct Binary Upload:** The user client uploads the 2 MB raw image binary directly to Object Storage using the presigned URL, bypassing App Server memory and network bandwidth.
4. **Confirm Upload:** Upon successful upload completion to Object Storage, the client notifies the App Server via `POST /photos/complete`.
5. **Enqueue Thumbnail Job:** The App Server updates the photo's status to active in the Primary Database and immediately publishes a `generate_thumbnail` event containing the photo ID and object URL to the Message Queue.
6. **Instant Response to User:** The App Server immediately returns an HTTP `201 Created` response to the user so their UI reflects a fast, successful post without waiting for background image processing.
7. **Asynchronous Thumbnail Processing:** An asynchronous Worker Server consumes the message from the queue, fetches the 2 MB original photo from Object Storage, generates a 50 KB compressed thumbnail, and saves the thumbnail into Object Storage.
8. **Finalize Metadata & Cache Invalidation:** The Worker Server writes the thumbnail URI into the database record and publishes a cache invalidation/fanout event so followers can view the new photo in their updated feeds.

---

## 8. Architectural Trade-offs

### Trade-off 1: Asynchronous Thumbnail Processing vs. Synchronous Availability
- **Decision:** Generate thumbnails asynchronously using a message queue and background workers rather than generating them inline during the client HTTP upload request.
- **Advantage:** Dramatically decreases client upload latency and prevents app server thread starvation, because clients do not block on CPU-heavy image resizing operations.
- **Drawback (Trade-off):** Introduces eventual consistency; for a brief window (typically a few hundred milliseconds to a couple of seconds), a follower viewing the feed might see a loading placeholder or fallback blurred preview before the processed 50 KB thumbnail is fully available in the CDN/Object Store.

### Trade-off 2: Fanout-on-Write (Push Model) vs. Fanout-on-Read (Pull Model) for Feed Generation
- **Decision:** Utilize a hybrid feed architecture (Fanout-on-Write for regular users, Fanout-on-Read for high-follower celebrity accounts).
- **Advantage:** Pre-computing feeds into an in-memory cache upon photo upload ensures lightning-fast feed view speeds ($O(1)$ lookup for $579$ to $2,894$ views/sec) without executing complex relational SQL joins across millions of follower records on every feed refresh.
- **Drawback (Trade-off):** Consumes substantial in-memory cache storage, and when a celebrity with millions of followers posts a photo, broadcasting that post to all follower feeds simultaneously ("hotkey / fanout explosion") creates a massive spike in background worker write operations.
