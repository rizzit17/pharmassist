# ARCHITECTURE.md — PharmAssist Customer Complaint Management System

## 1. High-Level System Diagram

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│           FRONTEND           │        │            BACKEND            │
│  React + TS + Vite           │        │  FastAPI (Python)             │
│                               │  HTTP  │                                │
│  ┌─────────────┐  ┌────────┐ │◄──────►│  ┌──────────┐   ┌───────────┐  │
│  │ Complaint    │  │ Copilot│ │ Axios  │  │ API      │──►│ Services  │  │
│  │ Form (Redux) │  │ Chat   │ │  JSON  │  │ Routers  │   │ (business │  │
│  └──────┬───────┘  └───┬────┘ │        │  └──────────┘   │  logic)   │  │
│         │              │      │        │                 └─────┬─────┘  │
│  Redux Toolkit Store   │      │        │                       │        │
│  (single source of     │      │        │              ┌────────▼──────┐ │
│   truth for draft)     │      │        │              │  Repositories  │ │
└─────────────────────────────┘        │              └────────┬──────┘ │
                                          │                       │        │
                                          │              ┌────────▼──────┐ │
                                          │              │  PostgreSQL    │ │
                                          │              └────────────────┘ │
                                          │                                │
                                          │  ┌──────────────────────────┐  │
                                          │  │      LangGraph Engine     │  │
                                          │  │  (StateGraph, checkpointed│  │
                                          │  │   per session/complaint)  │  │
                                          │  └─────────────┬────────────┘  │
                                          │                │                │
                                          │        ┌───────▼────────┐       │
                                          │        │   Groq API      │       │
                                          │        │ gemma2-9b-it /  │       │
                                          │        │ llama-3.3-70b   │       │
                                          │        └─────────────────┘       │
                                          └──────────────────────────────┘
```

## 2. End-to-End Data Flow (Golden Path)

```
User types/pastes text OR uploads file in Copilot panel
   → POST /api/v1/copilot/chat  or  POST /api/v1/copilot/upload
   → FastAPI router validates request (Pydantic) → CopilotService
   → CopilotService loads/creates LangGraph session state (checkpointed)
   → LangGraph run:
        Intent Detection → Input Type Detection
        → Complaint Extraction  |  Complaint Update   (conditional branch)
        → Completeness & Validation
        → Duplicate Detection (new complaints only)
        → Risk Analysis
        → Recommendation (root cause + CAPA)
        → Summary Generation
        → Response Formatter
   → Structured JSON envelope returned to FastAPI → HTTP response
   → Frontend Axios client receives response
   → Redux thunk dispatches: complaintDraftSlice.update(complaint, updatedFields)
                              chatSlice.appendMessage(assistant_message)
   → React form re-renders from Redux state (controlled inputs)
   → Fields present in `updated_fields` get the green highlight animation
   → Risk Assessment card and status pill re-render from the same payload
   → User reviews, optionally sends another correction (loop repeats)
   → User clicks "Commit to QMS Ledger"
   → POST /api/v1/complaints (or PATCH if draft already has an id)
   → ComplaintService persists complaint + ai_analysis + audit_logs rows
   → Status pill transitions to "Committed"; list/dashboard views reflect the new record
```

## 3. Frontend Architecture

**Pattern:** feature-folder architecture, Redux Toolkit as the single source of truth for the in-progress complaint and chat state; components are presentational and dispatch/select rather than holding local form state.

```
src/
  app/store.ts, hooks.ts
  features/
    complaints/
      complaintSlice.ts      # draft object, updatedFields[], status pill state
      complaintsApi.ts       # RTK Query endpoints: list/get/create/update/delete
      components/
        ComplaintForm.tsx
        ComplaintList.tsx
        ComplaintDetails.tsx
        RiskAssessmentCard.tsx
        StatusPill.tsx
    copilot/
      chatSlice.ts           # messages[], sessionId, isProcessing, uploadProgress
      copilotApi.ts          # /copilot/chat, /copilot/upload
      components/
        ChatPanel.tsx
        MessageBubble.tsx
        FileUploadCard.tsx
        ProgressIndicator.tsx
    dashboard/
    auth/
  components/ui/             # Button, Card, Badge, Input, Select, Skeleton, Toast, Modal
  hooks/                     # useDebounce, useAutoScroll, useFileUpload, useHighlightOnChange
  routes/                    # AppShell + React Router config
  lib/axiosClient.ts
  types/                     # TS interfaces mirroring backend Pydantic schemas
