# Reflection

The most difficult concept in the course was mastering **distributed locking for seat reservation** during flash‑sale events.  Understanding how to combine relational row‑level locks, a Redis‑based Redlock, and short‑lived lock rows while keeping latency low required juggling consistency guarantees, transaction isolation levels, and cache invalidation strategies.  I overcame this by building a small prototype that simulated concurrent seat‑locking requests, visualizing lock contention with logs, and iterating on the lock‑acquire API until the failure rate dropped to zero.  Reading the underlying papers on two‑phase commit and the Redlock algorithm, and discussing the design with peers, helped solidify the mental model.

Based on the feedback from my capstone review, the area I would improve most is **observability**.  Reviewers noted that while I had basic logging and metrics, the system lacked end‑to‑end tracing of a purchase flow, making debugging under load harder.  I plan to integrate OpenTelemetry across the API service, the Redis lock manager, and the payment microservice, and to expose dashboards that correlate request latency with lock‑wait times.

Next, I will deepen my knowledge of **event‑driven architectures**.  I want to explore how a fully asynchronous workflow—using Kafka to orchestrate seat reservation, payment, and ticket issuance—could further increase scalability and fault tolerance, especially for future features like real‑time seat‑availability streams to the front‑end.

