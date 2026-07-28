"""Health check endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.config import settings
from app.core.dependencies import get_db

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok", "service": "AIVOA CMS Backend"}


@router.get("/health/db")
async def health_db(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": str(e)}


@router.get("/health/llm")
async def health_llm():
    has_key = bool(settings.groq_api_key)
    return {
        "status": "ok" if has_key else "no_api_key",
        "model": settings.primary_model,
        "groq_api_key_set": has_key,
    }
