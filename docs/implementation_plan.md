# AIVOA Customer Complaint Management System — Implementation Plan

## Overview

A full-stack, enterprise-grade SaaS application — the **AIVOA Customer Complaint Management System** — an AI-powered QMS module for pharmaceutical API/FDF manufacturers. The centerpiece is an AI Copilot (LangGraph multi-node stateful graph) that lets quality personnel log, edit, and extract customer complaints using natural language and document uploads.

**Target Directory:** `c:\Users\Rishit\Desktop\pharmassist\`

---

## Key Design Decisions

> [!IMPORTANT]
> **PostgreSQL** will be used (not MySQL). Docker Compose will wire Postgres 15, FastAPI, and React/Vite together for a one-command `docker compose up` dev experience.

> [!IMPORTANT]
> **LangGraph will be a genuine multi-node StateGraph** — 10 discrete nodes with conditional edges, per-session checkpointing (in-memory for dev), prompt templates externalized to `app/prompts/`.

> [!NOTE]
> Auth is lightweight — JWT with a seeded demo user + "Continue as Demo User" bypass. JWT secret from env var.

> [!NOTE]
> OCR for images uses `pytesseract` if available, with a clearly-labeled stub fallback. Full production-grade OCR is explicitly out of scope per the assignment.

---

## Binding Decisions from IMPLEMENTATION_NOTES.md

1. **AMBIGUOUS intent** → `response_formatter` with a clarifying question (`status: "needs_clarification"`), no field highlights. `GENERAL_QUERY` → `response_formatter` with a DB-answer reply.
2. **Conditional risk re-analysis** — `complaint_update` emits `requires_risk_rerun: bool`. Risk node only re-runs when `intent != EDIT_COMPLAINT OR requires_risk_rerun`. Material fields: `batch_lot_number`, `affected_quantity`, `manufacturing_date`, `expiry_date`, `complaint_category`, `complaint_description`, `impacted_npm`.
3. **Duplicate detection** — Two-stage: SQL pre-filter (product + batch prefix + 90-day window, top 5) → LLM similarity judgment only if ≥1 SQL candidate found. Surface warning only if `similarity_score >= 0.75`. Skip entirely on EDIT_COMPLAINT.
4. **Auth bypass** — `AUTH_REQUIRED` config flag (default `True`). When `False`, all endpoints resolve to demo user without bearer token — for Swagger/curl testing during demo recording only.
5. **OCR stub** — If pytesseract unavailable: `method="stub"`, `text=""`, response_formatter emits clarifying message asking user to paste text or upload PDF. Frontend shows `needs_clarification` state (not error toast).
6. **CORS/retry wiring** — `GROQ_TIMEOUT_SECONDS=20`, `GROQ_MAX_RETRIES=2` in config. Shared `utils/llm_client.py` with tenacity retry decorator used by ALL nodes. `response_formatter` always runs even on upstream error (conditional short-circuit edge). Error state returns graceful envelope, never bare 500.
7. **Extra state fields** — `requires_risk_rerun: bool`, `duplicate_candidates_raw: Optional[list]`, `ocr_method: Optional[str]` added to `ComplaintGraphState`.

---

## Proposed Changes

### Phase 1 — Monorepo Scaffold + Docker + Env Files

#### [NEW] `docker-compose.yml`
- Services: `postgres`, `backend`, `frontend`, `pgadmin` (optional)
- Backend depends on postgres with health check
- Frontend proxies `/api` to backend for dev

#### [NEW] `Makefile`
- `make dev` → docker compose up
- `make migrate` → alembic upgrade head
- `make seed` → python seed.py
- `make test-backend` / `make test-frontend`

#### [NEW] `.env.example` (root)
- GROQ_API_KEY, DATABASE_URL, JWT_SECRET, FRONTEND_URL, BACKEND_URL

---

### Phase 2 — Backend Core

#### [NEW] `backend/` directory structure
```
backend/
  app/
    api/
      complaints.py       # CRUD + audit trail endpoint
      copilot.py          # /chat, /upload, /risk-assessment, /summary
      dashboard.py        # /stats, /charts
      auth.py             # /login, /demo, /me
      health.py           # /health, /health/db, /health/llm
    schemas/
      complaint.py        # ComplaintCreate, ComplaintOut, ComplaintUpdate
      copilot.py          # CopilotChatRequest, CopilotResponseEnvelope
      auth.py             # LoginRequest, TokenOut, UserOut
      dashboard.py        # StatsOut, ChartDataOut
      audit.py            # AuditLogOut
    models/
      complaint.py        # Complaint ORM model
      ai_analysis.py      # AIAnalysis ORM model
      chat_history.py     # ChatHistory ORM model
      audit_log.py        # AuditLog ORM model
      user.py             # User ORM model
      duplicate_flag.py   # DuplicateFlag ORM model
    services/
      complaint_service.py
      copilot_service.py
      dashboard_service.py
      auth_service.py
    repositories/
      complaint_repository.py
      chat_repository.py
      audit_repository.py
      user_repository.py
    langgraph/
      state.py            # ComplaintGraphState (TypedDict/Pydantic)
      graph.py            # StateGraph definition + conditional edges
      nodes/
        intent_detection.py
        input_type_detection.py
        complaint_extraction.py
        complaint_update.py
        completeness_validation.py
        duplicate_detection.py
        risk_analysis.py
        recommendation.py
        summary_generation.py
        response_formatter.py
    prompts/
      intent_detection.py
      complaint_extraction.py
      complaint_update.py
      risk_analysis.py
      recommendation.py
      summary_generation.py
    utils/
      pdf_parser.py
      email_parser.py
      image_ocr.py
      field_validators.py
      file_handler.py
    core/
      config.py           # Settings (pydantic-settings), model selection per node
      security.py         # JWT encode/decode, bcrypt
      logging.py          # structured logging config
      dependencies.py     # FastAPI Depends: get_db, get_current_user
    db/
      session.py          # async SQLAlchemy engine + session factory
      base.py             # declarative base
      alembic/            # migrations
  tests/
    test_nodes.py         # unit tests for each LangGraph node
    test_complaints_api.py
    test_copilot_api.py
  main.py
  seed.py
  requirements.txt
  Dockerfile
  .env.example
