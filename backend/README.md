# TraceMind Backend

> **"Every incident teaches. Every resolution makes us smarter."**  
> TraceMind is an AI-powered incident-response intelligence platform that uses Hindsight's persistent memory to learn from past incident resolutions, eliminate recurring failures, and recommend targeted root-cause hypotheses and investigation steps.

---

## 1. Architecture & Stack

- **Framework**: Python 3.11+ / FastAPI
- **Database**: PostgreSQL (via Docker Compose) with transparent SQLite fallback via `DATABASE_URL`
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
│   │   ├── analytics.py         # Real derived metrics schema
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

## 3. Environment Variables & Configuration

Copy `.env.example` to `.env` in the repository root:
```bash
cp .env.example .env
```

| Variable | Description | Default / Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection or SQLite fallback | `postgresql://tracemind:tracemind_password@localhost:5432/tracemind` or `sqlite:///./tracemind.db` |
| `HINDSIGHT_BASE_URL` | Hindsight server endpoint | `https://api.hindsight.vectorize.io` |
| `HINDSIGHT_API_KEY` | Vectorize / Hindsight API key | `your_hindsight_api_key_here` |
| `HINDSIGHT_BANK_ID` | Isolated memory bank identifier | `tracemind-production` |
| `GROQ_API_KEY` | Groq LLM API Key | `your_groq_api_key_here` |
| `GROQ_MODEL` | Primary LLM for incident analysis | `openai/gpt-oss-120b` |
| `GROQ_FALLBACK_MODEL`| Fallback LLM if primary is rate limited | `qwen/qwen3-32b` |
| `FRONTEND_ORIGIN` | React frontend allowed origin for CORS | `http://localhost:3000` |
| `HOST` | Backend bind host | `0.0.0.0` |
| `PORT` | Backend bind port | `8000` |

---

## 4. Setup & Running

### 4.1 Local Virtual Environment
```bash
python3 -m venv backend/venv
source backend/venv/bin/activate
pip install -r backend/requirements.txt
```

### 4.2 Database (PostgreSQL via Docker Compose)
If Docker is installed:
```bash
docker compose up -d postgres
```
If Docker is unavailable, the backend automatically uses `sqlite:///./tracemind.db`.

### 4.3 Running the Backend Server
```bash
source backend/venv/bin/activate
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive API docs are available at `http://localhost:8000/docs`.

---

## 5. Scripts

### 5.1 Real Hindsight Smoke Test
Executes a live test against the real Hindsight memory service:
1. Retains sample incident `INC-DEMO-001` (Payment API, Production; connection pool exhaustion).
2. Recalls with semantically altered query: *"Payment requests are failing because database connections remain unavailable. Have we seen a similar service issue, and what fixed it?"*
3. Prints the authentic memory response and metadata.

```bash
source backend/venv/bin/activate
python3 backend/scripts/hindsight_smoke_test.py
```

### 5.2 Seed Demo Data
Populates 30 realistic synthetic past incidents across 6 services with 3 recurring failure patterns:
```bash
source backend/venv/bin/activate
python3 backend/scripts/seed_demo_data.py
```

### 5.3 Run Tests
```bash
source backend/venv/bin/activate
pytest
```

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
curl -X GET http://localhost:8000/api/incidents/INC-DEMO-001
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
curl -X POST http://localhost:8000/api/incidents/INC-DEMO-026/resolve \
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

### 6.10 Get Analytics Summary
```bash
curl -X GET http://localhost:8000/api/analytics/summary
```
