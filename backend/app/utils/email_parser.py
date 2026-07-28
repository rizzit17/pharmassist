"""Email/plain-text complaint extraction."""
import logging
from typing import TypedDict

logger = logging.getLogger(__name__)


class EmailParseResult(TypedDict):
    text: str
    subject: str
    sender: str


async def extract_text_from_email(file_path: str) -> EmailParseResult:
    """
    Extract plain text from an .eml file or plain text file.
    Handles both RFC 2822 email format and raw plain text.
    """
    try:
        import email as email_lib
        with open(file_path, "rb") as f:
            msg = email_lib.message_from_bytes(f.read())

        subject = msg.get("Subject", "")
        sender = msg.get("From", "")
        body_parts = []

        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain":
                    payload = part.get_payload(decode=True)
                    if payload:
                        body_parts.append(payload.decode("utf-8", errors="ignore"))
        else:
            payload = msg.get_payload(decode=True)
            if payload:
                body_parts.append(payload.decode("utf-8", errors="ignore"))

        full_text = "\n".join(body_parts).strip()
        if full_text:
            # Prepend subject/sender context
            header = f"Email Subject: {subject}\nFrom: {sender}\n\n"
            return {"text": header + full_text, "subject": subject, "sender": sender}

    except Exception as e:
        logger.warning("Email parser failed (%s), reading as plain text", e)

    # Fallback: read as plain text
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
        return {"text": text, "subject": "", "sender": ""}
    except Exception as e:
        logger.error("Email/text extraction failed: %s", e)
        return {"text": "", "subject": "", "sender": ""}
