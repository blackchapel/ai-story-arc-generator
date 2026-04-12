import logging
import os
import time
from collections import defaultdict
from threading import Lock
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from firebase_admin.exceptions import FirebaseError

from src.dependencies.auth import get_current_user
from src.firebase_init import generate_magic_link
from src.models.auth_model import SendMagicLinkRequest, UserResponse
from src.schemas.user_schema import UserSchema
from src.services.email_client import send_magic_link_email

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


_APP_BASE_URL = os.environ.get("APP_BASE_URL", "").rstrip("/")


@router.post("/send-magic-link", status_code=status.HTTP_204_NO_CONTENT)
def send_magic_link(body: SendMagicLinkRequest, request: Request) -> None:
    ip = request.client.host if request.client else "unknown"
    _check_rate_limit(ip)
    try:
        link = generate_magic_link(
            str(body.email),
            redirect_url=_APP_BASE_URL or "https://arc.example.com",
        )
    except FirebaseError as exc:
        logger.error("Firebase magic link generation failed for %s: %s", body.email, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to generate sign-in link. Please try again.",
        ) from exc
    send_magic_link_email(str(body.email), link)


@router.get("/me", response_model=UserResponse)
def me(
    current_user: Annotated[UserSchema, Depends(get_current_user)],
) -> UserResponse:
    return UserResponse.model_validate(current_user)
