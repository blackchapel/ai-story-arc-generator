import logging
import time
from collections import defaultdict
from threading import Lock
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.dependencies.auth import get_current_user
from src.models.auth_model import (
    RefreshRequest,
    SendOtpRequest,
    TokenResponse,
    UserResponse,
    VerifyOtpRequest,
)
from src.schemas.user_schema import UserSchema
from src.services.auth_service import logout_user, refresh_access_token, send_otp, verify_otp
from src.services.email_service import send_otp_email

router = APIRouter()
logger = logging.getLogger(__name__)

# ── Rate limiter: 5 requests per IP per 60 s ─────────────────────────────────

_LIMIT  = 5
_WINDOW = 60
_store: dict[str, list[float]] = defaultdict(list)
_lock = Lock()


def _rate_limit(ip: str) -> None:
    now    = time.monotonic()
    cutoff = now - _WINDOW
    with _lock:
        _store[ip] = [t for t in _store[ip] if t > cutoff]
        # Remove the key entirely when the window is empty to prevent
        # unbounded growth of the dict (stale IPs would accumulate forever).
        if not _store[ip]:
            del _store[ip]
            _store[ip]  # re-initialise via defaultdict
        if len(_store[ip]) >= _LIMIT:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
            )
        _store[ip].append(now)


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/send-otp", status_code=status.HTTP_200_OK)
def send_otp_route(
    body: SendOtpRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    _rate_limit(request.client.host if request.client else "unknown")
    code = send_otp(body.email, db)
    try:
        send_otp_email(body.email, code)
    except Exception as exc:
        logger.error("Failed to send OTP email to %s: %s", body.email, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to send verification email. Please try again.",
        ) from exc
    return {"message": "OTP sent"}


@router.post("/verify-otp", response_model=TokenResponse)
def verify_otp_route(
    body: VerifyOtpRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    _rate_limit(request.client.host if request.client else "unknown")
    access, refresh = verify_otp(body.email, body.code, db)
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    access, refresh = refresh_access_token(body.refresh_token, db)
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/logout")
def logout(body: RefreshRequest, db: Session = Depends(get_db)) -> dict:
    logout_user(body.refresh_token, db)
    return {"message": "Logged out"}


@router.get("/me", response_model=UserResponse)
def me(current_user: Annotated[UserSchema, Depends(get_current_user)]) -> UserResponse:
    return UserResponse.model_validate(current_user)
