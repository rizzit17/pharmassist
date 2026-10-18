# PharmAssist — project context and portfolio evidence

## Scope and claim discipline
Repository: `rizzit17/pharmassist`; reviewed baseline `37a8ab309ed5d18198255560d877c8a133f5d1ba`. Citations are repository-relative paths plus symbols where useful. Code/configs, lockfile, tests, documentation, seed fixtures, bundled PDF text, and all 53 reachable commit subjects were inspected. Design documents describe intended behavior; this summary distinguishes current implementation from intent. Deployed availability and regulatory compliance are **UNVERIFIED**. Unmeasured outcomes are **unknown**.

## Problem, solution, and why it matters
QA staff at pharmaceutical API and finished-dosage manufacturers must translate customer reports into structured complaint records: product/batch identification, defect descriptions, dates, site/material impact, triage, and traceable follow-up. Unstructured text and documents make this repetitive and prone to missing fields. PharmAssist is an internship-assessment prototype that combines complaint intake, AI-assisted extraction and triage, a human review/commit screen, a searchable ledger, and management dashboards. Its value proposition is less manual transcription and more consistent triage; actual time savings and quality improvements are **unknown**. Sources: `README.md`, `CONTEXT_pharmassist.md`, `frontend/src/pages/NewComplaintPage.tsx`, `backend/app/langgraph/nodes/complaint_extraction.py`.

AI severity, root-cause hypotheses, CAPA suggestions, and reportability flags are preliminary QA decision support. The risk prompt explicitly requires qualified human review. The system does not demonstrate validated regulatory decisions, electronic signatures, or immutable records sufficient to substantiate the README's compliance claims. Sources: `backend/app/langgraph/nodes/risk_analysis.py`, `backend/app/models/audit_log.py`, `backend/app/models/complaint.py`.

## Architecture and data flow
```text
Browser: React + Router + Redux + Tailwind
  | text/current draft       | PDF/email/image upload
  +--------------------------+
  | Axios: JWT + optional model headers
  v
FastAPI /api/v1 -- auth / complaints / copilot / dashboard / health
  | request-local model ContextVars
  v
Services ---------------------------> Repositories --> async SQLAlchemy
  |                                                       |
  | CopilotService + persisted chat                       v
  v                                               SQLite (default)
Fresh LangGraph instance per request                or PostgreSQL
  |
  +--> intent --> input type / document parsing
                       |
       new/upload --> extraction --+
       edit       --> update ------+--> completeness --> duplicates
       general/ambiguous -------------------------------> formatter
                                                    |
                           material edit/new --> risk
                           other edit -----------+  |
                                                v  v
                                      recommendations --> summary
                                                            |
                                                            v
                                                        formatter
                                                            |
               Groq ChatGroq <--- node LLM calls              v
                                            structured response envelope
                                                            |
                                                            v
                       Redux draft/risk/highlights/chat --> human review
                                                            |
                                               POST complaints (commit)
                                                            |
                                               ledger + analysis + audit
```
Sources: `frontend/src/lib/api.ts`, `frontend/src/features/complaints/complaintSlice.ts`, `backend/app/main.py`, `backend/app/services/copilot_service.py`, `backend/app/langgraph/graph.py`, `backend/app/db/session.py`.

The graph contains ten registered nodes: intent detection, input-type detection, complaint extraction, complaint update, completeness validation, duplicate detection, risk analysis, recommendation, summary generation, response formatter. Conditional branches avoid unrelated extraction/risk work and return formatted error/clarification responses. Most routes use services/repositories; the explicit risk-assessment endpoint invokes two nodes directly, and dashboard service runs aggregate SQL. Sources: `backend/app/langgraph/graph.py`, `backend/app/api/copilot.py`, `backend/app/services/dashboard_service.py`.

The process is request/response, not streaming or queued. Chat is persisted, but each call to `build_graph()` constructs a new in-memory `MemorySaver`; durable cross-request graph checkpoints are **not implemented**. The browser's current complaint and DB chat replay provide turn context. Sources: `backend/app/langgraph/graph.py::build_graph`, `backend/app/services/copilot_service.py::process_chat`, `frontend/src/pages/CopilotPage.tsx`.