```

**State flow rule:** AI responses are the only writer to `complaintSlice`'s draft object. Form inputs are controlled components bound to Redux; any manual edit (if enabled) also dispatches through the same reducer path so the UI can never drift from committed state.

## 4. Backend Architecture (Layered)

```
backend/app/
  api/            # routers: complaints.py, copilot.py, dashboard.py, auth.py, health.py
  schemas/        # Pydantic: ComplaintCreate, ComplaintOut, CopilotChatRequest,
                  # CopilotResponseEnvelope, RiskAssessmentOut, AuditLogOut ...
  models/         # SQLAlchemy: Complaint, AIAnalysis, ChatHistory, AuditLog, User, DuplicateFlag
  services/       # ComplaintService, CopilotService, DashboardService
                  # (orchestrate repositories + langgraph runner; no ORM code here)
  repositories/   # ComplaintRepository, ChatRepository, AuditRepository
                  # (only layer that touches SQLAlchemy queries)
  langgraph/
    state.py       # ComplaintGraphState (Pydantic) threaded through all nodes
    graph.py        # StateGraph definition, conditional edges, checkpointer wiring
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
  prompts/         # one template file per node
  utils/           # pdf_parser.py, email_parser.py, image_ocr.py, field_validators.py
  core/            # config.py, security.py, logging.py, dependencies.py
  db/              # session.py, base.py, alembic/
  tests/
```

**Dependency direction:** `api → services → repositories → db` and `services → langgraph`. Routers never touch the ORM or the graph directly; this keeps the AI engine swappable and testable in isolation.

## 5. LangGraph Design

**State object (`ComplaintGraphState`):** session_id, current complaint fields (all nullable), chat_history, uploaded_file metadata, intent, updated_fields, confidence_scores, risk_assessment, recommendations, completeness, duplicate_warning, assistant_message, status.

**Graph topology:**

```
START
 → intent_detection            (NEW_COMPLAINT | EDIT_COMPLAINT | DOCUMENT_UPLOAD | GENERAL_QUERY | AMBIGUOUS)
 → input_type_detection         (text | pdf | email | image)
 → [conditional_edge on intent]
      NEW_COMPLAINT/DOCUMENT_UPLOAD → complaint_extraction
      EDIT_COMPLAINT                → complaint_update
 → completeness_validation
 → duplicate_detection           (skipped/no-op on edits)
 → risk_analysis                 (re-entered whenever a material field changed)
 → recommendation                (root cause + CAPA)
 → summary_generation
 → response_formatter
 → END
