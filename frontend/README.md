# TraceMind Frontend Console

> **Tagline**: *"Every incident teaches. Every resolution makes us smarter."*

TraceMind is an autonomous AI incident-response intelligence platform that pairs **Groq LLM reasoning** with **Hindsight persistent institutional memory** to prevent repetitive downtime and accelerate recovery.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v20+ (tested on Node v24.15.0)
- **npm**: v10+ (tested on npm 11.12.1)

### 2. Installation
```bash
cd frontend
npm install
```

### 3. Environment Configuration
Create a `.env` file in `frontend/` (see `.env.example`):
```env
# URL of the running FastAPI backend
VITE_API_BASE_URL=http://localhost:8000/api

# DEV-ONLY mock adapter (true to simulate contract responses when backend is offline)
# MUST BE false for the real live demo!
VITE_USE_MOCKS=false
```

### 4. Running Locally
```bash
# Start Vite development server
npm run dev

# Run Oxlint validation
npm run lint

# Compile and verify production build
npm run build

# Preview production build locally
npm run preview
```

---

## 🛠️ Stack & Architecture

- **Framework**: React 19 + TypeScript + Vite 8
- **Styling**: Tailwind CSS v4 ("Ops Console" dark slate theme, Teal/Violet accents, Severity colors: Critical red, High orange, Medium amber, Low blue)
- **Routing**: React Router 7 (`react-router-dom`)
- **API Client**: Axios with typed endpoints adhering strictly to `docs/API_CONTRACT.md`
- **Charts**: Recharts (Mean-Time-To-Resolution comparison, Severity breakdown, Microservice hotspots)
- **Icons**: Lucide React
- **Notifications**: Custom non-blocking ops toast system with error unboxing

### Directory Layout
```
frontend/src/
├── api/
│   ├── client.ts         # Central Axios client + DEV-ONLY mock adapter (behind VITE_USE_MOCKS)
│   ├── index.ts          # Strictly typed endpoint wrappers (GET /health, POST /analyze, etc.)
│   └── mockData.ts       # Realistic seed data mirroring backend seeder
├── components/
│   ├── common/           # Logo, StatusChip, Badge, Modal, Skeleton, EmptyState, ErrorBanner
│   ├── incident/         # ResolveModal, FeedbackModal
│   └── layout/           # AppShell, Sidebar, TopBar
├── context/              # Toast notification context & hooks
├── pages/
│   ├── LandingPage.tsx        # Hero "/" (Problem, 3 pillars: Retain/Recall/Reflect, Demo guide)
│   ├── DashboardPage.tsx      # Overview (Stat cards, MTTR impact card, Recent incidents, Severity pie)
│   ├── IncidentsListPage.tsx  # Searchable & filterable incident registry with status/severity pills
│   ├── CreateIncidentPage.tsx # Anomaly declaration form with monospace log view & demo autofill
│   ├── IncidentDetailPage.tsx # Hero triage page (Side-by-side compare, memory recall, guardrails)
│   ├── MemoryExplorerPage.tsx # Hindsight semantic recall bank inspector with chips
│   ├── AnalyticsPage.tsx      # Real MTTR acceleration metrics & charts
│   └── NotFoundPage.tsx       # 404 handler
└── types/
    └── index.ts          # TypeScript interfaces mapping 1:1 to docs/API_CONTRACT.md
```

---

## 📋 2-Minute Demo Flow for Evaluators & Judges

1. **Dashboard (`/dashboard`)**:
   - Check the live top-bar **Hindsight Memory** health chip (polled from `GET /api/health`).
   - Review the **Memory Impact Card** showing **70.2% MTTR acceleration** (18.5 min with memory vs 62.0 min without).
2. **Hero Incident Triage (`/incidents/INC-001`)**:
   - Inspect raw logs for connection pool exhaustion.
   - Click **Side-by-Side Compare Mode**:
     - *Left (Zero-Shot)*: Generic advice with low confidence.
     - *Right (With Hindsight Memory)*: Pinpoints leaked session context from past incident `INC-DEMO-001` with high confidence.
   - Review guardrail notice: *"Human approval required before any change."*
   - Click **Accept** on the recommendation.
3. **Verified Resolution (`Resolve & Retain in Memory`)**:
   - Open resolution modal, autofill post-mortem, and click **Resolve & Retain in Memory**.
   - Confirmation verifies indexation into Hindsight (`retained_in_hindsight: true`).
4. **Hindsight Memory Explorer (`/memory`)**:
   - Search for `"database connection pool leak"` to inspect recalled memory cards and past incident links.
5. **Analytics Telemetry (`/analytics`)**:
   - Inspect Recharts MTTR horizontal bar comparison, severity breakdown, and microservice hotspots.

---

## 🔒 Guardrails & Principles

- **Human-in-the-Loop**: TraceMind never executes remediation actions automatically. Every recommendation has clear confidence badges and requires engineer acceptance or modification.
- **Contract Strictness**: Frontend models strictly conform to `docs/API_CONTRACT.md`.
- **Zero Fabrication**: When the backend database has zero records, charts render genuine empty states.
