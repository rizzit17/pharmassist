"""
Core application configuration — reads from environment variables via pydantic-settings.
All secrets must come from .env or Docker environment; never hardcoded here.
"""
from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ───────────────────────────────────────────────────────
    app_name: str = "AIVOA Customer Complaint Management System"
    debug: bool = False

    # ── Database ──────────────────────────────────────────────────
    database_url: str = "sqlite+aiosqlite:///./aivoa.db"

    # ── Auth ──────────────────────────────────────────────────────
    jwt_secret: str = "dev_secret_change_in_production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440
    auth_required: bool = True

    # ── Groq / LLM ────────────────────────────────────────────────
    groq_api_key: str = ""
    primary_model: str = "llama-3.1-8b-instant"
    secondary_model: str = "llama-3.3-70b-versatile"
    use_large_model: bool = False
    groq_timeout_seconds: int = 20
    groq_max_retries: int = 2

    # ── CORS ──────────────────────────────────────────────────────
    cors_allowed_origins_str: str = "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000"

    @property
    def cors_allowed_origins(self) -> List[str]:
        return [o.strip() for o in self.cors_allowed_origins_str.split(",") if o.strip()]

    # ── File Uploads ──────────────────────────────────────────────
    upload_dir: str = "uploads"
    max_upload_size_mb: int = 10

    # ── Model selection per node ─────────────────────────────────
    # Nodes using the secondary (larger) model when use_large_model=True
    large_model_nodes: List[str] = [
        "complaint_extraction",
        "risk_analysis",
        "duplicate_detection",
    ]

    def model_for_node(self, node_name: str) -> str:
        """Return the appropriate model name for a given graph node."""
        model = self.secondary_model if (self.use_large_model and node_name in self.large_model_nodes) else self.primary_model
        if "gemma" in model.lower():
            return "llama-3.1-8b-instant"
        return model


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
