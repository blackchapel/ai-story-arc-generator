import logging
import os

import httpx
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

_EMAIL_SERVICE_URL = os.environ.get("EMAIL_SERVICE_URL", "").rstrip("/")
_EMAIL_API_KEY     = os.environ.get("EMAIL_API_KEY", "")

_TIMEOUT = httpx.Timeout(10.0)


def send_magic_link_email(to_email: str, magic_link: str) -> None:
    """Call the email microservice to send a magic link email.
    Raises HTTPException(503) if the microservice is unreachable or returns an error.
    """
    if not _EMAIL_SERVICE_URL:
        raise RuntimeError("EMAIL_SERVICE_URL environment variable is not set")
    if not _EMAIL_API_KEY:
        raise RuntimeError("EMAIL_API_KEY environment variable is not set")

    try:
        response = httpx.post(
            f"{_EMAIL_SERVICE_URL}/send-magic-link",
            json={"to_email": to_email, "magic_link": magic_link},
            headers={"X-API-Key": _EMAIL_API_KEY},
            timeout=_TIMEOUT,
        )
        response.raise_for_status()
        logger.info("Magic link email dispatched to %s", to_email)
    except httpx.HTTPStatusError as exc:
        logger.error(
            "Email service returned %s for %s: %s",
            exc.response.status_code,
            to_email,
            exc.response.text,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to send sign-in email. Please try again.",
        ) from exc
    except httpx.RequestError as exc:
        logger.error("Email service unreachable: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to send sign-in email. Please try again.",
        ) from exc
