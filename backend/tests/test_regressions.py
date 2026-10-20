import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, func
from app.main import app
from app.models.complaint import Complaint
from app.models.ai_analysis import AIAnalysis
from app.models.audit_log import AuditLog
from app.repositories.complaint_repository import ComplaintRepository
from app.langgraph.nodes import risk_analysis
from app.services.complaint_service import ComplaintService
from app.schemas.complaint import ComplaintCreate


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        auth = await client.post("/api/v1/auth/demo")
        client.headers["Authorization"] = "Bearer " + auth.json()["token"]["access_token"]
        yield client


@pytest.mark.asyncio
async def test_create_clear_and_audit(client):
    response = await client.post("/api/v1/complaints", json={
        "customer_name": "Example", "status": "committed",
        "risk_assessment": {"severity": "Critical", "rationale": "Extra AI metadata"},
    })
    assert response.status_code == 201, response.text
    record = response.json()
    assert record["ai_analyses"][0]["severity"] == "Critical"
    updated = await client.patch("/api/v1/complaints/" + record["id"], json={"customer_name": None})
    assert updated.status_code == 200
    assert updated.json()["customer_name"] is None
    trail = (await client.get("/api/v1/complaints/" + record["id"] + "/audit-trail")).json()
    assert any(log["field_name"] == "customer_name" and log["old_value"] == "Example" and log["new_value"] is None for log in trail)
    fetched = await client.get("/api/v1/complaints/" + record["id"])
    assert fetched.json()["ai_analyses"][0]["severity"] == "Critical"


@pytest.mark.asyncio
async def test_invalid_status_and_analysis_rejected(client):
    for payload in ({"status": "invalid"}, {"status": None}, {"risk_assessment": {"severity": "imaginary"}}):
        response = await client.post("/api/v1/complaints", json=payload)
        assert response.status_code == 422
    record = (await client.post("/api/v1/complaints", json={})).json()
    response = await client.patch("/api/v1/complaints/" + record["id"], json={"status": None})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_sort_cannot_access_orm_relationship(client):
    response = await client.get("/api/v1/complaints", params={"sort_by": "ai_analyses"})
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_dashboard_uses_latest_assessment(client, isolated_database):
    record = (await client.post("/api/v1/complaints", json={"risk_assessment": {"severity": "Critical"}})).json()
    async with isolated_database() as db:
        await ComplaintRepository(db).save_ai_analysis(record["id"], {"severity": "Minor"})
        await db.commit()
    stats = (await client.get("/api/v1/dashboard/stats")).json()
    assert stats["total_complaints"] == 1
    assert stats["critical_complaints"] == 0
    charts = (await client.get("/api/v1/dashboard/charts")).json()
    assert charts["severity_distribution"] == [{"severity": "Minor", "count": 1, "percentage": 100.0}]
    assert charts["monthly_trend"][0]["minor"] == 1
    fetched = (await client.get("/api/v1/complaints/" + record["id"])).json()
    assert fetched["ai_analyses"][-1]["severity"] == "Minor"


@pytest.mark.asyncio
async def test_creation_rolls_back_when_audit_fails(isolated_database, monkeypatch):
    from app.repositories.audit_repository import AuditRepository
    async def fail(*args, **kwargs):
        raise RuntimeError("audit unavailable")
    monkeypatch.setattr(AuditRepository, "log", fail)
    async with isolated_database() as db:
        with pytest.raises(RuntimeError):
            await ComplaintService(db).create_complaint(ComplaintCreate(customer_name="Must roll back"))
        await db.rollback()
    async with isolated_database() as db:
        assert await db.scalar(select(func.count()).select_from(Complaint)) == 0
        assert await db.scalar(select(func.count()).select_from(AuditLog)) == 0


@pytest.mark.asyncio
async def test_missing_summary_record(client):
    response = await client.post("/api/v1/copilot/summary", json={"complaint_id": "missing"})
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_failed_risk_is_not_a_successful_classification(monkeypatch):
    async def fail(**kwargs):
        raise RuntimeError("provider unavailable")
    monkeypatch.setattr(risk_analysis, "invoke_llm_with_retry", fail)
    result = await risk_analysis.risk_analysis_node({"complaint": {"product_name": "Test"}, "intent": "NEW_COMPLAINT", "status": "processing"})
    assert result["status"] == "error"
    assert result["risk_assessment"]["severity"] is None
    assert result["risk_assessment"]["regulatory_reportable"] is None


@pytest.mark.asyncio
async def test_copilot_state_survives_service_recreation(isolated_database, monkeypatch):
    from app.services import copilot_service
    observed = []
    class FakeGraph:
        async def ainvoke(self, state, config):
            observed.append(state)
            return {**state, "complaint": {"product_name": "Preserved"},
                    "risk_assessment": {"severity": "Minor"},
                    "assistant_message": "Saved", "status": "success"}
    monkeypatch.setattr(copilot_service, "build_graph", lambda **kwargs: FakeGraph())
    async with isolated_database() as db:
        first = await copilot_service.CopilotService(db).process_chat("New complaint")
    async with isolated_database() as db:
        await copilot_service.CopilotService(db).process_chat("Update customer", session_id=first.session_id)
    assert observed[1]["complaint"]["product_name"] == "Preserved"
    assert observed[1]["risk_assessment"]["severity"] == "Minor"


@pytest.mark.asyncio
async def test_delete_cleans_related_records(client):
    record = (await client.post("/api/v1/complaints", json={})).json()
    response = await client.delete("/api/v1/complaints/" + record["id"])
    assert response.status_code == 204
    assert (await client.get("/api/v1/complaints/" + record["id"])).status_code == 404


@pytest.mark.asyncio
async def test_upload_limits_and_empty_files(client):
    response = await client.post("/api/v1/copilot/upload", files={"file": ("empty.txt", b"", "text/plain")})
    assert response.status_code == 400
    response = await client.post("/api/v1/copilot/upload", files={"file": ("bad.exe", b"data", "application/octet-stream")})
    assert response.status_code == 400


def test_cors_environment_alias(monkeypatch):
    from app.core.config import Settings
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "https://example.test,http://localhost:5174")
    assert Settings(_env_file=None).cors_allowed_origins == ["https://example.test", "http://localhost:5174"]


@pytest.mark.asyncio
async def test_login_does_not_provision_privileged_accounts(client):
    response = await client.post("/api/v1/auth/login", json={"email": "admin@pharmassist.com", "password": "admin1234"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_long_password_is_auth_failure_not_server_error(client):
    response = await client.post("/api/v1/auth/login", json={"email": "demo@pharmassist.com", "password": "a" * 100})
    assert response.status_code == 401
