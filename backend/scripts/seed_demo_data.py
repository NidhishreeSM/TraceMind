#!/usr/bin/env python3
"""
TraceMind Demo Data Seeder
Generates 30 realistic synthetic past incidents across varied services,
storing them in Postgres/SQLite and retaining their post-mortems in Hindsight.

Features:
- Idempotent execution (skips or refreshes existing INC-DEMO-xxx records)
- 3 Recurring Failure Patterns to demonstrate memory recall advantage:
  Pattern 1: Database connection pool starvation (payment-api, orders-db)
  Pattern 2: JWT public key cache invalidation desync (auth-service, k8s-ingress)
  Pattern 3: Kafka consumer rebalance storm from unbounded batch processing (kafka-consumer)
- Labeled with is_demo=True
"""

from datetime import datetime, timedelta, timezone
import json
import os
import sys
from pathlib import Path

# Add project root to PYTHONPATH
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from dotenv import load_dotenv
load_dotenv()

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.models.database import SessionLocal, init_db, Incident, Resolution, Analysis, Feedback
from backend.app.services.hindsight_service import hindsight_service


def utc_ago(days: int = 0, hours: int = 0, minutes: int = 0) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days, hours=hours, minutes=minutes)


DEMO_INCIDENTS = [
    # --------------------------------------------------------------------------
    # PATTERN 1: Connection Pool Exhaustion / Leaked DB Sessions
    # --------------------------------------------------------------------------
    {
        "id": "INC-DEMO-001",
        "title": "Payment API connection pool exhaustion during peak checkout",
        "service": "payment-api",
        "environment": "production",
        "severity": "critical",
        "status": "resolved",
        "symptoms": "Spike in HTTP 504 Gateway Timeouts on checkout endpoints. DB connection latency climbed to 30s.",
        "error_logs": "ERROR: sqlalchemy.exc.TimeoutError: QueuePool limit of size 10 overflow 10 reached, connection timed out, timeout 30.00\n  File '/app/handlers/checkout.py', line 84, in create_payment",
        "confirmed_cause": "Unhandled exception in payment gateway webhook handler exited without releasing the DB session back to the pool.",
        "steps_taken": [
            "Queried pg_stat_activity to inspect idle in transaction connections",
            "Traced leaked connections to checkout.py webhook callback",
            "Wrapped database session handling in a try/finally context manager",
            "Increased pool_size to 25 and max_overflow to 20"
        ],
        "verified_resolution": "Fixed session lifecycle with context managers and raised pool limits in payment-api Helm values.",
        "failed_attempts": [
            "Restarted payment pods without code fix (pool exhausted again within 3 minutes)"
        ],
        "outcome": "DB connection acquisition dropped to 4ms; 0 dropped checkouts.",
        "created_ago_days": 14,
        "duration_minutes": 22
    },
    {
        "id": "INC-DEMO-002",
        "title": "Orders DB connection queue timeout on high-volume order ingestion",
        "service": "orders-db",
        "environment": "production",
        "severity": "critical",
        "status": "resolved",
        "symptoms": "Order creation requests failing with database pool timeouts. Database CPU was low (<15%) but connections were pinned.",
        "error_logs": "FATAL: remaining connection slots are reserved for non-replication superuser connections\nActive connections: 200/200; state: idle in transaction",
        "confirmed_cause": "Database connection pool leak: unhandled timeout exceptions in payment confirmation webhook left connections idle in transaction.",
        "steps_taken": [
            "Inspected connection counts using pg_stat_activity",
            "Identified matching pattern with INC-DEMO-001 connection leak",
            "Enabled statement_timeout=5000ms and idle_in_transaction_session_timeout=10000ms in Postgres config",
            "Fixed orders worker connection teardown in try/finally block"
        ],
        "verified_resolution": "Applied connection context managers and added idle_in_transaction_session_timeout.",
        "failed_attempts": [
            "Attempted to double max_connections in Postgres (risk of exhausting OS file descriptors)"
        ],
        "outcome": "Active connections stabilized at 35; zero pool timeout errors.",
        "created_ago_days": 11,
        "duration_minutes": 18
    },
    {
        "id": "INC-DEMO-003",
        "title": "Payment gateway query timeout causing replica thread starvation",
        "service": "payment-api",
        "environment": "production",
        "severity": "high",
        "status": "resolved",
        "symptoms": "Gradual degradation of transaction verification endpoint. Pod memory and thread counts plateaued at maximum limits.",
        "error_logs": "WARN: HikariPool-1 - Connection is not available, request timed out after 30005ms\nThread dump shows 64 threads waiting on pool.getConnection()",
        "confirmed_cause": "Database connection leak: third-party provider downtime caused synchronous timeout inside unmanaged connection block.",
        "steps_taken": [
            "Checked Hindsight for previous payment-api connection pool issues",
            "Applied non-blocking circuit breaker with 2s timeout on payment provider HTTP client",
            "Ensured connection checkout occurs AFTER external API verification, not during"
        ],
        "verified_resolution": "Separated external network calls from database transaction scope; connections held only during active SQL.",
        "failed_attempts": [
            "Increased pool connection timeout from 30s to 60s (worsened thread exhaustion)"
        ],
        "outcome": "Transaction p99 dropped from 30s to 120ms during provider degradation.",
        "created_ago_days": 8,
        "duration_minutes": 15
    },

    # --------------------------------------------------------------------------
    # PATTERN 2: JWT Key Rotation / Clock Skew Auth Failures
    # --------------------------------------------------------------------------
    {
        "id": "INC-DEMO-004",
        "title": "Auth service JWKS key rotation desync causing widespread 401s",
        "service": "auth-service",
        "environment": "production",
        "severity": "critical",
        "status": "resolved",
        "symptoms": "Valid logged-in users receiving HTTP 401 Unauthorized across all mobile and web clients after scheduled token rotation.",
        "error_logs": "ERROR: jwt.exceptions.InvalidSignatureError: Signature verification failed for kid='rsa-2026-b'\nJWKS cache in ingress gateway missing updated kid",
        "confirmed_cause": "Key rotation published new public keys to KMS, but downstream microservices cached JWKS keys for 24h without listening to cache invalidation pubsub.",
        "steps_taken": [
            "Flushed JWKS in-memory cache across ingress and auth pods",
            "Reduced JWKS cache TTL from 24 hours to 5 minutes with background async refresh",
            "Configured cache pre-warming during key rotation lifecycle"
        ],
        "verified_resolution": "Reduced JWKS cache TTL to 5 minutes and added stale-while-revalidate key fetching.",
        "failed_attempts": [
            "Rolled back to old signing key without updating KMS (caused duplicate key collisions)"
        ],
        "outcome": "401 error rate dropped from 94% to 0.01% immediately after cache flush.",
        "created_ago_days": 13,
        "duration_minutes": 25
    },
    {
        "id": "INC-DEMO-005",
        "title": "K8s Ingress rejecting valid bearer tokens following node time drift",
        "service": "k8s-ingress",
        "environment": "production",
        "severity": "high",
        "status": "resolved",
        "symptoms": "Spike in HTTP 401 Unauthorized at API Gateway. User tokens issued 2 seconds ago were rejected as 'token not yet valid (nbf)'.",
        "error_logs": "ERROR: lua-jwt: Token cannot be used before 1762391200 (current server time: 1762391196)\nClock skew delta: -4 seconds on node pool worker-03",
        "confirmed_cause": "NTP daemon (chronyd) stalled on two Kubernetes worker nodes, creating a 4-second negative clock skew against auth-service.",
        "steps_taken": [
            "Identified clock skew through lua-jwt error logs referencing nbf (not before)",
            "Restarted chrony service across cluster nodes to resynchronize with AWS time server",
            "Configured JWT validation leeway of 15 seconds in ingress authentication filter"
        ],
        "verified_resolution": "Added 15-second clock tolerance leeway to JWT validator and enabled alert on chrony offset > 100ms.",
        "failed_attempts": [
            "Attempted regenerating user session tokens (tokens still rejected on skewed nodes)"
        ],
        "outcome": "Zero nbf validation failures; all nodes locked within 2ms NTP delta.",
        "created_ago_days": 9,
        "duration_minutes": 14
    },
    {
        "id": "INC-DEMO-006",
        "title": "Auth service token verification spike causing Redis rate-limit saturation",
        "service": "auth-service",
        "environment": "production",
        "severity": "medium",
        "status": "resolved",
        "symptoms": "High p99 latency in token validation endpoint. Redis auth cache CPU pegged at 100%.",
        "error_logs": "WARN: RedisCommandTimeoutException: Command timed out after 250ms on AUTH:TOKEN_BLOCKLIST",
        "confirmed_cause": "Uncached token blocklist check executed Redis KEYS pattern query instead of O(1) set lookup.",
        "steps_taken": [
            "Replaced Redis KEYS command with O(1) SISMEMBER on token blocklist",
            "Added local LRU cache for high-frequency token hashes"
        ],
        "verified_resolution": "Migrated blocklist lookup to Redis Sets and local LRU caching.",
        "failed_attempts": [
            "Scaled Redis replica count (KEYS command still blocked the single-threaded master)"
        ],
        "outcome": "Redis CPU dropped from 100% to 8%; p99 latency decreased to 2ms.",
        "created_ago_days": 6,
        "duration_minutes": 19
    },

    # --------------------------------------------------------------------------
    # PATTERN 3: Kafka Consumer Rebalance Storms
    # --------------------------------------------------------------------------
    {
        "id": "INC-DEMO-007",
        "title": "Kafka consumer rebalance storm in order processing topic",
        "service": "kafka-consumer",
        "environment": "production",
        "severity": "critical",
        "status": "resolved",
        "symptoms": "Order fulfillment pipeline stopped processing events. Consumer group stuck in perpetual rebalance; lag grew by 50,000 messages.",
        "error_logs": "WARN: org.apache.kafka.clients.consumer.internals.ConsumerCoordinator: [Consumer clientId=consumer-order-worker-1, groupId=order-fulfillment] "
                     "CommitFailedException: The message was sent to a partition which is no longer assigned to this consumer. "
                     "max.poll.interval.ms exceeded.",
        "confirmed_cause": "Downstream inventory RPC latency exceeded max.poll.interval.ms (300,000ms), causing Kafka coordinator to assume consumer died and trigger rebalance.",
        "steps_taken": [
            "Recognized classic Kafka rebalance loop where batch processing time exceeds heartbeat timeout",
            "Reduced max.poll.records from 500 to 50 to ensure batches finish within timeout",
            "Increased max.poll.interval.ms to 600,000ms",
            "Offloaded slow inventory RPC calls to an asynchronous worker thread pool"
        ],
        "verified_resolution": "Lowered max.poll.records to 50 and decoupled record processing from consumer poll loop.",
        "failed_attempts": [
            "Added more consumer pods (new pods triggered additional rebalance cycles)"
        ],
        "outcome": "Consumer group stabilized in 45s; 50k backlogged messages drained in 6 minutes.",
        "created_ago_days": 12,
        "duration_minutes": 27
    },
    {
        "id": "INC-DEMO-008",
        "title": "Payment notification Kafka consumer cascade rebalance during email outage",
        "service": "kafka-consumer",
        "environment": "production",
        "severity": "high",
        "status": "resolved",
        "symptoms": "Payment receipt notifications delayed by 2+ hours. Kafka consumer group repeatedly joined and left group.",
        "error_logs": "ERROR: OffsetCommit failed: Member has already been rebalanced out. max.poll.interval.ms exceeded while waiting for SendGrid response.",
        "confirmed_cause": "External email provider latency spikes caused message processing time to exceed max.poll.interval.ms, triggering identical rebalance pattern as INC-DEMO-007.",
        "steps_taken": [
            "Consulted Hindsight memory for 'kafka consumer rebalance storm'",
            "Applied proven fix: reduced max.poll.records from 200 to 25",
            "Added circuit breaker and dead-letter queue for unresponsive external notification calls"
        ],
        "verified_resolution": "Configured max.poll.records=25 and routed timed-out emails to DLQ.",
        "failed_attempts": [
            "Increased pod memory and CPU limits (no effect as issue was poll loop timeout)"
        ],
        "outcome": "Consumer rebalance eliminated; notification delivery lag dropped to under 1 second.",
        "created_ago_days": 7,
        "duration_minutes": 11
    },
    {
        "id": "INC-DEMO-009",
        "title": "Kafka partition skew causing single-worker memory saturation",
        "service": "kafka-consumer",
        "environment": "staging",
        "severity": "medium",
        "status": "resolved",
        "symptoms": "One out of 8 Kafka worker pods repeatedly crashed with OOMKilled while other 7 pods sat idle.",
        "error_logs": "FATAL: java.lang.OutOfMemoryError: Java heap space on consumer partition 3\nPartition 3 contains 85% of total topic message volume",
        "confirmed_cause": "Improper partition key (static merchant ID instead of user ID) created extreme partition hotspotting.",
        "steps_taken": [
            "Changed Kafka producer partitioning strategy to use composite key (merchant_id + user_id)",
            "Rebalanced consumer partitions evenly"
        ],
        "verified_resolution": "Updated producer message key hashing to composite key.",
        "failed_attempts": [
            "Doubled JVM heap size on consumer pods (partition 3 still crashed, only 10 minutes later)"
        ],
        "outcome": "Traffic evenly distributed across all 8 partitions; memory usage equalized at 32%.",
        "created_ago_days": 5,
        "duration_minutes": 20
    },

    # --------------------------------------------------------------------------
    # REDIS CACHE INCIDENTS
    # --------------------------------------------------------------------------
    {
        "id": "INC-DEMO-010",
        "title": "Redis cache eviction storm causing DB query thundering herd",
        "service": "redis-cache",
        "environment": "production",
        "severity": "critical",
        "status": "resolved",
        "symptoms": "Sudden 10x query spike on primary database. Redis cache hit ratio plummeted from 98% to 12% within 60 seconds.",
        "error_logs": "WARN: Redis maxmemory reached (policy: allkeys-lru). Evicted 450,000 keys in 10s.\nDB error: connection count exceeded on read replica",
        "confirmed_cause": "Large uncompressed JSON payloads ingested into cache exceeded maxmemory; LRU eviction wiped hot product catalog cache simultaneously.",
        "steps_taken": [
            "Increased Redis maxmemory allocation from 4GB to 12GB",
            "Implemented zlib payload compression for cached items > 10KB",
            "Added jitter (random +/- 15%) to cache TTLs to avoid synchronized expiration storms"
        ],
        "verified_resolution": "Enabled payload compression, added TTL jitter, and adjusted Redis memory limits.",
        "failed_attempts": [
            "Restarted Redis cluster (lost remaining warm keys, worsening DB storm)"
        ],
        "outcome": "Cache hit ratio restored to 99.1%; database load dropped by 88%.",
        "created_ago_days": 10,
        "duration_minutes": 23
    },
    {
        "id": "INC-DEMO-011",
        "title": "Redis master failover connection timeout in cart service",
        "service": "redis-cache",
        "environment": "production",
        "severity": "high",
        "status": "resolved",
        "symptoms": "Cart checkout operations failed during automated AWS Redis node maintenance failover.",
        "error_logs": "ERROR: io.lettuce.core.RedisConnectionException: Unable to connect to [redis-master:6379]: Connection refused",
        "confirmed_cause": "Cart client lacked dynamic topology refresh, attempting to write to old read-only master after failover.",
        "steps_taken": [
            "Enabled Lettuce dynamic refresh topology and periodic refresh every 30s",
            "Configured auto-reconnect with exponential backoff in Redis client configuration"
        ],
        "verified_resolution": "Configured dynamic topology discovery and fast master failover reconnect.",
        "failed_attempts": [
            "Hardcoded secondary IP address in app config (failed on subsequent failover)"
        ],
        "outcome": "Future failovers recover in < 800ms with zero cart loss.",
        "created_ago_days": 4,
        "duration_minutes": 16
    },

    # --------------------------------------------------------------------------
    # K8S INGRESS & NETWORKING INCIDENTS
    # --------------------------------------------------------------------------
    {
        "id": "INC-DEMO-012",
        "title": "Ingress NGINX upstream buffer overflow on large customer payloads",
        "service": "k8s-ingress",
        "environment": "production",
        "severity": "high",
        "status": "resolved",
        "symptoms": "Customer file upload feature returning HTTP 502 Bad Gateway intermittently on files > 2MB.",
        "error_logs": "ERROR: *4192 upstream sent too big header while reading response header from upstream\nproxy_busy_buffers_size limit reached",
        "confirmed_cause": "Ingress NGINX proxy buffer configurations (proxy_buffers and proxy_buffer_size) were too small for aggregated headers.",
        "steps_taken": [
            "Increased proxy_buffer_size to 16k and proxy_buffers to 8 16k in ingress annotations",
            "Configured client_max_body_size to 25m"
        ],
        "verified_resolution": "Tuned proxy buffer size annotations on Kubernetes Ingress resource.",
        "failed_attempts": [
            "Increased application pod memory (issue was in reverse proxy buffer, not backend pod)"
        ],
        "outcome": "0 upload failures; large payloads processed smoothly.",
        "created_ago_days": 7,
        "duration_minutes": 17
    },
    {
        "id": "INC-DEMO-013",
        "title": "Kubernetes DNS core-dns latency spike causing inter-service timeouts",
        "service": "k8s-ingress",
        "environment": "production",
        "severity": "critical",
        "status": "resolved",
        "symptoms": "Inter-service HTTP calls timing out randomly across all microservices. Services unable to resolve internal DNS names.",
        "error_logs": "ERROR: dial tcp: lookup payment-api.default.svc.cluster.local on 10.96.0.10:53: i/o timeout",
        "confirmed_cause": "CoreDNS pods overwhelmed by excessive un-cached single-request lookups and search path amplification.",
        "steps_taken": [
            "Scaled CoreDNS deployment from 2 to 6 replicas",
            "Deployed NodeLocal DNSCache daemonset to handle DNS caching on each node",
            "Tuned ndots setting in pod dnsConfig from 5 to 2"
        ],
        "verified_resolution": "Installed NodeLocal DNSCache and scaled CoreDNS replicas.",
        "failed_attempts": [
            "Swapped internal service names for static cluster IPs (unmaintainable in dynamic K8s)"
        ],
        "outcome": "DNS resolution latency dropped from 1200ms to 0.4ms; 0 DNS timeouts.",
        "created_ago_days": 6,
        "duration_minutes": 24
    },

    # --------------------------------------------------------------------------
    # ORDERS DB & DATA STORE INCIDENTS
    # --------------------------------------------------------------------------
    {
        "id": "INC-DEMO-014",
        "title": "Orders DB transaction deadlocks on concurrent inventory reservation",
        "service": "orders-db",
        "environment": "production",
        "severity": "high",
        "status": "resolved",
        "symptoms": "Flash sale event triggered high rate of transaction rollback errors: 'deadlock detected'.",
        "error_logs": "ERROR: deadlock detected\nProcess 1482 waits for ExclusiveLock on tuple (48, 12); Process 1490 waits for ExclusiveLock on tuple (48, 14)",
        "confirmed_cause": "Orders service and inventory service locked item rows in opposite order (order_id ASC vs product_id DESC).",
        "steps_taken": [
            "Enforced strict alphabetical sorting of item IDs before acquiring row-level locks",
            "Used SELECT ... FOR UPDATE with standardized locking order"
        ],
        "verified_resolution": "Standardized row acquisition sequence across all database transactions.",
        "failed_attempts": [
            "Added transaction retry loop with zero backoff (amplified deadlock frequency)"
        ],
        "outcome": "Deadlocks eliminated; concurrent order throughput increased 4x.",
        "created_ago_days": 5,
        "duration_minutes": 18
    },
    {
        "id": "INC-DEMO-015",
        "title": "Postgres autovacuum freeze lockup on unvacuumed orders table",
        "service": "orders-db",
        "environment": "production",
        "severity": "critical",
        "status": "resolved",
        "symptoms": "Write queries on orders table hung indefinitely. Read queries functioned normally.",
        "error_logs": "WARNING: database 'tracemind' must be vacuumed within 10000000 transactions\nTransaction ID wraparound protection invoked.",
        "confirmed_cause": "Aggressive write volume outpaced default autovacuum worker settings, triggering emergency wraparound freeze.",
        "steps_taken": [
            "Ran manual VACUUM FREEZE ANALYZE on bloated tables",
            "Tuned autovacuum_vacuum_cost_limit from 200 to 2000 and cost_delay from 20ms to 2ms",
            "Increased autovacuum_max_workers to 6"
        ],
        "verified_resolution": "Completed emergency vacuum and adjusted autovacuum worker resource limits.",
        "failed_attempts": [
            "Attempted killing vacuum processes (prolonged transaction wraparound freeze)"
        ],
        "outcome": "Table bloat reduced by 42GB; write operations resumed within 12 minutes.",
        "created_ago_days": 12,
        "duration_minutes": 29
    },

    # --------------------------------------------------------------------------
    # ADDITIONAL DIVERSE PAST INCIDENTS (Filling ~30 total)
    # --------------------------------------------------------------------------
    {
        "id": "INC-DEMO-016",
        "title": "Payment webhook retry flood after partner gateway timeout",
        "service": "payment-api",
        "environment": "production",
        "severity": "high",
        "status": "resolved",
        "symptoms": "Partner gateway returned 504; payment-api re-queued events with zero backoff, generating 100k requests/min.",
        "error_logs": "ERROR: Rate limit exceeded on partner endpoint: 429 Too Many Requests",
        "confirmed_cause": "Retry queue lacked exponential backoff and jitter, creating immediate self-inflicted DDoS.",
        "steps_taken": [
            "Implemented exponential backoff with full jitter in webhook retry worker",
            "Added per-domain concurrency limiter"
        ],
        "verified_resolution": "Added exponential backoff with jitter and circuit breaker.",
        "failed_attempts": ["Disabled webhooks entirely (caused customer account sync delays)"],
        "outcome": "Webhook delivery rate stabilized within partner quotas.",
        "created_ago_days": 9,
        "duration_minutes": 15
    },
    {
        "id": "INC-DEMO-017",
        "title": "Auth service memory leak in session token parsing regex",
        "service": "auth-service",
        "environment": "staging",
        "severity": "medium",
        "status": "resolved",
        "symptoms": "Auth service pods gradually consumed all available RAM over 72 hours until OOM killed.",
        "error_logs": "Killed process 1 (python) total-vm:1842MB, anon-rss:920MB, file-rss:0MB",
        "confirmed_cause": "Unbounded compilation of dynamic regular expressions in auth token header sanitizer.",
        "steps_taken": [
            "Precompiled regex pattern at module load time",
            "Added memory profile benchmark to CI test suite"
        ],
        "verified_resolution": "Precompiled static regexes and eliminated runtime dynamic compiles.",
        "failed_attempts": ["Increased memory request from 512MB to 2GB (only delayed OOM)"],
        "outcome": "Memory consumption flatlined at 85MB.",
        "created_ago_days": 8,
        "duration_minutes": 21
    },
    {
        "id": "INC-DEMO-018",
        "title": "Kafka consumer offset reset loop following broker restart",
        "service": "kafka-consumer",
        "environment": "production",
        "severity": "high",
        "status": "resolved",
        "symptoms": "Consumer repeated processing of past 24h messages upon pod startup.",
        "error_logs": "WARN: auto.offset.reset=earliest triggered; resetting consumer offset to beginning",
        "confirmed_cause": "Offset commit failed silently during graceful shutdown because timeout was set to 0.",
        "steps_taken": [
            "Configured auto.offset.reset to 'latest' with explicit sync commit on SIGTERM",
            "Set terminationGracePeriodSeconds to 60s in Kubernetes spec"
        ],
        "verified_resolution": "Configured clean offset flush during pod shutdown lifecycle.",
        "failed_attempts": ["Manually updated ZooKeeper offset nodes (caused data corruption)"],
        "outcome": "Zero message duplication on subsequent broker maintenance.",
        "created_ago_days": 7,
        "duration_minutes": 18
    },
    {
        "id": "INC-DEMO-019",
        "title": "Orders DB read-replica replication lag on bulk customer migration",
        "service": "orders-db",
        "environment": "production",
        "severity": "medium",
        "status": "resolved",
        "symptoms": "Dashboard reporting outdated order statuses; replica lag climbed past 45 minutes.",
        "error_logs": "WARN: postgres replication delay: 2840 seconds on replica-02",
        "confirmed_cause": "Single-threaded replication worker bottlenecked on large un-batched UPDATE table scan.",
        "steps_taken": [
            "Split single 500k row UPDATE into chunked batches of 2,000 with 100ms pause",
            "Enabled parallel replication workers in Postgres 16 config"
        ],
        "verified_resolution": "Chunked bulk updates and enabled multi-threaded wal receiver.",
        "failed_attempts": ["Restarted replica instance (forced full snapshot reload)"],
        "outcome": "Replication lag dropped back below 50ms within 8 minutes.",
        "created_ago_days": 4,
        "duration_minutes": 14
    },
    {
        "id": "INC-DEMO-020",
        "title": "Redis cache hotkey degradation on viral product listing",
        "service": "redis-cache",
        "environment": "production",
        "severity": "high",
        "status": "resolved",
        "symptoms": "Single Redis node hitting 100% CPU while other nodes in cluster had 5% utilization.",
        "error_logs": "WARN: Redis single core CPU 100%; top hotkey: product:item:9401",
        "confirmed_cause": "Traffic concentration on a single cache key overwhelmed single-threaded Redis core.",
        "steps_taken": [
            "Implemented client-side in-memory caching with 5s TTL for ultra-hot keys",
            "Appended random subkey shards (product:item:9401:shard_[1-5]) across nodes"
        ],
        "verified_resolution": "Deployed client-side tier-1 cache and key sharding.",
        "failed_attempts": ["Added Redis read replicas (replication traffic saturated master CPU)"],
        "outcome": "Redis node CPU reduced to 18%; product page response time dropped to 5ms.",
        "created_ago_days": 3,
        "duration_minutes": 12
    },
    {
        "id": "INC-DEMO-021",
        "title": "K8s Ingress SSL certificate expiration on secondary domain",
        "service": "k8s-ingress",
        "environment": "production",
        "severity": "high",
        "status": "resolved",
        "symptoms": "Browsers displaying NET::ERR_CERT_DATE_INVALID warning on checkout-assets subdomain.",
        "error_logs": "ERROR: cert-manager: Certificate request failed: ACME challenge timeout",
        "confirmed_cause": "Cert-manager ingress solver route lacked appropriate external DNS record for challenge validation.",
        "steps_taken": [
            "Corrected DNS record for Let's Encrypt HTTP01 challenge route",
            "Manually triggered certificate renewal and verified TLS handshake"
        ],
        "verified_resolution": "Restored ACME solver route and configured automated 30-day renewal alert.",
        "failed_attempts": ["Generated self-signed certificate (clients still showed security warning)"],
        "outcome": "Valid certificate deployed; all SSL errors resolved.",
        "created_ago_days": 2,
        "duration_minutes": 16
    },
    {
        "id": "INC-DEMO-022",
        "title": "Payment API HMAC verification failure following secret mismatch",
        "service": "payment-api",
        "environment": "staging",
        "severity": "medium",
        "status": "resolved",
        "symptoms": "All payment callbacks rejected with 403 Forbidden in staging environment.",
        "error_logs": "ERROR: Signature mismatch: expected sha256=a8f... received sha256=12d...",
        "confirmed_cause": "Staging deployment config map contained trailing newline character in base64 secret.",
        "steps_taken": [
            "Stripped trailing whitespace and newlines from environment variable parser",
            "Updated CI pipeline secret injection to enforce rstrip()"
        ],
        "verified_resolution": "Added whitespace sanitization to secret ingestion.",
        "failed_attempts": ["Regenerated secret with provider twice without sanitizing local config"],
        "outcome": "100% of webhook signatures verified correctly.",
        "created_ago_days": 2,
        "duration_minutes": 10
    },
    {
        "id": "INC-DEMO-023",
        "title": "Kafka consumer partition rebalance on high garbage collection pause",
        "service": "kafka-consumer",
        "environment": "production",
        "severity": "high",
        "status": "resolved",
        "symptoms": "Consumer dropped out of consumer group every 15 minutes during JVM full GC pause.",
        "error_logs": "WARN: [Consumer clientId=sub-1] Heartbeat failed. Stop-the-world GC pause lasted 12.4s.",
        "confirmed_cause": "Legacy G1GC settings allowed 12s stop-the-world pauses exceeding session.timeout.ms (10s).",
        "steps_taken": [
            "Tuned JVM GC flags to ZGC (sub-millisecond pause times)",
            "Increased session.timeout.ms from 10s to 30s"
        ],
        "verified_resolution": "Migrated JVM to ZGC and increased Kafka session timeout.",
        "failed_attempts": ["Increased JVM heap from 4GB to 8GB (only lengthened the GC pause)"],
        "outcome": "GC pauses dropped below 1ms; zero spurious heartbeat rebalances.",
        "created_ago_days": 3,
        "duration_minutes": 17
    },
    {
        "id": "INC-DEMO-024",
        "title": "Auth service OpenID connect discovery endpoint rate limited by IdP",
        "service": "auth-service",
        "environment": "production",
        "severity": "high",
        "status": "resolved",
        "symptoms": "SSO login unavailable for enterprise users. Error 500 on /auth/callback.",
        "error_logs": "ERROR: HTTP 429 Too Many Requests from https://idp.enterprise.com/.well-known/openid-configuration",
        "confirmed_cause": "Every login request fetched the OpenID discovery document without HTTP caching headers.",
        "steps_taken": [
            "Cached discovery metadata in-memory with 1-hour TTL",
            "Added circuit breaker fallback to last known good config"
        ],
        "verified_resolution": "Cached IdP discovery documents with resilient fallback.",
        "failed_attempts": ["Requested rate limit increase from IdP (still violated best practices)"],
        "outcome": "IdP requests dropped by 99.9%; enterprise SSO restored.",
        "created_ago_days": 4,
        "duration_minutes": 15
    },
    {
        "id": "INC-DEMO-025",
        "title": "Orders DB connection exhaustion from orphan analytics queries",
        "service": "orders-db",
        "environment": "production",
        "severity": "critical",
        "status": "resolved",
        "symptoms": "Production order transactions blocked. Active connections hit 100% capacity.",
        "error_logs": "FATAL: remaining connection slots are reserved for non-replication superuser connections\npg_stat_activity: SELECT * FROM orders WHERE ... (running for 4 hours)",
        "confirmed_cause": "Long-running ad-hoc BI analytics query executed directly against primary transactional database instead of read replica.",
        "steps_taken": [
            "Terminated long-running analytics backend PID using pg_terminate_backend()",
            "Revoked direct connect privileges for BI tool on primary database",
            "Configured dedicated read-only replica endpoint for all BI tooling"
        ],
        "verified_resolution": "Isolated all analytics workloads to dedicated read replica with statement_timeout=30s.",
        "failed_attempts": ["Killed database server (interrupted ongoing production checkouts)"],
        "outcome": "Primary DB connection count returned to 15%; 0 impact on transactional queries.",
        "created_ago_days": 5,
        "duration_minutes": 13
    },

    # --------------------------------------------------------------------------
    # ACTIVE / OPEN INCIDENTS (For realistic demo state)
    # --------------------------------------------------------------------------
    {
        "id": "INC-DEMO-026",
        "title": "Payment API elevated 504 timeouts on international card processing",
        "service": "payment-api",
        "environment": "production",
        "severity": "critical",
        "status": "open",
        "symptoms": "Checkout requests for non-US currency transactions timing out after 30 seconds. Database connection count increasing.",
        "error_logs": "ERROR: TimeoutError: QueuePool limit reached. Connection acquisition timeout 30000ms\n  File 'handlers/forex.py', line 54",
        "confirmed_cause": None,
        "steps_taken": [],
        "verified_resolution": None,
        "failed_attempts": [],
        "outcome": None,
        "created_ago_days": 0,
        "duration_minutes": None
    },
    {
        "id": "INC-DEMO-027",
        "title": "Auth service intermittent 401 on token refresh during deployment",
        "service": "auth-service",
        "environment": "production",
        "severity": "high",
        "status": "investigating",
        "symptoms": "Users report sudden logout when switching pages right after canary rollout. JWT verification error in logs.",
        "error_logs": "ERROR: Signature verification failed for kid='rsa-2026-c'\nToken kid not found in active key set",
        "confirmed_cause": None,
        "steps_taken": ["Investigating whether JWKS cache on ingress pods is out of sync with new canary pods"],
        "verified_resolution": None,
        "failed_attempts": [],
        "outcome": None,
        "created_ago_days": 0,
        "duration_minutes": None
    },
    {
        "id": "INC-DEMO-028",
        "title": "Kafka consumer lag building on order-events topic",
        "service": "kafka-consumer",
        "environment": "production",
        "severity": "medium",
        "status": "investigating",
        "symptoms": "Order fulfillment delay growing. Lag increased from 100 to 12,000 in last 20 minutes.",
        "error_logs": "WARN: CommitFailedException: max.poll.interval.ms exceeded on partition 2",
        "confirmed_cause": None,
        "steps_taken": ["Checking batch size and external downstream API response times"],
        "verified_resolution": None,
        "failed_attempts": [],
        "outcome": None,
        "created_ago_days": 0,
        "duration_minutes": None
    },
    {
        "id": "INC-DEMO-029",
        "title": "Redis cache memory fragmentation above 2.5 on cache cluster node 2",
        "service": "redis-cache",
        "environment": "staging",
        "severity": "low",
        "status": "open",
        "symptoms": "Staging Redis host memory warning: used_memory_rss is 2.8x used_memory.",
        "error_logs": "WARN: mem_fragmentation_ratio: 2.84",
        "confirmed_cause": None,
        "steps_taken": [],
        "verified_resolution": None,
        "failed_attempts": [],
        "outcome": None,
        "created_ago_days": 0,
        "duration_minutes": None
    },
    {
        "id": "INC-DEMO-030",
        "title": "K8s Ingress HTTP 503 during pod rolling update",
        "service": "k8s-ingress",
        "environment": "production",
        "severity": "medium",
        "status": "open",
        "symptoms": "Brief burst of HTTP 503 Service Unavailable errors whenever payment-api deployment rolls out new pods.",
        "error_logs": "ERROR: [error] 148#148: *9129 connect() failed (111: Connection refused) while connecting to upstream",
        "confirmed_cause": None,
        "steps_taken": [],
        "verified_resolution": None,
        "failed_attempts": [],
        "outcome": None,
        "created_ago_days": 0,
        "duration_minutes": None
    }
]


