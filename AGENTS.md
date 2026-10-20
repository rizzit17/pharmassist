# PharmAssist — agent operating guide

## Purpose
PharmAssist is an enterprise pharmaceutical complaint-management and regulatory intelligence system designed for QA officers and managers at API and finished-dosage manufacturers. A React client lets users turn text and documents into a structured complaint draft, review preliminary AI risk/CAPA suggestions, commit records, and inspect complaint analytics and change history. FastAPI orchestrates an asynchronous LangGraph workflow and SQLAlchemy persistence. Describe it as clinical decision support.

## Stack and versions
- Python **3.11.9** in `backend/.python-version` and `backend/PYTHON_VERSION`; Docker/CI use Python 3.11.
- Backend requirement lower bounds: FastAPI 0.115.0, Uvicorn 0.32.0, Pydantic 2.10.0, pydantic-settings 2.7.0, SQLAlchemy 2.0.0, aiosqlite 0.20.0, asyncpg 0.30.0, Alembic 1.14.0, LangGraph 0.2.0, langchain-groq 0.2.0, langchain-core/community 0.3.0, tenacity 9.0.0 (`backend/requirements.txt`). No Python lockfile.
- JWT: python-jose >=3.3.0; native bcrypt >=4.0.0. Parsing: pdfplumber >=0.11.0, pypdf >=5.0.0, Pillow >=10.0.0. OCR additionally needs unlisted `pytesseract` and the Tesseract executable.
- Frontend lockfile resolves React **19.2.8**, Vite **8.1.5**, TypeScript **6.0.3**, Redux Toolkit **2.12.0**, React Router **7.18.1**, Axios **1.18.1**, Recharts **3.10.1**, Tailwind **3.4.19**. Manifest permits ranges; prefer `npm ci` (`frontend/package*.json`). README's React 18 is stale.
- Node 20 is CI's configured major; use a patch satisfying the lockfile's engine constraints. Node **22.22.2** was available during review; Node 18 README guidance is stale for this Vite tree.
- DB defaults to local SQLite; Compose selects PostgreSQL **15-alpine**. No Redis, broker, vector DB, or background worker exists.

## Install and run
Use two terminals. Commands below assume repository root initially; no activation is required:
```powershell
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
$env:DATABASE_URL = 'sqlite+aiosqlite:///./pharmassist.db'
$env:JWT_SECRET = '<set-a-local-secret>'
# Optional: $env:GROQ_API_KEY = '<your-key>'
.\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```
```powershell
cd frontend
npm ci
npm run dev
```
- Open frontend `http://localhost:5174`; API docs `http://localhost:8000/docs`. Vite proxies `/api` to `127.0.0.1:8000` (`frontend/vite.config.ts`).
- Settings read `.env` from the backend working directory. The template is **root** `.env.example`, not `backend/.env.example`. If copying it, change the Docker hostname `postgres` to `localhost` for host PostgreSQL, or retain the SQLite URL above. Never commit `.env`.
- Lifespan creates tables and attempts `seed()`; empty databases receive two demo accounts and **15** complaint fixtures, not the seed docstring's 20. A user already present causes seed to skip (`backend/app/main.py`, `backend/seed.py`).
- With no Groq key, extraction has heuristic fallbacks; risk can return an unavailable/default assessment and edits can fail. This is not equivalent to a successful live AI run (`backend/app/langgraph/nodes/`).
- Optional PostgreSQL only: configure root `.env`, then `docker compose up -d postgres`. Full Compose is currently broken: missing frontend Dockerfile and missing Alembic configuration/migrations. Do not present `make dev` as verified.