## Stack and version evidence
| Layer | Actual evidence |
|---|---|
| Runtime | Python 3.11.9 in `backend/.python-version` and `PYTHON_VERSION`; Python 3.11 in CI/Docker; Node 20 configured in CI |
| API/validation | FastAPI >=0.115.0, Uvicorn >=0.32.0, Pydantic >=2.10.0, pydantic-settings >=2.7.0 |
| Persistence | SQLAlchemy async >=2.0.0, aiosqlite >=0.20.0, asyncpg >=0.30.0; Compose PostgreSQL 15-alpine |
| AI | LangGraph >=0.2.0, langchain-groq >=0.2.0, langchain-core/community >=0.3.0, tenacity >=9.0.0 |
| Auth/parsers | python-jose >=3.3.0, bcrypt >=4.0.0, pdfplumber >=0.11.0, pypdf >=5.0.0, Pillow >=10.0.0 |
| Locked frontend | React 19.2.8, Vite 8.1.5, TypeScript 6.0.3, Redux Toolkit 2.12.0, React Router 7.18.1, Axios 1.18.1 |
| UI libraries | Tailwind 3.4.19, Recharts 3.10.1; Framer Motion and Lucide also declared |

Sources: `backend/requirements.txt`, `backend/Dockerfile`, `.github/workflows/ci.yml`, `docker-compose.yml`, `frontend/package.json`, `frontend/package-lock.json`. Backend versions are lower bounds, not a reproducible lock; frontend values above are lock resolutions. README React 18/Node 18 and older LLM descriptions are stale.

## AI implementation specifics
### Models and routing
The project uses hosted LLM inference through **Groq**, not local training or fine-tuning. Default primary/secondary IDs in code are `openai/gpt-oss-20b` and `openai/gpt-oss-120b`. `USE_LARGE_MODEL` enables secondary selection for extraction, risk, and duplicate nodes. Request headers `X-Primary-Model` / `X-Secondary-Model` feed ContextVars, allowing request-specific overrides. Legacy llama/gemma names are rewritten; model-not-found errors can try `openai/gpt-oss-20b`, `openai/gpt-oss-120b`, then `qwen/qwen3.8-27b`. These are configured identifiers, not a claim that each is currently available. Sources: `backend/app/core/config.py`, `backend/app/main.py::model_override_middleware`, `backend/app/utils/llm_client.py`.

The client has a default 20-second timeout per call, two retries after the first attempt, and exponential waits capped at five seconds. Model fallbacks and JSON-correction retries can add more calls. Extraction/update/intent use temperature 0; risk 0.1; recommendations and summaries 0.2. There is no graph-wide latency budget. Sources: `backend/app/utils/llm_client.py`, `backend/app/langgraph/nodes/`.

### Inputs, extraction, and features
The extraction schema has **12 fields**: source, customer, product, strength, batch/lot, quantity, manufacturing date, expiry date, originating site/block, impacted non-product materials, category, description. Outputs include per-field confidence and changed-field names. LLM JSON is parsed, markdown fencing stripped, missing fields post-filled heuristically, and dates normalized. Malformed extraction JSON gets one corrective-prompt attempt. Source: `backend/app/langgraph/nodes/complaint_extraction.py`.

These are structured information-extraction fields, not learned numerical features. Five mandatory fields determine completeness: customer, product, batch, category, description. Five additional important fields are tracked; ISO dates and expiry-after-manufacture are checked. However, node `validation_errors` are dropped by `CompletenessEnvelope`, and incompleteness does not itself halt risk processing. Sources: `backend/app/langgraph/nodes/completeness_validation.py`, `backend/app/schemas/copilot.py`, `backend/app/langgraph/graph.py`.