```

- Each node is a small, single-responsibility function with its own externalized prompt (`app/prompts/<node>.md` or `.py`), independently unit-testable with mocked LLM output.
- Conditional routing uses LangGraph's `add_conditional_edges`, not in-node if/else branching.
- State is checkpointed per `session_id` (in-memory for dev, Postgres-backed checkpointer for persistence) so multi-turn corrections don't require the frontend to resend full history.
- Model selection is per-node and configurable in `core/config.py`: lightweight classification nodes (intent/input-type) default to `gemma2-9b-it`; extraction and risk-analysis nodes may use `llama-3.3-70b-versatile` when enabled for extra reasoning headroom.
- Every node validates its own JSON output against its Pydantic schema and retries once with a corrective prompt on malformed output before failing gracefully.

## 6. API Contract Summary

Base path: `/api/v1`

| Endpoint | Method | Purpose |
|---|---|---|
| `/auth/login`, `/auth/demo`, `/auth/me` | POST/GET | optional auth |
| `/complaints` | GET, POST | list, create |
| `/complaints/{id}` | GET, PATCH, DELETE | detail, update, delete |
| `/complaints/{id}/audit-trail` | GET | timeline of changes |
| `/copilot/chat` | POST | drives Log/Edit tools |
| `/copilot/upload` | POST | drives Document Extraction tool |
| `/copilot/sessions/{session_id}/history` | GET | chat history |
| `/copilot/risk-assessment` | POST | explicit re-run |
| `/copilot/summary` | POST | executive summary |
| `/dashboard/stats`, `/dashboard/charts` | GET | KPI + chart data |
| `/health`, `/health/db`, `/health/llm` | GET | liveness/readiness |

**Response envelope** (all `/copilot/*` endpoints):

```json
{
  "session_id": "string",
  "intent": "NEW_COMPLAINT | EDIT_COMPLAINT | DOCUMENT_UPLOAD | GENERAL_QUERY",
  "complaint": { "...full current complaint object, nulls where unknown..." },
  "updated_fields": ["batch_lot_number", "affected_quantity"],
  "confidence_scores": { "batch_lot_number": 0.94 },
  "risk_assessment": {
    "severity": "Major",
    "suggested_next_action": "...",
    "initial_risk_assessment": "...",
    "regulatory_reportable": false
  },
  "recommendations": { "root_cause": [], "capa": [] },
  "completeness": { "is_complete": false, "missing_fields": [] },
  "duplicate_warning": { "found": false, "candidates": [] },
  "assistant_message": "Human-readable chat reply",
  "status": "processing | success | needs_clarification | error"
}
```

## 7. Database Schema (Entity-Relationship Summary)

```
users (optional)
  id PK, email, name, hashed_password, role, created_at

complaints
  id PK, complaint_number, source, customer_name, product_name, product_strength,
  batch_lot_number, affected_quantity, manufacturing_date, expiry_date,
  originating_site_block, impacted_npm, complaint_category, complaint_description,
  status (enum), created_by FK→users, created_at, updated_at

ai_analysis
  id PK, complaint_id FK→complaints, severity, suggested_next_action,
  initial_risk_assessment, regulatory_reportable, root_cause_suggestions (JSON),
  capa_suggestions (JSON), confidence_scores (JSON), model_used, created_at

chat_history
  id PK, session_id, complaint_id FK→complaints (nullable), role, message,
  attached_file_name (nullable), created_at

audit_logs
  id PK, complaint_id FK→complaints, actor (human|ai), field_name,
  old_value, new_value, action_type, created_at

duplicate_flags
  id PK, complaint_id FK→complaints, duplicate_of_complaint_id FK→complaints,
  similarity_score, created_at
```

Relationships: one complaint → many `ai_analysis` rows (if analyses are versioned across edits), one complaint → many `chat_history` and `audit_logs` rows. Indexes on `batch_lot_number`, `product_name`, `status`, `created_at` for list/dashboard query performance. Schema managed via Alembic migrations; `seed.py` populates ~15–20 realistic historical complaints for a populated demo.

## 8. Security & Resilience Notes

- Secrets via environment variables only (`GROQ_API_KEY`, `DATABASE_URL`, `JWT_SECRET`), `.env` git-ignored.
- CORS restricted to known frontend origin(s).
- SQLAlchemy parameterized queries throughout — no raw string interpolation.
- Prompt-injection mitigation: uploaded/extracted content is always treated as data inside the prompt, never as instructions; suspicious control phrases are stripped before re-use in later graph steps.
- File uploads: allow-listed MIME types (`.pdf`, `.eml`, `.txt`, `.png`, `.jpg`), size-limited, stored outside the web root with randomized filenames.
- Groq API calls wrapped with timeout + retry-with-backoff; graceful fallback assistant message on failure.
- Global FastAPI exception handlers producing consistent error envelopes; Axios interceptor maps these to toast notifications on the frontend.

## 9. Deployment

`docker-compose.yml` wires three services — `frontend`, `backend`, `postgres` — with a single `docker compose up` bringing up a fully seeded, working application, given a valid `GROQ_API_KEY` in `.env`.
