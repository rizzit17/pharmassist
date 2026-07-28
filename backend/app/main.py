"""
AIVOA Customer Complaint Management System: FastAPI Application Entry Point
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from app.core.config import settings
from app.core.logging import setup_logging
from app.db.session import create_db_tables
from app.api import complaints, copilot, dashboard, auth, health

setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    logger.info("AIVOA CMS starting up...")
    await create_db_tables()
    logger.info("Database tables verified.")
    yield
    logger.info("AIVOA CMS shutting down.")


app = FastAPI(
    title="AIVOA Customer Complaint Management System",
    description=(
        "AI-powered Quality Management System module for pharmaceutical "
        "API & FDF manufacturers. Features an AI Copilot (LangGraph multi-node "
        "graph) that extracts, validates, and risk-assesses customer complaints."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Dynamic Model Routing Middleware ──────────────────────────────
from app.utils.llm_client import active_primary_model_var, active_secondary_model_var

@app.middleware("http")
async def model_override_middleware(request, call_next):
    primary_hdr = request.headers.get("x-primary-model")
    secondary_hdr = request.headers.get("x-secondary-model")

    tok1 = active_primary_model_var.set(primary_hdr) if primary_hdr else None
    tok2 = active_secondary_model_var.set(secondary_hdr) if secondary_hdr else None
    try:
        response = await call_next(request)
        return response
    finally:
        if tok1:
            active_primary_model_var.reset(tok1)
        if tok2:
            active_secondary_model_var.reset(tok2)



# ── Global exception handlers ─────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": "An unexpected error occurred. Please try again.",
            "detail": str(exc) if settings.debug else None,
        },
    )


# ── Routers ──────────────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(health.router, prefix=API_PREFIX, tags=["Health"])
app.include_router(auth.router, prefix=f"{API_PREFIX}/auth", tags=["Auth"])
app.include_router(complaints.router, prefix=f"{API_PREFIX}/complaints", tags=["Complaints"])
app.include_router(copilot.router, prefix=f"{API_PREFIX}/copilot", tags=["Copilot / AI"])
app.include_router(dashboard.router, prefix=f"{API_PREFIX}/dashboard", tags=["Dashboard"])


@app.get("/", tags=["Root"])
async def root():
    return {
        "service": "AIVOA Customer Complaint Management System",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "operational",
    }