PDF parsing tries pdfplumber then pypdf; email uses Python's MIME parser with plain-text fallback. Image OCR uses `pytesseract`/Tesseract when available, otherwise a visible clarification path. Scanned PDFs have no image-OCR conversion fallback. Uploads allow PDF, EML, TXT, PNG/JPG/JPEG/TIFF server-side, default maximum 10 MB, randomized stored names, and cleanup in `finally`. MIME allow-list constants exist, but validation actually checks extensions and size, not content signatures. Sources: `backend/app/utils/pdf_parser.py`, `email_parser.py`, `image_ocr.py`, `file_handler.py`, `backend/app/api/copilot.py`.

### Edits, duplicates, and risk
Natural-language edits ask for a field diff; only returned keys are merged. Seven material fields trigger risk reruns: batch, quantity, manufacturing/expiry dates, category, description, impacted NPM. Non-material edits skip risk; previous risk is not supplied in the fresh service state, so preserving it inside the graph is incomplete. The update parser does not strictly whitelist model-returned keys. Sources: `backend/app/langgraph/nodes/complaint_update.py`, `backend/app/langgraph/graph.py`, `backend/app/services/copilot_service.py`.

Duplicate detection first queries same product (case-insensitive), first six batch-prefix characters, non-draft status, and records created within 90 days of server time, capped at five candidates without explicit ordering. Only then does an LLM compare descriptions; scores >=0.75 produce a warning. Edits skip detection. There are no embeddings/vector indexes and no measured duplicate precision/recall. Failures return no warning, which does not establish absence of duplicates. Sources: `backend/app/repositories/complaint_repository.py::get_duplicates_candidates`, `backend/app/langgraph/nodes/duplicate_detection.py`.

Risk produces Critical/Major/Minor severity, a reportability boolean, action, and narrative requiring QA review. CAPA and root-cause lists are generated separately. Summary generation only rewrites a complaint description if missing/under 50 characters; the dedicated `/summary` route generates an executive narrative with a rule-based fallback. Sources: `backend/app/langgraph/nodes/risk_analysis.py`, `recommendation.py`, `summary_generation.py`, `backend/app/api/copilot.py`.

### Fallbacks and evaluation boundary
Offline extraction is a regex/keyword fallback, not a second trained model. It can infer customer/site/material/source defaults absent from the report and sets confidence constants around 0.9/0.95. OCR confidence is also a fixed heuristic. These numbers are **not calibrated accuracy**. Risk failures can return default Major/false-reportability values with an unavailable message; the create endpoint separately infers severity from category/description when no risk object is supplied. Sources: `backend/app/langgraph/nodes/complaint_extraction.py`, `risk_analysis.py`, `backend/app/utils/image_ocr.py`, `backend/app/api/complaints.py`.

There is no labeled evaluation corpus, extraction F1, field accuracy, confusion matrix, calibration study, hallucination rate, benchmark latency, or token-cost evaluation in the tracked implementation: all are **unknown**. `backend/seed.py` contains **15 demo complaint dictionaries**, two users, and fabricated illustrative analysis/confidence metadata. Two sample complaint PDFs and their generator are demo inputs, not a held-out test set (`sample_complaints/`, `backend/generate_sample_pdfs.py`).

## Backend and database specifics
### Schema
| Table/model path | Main fields and relationships |
|---|---|
| `backend/app/models/user.py` — `users` | UUID string ID, unique indexed email, name, bcrypt hash, role enum (`qa_officer`, `qa_manager`, `admin`), timestamp |
| `backend/app/models/complaint.py` — `complaints` | UUID ID, unique indexed `CC-year-sequence` number, 12 complaint fields, seven-state workflow, creator FK, created/updated timestamps |
| `backend/app/models/ai_analysis.py` — `ai_analysis` | Complaint FK; severity/action/risk/reportability; JSON root causes, CAPA, confidence; model name; timestamp; supports multiple rows per complaint |
| `backend/app/models/chat_history.py` — `chat_history` | Indexed session ID and optional complaint FK, role/message, attachment name, timestamp |
| `backend/app/models/audit_log.py` — `audit_logs` | Complaint FK, human/AI actor, action type, changed field, old/new text, timestamp |
| `backend/app/models/duplicate_flag.py` — `duplicate_flags` | Complaint/duplicate-of FKs, similarity score, timestamp; model exists but commit persistence is absent |

