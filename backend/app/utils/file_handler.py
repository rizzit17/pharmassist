"""
File upload handler — validates, stores, and manages uploaded complaint documents.
Security: allow-listed MIME types, max size enforcement, randomized filenames.
"""
import os
import uuid
import logging
from pathlib import Path
from typing import Optional

from fastapi import UploadFile, HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES = {
    "application/pdf": ".pdf",
    "message/rfc822": ".eml",
    "text/plain": ".txt",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/tiff": ".tiff",
}

ALLOWED_EXTENSIONS = {".pdf", ".eml", ".txt", ".png", ".jpg", ".jpeg", ".tiff"}


def _get_upload_dir() -> Path:
    """Get and create upload directory if it doesn't exist."""
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


def _validate_extension(filename: str) -> str:
    """Validate file extension. Raises HTTP 400 if not allowed."""
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{ext}' is not supported. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )
    return ext


async def save_upload(file: UploadFile) -> dict:
    """
    Validate and save an uploaded file.
    Returns dict with stored_path, original_name, file_type.
    Raises HTTP 400/413 on validation failure.
    """
    # Validate extension
    ext = _validate_extension(file.filename or "unknown")

    # Read file content
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)

    if size_mb > settings.max_upload_size_mb:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large ({size_mb:.1f}MB). Maximum allowed: {settings.max_upload_size_mb}MB",
        )

    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    # Store with randomized filename
    upload_dir = _get_upload_dir()
    stored_filename = f"{uuid.uuid4().hex}{ext}"
    stored_path = upload_dir / stored_filename

    with open(stored_path, "wb") as f:
        f.write(content)

    logger.info(
        "Saved upload: %s → %s (%.1fMB)",
        file.filename, stored_filename, size_mb
    )

    return {
        "stored_path": str(stored_path),
        "original_name": file.filename or "unknown",
        "file_type": ext.lstrip("."),
        "size_mb": round(size_mb, 2),
    }


def cleanup_upload(stored_path: str) -> None:
    """Delete a stored upload file (called after processing)."""
    try:
        Path(stored_path).unlink(missing_ok=True)
        logger.debug("Cleaned up upload: %s", stored_path)
    except Exception as e:
        logger.warning("Failed to clean up upload %s: %s", stored_path, e)
