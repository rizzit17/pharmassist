# CONTEXT.md — PharmAssist Customer Complaint Management System

## 1. What This Project Is

An AI-powered Customer Complaint Management System built for the **PharmAssist AI Product Engineer (Interns) — Round 1** assignment. It targets the pharmaceutical manufacturing industry (API and FDF manufacturers) and digitizes the **Customer Complaint module** of a Quality Management System (QMS).

The core idea: quality personnel should never manually fill a large complaint intake form. Instead, they type a natural-language description of a customer complaint, or upload a document (PDF, email, image), and an **AI Copilot** extracts the structured data, populates the form, runs a risk assessment, and stays available for natural-language corrections afterward — with the form and the AI always kept in sync.

## 2. Why It Matters (Domain Background)

In pharmaceutical manufacturing, a **Quality Management System (QMS)** is the formal, regulator-scrutinized framework (aligned with ICH Q10, WHO GMP, 21 CFR Part 211, EU GMP Annex, etc.) that governs how a manufacturer ensures product quality throughout its lifecycle. The **Customer Complaint** module is one of its core sub-systems: when a customer (pharmacy, hospital, distributor, or another manufacturer buying API) reports a problem with a batch — discoloration, contamination, short-fill, mislabeling, packaging failure — that complaint must be:

- Logged with full batch traceability (product, batch/lot number, manufacturing and expiry dates, affected quantity)
- Triaged for severity (Minor / Major / Critical)
- Assessed for risk, including whether it is potentially **reportable to a regulator** (e.g., FDA field alert, MHRA yellow-card equivalent)
- Routed to the correct next step (QA investigation, batch recall evaluation, replacement, CAPA — Corrective and Preventive Action)
- Fully **audit-trailed**, since QMS records are subject to regulatory inspection

This is inherently a data-entry-heavy, compliance-sensitive workflow — exactly the kind of process that benefits from an AI copilot that removes manual typing while preserving traceability and human sign-off.

## 3. Assignment Requirements (Source of Truth)

Provided by PharmAssist:
- An assignment document describing objective, mandatory tech stack, and deliverables
- A reference UI (screenshots of a two-pane "Log Customer Complaint" form + "PharmAssist Copilot" chat panel)
- A demo video showing the expected end-to-end workflow

**Mandatory tech stack:** React + Redux (frontend), Python + FastAPI (backend), LangGraph (AI agent framework), Groq API with `gemma2-9b-it` (and optionally `llama-3.3-70b-versatile`), MySQL/PostgreSQL, Google Inter font.

**Three mandatory AI tools:**
1. **Log Complaint Tool** — natural language → structured complaint + risk assessment
2. **Edit Complaint Tool** — natural language corrections → targeted field updates, preserving everything else, re-running risk analysis when warranted
3. **Document Extraction Tool** — PDF/email/image upload → structured complaint + risk assessment, still editable afterward via chat

**Bonus features encouraged:** Completeness Checker, Root Cause Recommendation, Duplicate Complaint Detection, CAPA Recommendation, Complaint Summary, AI Risk Classification, Confidence Scores, Field Validation, Missing Information Detection, Audit Trail.

**Deliverables:** GitHub repo + a 5–10 minute demo video walking through the full stack (frontend input → API → LangGraph workflow → form/risk-assessment population).

**Evaluation emphasis:** curiosity, research, clean code, product thinking, and problem-solving — not domain expertise or a "perfect" application. The candidate must be able to explain and extend the implementation in an interview.

## 4. What Was Derived From the Reference Screenshots

The reference UI shows a two-pane layout:

- **Left pane:** "Log Customer Complaint" form (subtitle "API & FDF Quality Assurance Module") with a status pill (`Pending Triage` → `Ready to Commit`), sectioned fields (Origin & Customer Details, Product & Batch Identification, Facility & Material Impact, Defect Analysis), a distinct "AI Copilot Risk Assessment" card (severity, suggested next action, risk narrative), and a bottom "Commit to QMS Ledger" button.
- **Right pane:** "PharmAssist Copilot" chat panel — assistant/user message bubbles, file-upload cards for attached documents, inline processing indicators (e.g., "Extracting tabular data via OCR…"), a message input with attach + send controls, and a "Powered by LangGraph" footer.
- Observed interaction pattern: user pastes a complaint description → AI parses it and fills the form + generates risk assessment → user sends a correction ("the batch number is actually X") → AI updates only that field and highlights it green → user uploads a PDF → AI extracts and repopulates the form → user issues another natural-language correction on the newly extracted data, proving the extraction and chat-editing tools compose seamlessly.

This observed loop (extract → populate → assess → correct → re-sync, repeatable across both text and document input) is the primary functional contract the build must satisfy — pixel-perfect UI cloning is explicitly not required by the assignment, but the workflow must be faithfully reproduced.

## 5. Non-Goals / Explicit Simplifications

- Production-grade OCR is **not required** — a lightweight or stubbed extraction path for images is acceptable.
- Exact visual parity with the reference screenshots is **not required** — functional parity is what's graded.
- Regulatory determinations made by the AI (e.g., "may be reportable") must always be labeled as AI suggestions requiring human QA sign-off, never presented as compliance conclusions.
- Sample complaint PDFs/emails must be entirely fictional, created for demo purposes.

## 6. Key Documents in This Repo

- `MASTER_PROMPT.md` — the full build specification used to generate the application.
- `ARCHITECTURE.md` — system architecture, data flow, LangGraph graph design, schema, and API contract.
- `README.md` — setup, run, and demo instructions (generated alongside the app).
