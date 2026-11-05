# TraceMind API Contract (v1)

> **Binding Contract Notice**: This document defines the exact HTTP endpoints, request payloads, response schemas, and error envelopes between the TraceMind Backend and React Frontend. Response shapes must not change without mutual agreement.

---

## 1. Global Standards & Conventions

### 1.1 Base URL
All API routes are served under prefix `/api`:
```
http://localhost:8000/api
```
Interactive OpenAPI documentation is available at `/docs` (JSON schema at `/openapi.json`).

### 1.2 Error Format
All errors (4xx and 5xx) adhere strictly to the following envelope:
```json
{
  "error": {
    "code": "INCIDENT_NOT_FOUND",
    "message": "Incident INC-042 was not found",
    "details": null
  }
}
```

### 1.3 Identification & Enums
- **Incident IDs**: Sequentially formatted with prefix `INC-` (e.g., `INC-001`, `INC-002`, `INC-DEMO-001`).
- **Severity**: `"critical"`, `"high"`, `"medium"`, `"low"`
- **Environment**: `"production"`, `"staging"`, `"development"`
- **Status**: `"open"`, `"investigating"`, `"mitigated"`, `"resolved"`
- **Feedback Type**: `"accept"`, `"reject"`, `"modify"`

---

## 2. Endpoints Specification

### 2.1 System Health
`GET /api/health`

Reports the health of the core service and its external dependencies (PostgreSQL / SQLite, Groq, Hindsight).