Complaint indexes cover batch, product, status, and created time. SQLAlchemy sessions are async with `expire_on_commit=False`; non-SQLite engines configure pool size 10, overflow 20, and pre-ping. Startup uses `Base.metadata.create_all`; Alembic is declared but migrations/config are absent. Sources: `backend/app/db/session.py`, ORM files, tracked tree.

Seven complaint statuses are draft, pending_triage, ready_to_commit, committed, under_investigation, capa_assigned, closed. Server request schemas accept status strings and nullable fields without enforcing graph completeness or allowed transitions. The UI sends `POST /complaints` with status committed rather than invoking a dedicated commit API. Sources: `backend/app/schemas/complaint.py`, `backend/app/api/complaints.py`, `frontend/src/pages/NewComplaintPage.tsx::handleCommit`.

### API surface
All following routes are under `/api/v1`; Swagger/ReDoc are `/docs` and `/redoc` (`backend/app/main.py`).

| Method/path | Behavior | Source |
|---|---|---|
| POST `/auth/login`, POST `/auth/demo`, GET `/auth/me` | Email/password login, passwordless demo token, current identity | `backend/app/api/auth.py` |
| GET/POST `/complaints` | Paginated status/search/sort listing; create complaint and initial assessment/audit | `backend/app/api/complaints.py` |
| GET/PATCH/DELETE `/complaints/{id}` | Retrieve, partial update with field audit, delete | same |
| GET `/complaints/{id}/audit-trail` | Chronological audit entries | same |
| POST `/copilot/chat`, POST `/copilot/upload` | Graph-driven text or multipart document processing | `backend/app/api/copilot.py` |
| GET `/copilot/sessions/{id}/history` | Persisted session messages | same |
| POST `/copilot/risk-assessment`, POST `/copilot/summary` | Direct risk/CAPA rerun; executive narrative | same |
| GET `/dashboard/stats`, GET `/dashboard/charts` | Aggregated KPIs/distributions/trend/category datasets | `backend/app/api/dashboard.py` |
| GET `/health`, `/health/db`, `/health/llm` | Process response, DB SELECT 1, API-key-presence check | `backend/app/api/health.py` |

List defaults are page size 20, maximum 100; search uses case-insensitive substrings. Chat input is limited to 10,000 characters. LLM health checks key presence, not provider connectivity. Sources: `backend/app/api/complaints.py`, `backend/app/repositories/complaint_repository.py`, `backend/app/schemas/copilot.py`, `backend/app/api/health.py`.

### Auth, audit, caching, queues
Native bcrypt handles password hashes; python-jose signs HS256 JWTs with email subject, issue/expiry times, default 1,440-minute validity. `get_current_user` resolves the user, with a development-only `AUTH_REQUIRED=False` bypass. Current routes do not enforce roles, tenant boundaries, complaint ownership, or session ownership. Passwordless demo access and fixed-credential provisioning are intentional demo capabilities. Sources: `backend/app/core/security.py`, `dependencies.py`, `config.py`, `backend/app/services/auth_service.py`.

Audit repository offers append operations, but records are not tamper-evident or protected from complaint-deletion cascades. Complaint writes and each audit insert commit separately, permitting partial operations. Creation logs a human creation and AI-analysis event; draft chat changes are not automatically recorded as per-field ledger changes. No electronic-signature/approval-state mechanism is implemented. Sources: `backend/app/services/complaint_service.py`, `backend/app/repositories/audit_repository.py`, `backend/app/models/complaint.py`.

Only configuration uses `lru_cache`; there is no application response cache, Redis, job broker, background processing queue, or durable graph checkpoint store. SQL chat persistence differs from graph-state persistence. Sources: `backend/app/core/config.py`, `backend/app/langgraph/graph.py`, `backend/app/services/copilot_service.py`.