```

#### Backend Key Libraries
- `fastapi`, `uvicorn[standard]`, `pydantic[email]`, `pydantic-settings`
- `sqlalchemy[asyncio]`, `asyncpg`, `alembic`
- `langchain-groq`, `langgraph`, `langchain-core`
- `pypdf`, `pdfplumber`, `python-multipart`
- `python-jose[cryptography]`, `passlib[bcrypt]`
- `tenacity` (retry with backoff)
- `pytest`, `pytest-asyncio`, `httpx` (testing)

---

### Phase 3 — LangGraph Multi-Node Graph

**State Object (`ComplaintGraphState`):**
```python
class ComplaintGraphState(TypedDict):
    session_id: str
    intent: str  # NEW_COMPLAINT | EDIT_COMPLAINT | DOCUMENT_UPLOAD | GENERAL_QUERY | AMBIGUOUS
    input_type: str  # text | pdf | email | image
    user_message: str
    chat_history: List[dict]
    uploaded_file_path: Optional[str]
    uploaded_file_name: Optional[str]
    # Complaint fields (all nullable)
    complaint: dict  # Full complaint object
    existing_complaint: Optional[dict]  # Current state for EDIT path
    updated_fields: List[str]
    confidence_scores: dict
    risk_assessment: Optional[dict]
    recommendations: Optional[dict]
    completeness: Optional[dict]
    duplicate_warning: Optional[dict]
    assistant_message: str
    status: str  # processing | success | needs_clarification | error
    error: Optional[str]
