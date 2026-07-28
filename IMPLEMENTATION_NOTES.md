# IMPLEMENTATION_NOTES.md — Clarifications & Decisions Addendum

This document resolves ambiguities in the Antigravity implementation plan before build starts. Treat these as binding decisions, same authority level as ANTIGRAVITY_MASTER_PROMPT.md and ARCHITECTURE.md.

## 1. Intent Routing — `AMBIGUOUS` vs `GENERAL_QUERY`

The conditional edge table sends both `AMBIGUOUS` and `GENERAL_QUERY` straight to `response_formatter`, skipping extraction/update/risk/recommendation. This is correct for `GENERAL_QUERY` (e.g. "how many critical complaints this month?") but not for `AMBIGUOUS`.

**Decision:**
- `GENERAL_QUERY` → `response_formatter` directly, `assistant_message` answers the question (may query the DB via a lightweight read inside the node), `complaint` field in the response is unchanged/passthrough.
- `AMBIGUOUS` → also routes to `response_formatter`, but the node must produce a **clarifying question** as `assistant_message` (e.g. "Did you mean to update the batch number or the affected quantity?") and set `status: "needs_clarification"`. The frontend must treat `needs_clarification` as a distinct state — no field highlight animation fires, and the chat panel does not show a processing-success checkmark, just the question.
- `intent_detection` prompt must explicitly instruct the model: prefer `AMBIGUOUS` over guessing when a correction references a value without saying which field it belongs to and more than one candidate field exists in the current complaint state.

## 2. Conditional Risk Re-Analysis on Edits

The plan lists `risk_analysis` as a fixed node in every path. Per the master spec, risk analysis should only re-run on **material** field changes during `EDIT_COMPLAINT`, not on every correction.

**Decision:**
- `complaint_update` node's output must include a boolean `requires_risk_rerun`.
- Set `requires_risk_rerun = True` only if the diffed fields intersect this material-field set: `batch_lot_number`, `affected_quantity`, `manufacturing_date`, `expiry_date`, `complaint_category`, `complaint_description`, `impacted_npm`.
- Fields considered non-material (do not trigger re-run): `customer_name`, `complaint_source`, `originating_site_block` (unless it changes NPM impact), and any pure typo fix flagged by the model as cosmetic.
- Add a conditional edge after `completeness_validation`:
  ```python
  graph.add_conditional_edges(
      "completeness_validation",
      lambda state: "risk_analysis" if state["intent"] == "EDIT_COMPLAINT" and not state.get("requires_risk_rerun") else "risk_analysis_default",
      ...
  )
  ```
  Simpler equivalent: route to `risk_analysis` only when `intent != "EDIT_COMPLAINT" or requires_risk_rerun is True`; otherwise skip straight to `recommendation` (or `summary_generation` if recommendations are also unaffected) carrying forward the existing `risk_assessment` object unchanged in state.
- This keeps trivial corrections (e.g. fixing a customer name typo) fast and avoids an unnecessary Groq call — matters both for cost and for demo responsiveness.

## 3. Duplicate Detection Mechanism

"Semantic comparison against DB" is underspecified — there is no vector DB in the stack. Define the actual mechanism now rather than during implementation.

**Decision (two-stage, no vector DB required):**
1. **Structured pre-filter** (SQL, cheap): query `complaints` where `product_name` matches (case-insensitive) AND `batch_lot_number` shares the same prefix (e.g. first 6 chars) AND `created_at` is within a 90-day window of the new complaint. Cap to top 5 candidates.
2. **LLM similarity judgment** (only if step 1 returns ≥1 candidate): pass the new `complaint_description` plus each candidate's description to the `duplicate_detection` node's prompt, ask the model to return a `similarity_score` (0–1) and short `reasoning` per candidate.
3. Only surface a `duplicate_warning` in the response if `similarity_score >= 0.75` for at least one candidate. Below that threshold, `found: false`.
4. Persist any surfaced duplicate as a `duplicate_flags` row on commit (not on draft), so flags only accumulate for real, saved complaints.
5. Skip this node entirely (no-op passthrough) when `intent == "EDIT_COMPLAINT"` — duplicate detection only applies to new complaints.

## 4. Auth Bypass for Demo/Dev

JWT + "Continue as Demo User" is fine as the default UX, but must not block API testing during the required code walkthrough video.

**Decision:**
- Add a `DEV_MODE` / `AUTH_REQUIRED` flag in `core/config.py`, default `True` in `.env.example` but documented as settable to `False` for local `/docs` testing.
- When `AUTH_REQUIRED=False`, all endpoints resolve `get_current_user` to the seeded demo user without requiring a bearer token — this lets you `curl`/hit Swagger UI directly while recording the "walk through the backend" portion of the demo video.
- Frontend always goes through the normal login/demo-bypass flow regardless of this flag; the flag only affects direct API access.
- Never disable `AUTH_REQUIRED` in any deployed/shared environment — dev-only.

## 5. Image OCR Fallback Behavior

Pytesseract-if-available, stub otherwise — the stub's actual behavior must be defined so it isn't a silent no-op.

**Decision:**
- `utils/image_ocr.py` exposes `extract_text_from_image(path) -> OCRResult` where `OCRResult = {"text": str, "method": "tesseract" | "stub", "confidence": float}`.
- If `pytesseract` + Tesseract binary are available: run OCR normally, `method="tesseract"`.
- If unavailable: `method="stub"`, `text=""`, and the `document_extraction` flow must have the `response_formatter` node emit an explicit assistant message: *"I couldn't extract text from this image automatically in this environment. Could you paste the complaint details as text, or upload a PDF/email instead?"* — never silently populate an empty form and claim success.
- Frontend must render `status: "needs_clarification"` styling for this case, same as the ambiguous-intent case in Section 1, not a generic error toast.

## 6. CORS, Timeouts, and Retry Wiring

ARCHITECTURE.md specifies these; the plan doesn't show where they're actually wired. Pin down now.

**Decision:**
- `core/config.py` holds `GROQ_TIMEOUT_SECONDS` (default 20), `GROQ_MAX_RETRIES` (default 2), `CORS_ALLOWED_ORIGINS` (list, from env, default `["http://localhost:5173"]`).
- `main.py` registers `CORSMiddleware` using `CORS_ALLOWED_ORIGINS` at app startup — not hardcoded inline.
- Every LangGraph node that calls Groq must wrap the call using a shared `utils/llm_client.py` helper decorated with `tenacity.retry(stop=stop_after_attempt(GROQ_MAX_RETRIES + 1), wait=wait_exponential(...))`, not ad-hoc retry logic duplicated per node.
- On final retry exhaustion, the node must catch the exception and return a state update with `status: "error"` and a graceful `assistant_message` ("I'm having trouble reaching the AI service — please try again in a moment") rather than letting the exception propagate to a raw 500.
- `response_formatter` must always run even on an upstream error (short-circuit via conditional edge on `state["status"] == "error"`), so the frontend always receives a well-formed envelope, never a bare HTTP failure.

## 7. Summary of New/Changed State Fields

Add to `ComplaintGraphState`:
```python
requires_risk_rerun: bool = False
duplicate_candidates_raw: Optional[list] = None  # pre-LLM SQL prefilter results, for debugging
ocr_method: Optional[str] = None  # "tesseract" | "stub" | None
```

Add to the response envelope (`schemas/copilot.py`):
```python
"status": "processing | success | needs_clarification | error"  # already present, now formally includes needs_clarification as first-class
```
