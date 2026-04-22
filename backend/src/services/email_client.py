import logging
import os

import httpx
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

_EMAIL_SERVICE_URL = os.environ.get("EMAIL_SERVICE_URL", "").rstrip("/")
_EMAIL_API_KEY     = os.environ.get("EMAIL_API_KEY", "")
_TIMEOUT           = httpx.Timeout(10.0)


def _send_email(*, to_email: str, subject: str, html_body: str, text_body: str) -> None:
    """POST to the email microservice's generic /send-email endpoint."""
    if not _EMAIL_SERVICE_URL:
        raise RuntimeError("EMAIL_SERVICE_URL environment variable is not set")
    if not _EMAIL_API_KEY:
        raise RuntimeError("EMAIL_API_KEY environment variable is not set")

    try:
        response = httpx.post(
            f"{_EMAIL_SERVICE_URL}/send-email",
            json={
                "to_email": to_email,
                "subject": subject,
                "html_body": html_body,
                "text_body": text_body,
            },
            headers={"X-API-Key": _EMAIL_API_KEY},
            timeout=_TIMEOUT,
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.error(
            "Email service returned %s for %s: %s",
            exc.response.status_code,
            to_email,
            exc.response.text,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to send email. Please try again.",
        ) from exc
    except httpx.RequestError as exc:
        logger.error("Email service unreachable: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to send email. Please try again.",
        ) from exc


# ── Templates ─────────────────────────────────────────────────────────────────

_BASE_STYLES = (
    "margin:0;padding:0;background:#f5f5f5;"
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"
)

_LOGO = (
    '<span style="font-size:28px;font-weight:900;letter-spacing:-1.5px;color:#0C0C0C;">'
    'arc<span style="color:#F5A623;">.</span>'
    "</span>"
)


def _wrap_card(body_rows: str) -> str:
    """Wrap content rows in the shared email card shell."""
    return f"""<!DOCTYPE html>
<html>
  <body style="{_BASE_STYLES}">
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
              <td align="center" style="padding:32px 40px 0;">{_LOGO}</td>
            </tr>
            {body_rows}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""


def _magic_link_html(magic_link: str) -> str:
    rows = f"""
    <tr>
      <td style="padding:24px 40px 8px;text-align:center;">
        <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0C0C0C;">Sign in to arc.</p>
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
    </tr>"""
    return _wrap_card(rows)


def _otp_html(otp_code: str) -> str:
    digits = "".join(
        f'<span style="display:inline-block;width:44px;height:54px;line-height:54px;'
        f'text-align:center;background:#F5F5FF;border:1.5px solid #E0E0FF;'
        f'border-radius:10px;font-size:26px;font-weight:700;color:#6366F1;'
        f'margin:0 3px;">{d}</span>'
        for d in otp_code
    )
    rows = f"""
    <tr>
      <td style="padding:24px 40px 8px;text-align:center;">
        <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0C0C0C;">Your sign-in code</p>
        <p style="margin:0;font-size:14px;color:#8C8C8C;line-height:1.55;">
          Enter this code in the arc. app to sign in.<br>
          It expires in <strong>10 minutes</strong> and can only be used once.
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:28px 40px 36px;">
        <div style="display:inline-block;">{digits}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:0 40px 28px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#ABABAB;line-height:1.6;">
          If you did not request this code, you can safely ignore this email.<br>
          Never share this code with anyone.
        </p>
      </td>
    </tr>"""
    return _wrap_card(rows)


# ── Public API ────────────────────────────────────────────────────────────────

def send_magic_link_email(to_email: str, magic_link: str) -> None:
    text_body = (
        f"Sign in to arc. by clicking this link:\n{magic_link}\n\n"
        "This link expires in 30 minutes and can only be used once.\n"
        "If you did not request this, ignore this email."
    )
    _send_email(
        to_email=to_email,
        subject="Sign in to arc.",
        html_body=_magic_link_html(magic_link),
        text_body=text_body,
    )
    logger.info("Magic link email dispatched to %s", to_email)


def send_otp_email(to_email: str, otp_code: str) -> None:
    text_body = (
        f"Your arc. sign-in code is: {otp_code}\n\n"
        "Enter this code in the arc. app to complete sign-in.\n"
        "It expires in 10 minutes and can only be used once.\n"
        "If you did not request this, ignore this email."
    )
    _send_email(
        to_email=to_email,
        subject=f"{otp_code} is your arc. sign-in code",
        html_body=_otp_html(otp_code),
        text_body=text_body,
    )
    logger.info("OTP email dispatched to %s", to_email)
