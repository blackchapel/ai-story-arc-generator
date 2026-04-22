import hashlib
import logging
import os
import secrets
import time
import urllib.parse
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from threading import Lock
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from firebase_admin.exceptions import FirebaseError
from sqlalchemy.orm import Session

from src.database import get_db
from src.dependencies.auth import get_current_user
from src.firebase_init import create_custom_token, generate_magic_link, get_or_create_firebase_user
from src.models.auth_model import SendMagicLinkRequest, SendOtpRequest, UserResponse, VerifyOtpRequest, VerifyOtpResponse
from src.schemas.job_schema import JobSchema
from src.schemas.notification_schema import NotificationSchema
from src.schemas.otp_schema import OtpSchema
from src.schemas.output_schema import OutputSchema
from src.schemas.user_schema import UserSchema
from src.services.email_client import send_magic_link_email, send_otp_email
from src.services.gcs_service import delete_blob

router = APIRouter()
logger = logging.getLogger(__name__)

_RATE_LIMIT  = 5
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
                detail="Too many requests. Please try again later.",
            )
        _rate_store[ip].append(now)


_APP_BASE_URL    = os.environ.get("APP_BASE_URL", "").rstrip("/")
_OTP_TTL_MINUTES = 10
_OTP_MAX_ATTEMPTS = 3


@router.post("/send-magic-link", status_code=status.HTTP_204_NO_CONTENT)
def send_magic_link(body: SendMagicLinkRequest, request: Request) -> None:
    ip = request.client.host if request.client else "unknown"
    _check_rate_limit(ip)

    app_base = _APP_BASE_URL or "https://arc.example.com"

    try:
        firebase_link = generate_magic_link(str(body.email), redirect_url=app_base)
    except FirebaseError as exc:
        logger.error("Firebase magic link generation failed for %s: %s", body.email, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to generate sign-in link. Please try again.",
        ) from exc

    # Wrap in our domain so the email link opens the PWA, not Firebase's domain.
    # The frontend extracts magicUrl and passes it to signInWithEmailLink().
    wrapped = f"{app_base}/auth/verify?magicUrl={urllib.parse.quote(firebase_link, safe='')}"
    send_magic_link_email(str(body.email), wrapped)


@router.post("/send-otp", status_code=status.HTTP_204_NO_CONTENT)
def send_otp(body: SendOtpRequest, request: Request, db: Session = Depends(get_db)) -> None:
    ip = request.client.host if request.client else "unknown"
    _check_rate_limit(ip)

    code = f"{secrets.randbelow(1_000_000):06d}"
    otp_hash = hashlib.sha256(code.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=_OTP_TTL_MINUTES)

    otp = OtpSchema(email=str(body.email), otp_hash=otp_hash, expires_at=expires_at)
    db.add(otp)
    db.commit()

    send_otp_email(str(body.email), code)


@router.post("/verify-otp", response_model=VerifyOtpResponse)
def verify_otp(body: VerifyOtpRequest, db: Session = Depends(get_db)) -> VerifyOtpResponse:
    now = datetime.now(timezone.utc)
    code_hash = hashlib.sha256(body.code.encode()).hexdigest()

    otp = (
        db.query(OtpSchema)
        .filter(
            OtpSchema.email == str(body.email),
            OtpSchema.used == False,  # noqa: E712
            OtpSchema.expires_at > now,
        )
        .order_by(OtpSchema.created_at.desc())
        .first()
    )

    if otp is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code has expired. Please request a new one.",
        )

    otp.attempts += 1

    if otp.attempts > _OTP_MAX_ATTEMPTS:
        otp.used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many attempts. Please request a new code.",
        )

    if otp.otp_hash != code_hash:
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid code. Please try again.",
        )

    otp.used = True
    db.commit()

    uid = get_or_create_firebase_user(str(body.email))
    token = create_custom_token(uid)
    return VerifyOtpResponse(custom_token=token)


@router.get("/me", response_model=UserResponse)
def me(
    current_user: Annotated[UserSchema, Depends(get_current_user)],
) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(
    current_user: Annotated[UserSchema, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> None:
    # 1. Fetch all arcs owned by this user.
    user_arcs = (
        db.query(OutputSchema)
        .filter(OutputSchema.user_id == current_user.id)
        .all()
    )

    # 2. Best-effort GCS cleanup for each owned arc.
    for arc in user_arcs:
        if arc.html and arc.html.startswith("https://storage.googleapis.com/"):
            # URL format: https://storage.googleapis.com/{bucket}/{path}
            parts = arc.html.split("/", 4)
            if len(parts) == 5:
                delete_blob(parts[4])

    # 3. Collect all job IDs belonging to this user.
    user_job_ids: list[str] = [
        row.id
        for row in db.query(JobSchema.id).filter(JobSchema.user_id == current_user.id).all()
    ]

    # 4. Delete notifications for those jobs (no FK cascade on NotificationSchema.job_id).
    if user_job_ids:
        db.query(NotificationSchema).filter(
            NotificationSchema.job_id.in_(user_job_ids)
        ).delete(synchronize_session=False)

    # 5. Delete each owned arc (cascades to saved_arcs rows referencing these arcs).
    for arc in user_arcs:
        db.delete(arc)

    # 6. Delete the user row (cascades to jobs via CASCADE, and to saved_arcs where
    #    this user saved others' arcs via CASCADE).
    db.delete(current_user)

    # 7. Commit all changes atomically.
    db.commit()