## Frontend implementation
React functional pages use Router, Redux Toolkit, typed selector/dispatch hooks, Axios, Tailwind/CSS tokens, Recharts, Lucide icons, and Framer Motion for selected animation. The entry point uses StrictMode; App supplies a class error boundary. TypeScript targets ES2023 but allows implicit any and unused declarations. Sources: `frontend/src/main.tsx`, `App.tsx`, `app/store.ts`, `frontend/tsconfig.app.json`, `frontend/package.json`.

| Screen/path | Implemented behavior |
|---|---|
| Splash/login | Five-second session-gated splash; email/password and two demo credential shortcuts |
| `/dashboard` | KPI cards, severity/category/trend charts, six recent complaints loaded with parallel requests |
| `/complaints` | Search (350 ms debounce), status filter, pagination, detail links, deletion |
| `/complaints/new` | Desktop form/chat panes, mobile tabs, file drop/paste, field highlighting, risk/duplicate/completeness display, explicit commit |
| `/complaints/:id` | Record fields, status changes, audit timeline, executive summary, delete |
| `/copilot` | Full-screen chat sharing the complaint draft and message slices |
| `/history` | Current in-memory Redux session summary; archived session browsing is not implemented |
| `/settings` | Read-only profile, functional theme switch, cosmetic model/OCR selectors and save banner |

Sources: `frontend/src/routes/index.tsx`, `frontend/src/pages/`, `frontend/src/hooks/useHighlightOnChange.ts`.

The complaint slice stores draft, risk, recommendations, completeness, duplicate warning, confidence, and updated fields. `applyAIResponse` merges complaint keys and retains previous optional objects when absent; a separate manual-update reducer exists. Chat state stores messages/processing/progress. Auth token/user and theme persist in localStorage; complaint/chat drafts do not. Full-page reload can lose draft/session UI state. Sources: `frontend/src/features/{complaints,auth,copilot,settings}/`.

Axios uses an explicit HTTP `VITE_API_BASE_URL` when configured, `/api/v1` on localhost (Vite proxy), and a hardcoded Render URL on other hosts. It adds stored JWT and optional model headers, clears credentials on 401, and uses 30-second normal / 60-second upload timeouts. Settings does not write the model keys Axios reads. Sources: `frontend/src/lib/axiosClient.ts`, `api.ts`, `frontend/vite.config.ts`, `frontend/src/pages/SettingsPage.tsx`.

## Decisions and tradeoffs
- **Structured envelope between graph and Redux:** makes extraction, highlighted edits, risk, and completeness render together. Tradeoff: duplicated Python/TS contracts drift; validation errors are already dropped, and frontend processing does not propagate envelope status as a distinct reducer field. Sources: `backend/app/schemas/copilot.py`, `frontend/src/types/copilot.ts`, complaint slice, new complaint page.
- **Conditional graph instead of one prompt:** separates extraction, edits, validation, duplicates, and risk, and avoids a risk call on non-material edits. Tradeoff: multiple sequential LLM calls increase latency and failure modes; fresh checkpoints lose intended state. Sources: `backend/app/langgraph/graph.py`, `backend/app/services/copilot_service.py`.
- **SQL candidate filter before LLM duplicates:** bounds external comparisons to five candidates without vector infrastructure. Tradeoff: product/prefix/date filtering can exclude real duplicates; scores are uncalibrated and failures look like no match. Sources: complaint repository and duplicate node.
- **Heuristic fallback for demo continuity:** supports field population without a live key. Tradeoff: inferred defaults and fixed confidence obscure provenance and can look more certain than the input warrants. Source: extraction node.
- **SQLite plus PostgreSQL ORM support:** convenient local setup with an upgrade path. Tradeoff: dialect differences, missing migrations, and race-prone sequential numbering require production work. Sources: DB session, dashboard service, complaint repository.
- **Human commit UI:** lets staff review before ledger creation. Tradeoff: enforcement is client-side; API allows direct incomplete/committed records, and the commit payload omits duplicate warnings, recommendations, confidence, and session linkage. Sources: NewComplaintPage, complaint schema/service.

