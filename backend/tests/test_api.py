"""Unit tests for FastAPI endpoints."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_demo_auth_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/auth/demo")
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert "access_token" in data["token"]


@pytest.mark.asyncio
async def test_dashboard_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        auth_res = await ac.post("/api/v1/auth/demo")
        token = auth_res.json()["token"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        response = await ac.get("/api/v1/dashboard/stats", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_complaints" in data
    assert "critical_complaints" in data
