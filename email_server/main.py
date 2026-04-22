"""
Email microservice — generic transactional email transport via Mailjet.
Deployed on Vercel. Called by the arc backend over HTTPS.
The backend is responsible for all template rendering and subject construction;
this service is purely a transport layer.
"""
import logging
import os
import time
from collections import defaultdict
from threading import Lock

from dotenv import load_dotenv
import httpx

from fastapi import FastAPI, Header, HTTPException, Request, status
from pydantic import BaseModel, EmailStr

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","level":"%(levelname)s","name":"%(name)s","msg":"%(message)s"}',
    datefmt="%Y-%m-%dT%H:%M:%SZ",
)
logger = logging.getLogger("email_server")

# ── Config ────────────────────────────────────────────────────────────────────

load_dotenv()


def _require_env(name: str) -> str:
    val = os.environ.get(name, "").strip()
    if not val:
        raise RuntimeError(f"Required environment variable '{name}' is not set")
    return val


EMAIL_API_KEY        = _require_env("EMAIL_API_KEY")
MAILJET_API_KEY      = _require_env("MAILJET_API_KEY")
MAILJET_API_SECRET   = _require_env("MAILJET_API_SECRET")
MAILJET_SENDER_EMAIL = _require_env("MAILJET_SENDER_EMAIL")
MAILJET_SENDER_NAME  = os.environ.get("MAILJET_SENDER_NAME", "arc.").strip()

_MAILJET_URL = "https://api.mailjet.com/v3.1/send"
_MAILJET_TIMEOUT = httpx.Timeout(10.0)

# ── Rate limiter ──────────────────────────────────────────────────────────────

_RATE_LIMIT  = 20
_RATE_WINDOW = 60
_rate_store: dict[str, list[float]] = defaultdict(list)
_rate_lock = Lock()


def _check_rate_limit(ip: str) -> None:
    now    = time.monotonic()
    cutoff = now - _RATE_WINDOW
    with _rate_lock:
        _rate_store[ip] = [t for t in _rate_store[ip] if t > cutoff]
        if len(_rate_store[ip]) >= _RATE_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later.",
            )
        _rate_store[ip].append(now)

# ── Auth ──────────────────────────────────────────────────────────────────────


def _verify_api_key(x_api_key: str | None) -> None:
    if not x_api_key or x_api_key != EMAIL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
        )

# ── Transport ─────────────────────────────────────────────────────────────────


def _dispatch(to_email: str, to_name: str, subject: str, text_body: str, html_body: str) -> None:
    payload = {
        "Messages": [
            {
                "From": {"Email": MAILJET_SENDER_EMAIL, "Name": MAILJET_SENDER_NAME},
                "To": [{"Email": to_email, "Name": to_name}],
                "Subject": subject,
                "TextPart": text_body,
                "HTMLPart": html_body,
            }
        ]
    }
    response = httpx.post(
        _MAILJET_URL,
        json=payload,
        auth=(MAILJET_API_KEY, MAILJET_API_SECRET),
        timeout=_MAILJET_TIMEOUT,
    )
    response.raise_for_status()

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="arc. Email Service", docs_url=None, redoc_url=None)

# ── Models ────────────────────────────────────────────────────────────────────


class SendEmailRequest(BaseModel):
    to_email: EmailStr
    to_name: str = ""
    subject: str
    html_body: str
    text_body: str

# ── Routes ────────────────────────────────────────────────────────────────────


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/send-email", status_code=status.HTTP_204_NO_CONTENT)
def send_email(
    body: SendEmailRequest,
    request: Request,
    x_api_key: str | None = Header(default=None),
) -> None:
    _verify_api_key(x_api_key)
    ip = request.client.host if request.client else "unknown"
    _check_rate_limit(ip)

    to_name = body.to_name or body.to_email

    try:
        _dispatch(body.to_email, to_name, body.subject, body.text_body, body.html_body)
        logger.info("Email sent to %s | subject=%r", body.to_email, body.subject)
    except httpx.HTTPError as exc:
        logger.error("Mailjet error sending to %s: %s", body.to_email, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to send email. Please try again.",
        ) from exc
    except Exception as exc:
        logger.error("Unexpected error sending to %s: %s", body.to_email, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to send email. Please try again.",
        ) from exc