## Evidenced outcomes and verification limits
| Item | Evidence and interpretation |
|---|---|
| Workflow breadth | Ten registered graph nodes, five intent categories, 12 extraction fields, three severity labels; implementation scope, not measured quality (`graph.py`, `state.py`, node prompts) |
| Persistence | Six ORM entities; schema capability, not production adoption (`backend/app/models/`) |
| Demo content | 15 complaint fixtures and two seeded users; illustrative data, not customer volume (`backend/seed.py`) |
| Tests | Seven tracked tests: three API and four node checks (`backend/tests/`); not seven model evaluations |
| Historic build claim | `docs/walkthrough.md` reports a 1.81-second build with zero errors; machine/context/raw log unavailable, **UNVERIFIED** as a reproducible benchmark |
| Extraction/risk/duplicate accuracy | unknown |
| Intake-time reduction, staff productivity, error reduction | unknown |
| Production users, complaint throughput, uptime, cost, latency | unknown |
| Validated regulatory compliance | UNVERIFIED |

CI config installs/builds frontend and imports the backend; it does not run tests, lint, or validate database migrations. API tests use ASGITransport without lifespan/database fixtures, node tests include stale input keys, and LLM responses are not mocked. Test pass/fail must be reported with actual environment/setup rather than inferred from checkmarked documentation. Sources: `.github/workflows/ci.yml`, `backend/tests/test_api.py`, `test_nodes.py`, `docs/task.md`.

Review checks on **2026-10-19**: all **seven tests passed** with Python 3.13 after setting `DATABASE_URL=sqlite+aiosqlite:///:memory:`, clearing the Groq key, calling `create_db_tables()` before `pytest.main`, and disabling pytest's disk cache. This uses existing installed Python packages, not a clean Python 3.11 environment. `npm ci --ignore-scripts --no-audit --no-fund` installed the lockfile; `npm run build` passed on Node 22.22.2 (TypeScript plus Vite), producing a **899.76 kB / 268.35 kB gzip** main JS chunk and a >500 kB chunk warning. `npm run lint` exited zero with **eight warnings** for unused imports and hook dependency lists. Vite initially encountered sandbox `spawn EPERM`; the permitted rerun passed. These checks verify limited execution/build behavior, not live LLM quality, browser flows, PostgreSQL compatibility, or full Compose deployment. Sources: executed commands against `backend/tests/`, `backend/app/db/session.py`, and `frontend/package.json`; emitted local `frontend/dist/` artifacts (ignored by Git).

## Known debt and improvement order
1. **Make invariants server-side:** require valid complaint/status transitions, define QA approval states, check roles and session/record scope, and separate demo provisioning from shared operation. Sources: API/schemas, auth service/dependencies.
2. **Repair persistence boundaries:** use one transaction for complaint+analysis+audit; allocate numbers with a DB-safe sequence/retry; define retention and deletion behavior; store duplicate/CAPA/confidence/model provenance and session linkage. Sources: complaint service/repository, models, UI commit.
3. **Restore graph continuity and error semantics:** durable checkpointer or explicit full state replay, previous risk loading, AMBIGUOUS clarification handling, validation-error propagation, and explicit degraded/fallback provenance. Sources: graph/service, formatter, schemas, extraction/risk nodes.
4. **Finish real settings/history:** persist model choices to request-header keys, validate allowed model IDs, remove cosmetic OCR controls, and load scoped DB sessions in History. Sources: SettingsPage, HistoryPage, Axios client, ChatRepository.
5. **Fix analytics:** count latest severity once per complaint, add closed timestamp for resolution time, and compute real monthly severity splits. Today critical/severity counts operate on analysis rows, resolution mean is null, and trend severity subcounts are zero. Source: `backend/app/services/dashboard_service.py`.
6. **Repair infrastructure/reproducibility:** add actual migrations and frontend container recipe, align env names/CORS/ports, pin Python dependencies, and fix clean-DB fixtures plus frontend tests. Full Compose references missing files and cannot be treated as verified. Sources: Compose, Makefile, config, requirements, tracked tree.
7. **Measure model behavior:** create labeled synthetic/deidentified evaluation cases covering field extraction, ambiguity, date formats, sparse input, OCR failure, duplication, and risk; separate LLM from heuristic results. Proposed work, not an existing benchmark.

