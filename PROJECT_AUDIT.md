# Project audit and repair record

Reviewed 20 October 2026. This records a substantial initial source review and repair pass; it is not a certification that every workflow is bug free.

## Architecture

React and Redux provide authenticated dashboard, complaint register, new complaint, detail, copilot, history, and settings screens. Axios calls FastAPI under /api/v1. FastAPI services use asynchronous SQLAlchemy repositories with SQLite locally and PostgreSQL in Docker. The copilot runs intent detection, input parsing, extraction or corrections, completeness checking, duplicate checking, risk assessment, recommendations, summaries, and response formatting through LangGraph. Groq supplies live model responses.

## Repairs implemented

- Complaint request analysis data is validated and kept separate from ORM complaint fields. Creation returns its newly saved analysis rather than an empty cached relationship.
- Complaint creation, field updates, and commit operations save their audit entries in the same database transaction. Failed requests can roll back rather than leave partial records.
- Nullable complaint fields can be cleared explicitly with PATCH; audit values retain actual nulls.
- Unsupported/null statuses and unsupported severity values produce request validation errors. Sorting cannot accidentally access an ORM relationship as a column.
- Assessment history has deterministic ordering. Dashboard severity totals and monthly breakdowns use the latest assessment per complaint instead of counting assessment versions or returning hardcoded zeros.
- Copilot draft data and assessment context persist in a new database table across requests and service recreation. Transient error states and temporary upload paths are not reused.
- Changes to product identity or strength trigger risk reassessment. Missing assessments are rerun on edits. Provider failures return an error and an unknown classification rather than a fabricated successful Major assessment; incomplete/error responses cannot enable commit.
- Summary requests for missing complaint records return 404.
- CORS honors configured origins and the documented environment variable rather than accepting every origin with credentials.
- Oversized uploads read only the configured maximum plus one byte for validation instead of first loading an arbitrarily large file.
- Login no longer creates privileged accounts merely because publicly known credentials were supplied. Invalid/overlong bcrypt password attempts fail authentication instead of crashing.
- Frontend upload processing sets the busy flag. Reset clears both draft and conversation. Save failures are visible, and committing is disabled during processing.
- Frontend API addressing uses explicit configuration or same-origin routing instead of silently sending remote deployments to an unrelated hardcoded backend. Validation errors display readable field messages.
- Malformed stored authentication JSON no longer prevents application startup.
- Complaint search resets pagination and ignores superseded responses. Deleting the last record on a page returns to a valid page.
- Docker has the missing frontend Dockerfile, excludes local credentials/data from image build contexts, and no longer runs an absent Alembic configuration on startup.
- CI now executes backend tests. Development dependencies and setup/deployment instructions are documented.

## Verification

20 backend tests pass against isolated in-memory SQLite databases. They cover demo authentication, dashboard endpoints, complaint creation/read/update/delete, clearing fields, assessment persistence, invalid input, audit rollback, latest-version analytics, summary 404, AI failure handling, copilot state continuity, upload rejection, CORS configuration, and authentication regressions. Node tests use mocked model responses.

Frontend production build and TypeScript checking pass. The bundler reports a large JavaScript chunk. Dependency deprecation warnings remain in Python's installed third-party libraries.

## Remaining work before a production release

- Live Groq extraction, correction, summaries, scanned-document OCR, and browser interaction have not been exercised end to end in this pass. Mocked tests establish application behavior, not provider quality or availability.
- PostgreSQL and Docker Compose have not been launched and verified here. Database migrations need a real versioned Alembic history; create_all only creates missing tables.
- Sequential complaint number generation currently uses a read-then-insert sequence and needs database-backed concurrency handling before multiple simultaneous writers are supported reliably.
- Demo login and startup demo seeding remain enabled, with sample credentials and a development JWT fallback. A production configuration must explicitly disable demo access/seeding and require a strong signing secret.
- Authentication currently establishes identity without a complete role/ownership authorization policy. Copilot sessions and shared complaint data need an agreed access model before multi-tenant use.
- Complaint deletion also deletes its audit records. Regulatory retention and immutability require a deliberate archival policy and stronger storage controls; the existing system does not establish Part 11 compliance.
- Draft/committed transitions are not yet a fully enforced server-side workflow. Mandatory-field checks, date ordering, QA approval, and state transitions need consistent enforcement for all API entry points.
- OCR requires an installed Tesseract binary and pytesseract. The Docker image supplies the binary; pytesseract is not currently in requirements. No-key AI mock mode is not implemented despite the original README claim, which has been corrected.
- The new complaint screen is designed around AI-populated read-only fields. A complete manual-entry and manual-risk-review workflow remains product work.
- Session draft writes currently replace the stored state without optimistic locking. Concurrent requests for the same session should be serialized or versioned.

No deployment or external-service mutation was performed. Existing user-authored interview preparation documents were left untouched.