**Response (200 OK / 503 Service Unavailable):**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "services": {
    "database": {
      "status": "healthy",
      "engine": "postgresql",
      "message": "Connected successfully"
    },
    "groq": {
      "status": "healthy",
      "model": "openai/gpt-oss-120b",
      "message": "Configured and available"
    },
    "hindsight": {
      "status": "healthy",
      "bank_id": "tracemind-production",
      "message": "Connected to Hindsight engine"
    }
  }
}
```

---

### 2.2 Incidents Management

#### `POST /api/incidents`
Creates a new incident. Automatically generates sequential ID (`INC-001`, etc.).

**Request Body:**
```json
{
  "title": "Payment API connection pool exhaustion",
  "service": "payment-api",
  "environment": "production",
  "severity": "critical",
  "symptoms": "High p99 latency and 504 Gateway Timeouts during checkout",
  "error_logs": "ERROR: pool exhausted, connection acquisition timeout 5000ms"
}
```

**Response (201 Created):**
```json
{
  "id": "INC-001",
  "title": "Payment API connection pool exhaustion",
  "service": "payment-api",
  "environment": "production",
  "severity": "critical",
  "status": "open",
  "symptoms": "High p99 latency and 504 Gateway Timeouts during checkout",
  "error_logs": "ERROR: pool exhausted, connection acquisition timeout 5000ms",
  "created_at": "2026-11-06T01:30:00Z",
  "updated_at": "2026-11-06T01:30:00Z",
  "resolved_at": null,
  "is_demo": false
}
```

---

#### `GET /api/incidents`
Lists all incidents with optional filtering.

**Query Parameters:**
- `status` (optional): `"open"`, `"investigating"`, `"mitigated"`, `"resolved"`
- `severity` (optional): `"critical"`, `"high"`, `"medium"`, `"low"`
- `service` (optional): string filter
- `is_demo` (optional): boolean
- `limit` (default: 50, max: 200)
- `offset` (default: 0)

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": "INC-001",
      "title": "Payment API connection pool exhaustion",
      "service": "payment-api",
      "environment": "production",
      "severity": "critical",
      "status": "open",
      "symptoms": "High p99 latency and 504 Gateway Timeouts during checkout",
      "error_logs": "ERROR: pool exhausted, connection acquisition timeout 5000ms",
      "created_at": "2026-11-06T01:30:00Z",
      "updated_at": "2026-11-06T01:30:00Z",
      "resolved_at": null,
      "is_demo": false
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

---

#### `GET /api/incidents/{id}`
Retrieves detailed information for a specific incident, including prior AI analyses, resolution details (if resolved), and user feedback.

**Response (200 OK):**
```json
{
  "id": "INC-001",
  "title": "Payment API connection pool exhaustion",
  "service": "payment-api",
  "environment": "production",
  "severity": "critical",
  "status": "open",
  "symptoms": "High p99 latency and 504 Gateway Timeouts during checkout",
  "error_logs": "ERROR: pool exhausted, connection acquisition timeout 5000ms",
  "created_at": "2026-11-06T01:30:00Z",
  "updated_at": "2026-11-06T01:30:00Z",
  "resolved_at": null,
  "is_demo": false,
  "analyses": [],
  "resolution": null,
  "feedback": []
}
```

---

### 2.3 AI Incident Analysis (Core Demo: With/Without Memory)

#### `POST /api/incidents/{id}/analyze`
Analyzes an incident using Groq AI. If `use_memory=true`, queries Hindsight memory first and supplies recalled past incident lessons to Groq; if `false`, queries Groq in zero-shot isolation.

**Request Body:**
```json
{
  "use_memory": true
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "incident_id": "INC-001",
  "use_memory": true,
  "model_used": "openai/gpt-oss-120b",
  "latency_ms": 1240,
  "hypotheses": [
    {
      "description": "Database connection pool leak in connection lifecycle management",
      "confidence": "high",
      "rationale": "Matches prior incident INC-DEMO-001 where unhandled exceptions failed to release connections back to the pool."
    }
  ],
  "investigation_steps": [
    "Check connection pool active vs idle metrics in HikariCP / SQLAlchemy.",
    "Verify whether recent PR #391 introduced unhandled exceptions in the checkout transaction handler."
  ],
  "recommendation": "Deploy hotfix restoring context manager cleanup and increase pool reserve size from 10 to 30.",
  "uncertainty_note": "AI hypothesis based on pattern recognition; verify live connection leaks in APM prior to production restart.",
  "recalled_memories": [
    {
      "id": "mem_01hqxyz",
      "text": "Incident INC-DEMO-001: Payment API connection pool exhaustion resolved by fixing unclosed session contexts in payment_gateway.py",
      "type": "experience",
      "metadata": {
        "service": "payment-api",
        "incident_id": "INC-DEMO-001"
      }
    }
  ],
  "created_at": "2026-11-06T01:32:00Z"
}
```

---

### 2.4 Incident Resolution & Hindsight Retain

#### `POST /api/incidents/{id}/resolve`
Records the confirmed root cause and resolution in the database, marks the incident as `resolved`, and retains the memory into Hindsight for future institutional learning.

**Request Body:**
```json
{
  "confirmed_cause": "Unhandled DB transaction rollback bypassed connection release in payment_gateway.py",
  "steps_taken": [
    "Identified unclosed session context in checkout route",
    "Wrapped database query inside try...finally cleanup",
    "Redeployed payment-api v2.4.1"
  ],
  "verified_resolution": "Fixed connection lifecycle with explicit context managers and bumped pool timeout to 10s.",
  "failed_attempts": [
    "Restarted service instances (pool exhausted again within 4 minutes)"
  ],
  "outcome": "Connection count stabilized under 15; checkout latency returned to 45ms."
}
```

**Response (200 OK):**
```json
{
  "incident_id": "INC-001",
  "status": "resolved",
  "resolved_at": "2026-11-06T01:45:00Z",
  "resolution": {
    "id": 1,
    "incident_id": "INC-001",
    "confirmed_cause": "Unhandled DB transaction rollback bypassed connection release in payment_gateway.py",
    "steps_taken": [
      "Identified unclosed session context in checkout route",
      "Wrapped database query inside try...finally cleanup",
      "Redeployed payment-api v2.4.1"
    ],
    "verified_resolution": "Fixed connection lifecycle with explicit context managers and bumped pool timeout to 10s.",
    "failed_attempts": [
      "Restarted service instances (pool exhausted again within 4 minutes)"
    ],
    "outcome": "Connection count stabilized under 15; checkout latency returned to 45ms.",
    "created_at": "2026-11-06T01:45:00Z"
  },
  "retained_in_hindsight": true,
  "hindsight_status": "retained",
  "error": null
}
```

---

### 2.5 Feedback on Recommendations

#### `POST /api/incidents/{id}/feedback`
Stores engineer feedback on AI analysis recommendations (e.g., whether the suggestion was accepted, modified, or rejected). **Never executes remediation actions automatically.**

**Request Body:**
```json
{
  "analysis_id": 1,
  "feedback_type": "accept",
  "notes": "Spot on. The suggested investigation step pointed right to the leak.",
  "modified_recommendation": null
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "incident_id": "INC-001",
  "analysis_id": 1,
  "feedback_type": "accept",
  "notes": "Spot on. The suggested investigation step pointed right to the leak.",
  "modified_recommendation": null,
  "created_at": "2026-11-06T01:46:00Z"
}
```

---

### 2.6 Memory Explorer (Hindsight Recall Passthrough)

#### `POST /api/memory/recall`
Direct passthrough to Hindsight `recall()` API for the frontend Memory Explorer.

**Request Body:**
```json
{
  "query": "database connection pool leak in payment service",
  "types": ["experience", "world", "observation"],
  "budget": "mid"
}
```

**Response (200 OK):**
```json
{
  "query": "database connection pool leak in payment service",
  "results": [
    {
      "id": "mem_01hqxyz",
      "text": "Incident INC-DEMO-001: Payment API connection pool exhausted caused by unclosed session context.",
      "type": "experience",
      "entities": ["payment-api", "database"],
      "metadata": {
        "service": "payment-api",
        "incident_id": "INC-DEMO-001"
      }
    }
  ],
  "total": 1
}
```

---

### 2.7 Analytics Summary

#### `GET /api/analytics/summary`
Calculates real metrics derived from actual database records. If the database has zero records, returns zeroes without fabrication.

**Response (200 OK):**
```json
{
  "total_incidents": 30,
  "open_incidents": 4,
  "resolved_incidents": 26,
  "memory_impact": {
    "avg_minutes_to_resolve_with_memory": 18.5,
    "avg_minutes_to_resolve_without_memory": 62.0,
    "time_saved_percentage": 70.16,
    "recall_hit_rate": 0.88,
    "feedback_accept_rate": 0.92
  },
  "severity_breakdown": {
    "critical": 8,
    "high": 12,
    "medium": 7,
    "low": 3
  },
  "service_breakdown": {
    "payment-api": 9,
    "auth-service": 6,
    "orders-db": 5,
    "redis-cache": 4,
    "kafka-consumer": 4,
    "k8s-ingress": 2
  }
}
```

