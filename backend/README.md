# TraceMind Backend

> **"Every incident teaches. Every resolution makes us smarter."**  
> TraceMind is an AI-powered incident-response intelligence platform that uses Hindsight's persistent memory to learn from past incident resolutions, eliminate recurring failures, and recommend targeted root-cause hypotheses and investigation steps.

---

## 1. Architecture & Stack

- **Framework**: Python 3.11+ / FastAPI
- **Database**: PostgreSQL (via Docker Compose) with automatic transparent SQLite fallback (`sqlite:///./tracemind.db`) when Docker/Postgres is unavailable
- **ORM**: SQLAlchemy 2 (Alembic-free clean `create_all`)
- **Agent Memory**: Official Vectorize `hindsight-client` (multi-strategy retrieval + background observation extraction)
- **AI Inference**: Official `groq` Python SDK (Primary: `openai/gpt-oss-120b`, Fallback: `qwen/qwen3-32b`)
- **Data Validation**: Pydantic v2
- **Testing**: Pytest

---

## 2. Directory Layout

```
backend/
├── app/
│   ├── main.py                  # FastAPI entry point, CORS, lifespan, exception handlers
│   ├── core/
│   │   ├── config.py            # Pydantic BaseSettings, startup validation
│   │   └── logging.py           # Structured logger with secret redaction
│   ├── models/
│   │   ├── __init__.py
│   │   └── database.py          # SQLAlchemy 2 models (Incident, Analysis, Resolution, Feedback)
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── incident.py          # Incident create/response schemas, enums
│   │   ├── analysis.py          # Analysis schemas (hypotheses, recalled memories)
│   │   ├── resolution.py        # Resolution schemas
│   │   ├── feedback.py          # Engineer feedback schemas (accept/reject/modify)
│   │   ├── memory.py            # Memory Explorer recall passthrough schemas
│   │   ├── analytics.py         # Real derived metrics schema (live vs demo separated)
│   │   ├── health.py            # Health status schema
│   │   └── error.py             # Standard error envelope
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── health.py            # GET /api/health
│   │   ├── incidents.py         # Incidents CRUD, analyze, resolve, feedback
│   │   ├── memory.py            # POST /api/memory/recall
│   │   └── analytics.py         # GET /api/analytics/summary
│   └── services/
│       ├── __init__.py
│       ├── hindsight_service.py # Hindsight client wrapper (retain, recall, reflect)
│       ├── groq_service.py      # Groq LLM client, model fallback, JSON parser
│       ├── incident_service.py  # Incident management, ID generator, orchestration
│       └── analytics_service.py # Pure database-derived metric computations
├── scripts/
│   ├── hindsight_smoke_test.py  # Real Hindsight service smoke test
│   └── seed_demo_data.py        # 30 synthetic incidents with 3 recurring patterns
├── tests/
│   └── test_logic.py            # Pytest test suite for pure business logic
├── requirements.txt
└── README.md
```

---

## 3. Required Environment Variables

Copy `.env.example` to `.env` in the repository root:
```bash
cp .env.example .env
```

| Variable | Description | Recommended / Active Value |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection or SQLite fallback | `postgresql://tracemind:tracemind_password@localhost:5432/tracemind` or `sqlite:///./tracemind.db` |
| `HINDSIGHT_BASE_URL` | Hindsight server endpoint | `https://api.hindsight.vectorize.io` |
| `HINDSIGHT_API_KEY` | Vectorize / Hindsight API key | Set in `.env` |
| `HINDSIGHT_BANK_ID` | Isolated memory bank identifier | `TraceMind` |
| `GROQ_API_KEY` | Groq LLM API Key | Set in `.env` |
| `GROQ_MODEL` | Primary LLM for incident analysis | `openai/gpt-oss-120b` |
| `GROQ_FALLBACK_MODEL`| Fallback LLM if primary is rate limited | `qwen/qwen3-32b` |
| `FRONTEND_ORIGIN` | React frontend allowed origin for CORS | `http://localhost:5173` |
| `HOST` | Backend bind host | `0.0.0.0` |
| `PORT` | Backend bind port | `8000` |

---

## 4. Run Order (Setup to Server)

Follow this exact sequence to bootstrap and verify the platform:

### Step 1: Install Dependencies
```bash
python3 -m venv backend/venv
source backend/venv/bin/activate
pip install -r backend/requirements.txt
```

### Step 2: Run Hindsight Smoke Test
Validates connection, retain, and recall operations against the real Hindsight memory service:
```bash
source backend/venv/bin/activate
python3 backend/scripts/hindsight_smoke_test.py
```

### Step 3: Seed Database & Backfill Hindsight Memory
Populates 30 synthetic past incidents across 6 services with 3 recurring failure patterns, and retains all 25 resolved post-mortems in Hindsight:
```bash
source backend/venv/bin/activate
python3 backend/scripts/seed_demo_data.py
```

### Step 4: Verify the Learning Loop (Proof of Institutional Memory)
Executes an end-to-end learning loop proof across any built-in novel failure scenario (e.g. `invoice-dst-drift` or `webhook-body-drain`):
```bash
source backend/venv/bin/activate
# Scenario 1: Daylight-saving cron drift in billing exports
python3 backend/scripts/verify_learning_loop.py --scenario invoice-dst-drift

# Scenario 2: Gateway request body stream consumption in HMAC verification
python3 backend/scripts/verify_learning_loop.py --scenario webhook-body-drain
```
This script proves that:
1. Incident A analyzed with `use_memory=true` before resolution recalls 0 matching historical memories.
2. Incident A resolution is retained in Hindsight and polled until indexing is confirmed via the official SDK.
3. Incident B (differently worded) recalls Incident A's document ID and cites its verified resolution.
4. Outputs a side-by-side comparison of memory-augmented vs. zero-shot analysis.