```

**Graph Nodes (10 nodes):**
1. `intent_detection` — classify intent using `gemma2-9b-it`
2. `input_type_detection` — detect text/pdf/email/image; parse if document
3. `complaint_extraction` — NEW_COMPLAINT/DOCUMENT_UPLOAD path; full structured extraction
4. `complaint_update` — EDIT_COMPLAINT path; diff-based partial update
5. `completeness_validation` — missing field detection + field format validation
6. `duplicate_detection` — semantic comparison against DB (new complaints only)
7. `risk_analysis` — severity + risk narrative + regulatory-reportability flag
8. `recommendation` — root cause categories + CAPA steps
9. `summary_generation` — formal QMS complaint description + executive summary
10. `response_formatter` — assemble final JSON envelope + human-readable chat message

**Conditional Edges:**
```python
graph.add_conditional_edges(
    "input_type_detection",
    route_by_intent,
    {
        "NEW_COMPLAINT": "complaint_extraction",
        "DOCUMENT_UPLOAD": "complaint_extraction",
        "EDIT_COMPLAINT": "complaint_update",
        "GENERAL_QUERY": "response_formatter",
        "AMBIGUOUS": "response_formatter",
    }
)
```

---

### Phase 4 — Frontend Architecture

#### [NEW] `frontend/` directory structure
```
frontend/
  src/
    app/
      store.ts            # Redux store configuration
      hooks.ts            # useAppDispatch, useAppSelector typed hooks
    features/
      complaints/
        complaintSlice.ts  # draft, updatedFields, statusPill
        complaintsApi.ts   # RTK Query: list/get/create/update/delete
        components/
          ComplaintForm.tsx
          ComplaintList.tsx
          ComplaintDetails.tsx
          RiskAssessmentCard.tsx
          StatusPill.tsx
          AuditTrailTimeline.tsx
          CompletenessChecker.tsx
      copilot/
        chatSlice.ts       # messages, sessionId, isProcessing, uploadProgress
        copilotApi.ts      # /copilot/chat, /copilot/upload
        components/
          ChatPanel.tsx
          MessageBubble.tsx
          FileUploadCard.tsx
          ProgressIndicator.tsx
          TypingIndicator.tsx
      dashboard/
        components/
          KPICard.tsx
          SeverityPieChart.tsx
          ComplaintsByMonthChart.tsx
          ComplaintsByCategoryChart.tsx
          RecentComplaintsTable.tsx
      auth/
        authSlice.ts
        components/
          LoginPage.tsx
    components/ui/
      Button.tsx
      Card.tsx
      Badge.tsx
      Input.tsx
      Select.tsx
      Skeleton.tsx
      Toast.tsx
      Modal.tsx
      Tooltip.tsx
    hooks/
      useDebounce.ts
      useAutoScroll.ts
      useFileUpload.ts
      useHighlightOnChange.ts
    routes/
      AppShell.tsx         # sidebar + topbar layout
      index.tsx            # React Router config
    pages/
      LoginPage.tsx
      DashboardPage.tsx
      ComplaintsPage.tsx
      ComplaintDetailPage.tsx
      NewComplaintPage.tsx  # THE PRIMARY TWO-PANE SCREEN
      CopilotPage.tsx
      HistoryPage.tsx
      SettingsPage.tsx
    lib/
      axiosClient.ts       # configured Axios instance + interceptors
      formatters.ts        # date, severity, status formatters
    types/
      complaint.ts         # mirrors ComplaintOut, ComplaintDraft
      copilot.ts           # CopilotResponseEnvelope, ChatMessage
      dashboard.ts         # StatsOut, ChartDataOut
      auth.ts              # User, TokenOut
    styles/
      index.css            # Tailwind directives + custom CSS vars
  vite.config.ts
  tailwind.config.ts
  tsconfig.json
  .env.example
  Dockerfile
  package.json
```

**Design System:**
- Color: Indigo/violet accent (`indigo-600` primary), `gray-50` backgrounds, Tokyo Night dark mode
- Typography: Inter (Google Fonts CDN)
- Animations: Framer Motion for field highlights, page transitions, modal entrances
- Charts: Recharts (donut/pie for severity, bar/line for monthly trends)
- Icons: Lucide React

**Key UX Behaviors:**
- `useHighlightOnChange` — watches `updatedFields` from Redux, applies green border/bg via Framer Motion, fades after 3s
- `useAutoScroll` — always scrolls chat to latest message
- Status pill: Pending Triage (amber) → Ready to Commit (green) → Committed (blue)
- Skeleton loaders on all data-fetching components
- Error boundaries around ChatPanel and ComplaintForm

---

### Phase 5 — Sample Data & Documents

#### [NEW] `backend/sample_data/`
- `complaint_01_discoloration.pdf` — Product defect, discoloration of API tablets
- `complaint_02_foreign_matter.pdf` — Foreign matter contamination in FDF capsules
- `complaint_03_packaging_failure.pdf` — Packaging seal failure in blister packs
- `complaint_04_short_fill.pdf` — Short-fill detected in vial batch
- `complaint_05_mislabeling.pdf` — Mislabeling incident on carton

#### [NEW] `backend/sample_data/emails/`
- `email_01_contamination.eml`
- `email_02_seal_failure.eml`
- `email_03_discoloration.eml`

#### [NEW] `backend/seed.py`
- Seeds 1 demo user (demo@aivoa.com / demo)
- Seeds 15–20 realistic historical complaints across varied severities/statuses/products
- Seeds `ai_analysis`, `audit_logs`, `chat_history` linked to seeded complaints

---

### Phase 6 — Infrastructure

#### [NEW] `docker-compose.yml`
```yaml
services:
  postgres:
    image: postgres:15
    environment: [POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD]
    healthcheck: pg_isready
    volumes: [pgdata:/var/lib/postgresql/data]
  
  backend:
    build: ./backend
    depends_on: [postgres]
    environment: [DATABASE_URL, GROQ_API_KEY, JWT_SECRET, ...]
    ports: ["8000:8000"]
    volumes: [./backend:/app] # dev hot-reload
  
  frontend:
    build: ./frontend
    depends_on: [backend]
    ports: ["5173:5173"]
    volumes: [./frontend:/app] # dev hot-reload
  
  pgadmin:  # optional
    image: dpage/pgadmin4
    ports: ["5050:80"]
