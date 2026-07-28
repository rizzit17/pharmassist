"""
Image OCR utility. Per IMPLEMENTATION_NOTES.md decision 5:
- If pytesseract + Tesseract binary are available: run OCR, method="tesseract"
- If unavailable: method="stub", text="", caller must emit clarifying message

Exposes: extract_text_from_image(path) -> OCRResult
"""
import logging
from typing import TypedDict

logger = logging.getLogger(__name__)


class OCRResult(TypedDict):
    text: str
    method: str  # tesseract | stub
    confidence: float


def _tesseract_available() -> bool:
    """Check if pytesseract and Tesseract binary are available."""
    try:
        import pytesseract
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


def extract_text_from_image(file_path: str) -> OCRResult:
    """
    Extract text from an image file.
    Returns OCRResult with method indicating whether real OCR or stub was used.
    """
    if _tesseract_available():
        try:
            import pytesseract
            from PIL import Image
            img = Image.open(file_path)
            # Run OCR with pharmaceutical-context page segmentation
            text = pytesseract.image_to_string(img, config="--psm 6")
            text = text.strip()
            logger.info("Tesseract OCR extracted %d chars from image", len(text))
            return {"text": text, "method": "tesseract", "confidence": 0.8 if text else 0.0}
        except Exception as e:
            logger.error("Tesseract OCR failed: %s", e)
            return {"text": "", "method": "stub", "confidence": 0.0}
    else:
        logger.info("Tesseract not available — returning OCR stub result")
        return {"text": "", "method": "stub", "confidence": 0.0}