### Step 5: Reset Live Data Between Rehearsals
Cleans up live test incidents, resolutions, and Hindsight documents while strictly preserving the 25 seeded benchmark documents (`INC-DEMO-*`):
```bash
source backend/venv/bin/activate
# Dry run preview (safe inspection)
python3 backend/scripts/reset_live_data.py

# Execute reset (restores Hindsight document count to 25 and next ID to INC-001)
python3 backend/scripts/reset_live_data.py --yes
```

### Step 6: Run Tests
Executes unit tests for pure business logic:
```bash
source backend/venv/bin/activate
pytest
```

### Step 7: Start Backend API Server
```bash
source backend/venv/bin/activate
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive API docs are available at `http://localhost:8000/docs`.

---

## 5. Demo Data & Analytics Disclosures

- **Synthetic Seed Data**: The 30 demo incidents generated by `seed_demo_data.py` are labeled with `is_demo=true`. They are strictly synthetic sample data created to benchmark memory retrieval across three recurring failure archetypes:
  1. *Database connection pool starvation* (`payment-api`, `orders-db`)
  2. *JWT signing key cache desync and clock skew* (`auth-service`, `k8s-ingress`)
  3. *Kafka consumer rebalance storms from processing timeouts* (`kafka-consumer`)
- **Safe State Isolation**: Live demo runs (`is_demo=false`, `INC-001`, `INC-002`, etc.) are completely decoupled from synthetic demo benchmarks. Running `python3 backend/scripts/reset_live_data.py --yes` will safely cascade-delete live demo documents from Hindsight without touching any `INC-DEMO-*` documents.
- **Truthful Analytics**: `/api/analytics/summary` strictly derives metrics from real database rows. It explicitly segregates live production runs from demo benchmark figures:
  - `recall_hit_rate` is computed only from actual `POST /api/incidents/{id}/analyze` calls where `use_memory=true`.
  - `time_saved_percentage` returns `null` unless sufficient live resolved incidents exist for both memory-augmented and baseline runs.
  - Sample incident metrics are nested under `demo_benchmark` with `"basis": "seeded_sample"` so historical reference data is never confused for live telemetry.

---

## 6. API Endpoint curl Examples

### 6.1 Check System Health
```bash
curl -X GET http://localhost:8000/api/health
```

### 6.2 List Incidents
```bash
curl -X GET "http://localhost:8000/api/incidents?status=open&limit=10"
```

### 6.3 Create a New Incident
```bash
curl -X POST http://localhost:8000/api/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Payment API connection pool exhaustion",
    "service": "payment-api",
    "environment": "production",
    "severity": "critical",
    "symptoms": "HTTP 504 Gateway Timeouts during checkout. Database connections climbing.",
    "error_logs": "ERROR: TimeoutError: QueuePool limit reached. Connection acquisition timeout 30000ms"
  }'
```

### 6.4 Get Incident Details (Including Analyses & Resolution)
```bash
curl -X GET http://localhost:8000/api/incidents/INC-DEMO-026
```

### 6.5 Analyze Incident (WITH Hindsight Memory - Core Demo)
```bash
curl -X POST http://localhost:8000/api/incidents/INC-DEMO-026/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "use_memory": true
  }'
```

### 6.6 Analyze Incident (WITHOUT Memory - Baseline Comparison)
```bash
curl -X POST http://localhost:8000/api/incidents/INC-DEMO-026/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "use_memory": false
  }'
```

### 6.7 Resolve Incident & Retain Post-Mortem in Hindsight
```bash
curl -X POST http://localhost:8000/api/incidents/INC-001/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "confirmed_cause": "Unhandled DB transaction rollback bypassed connection release in checkout webhook",
    "steps_taken": [
      "Inspected pg_stat_activity to detect idle in transaction connections",
      "Wrapped DB session handling in try/finally context manager",
      "Increased pool_size from 10 to 30"
    ],
    "verified_resolution": "Fixed session lifecycle with context managers and raised pool limits in payment-api Helm values.",
    "failed_attempts": [
      "Restarted payment pods without code fix (pool exhausted again within 3 minutes)"
    ],
    "outcome": "Active connections stabilized below 12; zero connection timeout errors."
  }'
```

### 6.8 Submit Feedback on Recommendations
```bash
curl -X POST http://localhost:8000/api/incidents/INC-DEMO-026/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "analysis_id": 1,
    "feedback_type": "accept",
    "notes": "Recommendation correctly identified the leaked session context."
  }'
```

### 6.9 Query Memory Explorer (Hindsight Recall Passthrough)
```bash
curl -X POST http://localhost:8000/api/memory/recall \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Kafka consumer rebalance storm heartbeat timeout",
    "budget": "mid",
    "limit": 5
  }'
```

### 6.10 Get Memory Bank Statistics
```bash
curl -X GET http://localhost:8000/api/memory/stats
```

### 6.11 Get Analytics Summary
```bash
curl -X GET http://localhost:8000/api/analytics/summary
```
