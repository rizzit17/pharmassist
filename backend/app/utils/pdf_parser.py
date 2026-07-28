"""PDF text extraction using pdfplumber with pypdf fallback."""
import logging
from typing import TypedDict

logger = logging.getLogger(__name__)


class ParseResult(TypedDict):
    text: str
    pages: int
    method: str


async def extract_text_from_pdf(file_path: str) -> ParseResult:
    """
    Extract text from a PDF file.
    Tries pdfplumber first (better layout handling), falls back to pypdf.
    """
    try:
        import pdfplumber
        text_parts = []
        with pdfplumber.open(file_path) as pdf:
            pages = len(pdf.pages)
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)

        full_text = "\n\n".join(text_parts).strip()
        if full_text:
            logger.info("pdfplumber extracted %d chars from %d pages", len(full_text), pages)
            return {"text": full_text, "pages": pages, "method": "pdfplumber"}

    except Exception as e:
        logger.warning("pdfplumber failed (%s), trying pypdf", e)

    try:
        from pypdf import PdfReader
        reader = PdfReader(file_path)
        pages = len(reader.pages)
        text_parts = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                text_parts.append(text)
        full_text = "\n\n".join(text_parts).strip()
        logger.info("pypdf extracted %d chars from %d pages", len(full_text), pages)
        return {"text": full_text, "pages": pages, "method": "pypdf"}

    except Exception as e:
        logger.error("PDF extraction failed entirely: %s", e)
        return {"text": "", "pages": 0, "method": "failed"}
