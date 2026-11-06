/**
 * DEV-ONLY Mock Data
 * Strictly conforms to docs/API_CONTRACT.md.
 * Used ONLY when VITE_USE_MOCKS=true (OFF by default for demo).
 */
import {
  HealthResponse,
  Incident,
  IncidentDetail,
  Analysis,
  AnalyticsSummary,
  MemoryRecallResponse,
} from '../types';

export const mockHealth: HealthResponse = {
  status: 'ok',
  version: '1.0.0',
  services: {
    database: {
      status: 'healthy',
      engine: 'postgresql',
      message: 'Connected successfully',
    },
    groq: {
      status: 'healthy',
      model: 'openai/gpt-oss-120b',
      message: 'Configured and available',
    },
    hindsight: {
      status: 'healthy',
      bank_id: 'TraceMind',
      message: 'Connected to Hindsight engine',
    },
  },
};

export const initialMockIncidents: IncidentDetail[] = [
  {
    id: 'INC-001',
    title: 'Payment API connection pool exhaustion during peak checkout',
    service: 'payment-api',
    environment: 'production',
    severity: 'critical',
    status: 'open',
    symptoms: 'High p99 latency (>30s) and 504 Gateway Timeouts during customer checkout spike.',
    error_logs: `ERROR: sqlalchemy.exc.TimeoutError: QueuePool limit of size 10 overflow 10 reached, connection timed out, timeout 30.00
  File '/app/handlers/checkout.py', line 84, in create_payment
  File '/app/db/session.py', line 42, in get_db_connection
  WARNING: 64 checkout worker threads in WAIT state waiting for free connection`,
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    resolved_at: null,
    is_demo: false,
    analyses: [],
    resolution: null,
    feedback: [],
  },
  {
    id: 'INC-002',
    title: 'Auth Service JWKS key rotation cache desync',
    service: 'auth-service',
    environment: 'production',
    severity: 'high',
    status: 'investigating',
    symptoms: 'Sudden surge of HTTP 401 Unauthorized errors across all downstream microservices.',
    error_logs: `jwt.exceptions.InvalidSignatureError: Signature verification failed for token with kid 'key-2026-v2'
  File '/app/auth/verifier.py', line 39, in verify_token
  DEBUG: Cached JWKS keyset only contains ['key-2026-v1'] (TTL not expired, cached 4 hours ago)`,
    created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    resolved_at: null,
    is_demo: false,
    analyses: [],
    resolution: null,
    feedback: [],
  },
  {
    id: 'INC-003',
    title: 'Kafka consumer rebalance storm on event-ingestion topic',
    service: 'kafka-consumer',
    environment: 'production',
    severity: 'high',
    status: 'open',
    symptoms: 'Consumer group lag expanding exponentially. Partitions repeatedly revoked and reassigned.',
    error_logs: `CommitFailedException: Commit cannot be completed since the group has already rebalanced and assigned the partitions to another member.
  File '/app/workers/telemetry.py', line 112, in process_batch
  Duration of batch processing: 312000ms exceeded max.poll.interval.ms: 300000ms`,
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    resolved_at: null,
    is_demo: false,
    analyses: [],
    resolution: null,
    feedback: [],
  },
  {
    id: 'INC-DEMO-001',
    title: 'Payment API connection pool exhaustion during peak checkout (Prior Occurrence)',
    service: 'payment-api',
    environment: 'production',
    severity: 'critical',
    status: 'resolved',
    symptoms: 'Spike in HTTP 504 Gateway Timeouts on checkout endpoints. DB connection latency climbed to 30s.',
    error_logs: `ERROR: sqlalchemy.exc.TimeoutError: QueuePool limit of size 10 overflow 10 reached, connection timed out, timeout 30.00
  File '/app/handlers/checkout.py', line 84, in create_payment`,
    created_at: new Date(Date.now() - 14 * 86400 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 14 * 86400 * 1000 + 22 * 60 * 1000).toISOString(),
    resolved_at: new Date(Date.now() - 14 * 86400 * 1000 + 22 * 60 * 1000).toISOString(),
    is_demo: true,
    analyses: [
      {
        id: 901,
        incident_id: 'INC-DEMO-001',
        use_memory: true,
        model_used: 'openai/gpt-oss-120b',
        latency_ms: 1180,
        hypotheses: [
          {
            description: 'Database connection pool leak in connection lifecycle management',
            confidence: 'high',
            rationale: 'Matches symptoms where threads hold connections open without returning them to the pool.',
          },
        ],
        investigation_steps: [
          'Query pg_stat_activity to inspect idle in transaction connections.',
          'Verify checkout.py webhook handler error paths.',
        ],
        recommendation: 'Wrap DB session lifecycle inside try/finally and raise pool size limits.',
        uncertainty_note: 'AI hypothesis based on pattern recognition; verify live connection leaks in APM prior to production restart.',
        recalled_memories: [],
        created_at: new Date(Date.now() - 14 * 86400 * 1000 + 5 * 60 * 1000).toISOString(),
      },
    ],
    resolution: {
      id: 801,
      incident_id: 'INC-DEMO-001',
      confirmed_cause: 'Unhandled exception in payment gateway webhook handler exited without releasing the DB session back to the pool.',
      steps_taken: [
        'Queried pg_stat_activity to inspect idle in transaction connections',
        'Traced leaked connections to checkout.py webhook callback',
        'Wrapped database session handling in a try/finally context manager',
        'Increased pool_size to 25 and max_overflow to 20',
      ],
      verified_resolution: 'Fixed session lifecycle with context managers and raised pool limits in payment-api Helm values.',
      failed_attempts: [
        'Restarted payment pods without code fix (pool exhausted again within 3 minutes)',
      ],
      outcome: 'DB connection acquisition dropped to 4ms; 0 dropped checkouts.',
      created_at: new Date(Date.now() - 14 * 86400 * 1000 + 22 * 60 * 1000).toISOString(),
    },
    feedback: [
      {
        id: 701,
        incident_id: 'INC-DEMO-001',
        analysis_id: 901,
        feedback_type: 'accept',
        notes: 'Spot on. The suggested investigation step pointed right to the leak.',
        modified_recommendation: null,
        created_at: new Date(Date.now() - 14 * 86400 * 1000 + 10 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'INC-DEMO-002',
    title: 'Orders DB connection queue timeout on high-volume order ingestion',
    service: 'orders-db',
    environment: 'production',
    severity: 'critical',
    status: 'resolved',
    symptoms: 'Order creation requests failing with database pool timeouts. Database CPU was low (<15%) but connections were pinned.',
    error_logs: `FATAL: remaining connection slots are reserved for non-replication superuser connections
Active connections: 200/200; state: idle in transaction`,
    created_at: new Date(Date.now() - 11 * 86400 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 11 * 86400 * 1000 + 18 * 60 * 1000).toISOString(),
    resolved_at: new Date(Date.now() - 11 * 86400 * 1000 + 18 * 60 * 1000).toISOString(),
    is_demo: true,
    analyses: [],
    resolution: {
      id: 802,
      incident_id: 'INC-DEMO-002',
      confirmed_cause: 'Database connection pool leak: unhandled timeout exceptions in payment confirmation webhook left connections idle in transaction.',
      steps_taken: [
        'Inspected connection counts using pg_stat_activity',
        'Identified matching pattern with INC-DEMO-001 connection leak',
        'Enabled statement_timeout=5000ms and idle_in_transaction_session_timeout=10000ms in Postgres config',
        'Fixed orders worker connection teardown in try/finally block',
      ],
      verified_resolution: 'Applied connection context managers and added idle_in_transaction_session_timeout.',
      failed_attempts: [
        'Attempted to double max_connections in Postgres (risk of exhausting OS file descriptors)',
      ],
      outcome: 'Active connections stabilized at 35; zero pool timeout errors.',
      created_at: new Date(Date.now() - 11 * 86400 * 1000 + 18 * 60 * 1000).toISOString(),
    },
    feedback: [],
  },
  {
    id: 'INC-DEMO-003',
    title: 'Auth service JWKS public key rotation cache invalidation desync',
    service: 'auth-service',
    environment: 'production',
    severity: 'high',
    status: 'resolved',
    symptoms: 'API Gateway rejecting all valid bearer tokens after scheduled key rotation.',
    error_logs: `InvalidSignatureError: Signature verification failed for token with kid 'key-2026-v2'`,
    created_at: new Date(Date.now() - 8 * 86400 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 86400 * 1000 + 15 * 60 * 1000).toISOString(),
    resolved_at: new Date(Date.now() - 8 * 86400 * 1000 + 15 * 60 * 1000).toISOString(),
    is_demo: true,
    analyses: [],
    resolution: {
      id: 803,
      incident_id: 'INC-DEMO-003',
      confirmed_cause: 'Gateway kept caching outdated JWKS public keys without fallback fetch on unrecognized kid.',
      steps_taken: [
        'Checked API gateway JWKS cache TTL (was hardcoded to 24h)',
        'Added dynamic fallback fetch when an unrecognized kid is encountered',
        'Flushed gateway Redis cache',
      ],
      verified_resolution: 'Implemented dynamic JWKS refresh on unknown kid and decreased default cache TTL to 1h.',
      failed_attempts: ['Rolling back private key (broke mobile clients)'],
      outcome: 'Gateway auth success rate restored to 100%.',
      created_at: new Date(Date.now() - 8 * 86400 * 1000 + 15 * 60 * 1000).toISOString(),
    },
    feedback: [],
  },
  {
    id: 'INC-DEMO-004',
    title: 'Kafka consumer rebalance storm from unbounded batch processing',
    service: 'kafka-consumer',
    environment: 'production',
    severity: 'medium',
    status: 'resolved',
    symptoms: 'Consumer lag kept climbing; frequent group rebalance pauses.',
    error_logs: `CommitFailedException: max.poll.interval.ms exceeded`,
    created_at: new Date(Date.now() - 5 * 86400 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400 * 1000 + 20 * 60 * 1000).toISOString(),
    resolved_at: new Date(Date.now() - 5 * 86400 * 1000 + 20 * 60 * 1000).toISOString(),
    is_demo: true,
    analyses: [],
    resolution: {
      id: 804,
      incident_id: 'INC-DEMO-004',
      confirmed_cause: 'Heavy payload processing caused consumer to exceed max.poll.interval.ms.',
      steps_taken: [
        'Reduced max.poll.records from 500 to 50',
        'Increased max.poll.interval.ms to 600000ms',
        'Added async processing queue',
      ],
      verified_resolution: 'Lowered batch size and decoupled processing from heartbeat loop.',
      failed_attempts: ['Adding more consumer pods (amplified rebalances)'],
      outcome: 'Zero rebalances in 72 hours; lag stabilized under 100 records.',
      created_at: new Date(Date.now() - 5 * 86400 * 1000 + 20 * 60 * 1000).toISOString(),
    },
    feedback: [],
  },
];

export const mockAnalyticsSummary: AnalyticsSummary = {
  total_incidents: 30,
  live_incidents: 3,
  demo_incidents: 27,
  open_incidents: 3,
  resolved_incidents: 27,
  memory_impact: {
    basis: 'insufficient_live_data',
    avg_minutes_to_resolve_with_memory: null,
    avg_minutes_to_resolve_without_memory: null,
    time_saved_percentage: null,
    recall_hit_rate: null,
    recall_hit_rate_note: 'Requires at least 5 resolved live incidents to establish statistically significant recall metrics.',
    feedback_accept_rate: null,
    live_samples_count: 2,
    demo_benchmark: {
      basis: 'seeded_sample',
      total_sample_incidents: 27,
      resolved_sample_incidents: 27,
      avg_sample_resolution_minutes: 19.8,
    },
  },
  severity_breakdown: {
    critical: 8,
    high: 12,
    medium: 7,
    low: 3,
  },
  service_breakdown: {
    'payment-api': 9,
    'auth-service': 6,
    'orders-db': 5,
    'redis-cache': 4,
    'kafka-consumer': 4,
    'k8s-ingress': 2,
  },
};

export function getMockAnalysis(incident: Incident, useMemory: boolean): Analysis {
  if (useMemory) {
    return {
      id: Date.now(),
      incident_id: incident.id,
      use_memory: true,
      model_used: 'openai/gpt-oss-120b',
      latency_ms: 1240,
      hypotheses: [
        {
          description: `Database connection pool leak in connection lifecycle management (Verified Pattern: ${incident.service})`,
          confidence: 'high',
          rationale: 'Strong match with past incident INC-DEMO-001. Leaked sessions caused QueuePool saturation during transaction rollbacks.',
        },
        {
          description: 'Synchronous downstream HTTP timeout holding open DB transactions',
          confidence: 'medium',
          rationale: 'Correlates with payment provider latency spikes reported in past incidents on payment-api.',
        },
      ],
      investigation_steps: [
        'Execute `SELECT pid, state, query_start, query FROM pg_stat_activity WHERE state = "idle in transaction";` to find leaked connection holders.',
        'Review recent commits in `checkout.py` for unclosed session contexts or missing try/finally blocks around database sessions.',
        'Compare active vs idle connections in HikariCP / SQLAlchemy metrics.',
      ],
      recommendation: 'Deploy hotfix wrapping checkout session lifecycle in explicit context managers, and temporarily raise QueuePool max_overflow to 25 to absorb spike.',
      uncertainty_note: 'AI hypothesis based on pattern recognition; verify live connection leaks in APM prior to production restart.',
      recalled_memories: [
        {
          id: 'mem_01hqxyz',
          text: 'Incident INC-DEMO-001: Payment API connection pool exhaustion resolved by fixing unclosed session contexts in payment_gateway.py and raising pool limits.',
          type: 'experience',
          entities: ['payment-api', 'database', 'connection-pool'],
          metadata: {
            service: 'payment-api',
            incident_id: 'INC-DEMO-001',
          },
        },
        {
          id: 'mem_02ab123',
          text: 'Incident INC-DEMO-002: Orders DB connection queue timeout resolved by applying idle_in_transaction_session_timeout=10000ms.',
          type: 'experience',
          entities: ['orders-db', 'connection-timeout'],
          metadata: {
            service: 'orders-db',
            incident_id: 'INC-DEMO-002',
          },
        },
      ],
      warnings: [],
      created_at: new Date().toISOString(),
    };
  }

  // Zero-shot (Without Memory) analysis:
  return {
    id: Date.now(),
    incident_id: incident.id,
    use_memory: false,
    model_used: 'openai/gpt-oss-120b',
    latency_ms: 890,
    hypotheses: [
      {
        description: 'Generic database overload or unexpected traffic spike',
        confidence: 'low',
        rationale: 'Error logs indicate QueuePool limit reached. Could be caused by slow queries or general traffic increase.',
      },
      {
        description: 'Possible network packet loss between application and database cluster',
        confidence: 'low',
        rationale: 'Connection timed out after 30s. Could be a network infrastructure partition.',
      },
    ],
    investigation_steps: [
      'Check database CPU and memory utilization in CloudWatch / Grafana.',
      'Check if database host is reachable via ping/telnet.',
      'Consider restarting the service pods to clear stuck connections.',
    ],
    recommendation: 'Restart application containers and consider scaling up database instance size.',
    uncertainty_note: 'Zero-shot AI assessment without organizational memory context. Recommendations are generic and may cause service restart loops.',
    recalled_memories: [],
    warnings: [],
    created_at: new Date().toISOString(),
  };
}

export const mockRecalledMemories: MemoryRecallResponse = {
  query: 'database connection pool leak',
  results: [
    {
      id: 'mem_01hqxyz',
      text: 'Incident INC-DEMO-001: Payment API connection pool exhausted caused by unclosed session context in checkout route. Resolved by adding try/finally context managers.',
      type: 'experience',
      entities: ['payment-api', 'database', 'connection-pool'],
      metadata: {
        service: 'payment-api',
        incident_id: 'INC-DEMO-001',
      },
    },
    {
      id: 'mem_02ab123',
      text: 'Incident INC-DEMO-002: Orders DB connection queue timeout on high-volume order ingestion. Resolved with idle_in_transaction_session_timeout.',
      type: 'experience',
      entities: ['orders-db', 'database', 'timeout'],
      metadata: {
        service: 'orders-db',
        incident_id: 'INC-DEMO-002',
      },
    },
    {
      id: 'mem_03cd456',
      text: 'Incident INC-DEMO-003: Auth service JWKS key rotation cache desync. Resolved by adding dynamic fallback fetch on unrecognized kid.',
      type: 'experience',
      entities: ['auth-service', 'jwks', 'cache-desync'],
      metadata: {
        service: 'auth-service',
        incident_id: 'INC-DEMO-003',
      },
    },
    {
      id: 'mem_04ef789',
      text: 'Incident INC-DEMO-004: Kafka consumer rebalance storm from unbounded batch processing. Resolved by decreasing max.poll.records to 50.',
      type: 'experience',
      entities: ['kafka-consumer', 'rebalance', 'batch-size'],
      metadata: {
        service: 'kafka-consumer',
        incident_id: 'INC-DEMO-004',
      },
    },
  ],
  total: 4,
};

