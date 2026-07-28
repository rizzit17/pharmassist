# AIVOA CMS — Build Task Tracker

## Phase 1 — Monorepo Scaffold + Docker + Env Files
- [x] Root `.env.example` + `.gitignore` + `Makefile`
- [x] `docker-compose.yml` (postgres, backend, frontend, pgadmin)
- [x] Backend `Dockerfile` + `requirements.txt` / `pyproject.toml`
- [x] Frontend `Dockerfile` + `package.json` scaffold
- [x] Backend directory structure + `main.py` stub
- [x] Frontend Vite + React + TS + Tailwind scaffold

## Phase 2 — Database Models + Alembic + Seed
- [x] SQLAlchemy models: User, Complaint, AIAnalysis, ChatHistory, AuditLog, DuplicateFlag
- [x] `db/session.py`, `db/base.py`
- [x] Alembic init + initial migration
- [x] `seed.py` with 15-20 realistic complaints + demo user

## Phase 3 — Backend CRUD Endpoints (No AI)
- [x] `core/config.py` (Settings, model config, auth flag)
- [x] `core/security.py` (JWT, bcrypt)
- [x] `core/dependencies.py` (get_db, get_current_user)
- [x] Pydantic schemas: complaint, auth, dashboard, audit, copilot
- [x] Repositories: ComplaintRepository, ChatRepository, AuditRepository, UserRepository
- [x] Services: ComplaintService, AuthService, DashboardService
- [x] API routers: auth, complaints, dashboard, health
- [x] Verify via `/docs`

## Phase 4 — LangGraph State + Nodes + Prompts
- [x] `langgraph/state.py` — ComplaintGraphState TypedDict
- [x] `utils/llm_client.py` — shared Groq client with tenacity retry
- [x] `utils/pdf_parser.py`, `email_parser.py`, `image_ocr.py`, `file_handler.py`
- [x] Node: `intent_detection.py` + prompt
- [x] Node: `input_type_detection.py` + prompt
- [x] Node: `complaint_extraction.py` + prompt
- [x] Node: `complaint_update.py` + prompt (with requires_risk_rerun logic)
- [x] Node: `completeness_validation.py`
- [x] Node: `duplicate_detection.py` (two-stage SQL+LLM)
- [x] Node: `risk_analysis.py` + prompt
- [x] Node: `recommendation.py` + prompt
- [x] Node: `summary_generation.py` + prompt
- [x] Node: `response_formatter.py`
- [x] `langgraph/graph.py` — StateGraph + conditional edges + checkpointer
- [x] Unit tests for all nodes with mock LLM

## Phase 5 — Copilot API + Groq Integration
- [x] `services/copilot_service.py` — graph runner
- [x] `api/copilot.py` — /chat, /upload, /risk-assessment, /summary, /sessions/{id}/history
- [x] End-to-end curl test: text → structured JSON response
- [x] End-to-end test: PDF upload → extraction

## Phase 6 — Frontend Scaffold
- [x] Vite + React 18 + TypeScript + Tailwind CSS config
- [x] Inter font (Google Fonts)
- [x] Redux store + RTK Query base
- [x] `complaintSlice.ts` + `chatSlice.ts` + `authSlice.ts`
- [x] `lib/axiosClient.ts` with interceptors
- [x] `types/` TS interfaces
- [x] React Router config + AppShell layout (sidebar + topbar)
- [x] UI primitives: Button, Card, Badge, Input, Select, Skeleton, Toast, Modal

## Phase 7 — New Complaint Two-Pane Screen (Primary)
- [x] `ComplaintForm.tsx` — all sections per spec
- [x] `RiskAssessmentCard.tsx` — AI Copilot Risk Assessment card
- [x] `StatusPill.tsx` — Pending Triage / Ready to Commit / Committed
- [x] `ChatPanel.tsx` — scrollable message thread
- [x] `MessageBubble.tsx` — user/assistant bubbles
- [x] `FileUploadCard.tsx` — file attachment render
- [x] `ProgressIndicator.tsx` — extraction progress bar
- [x] `TypingIndicator.tsx` — processing state
- [x] `useHighlightOnChange` hook — green border/bg fade animation
- [x] `useAutoScroll` hook
- [x] Wire to live backend: chat + upload endpoints

## Phase 8 — Remaining Pages
- [x] `DashboardPage.tsx` — KPI cards + Recharts (pie, bar/line, bar)
- [x] `ComplaintsPage.tsx` — filterable/sortable table, pagination, search
- [x] `ComplaintDetailPage.tsx` — read-only detail + audit trail timeline
- [x] `CopilotPage.tsx` — standalone full-width copilot
- [x] `HistoryPage.tsx` — past sessions filterable by complaint
- [x] `SettingsPage.tsx` — dark mode toggle, model preference, API key status

## Phase 9 — Bonus Features
- [x] `CompletenessChecker.tsx` — chip near Commit button
- [x] `AuditTrailTimeline.tsx` — timeline on Details page
- [x] Duplicate warning in chat panel + link to potential duplicates
- [x] Root cause + CAPA on Details page and risk card
- [x] Complaint summary generator (Details page)
- [x] Confidence score indicators (field-level hover tooltip)
- [x] Field validation (date logic, quantity plausibility)

## Phase 10 — Polish
- [x] Framer Motion field highlight animations
- [x] Page transitions
- [x] Skeleton loaders on all fetching components
- [x] Empty states with helpful copy + icons
- [x] Error boundaries on ChatPanel + ComplaintForm
- [x] Toast notifications (commit success, validation errors, API failures)
- [x] Dark mode toggle (Tokyo Night palette)
- [x] Responsive: mobile tab/toggle switcher between Form and Copilot
- [x] Bottom nav bar on mobile

## Phase 11 — Sample Data, Tests, Docs
- [x] 5 sample complaint PDFs (fictional pharma)
- [x] 3 sample complaint emails (.eml / .txt)
- [x] Finalize `seed.py` (15-20 complaints, all fields, varied statuses)
- [x] Backend tests: pytest node logic + API endpoints
- [x] Frontend tests: vitest slice reducers + highlight behavior
- [x] `README.md` with architecture diagram, setup, env reference, LangGraph diagram
- [x] Final `docker compose up` smoke test