## Build, test, verify
- Frontend: `cd frontend`, `npm run build` (TypeScript project check + Vite, output `dist/`), `npm run lint` (Oxlint), `npm run preview` (built-site preview). There is **no** `npm test` script or Vitest suite despite Makefile/docs claims.
- Backend: install `pytest pytest-asyncio` separately; from `backend/`, run `python -m pytest tests/ -q`. Seven tests exist across `test_api.py` and `test_nodes.py`; test dependencies are not in requirements.
- API tests use ASGITransport without application lifespan/database fixtures. Initialize an isolated test DB first or add proper fixtures before expecting clean-checkout success. Avoid pointing tests at real data.
- Node tests use stale `user_input`/`file_path` keys in two cases; current graph expects `user_message`/`uploaded_file_path`. LLM responses are not mocked. Passing these tests is not an extraction-quality evaluation.
- CI only runs frontend install/build and `import app.main`; it does not execute pytest or lint (`.github/workflows/ci.yml`). No Python package build is configured; backend Dockerfile is its packaging recipe.
- Review verification (2026-10-19): seven tests passed with Python 3.13, empty Groq key, and an initialized in-memory SQLite DB; frontend build passed on Node 22.22.2 after allowing Vite's child process. Oxlint exited zero with eight warnings; build warned about a ~900 kB JS chunk. This does not verify live Groq, PostgreSQL, Docker, or UI workflows.
- For changed behavior, add focused tests for graph routes, API validation, auth scope, or Redux envelope mapping. Mock `invoke_llm_with_retry` for deterministic unit tests; keep live-provider testing explicit.
- Manual smoke: login; submit text and PDF; inspect updated fields/completeness/risk; correct one field; commit; inspect detail/audit; search and paginate; switch theme; confirm missing-key/OCR failures remain visible.

## Module map
| Path | Responsibility |
|---|---|
| `backend/app/main.py` | Lifespan, CORS, model-header ContextVars, exception handler, `/api/v1` router mounting |
| `backend/app/core/` | Cached Pydantic settings, JWT/bcrypt, DB/auth dependencies, logging |
| `backend/app/api/` | Auth, complaints CRUD/audit, copilot chat/upload/risk/summary/history, dashboard, health |
| `backend/app/services/` | Complaint/audit orchestration, auth, graph execution/chat persistence, dashboard aggregates |
| `backend/app/repositories/` | Complaint queries/number allocation/duplicate candidate search, chat, user, audit persistence |
| `backend/app/models/`, `schemas/`, `db/` | Six ORM entities, Pydantic contracts, async engine/session/create_all |
| `backend/app/langgraph/state.py`, `graph.py` | TypedDict state and ten-node conditional workflow |
| `backend/app/langgraph/nodes/` | Intent/input parsing, extraction/update, completeness, duplicates, risk, CAPA, summary, formatting |
| `backend/app/utils/` | Shared Groq/retry client, upload validation/cleanup, PDF/email/image parsing |
| `backend/seed.py`, `tests/`, `generate_sample_pdfs.py` | Demo fixtures, seven lightweight checks, sample-document generator |
| `frontend/src/app/`, `features/` | Typed Redux hooks/store; complaint, chat, auth, theme slices |
| `frontend/src/lib/` | Axios origin/token/model headers; API wrappers; display formatters and `cn` helper |
| `frontend/src/pages/`, `routes/` | Eight content/login page types plus splash, protected routes, responsive shell |
| `frontend/src/hooks/`, `components/ui/`, `types/` | Upload/scroll/highlight hooks, shared Button, API-facing interfaces |
| `frontend/tailwind.config.js`, `src/index.css` | Design tokens, shared surfaces, theme styles |
| `docs/`, root architecture/context/design/implementation notes | Intent and walkthroughs; verify against code before relying on completion claims |
| `sample_complaints/`, root PDFs/assets, `generate_submission_pdf.py` | Demo inputs, reference/submission materials, reportlab submission generator |

