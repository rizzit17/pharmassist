# PharmAssist Customer Complaint Management System — Implementation Walkthrough

The **PharmAssist Customer Complaint Management System** is a complete, enterprise-grade AI-powered QMS module tailored for pharmaceutical API (Active Pharmaceutical Ingredient) and FDF (Finished Dosage Form) manufacturers.

---

## 🌟 What Was Built

### 1. Backend Architecture (FastAPI + Async SQLAlchemy + PostgreSQL)
- **Database Models & Alembic Migrations**: `User`, `Complaint`, `AIAnalysis`, `ChatHistory`, `AuditLog`, `DuplicateFlag`.
- **Repository Pattern**: `ComplaintRepository`, `ChatRepository`, `AuditRepository`, `UserRepository` using async SQLAlchemy 2.x.
- **Service Layer**: `CopilotService`, `ComplaintService`, `AuthService`, `DashboardService`.
- **FastAPI Endpoints**:
  - `/api/v1/auth`: JWT Login & Demo bypass (`/demo`).
  - `/api/v1/complaints`: Full CRUD, paginated filtering, audit trail lookup.
  - `/api/v1/copilot`: `/chat`, `/upload` (PDF/email/image), `/summary`, session history.
  - `/api/v1/dashboard`: Real-time KPIs, severity donut chart, monthly trend metrics.
  - `/api/v1/health`: System health & DB check.
- **Database Seeder**: `seed.py` pre-populates 15 realistic QMS complaints across API/FDF categories and a demo user.

### 2. LangGraph AI Orchestration Layer (10-Node StateGraph)
- **Resilient LLM Client**: Centralized Groq client (`gemma2-9b-it` for fast extraction, `llama-3.3-70b-versatile` for deep risk analysis) powered by `tenacity` retries.
- **10 Nodes**:
  1. `intent_detection`: Classifies user input into `NEW_COMPLAINT`, `EDIT_COMPLAINT`, `DOCUMENT_UPLOAD`, `GENERAL_QUERY`, or `AMBIGUOUS`.
  2. `input_type_detection`: Routes document uploads to PDF (`pdfplumber`/`pypdf`), Email, or Image OCR parsers.
  3. `complaint_extraction`: Extracts structured QMS fields with JSON schema validation & self-retry logic.
  4. `complaint_update`: Handles diff-based partial updates and flags material field edits for risk re-analysis.
  5. `completeness_validation`: Validates mandatory QMS fields and date sequencing.
  6. `duplicate_detection`: 2-stage duplicate detection (SQL batch window pre-filter + LLM similarity judgment).
  7. `risk_analysis`: Evaluates severity (`Critical`, `Major`, `Minor`), regulatory reportability (MHRA/USFDA), and suggested actions.
  8. `recommendation`: Generates root cause suggestions and 3-step CAPA actions.
  9. `summary_generation`: Synthesizes formal QMS defect narratives.
  10. `response_formatter`: Constructs uniform `CopilotResponseEnvelope`.
- **Memory Checkpointer**: Persistent per-session memory state using `MemorySaver`.

### 3. Frontend Application (React 18 + Redux Toolkit + Tailwind CSS + Framer Motion)
- **Monorepo Structure**: Vite + React 18 + TypeScript with `@/*` path alias.
- **Redux State Management**:
  - `complaintSlice`: AI response handling, draft updates, field highlight tracking, commit flow.
  - `chatSlice`: Messages thread, file upload progress, typing indicator state.
  - `authSlice`: JWT credentials & demo user session persistence.
  - `themeSlice`: Dark/Light theme toggle with Tokyo Night palette support.
- **Primary Two-Pane Interface (`/complaints/new`)**:
  - **Left Pane**: Form with live AI field population, green highlight animations (`useHighlightOnChange`), status pill state, and AI Risk Assessment Card.
  - **Right Pane**: Interactive chat panel with file drop zone, progress bars, and streaming message bubbles.
- **Full Page Suite**:
  - `/dashboard`: KPI cards, Recharts visualizations (Pie & Bar), recent complaints table.
  - `/complaints`: Searchable, filterable, paginated complaints ledger.
  - `/complaints/:id`: Detail view with full field breakdown, executive summary generator, and audit trail timeline.
  - `/copilot`: Full-screen AI chat assistant.
  - `/history`: LangGraph checkpointer session log viewer.
  - `/settings`: Model routing setup & theme settings.

---

## 🧪 Verification & Build Status

1. **Frontend Production Build**:
   ```powershell
   cd frontend
   npm run build
   # Output: Built in 1.81s with 0 errors!
   ```

2. **Backend Code Quality**:
   - All modules validated without syntax or runtime import errors.
   - Pydantic v2 schemas and SQLAlchemy async models fully aligned.

---

## 🚀 How to Run locally

### Backend
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload --port 8000
```

### Frontend
```powershell
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` and click **"Continue as Demo User"** to experience the PharmAssist QMS Copilot!
