"""
Email microservice — sends transactional emails via Gmail SMTP.
Deployed on Vercel. Called by the arc backend over HTTPS.
"""
import logging
import os
import smtplib
import time
from collections import defaultdict
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from threading import Lock
from dotenv import load_dotenv

from fastapi import FastAPI, Header, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, field_validator

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

GMAIL_ADDRESS      = _require_env("GMAIL_ADDRESS")
GMAIL_APP_PASSWORD = _require_env("GMAIL_APP_PASSWORD")
EMAIL_API_KEY      = _require_env("EMAIL_API_KEY")

_SMTP_HOST = "smtp.gmail.com"
_SMTP_PORT = 587

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

# ── SMTP ──────────────────────────────────────────────────────────────────────

def _send_email(to_email: str, msg: MIMEMultipart) -> None:
    with smtplib.SMTP(_SMTP_HOST, _SMTP_PORT, timeout=10) as server:
        server.ehlo()
        server.starttls()
        server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
        server.sendmail(GMAIL_ADDRESS, to_email, msg.as_string())

# ── Templates ─────────────────────────────────────────────────────────────────

def _magic_link_html(magic_link: str) -> str:
    return f"""<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0"
                 style="background:#ffffff;border-radius:16px;overflow:hidden;
                        box-shadow:0 2px 12px rgba(0,0,0,0.08);">
            <tr>
              <td style="height:4px;background:linear-gradient(90deg,#6366F1,#EC4899,#F5A623);"></td>
            </tr>
            <tr>
              <td align="center" style="padding:32px 40px 0;">
                <span style="font-size:28px;font-weight:900;letter-spacing:-1.5px;color:#0C0C0C;">
                  arc<span style="color:#F5A623;">.</span>
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px 8px;text-align:center;">
                <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0C0C0C;">
                  Sign in to arc.
                </p>
                <p style="margin:0;font-size:14px;color:#8C8C8C;line-height:1.55;">
                  Click the button below to sign in.<br>
                  This link expires in <strong>30 minutes</strong> and can only be used once.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:28px 40px 36px;">
                <a href="{magic_link}"
                   style="display:inline-block;padding:14px 32px;
                          background:linear-gradient(135deg,#6366F1,#8B5CF6);
                          color:#ffffff;font-size:14px;font-weight:700;
                          text-decoration:none;border-radius:10px;
                          box-shadow:0 4px 14px rgba(99,102,241,0.35);">
                  Sign in to arc.
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 28px;text-align:center;">
                <p style="margin:0;font-size:11px;color:#ABABAB;line-height:1.6;">
                  If you did not request this, you can safely ignore this email.<br>
                  If the button doesn't work, copy this link:<br>
                  <a href="{magic_link}" style="color:#6366F1;word-break:break-all;">{magic_link}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="arc. Email Service", docs_url=None, redoc_url=None)

# ── Models ────────────────────────────────────────────────────────────────────

class SendMagicLinkRequest(BaseModel):
    to_email: EmailStr
    magic_link: str

    @field_validator("magic_link")
    @classmethod
    def validate_magic_link(cls, v: str) -> str:
        if not v.startswith("https://"):
            raise ValueError("magic_link must be an HTTPS URL")
        return v

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health() -> dict:
    return {"status": "ok"}

@app.post("/send-magic-link", status_code=status.HTTP_204_NO_CONTENT)
def send_magic_link(
    body: SendMagicLinkRequest,
    request: Request,
    x_api_key: str | None = Header(default=None),
) -> None:
    _verify_api_key(x_api_key)
    ip = request.client.host if request.client else "unknown"
    _check_rate_limit(ip)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Sign in to arc."
    msg["From"]    = f"arc. <{GMAIL_ADDRESS}>"
    msg["To"]      = body.to_email

    text_body = (
        f"Sign in to arc. by clicking this link:\n{body.magic_link}\n\n"
        "This link expires in 30 minutes and can only be used once.\n"
        "If you did not request this, ignore this email."
    )

    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(_magic_link_html(body.magic_link), "html"))

    try:
        _send_email(body.to_email, msg)
        logger.info("Magic link email sent to %s", body.to_email)
    except smtplib.SMTPException as exc:
        logger.error("SMTP error sending to %s: %s", body.to_email, exc)
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