## Conventions and invariants
- Backend: four-space Python indentation, `snake_case` modules/functions/JSON fields, PascalCase classes, typed async functions, SQLAlchemy 2 `Mapped` models, UUID strings, UTC timestamps.
- Intended layering is router → service → repository; graph nodes return partial state dicts. Existing exceptions: explicit risk route calls nodes directly; dashboard service performs aggregate SQL.
- Put provider calls through `backend/app/utils/llm_client.py`; prompts currently live as uppercase strings in node modules. Keep error/clarification envelope behavior and preliminary-QA-review language.
- Preserve complaint field names across ORM, Pydantic, graph TypedDicts, TypeScript types, and Redux. Graph keys and response snake_case are intentional.
- Frontend: two-space indentation, single quotes, generally no semicolons, PascalCase component/page filenames, camelCase functions/Redux actions, `@/` imports. Functional components/hooks predominate; ErrorBoundary is a class.
- Apply AI results through `complaintSlice.applyAIResponse`; retain `updated_fields` and confidence/risk/completeness objects. The slice also exposes `manualFieldUpdate`; do not assume AI is the only possible writer.
- Keep red/amber/green severity semantics and shared Button/formatters; styles use Tailwind + CSS tokens. TypeScript allows implicit `any` and unused declarations; no enforced Python formatter exists.

## Known gaps / debt to prioritize
1. **Graph continuity:** `build_graph()` creates a fresh MemorySaver per request. Persisted chat + client draft supply continuity; checkpoints do not survive turns/restarts. Previous risk is not loaded into edit state, so non-material-edit recommendations can lack risk.
2. **Missing enforcement:** API accepts nullable complaint fields/status strings and does not enforce completeness, QA approval, or workflow transitions. Frontend commit gating is not a server invariant (`schemas/complaint.py`, `api/complaints.py`).
3. **Audit limits:** complaint deletion cascades audit/analysis records; audit writes and record writes commit separately. No tamper-evidence, signatures, or retention controls support immutable/Part 11 compliance claims (`models/complaint.py`, `repositories/audit_repository.py`).
4. **Access scope:** bearer auth exists, but role/record/session ownership checks do not. Demo login/account provisioning and default JWT secret are demo facilities, not production access control (`core/`, `services/auth_service.py`).
5. **CORS/settings drift:** main allows all origins regardless of configured list; template `CORS_ALLOWED_ORIGINS` does not match `cors_allowed_origins_str`. Remote frontend defaults to a hardcoded Render service; set an explicit API base URL for your environment.
6. **Model UI drift:** Settings Save only toggles a banner; model/OCR selections stay local component state and do not populate the localStorage keys read by Axios. Model names in README/settings differ from client defaults.
7. **Fallback provenance:** extraction fills inferred customer/site/material/source values and assigns fixed confidence constants. Confidence is not calibrated; unavailable duplicate checks return no warning. Do not equate fallback success with verified extraction.
8. **Envelope loss:** completeness node emits `validation_errors`, but response schema drops it. Detected AMBIGUOUS intent routes to formatter without setting clarification status; GENERAL_QUERY does not query records.
9. **Persistence gaps:** duplicate_flags model exists but commit path does not save warnings; UI commits send risk only, omitting CAPA/confidence/model provenance/session linkage. No explicit commit endpoint invokes the service's commit helper.
10. **Dashboard counts:** severity counts analysis rows, potentially multiple per complaint; resolution average is null, monthly severity splits zero. History page shows current Redux session only, not archived DB sessions.
11. **Concurrency/scale:** complaint numbering scans existing yearly IDs without a lock; concurrent creates can conflict. Uploads read whole files before size checks; parsers block inside async paths; no queue/rate limiter/response cache exists.
12. **Infrastructure/test debt:** no migrations/frontend Dockerfile/frontend tests; incomplete backend fixtures, broad dependency bounds, limited CI; optional OCR wrapper missing. Build has a large JS chunk and lint has unused-import/hook-dependency warnings. Planned/checkmarked docs are not proof of implementation.

## Evidence policy
Reviewed baseline: `37a8ab309ed5d18198255560d877c8a133f5d1ba`. Cite repository paths for claims. Mark uncertain behavior **UNVERIFIED**, missing measurements **unknown**; never turn seed data or confidence constants into accuracy/impact metrics. Prefer current code over historic plans and commit subjects. See `docs/PROJECT_CONTEXT.md` for the portfolio summary and validation boundary.
