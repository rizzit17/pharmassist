"""
Input Type Detection Node — detects whether the input is text, PDF, email, or image.
For document uploads, this node also performs text extraction before passing to extraction node.

Input state fields used: user_message, uploaded_file_path, uploaded_file_name, intent
Output state fields set: input_type, extracted_text, ocr_method
"""
import logging
from pathlib import Path

from app.langgraph.state import ComplaintGraphState

logger = logging.getLogger(__name__)


def _detect_file_type(filename: str) -> str:
    """Detect file type from extension."""
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return "pdf"
    elif ext in (".eml", ".email"):
        return "email"
    elif ext in (".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".gif"):
        return "image"
    elif ext in (".txt", ".text"):
        return "email"  # Plain text treated as email/paste
    return "text"


async def input_type_detection_node(state: ComplaintGraphState) -> dict:
    """
    Detect input type and extract text from documents.
    For text inputs, sets input_type='text' and extracted_text=user_message.
    For documents, extracts text via the appropriate parser.
    """
    try:
        uploaded_path = state.get("uploaded_file_path")
        uploaded_name = state.get("uploaded_file_name", "")

        if not uploaded_path:
            # Pure text input — no file processing needed
            return {
                "input_type": "text",
                "extracted_text": state.get("user_message", ""),
                "ocr_method": None,
            }

        file_type = _detect_file_type(uploaded_name)
        logger.info("Processing uploaded file: %s (type: %s)", uploaded_name, file_type)

        if file_type == "pdf":
            from app.utils.pdf_parser import extract_text_from_pdf
            result = await extract_text_from_pdf(uploaded_path)
            return {
                "input_type": "pdf",
                "extracted_text": result["text"],
                "ocr_method": None,
            }
        elif file_type == "email":
            from app.utils.email_parser import extract_text_from_email
            result = await extract_text_from_email(uploaded_path)
            return {
                "input_type": "email",
                "extracted_text": result["text"],
                "ocr_method": None,
            }
        elif file_type == "image":
            from app.utils.image_ocr import extract_text_from_image
            result = extract_text_from_image(uploaded_path)
            return {
                "input_type": "image",
                "extracted_text": result["text"],
                "ocr_method": result["method"],
            }
        else:
            # Treat unknown as plain text
            with open(uploaded_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
            return {"input_type": "text", "extracted_text": text, "ocr_method": None}

    except Exception as e:
        logger.error("Input type detection/extraction failed: %s", e)
        return {
            "input_type": "text",
            "extracted_text": state.get("user_message", ""),
            "ocr_method": None,
            "error": str(e),
        }