def seed_demo_data():
    print("=" * 80)
    print(" TRACEMIND DEMO DATA SEEDER ")
    print("=" * 80)
    print(f"Target Database: {settings.DATABASE_URL}")
    print(f"Hindsight Bank:  {settings.HINDSIGHT_BANK_ID}")

    # Ensure DB schema exists
    init_db()
    db = SessionLocal()

    # Pre-check Hindsight availability
    hindsight_active = hindsight_service.is_configured()
    if hindsight_active:
        print("[+] HINDSIGHT_API_KEY detected. Will retain resolved post-mortems in Hindsight memory.")
        try:
            hindsight_service.ensure_bank()
        except Exception as e:
            print(f"[!] Warning: Could not initialize bank: {e}. Retain operations may fail.")
    else:
        print("[!] Advisory: HINDSIGHT_API_KEY is not configured or placeholder.")
        print("    Incidents will be seeded into Database, but Hindsight retention will be skipped.")

    seeded_incidents = 0
    seeded_resolutions = 0
    retained_in_hindsight = 0
    already_retained = 0
    failures = []

    try:
        for data in DEMO_INCIDENTS:
            inc_id = data["id"]
            created_at = utc_ago(days=data["created_ago_days"], hours=1)
            is_resolved = data["status"] == "resolved"
            resolved_at = created_at + timedelta(minutes=data.get("duration_minutes", 20)) if is_resolved else None

            # 1. Upsert Incident
            incident = db.query(Incident).filter(Incident.id == inc_id).first()
            if not incident:
                incident = Incident(
                    id=inc_id,
                    title=data["title"],
                    service=data["service"],
                    environment=data["environment"],
                    severity=data["severity"],
                    status=data["status"],
                    symptoms=data["symptoms"],
                    error_logs=data["error_logs"],
                    is_demo=True,
                    created_at=created_at,
                    updated_at=resolved_at or created_at,
                    resolved_at=resolved_at
                )
                db.add(incident)
                seeded_incidents += 1
            else:
                incident.title = data["title"]
                incident.service = data["service"]
                incident.environment = data["environment"]
                incident.severity = data["severity"]
                incident.status = data["status"]
                incident.symptoms = data["symptoms"]
                incident.error_logs = data["error_logs"]
                incident.resolved_at = resolved_at
                incident.updated_at = resolved_at or created_at

            db.commit()

            # 2. Upsert Resolution for resolved incidents
            if is_resolved and data.get("confirmed_cause"):
                res = db.query(Resolution).filter(Resolution.incident_id == inc_id).first()
                if not res:
                    res = Resolution(
                        incident_id=inc_id,
                        confirmed_cause=data["confirmed_cause"],
                        steps_taken_json=json.dumps(data["steps_taken"]),
                        verified_resolution=data["verified_resolution"],
                        failed_attempts_json=json.dumps(data["failed_attempts"]),
                        outcome=data.get("outcome"),
                        retained_in_hindsight=False,
                        created_at=resolved_at
                    )
                    db.add(res)
                    seeded_resolutions += 1
                else:
                    res.confirmed_cause = data["confirmed_cause"]
                    res.steps_taken_json = json.dumps(data["steps_taken"])
                    res.verified_resolution = data["verified_resolution"]
                    res.failed_attempts_json = json.dumps(data["failed_attempts"])
                    res.outcome = data.get("outcome")

                db.commit()

                # 3. Retain in real Hindsight if configured & not yet retained
                if hindsight_active:
                    if res.retained_in_hindsight:
                        already_retained += 1
                    else:
                        try:
                            print(f"  -> Retaining real post-mortem for {inc_id} in Hindsight...")
                            retain_res = hindsight_service.retain_incident(
                                incident_id=inc_id,
                                title=data["title"],
                                service=data["service"],
                                environment=data["environment"],
                                symptoms=data["symptoms"],
                                confirmed_cause=data["confirmed_cause"],
                                verified_resolution=data["verified_resolution"],
                                steps_taken=data["steps_taken"],
                                error_logs=data["error_logs"],
                                failed_attempts=data["failed_attempts"],
                                outcome=data.get("outcome"),
                                is_demo=True
                            )
                            res.retained_in_hindsight = True
                            res.hindsight_document_id = inc_id
                            db.commit()
                            retained_in_hindsight += 1
                        except Exception as e:
                            err_msg = str(e)
                            print(f"     [!] Failed to retain {inc_id}: {err_msg}")
                            failures.append({"incident_id": inc_id, "error": err_msg})

        print("\n" + "=" * 80)
        print(" SEEDING & BACKFILL SUMMARY ")
        print("=" * 80)
        print(f"Total Incidents in Database:      {db.query(Incident).count()}")
        print(f"Total Resolutions in Database:    {db.query(Resolution).count()}")
        print(f"Newly Retained in Hindsight:      {retained_in_hindsight}")
        print(f"Already Retained in Hindsight:    {already_retained}")
        print(f"Retention Failures:               {len(failures)}")

        if failures:
            print("\n[!] List of Retention Failures:")
            for f in failures:
                print(f"    - {f['incident_id']}: {f['error']}")
            raise RuntimeError(f"Hindsight retention encountered {len(failures)} failures.")

        # 4. Verify with Real Recall Queries
        if hindsight_active:
            print("\n" + "=" * 80)
            print(" VERIFYING REAL RETRIEVAL FROM HINDSIGHT ")
            print("=" * 80)
            verify_queries = [
                ("Pattern 1 (DB Pools)", "database connection pool exhausted leaked session context"),
                ("Pattern 2 (JWT & Auth)", "JWKS public key rotation clock skew 401 unauthorized"),
                ("Pattern 3 (Kafka)", "Kafka consumer rebalance storm max.poll.interval.ms exceeded")
            ]
            for label, query in verify_queries:
                print(f"\n--- Testing Recall: {label} ---")
                print(f"Query: '{query}'")
                recalled = hindsight_service.recall(query=query, budget="mid", max_tokens=2048)
                print(f"Returned {len(recalled)} real memories:")
                for i, r in enumerate(recalled[:2], start=1):
                    print(f"  [{i}] ID: {r.id} | Score: {r.score} | Type: {r.type}")
                    print(f"      Text: {r.text[:140]}...")
                    if r.metadata:
                        print(f"      Metadata: {json.dumps(r.metadata)}")

        print("\nDatabase seeding and Hindsight backfill completed successfully.")

    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_data()