```

#### [NEW] `Makefile`
```makefile
dev:         docker compose up
migrate:     docker compose exec backend alembic upgrade head
seed:        docker compose exec backend python seed.py
test-backend: docker compose exec backend pytest
test-frontend: docker compose exec frontend npm test
```

---

### Phase 7 — Testing

#### Backend Tests (`backend/tests/`)
- `test_nodes.py` — unit tests for each LangGraph node with mocked LLM responses
- `test_complaints_api.py` — integration tests for CRUD endpoints
- `test_copilot_api.py` — integration tests for /chat and /upload

#### Frontend Tests (`frontend/src/__tests__/`)
- `complaintSlice.test.ts` — reducer unit tests
- `highlightOnChange.test.tsx` — field highlight behavior
- `ComplaintForm.test.tsx` — component rendering and field population

---

### Phase 8 — Documentation

#### [NEW] `README.md` (root)
- Architecture overview with ASCII/Mermaid diagram
- Setup instructions (local + Docker)
- Environment variable reference
- LangGraph workflow diagram
- How to run migrations/seed
- How to run tests
- Assignment requirement mapping table

---

## Build Order (Execution Sequence)

| Step | Task | Milestone Verification |
|------|------|------------------------|
| 1 | Scaffold monorepo + Docker + env files | `docker compose up` brings up all services |
| 2 | DB models + Alembic migration + seed | DB boots, seeds via Docker |
| 3 | Backend CRUD endpoints (no AI) | Verify via `/docs` |
| 4 | LangGraph state model + nodes + prompts | Unit tests pass with mock LLM |
| 5 | Wire real Groq API + copilot endpoints | curl end-to-end: text → structured JSON |
| 6 | Frontend scaffold: routing, Redux, AppShell, Tailwind | App loads, routes work |
| 7 | New Complaint two-pane screen (primary screen) | Live backend integration |
| 8 | Dashboard, Complaint List, Details, History, Settings | All pages functional |
| 9 | Bonus features: audit trail, duplicates, completeness | Both backend + UI surfaces |
| 10 | Polish: animations, skeleton/empty/error states, dark mode | Visual polish pass |
| 11 | Sample PDFs/emails, seed data, tests, README | Final Docker smoke test |

---

## Verification Plan

### Automated Tests
```bash
make test-backend   # pytest: node logic + API endpoints
make test-frontend  # vitest: slice reducers + highlight behavior
```

### Manual Verification
1. `docker compose up` from clean checkout (given `GROQ_API_KEY` in `.env`)
2. Log in as demo user → navigate to `/complaints/new`
3. Type a complaint in the chat panel → form auto-populates
4. Send a correction → only corrected field updates (green highlight)
5. Upload a sample PDF → form re-populates from document
6. Click "Commit to QMS Ledger" → appears in list + dashboard

### Browser Smoke Test
- All 8 routes render without JS errors
- Recharts render on `/dashboard`
- Audit trail renders on `/complaints/:id`
- Dark mode toggle works

---

## Open Questions

> [!IMPORTANT]
> **GROQ_API_KEY**: The user must supply a valid Groq API key in `.env`. The system will not make real AI calls without it. A `.env.example` will be committed; the user must copy it to `.env` and fill in their key before `docker compose up`.

> [!NOTE]
> **Dark mode**: Implemented as a settings toggle (Tokyo Night palette). Default is light mode.

> [!NOTE]
> **File upload storage**: Files stored in `backend/uploads/` (outside web root, randomized filenames). In Docker, this is a volume mount. Production would use S3/GCS.

> [!NOTE]
> **LangGraph checkpointing**: In-memory for dev (MemorySaver). Postgres-backed checkpointer can be swapped in via config flag for production persistence.