## Interview talking points
- **Hardest problem:** maintaining one consistent complaint draft across natural-language edits, asynchronous graph results, form state, risk reruns, and final ledger persistence. Explain partial state updates and `updated_fields`, then acknowledge lost checkpoint/risk and schema-drift gaps. Sources: graph state/service, complaint slice.
- **Most defensible design decision:** structured SQL prefiltering before semantic duplicate judgment; discuss bounded cost versus missed candidates, rather than claiming vector search or measured accuracy. Sources: duplicate node/repository.
- **What to improve first:** server validation/authorization and transactional audit, then durable state/provenance and evaluation. These directly address correctness before adding more prompts/screens.
- **Scale limits:** repeated graph compilation, sequential provider calls/retries, whole-file reads before size validation, synchronous document parsing in async request paths, full session-history loading, DB numbering scans, and no queue/rate limiter. Pool limits are configuration, not throughput measurements. Sources: graph/service, utils, repositories, db/session.
- **What a production rollout needs:** load/latency tests, background document jobs, bounded history, provider-budget controls, secure routing, migrations, audit-retention policy, and independently validated QA workflows. No deployed-scale or compliance result is established here.

## Resume-ready bullets
- Built a React/TypeScript and FastAPI complaint-management prototype with a ten-node LangGraph copilot that converts unstructured reports into a 12-field draft for human QA review. [Evidence: `backend/app/langgraph/graph.py`, extraction node, `frontend/src/pages/NewComplaintPage.tsx`.]
- Implemented conditional complaint-edit routing and material-field risk reruns, exposing changed fields, completeness, severity, and CAPA suggestions through a shared API envelope and Redux state. [Evidence: graph/update node, `backend/app/schemas/copilot.py`, complaint slice.]
- Designed a two-stage duplicate-warning workflow using SQL product/batch/date filtering and LLM comparison of up to five candidates, limiting semantic checks to relevant records. [Evidence: complaint repository, duplicate node.]
- Developed async SQLAlchemy models and REST workflows for complaint records, chat history, AI assessments, and field-change logs, with JWT/bcrypt authentication and paginated search. [Evidence: `backend/app/models/`, `api/`, `repositories/`, `core/security.py`.]
- Added PDF/email parsing, optional OCR fallback, model-selection middleware, retry handling, and a dashboard/ledger UI to support document-to-record review. [Evidence: `backend/app/utils/`, `backend/app/main.py`, frontend pages.]

These describe implemented capabilities without claiming measured time savings, model accuracy, tamper-proof audit, or regulatory certification.

## History and skill tags
The 53 reachable commits begin with the main prototype (`96b515b`), add CI (`c097e87`), dynamic model headers (`df84140`), visual/splash changes, risk persistence (`0ff9cfc`), deployment/CORS/auth fixes, a modern redesign (`7854f27`), demo provisioning (`21a647b`), and latest architecture/README updates (`db5e3f8`, `37a8ab3`). Commit subjects and changed paths describe evolution; they do not establish deployed success. Source: repository `git log --all` and current files.

**Skill tags:** [AI, GenAI, LLM Orchestration, LangGraph, SDE, Full-stack, Backend, React, TypeScript, Redux, Python, FastAPI, SQLAlchemy, SQL, Document Processing, Analytics, Data Visualization, Authentication, API Design].

Traditional ML model training, vector RAG, distributed queues, validated MLOps, and certified regulatory compliance are not demonstrated by the tracked implementation.
