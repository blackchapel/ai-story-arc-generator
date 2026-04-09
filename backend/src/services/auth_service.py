import hashlib
import os
import re
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from src.schemas.otp_schema import OtpSchema
from src.schemas.refresh_token_schema import RefreshTokenSchema
from src.schemas.user_schema import UserSchema

# ── Configuration ─────────────────────────────────────────────────────────────

ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS   = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
ALGORITHM                   = "HS256"

_OTP_TTL_MINUTES       = 10
_OTP_RATE_LIMIT_COUNT  = 3
_OTP_RATE_LIMIT_WINDOW = 10   # minutes
_OTP_MAX_ATTEMPTS      = 3

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable must be set")

# ── Email validation ───────────────────────────────────────────────────────────

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _validate_email(email: str) -> None:
    if not _EMAIL_RE.match(email):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid email address",
        )


# ── JWT ───────────────────────────────────────────────────────────────────────

def create_access_token(user_id: str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": user_id, "email": email, "exp": expire},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def _decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if not payload.get("sub"):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return payload
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")


# ── Refresh tokens ────────────────────────────────────────────────────────────

def _new_refresh_token() -> str:
    return secrets.token_urlsafe(64)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


# ── OTP helpers ───────────────────────────────────────────────────────────────

def _hash_otp(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


# ── Service functions ─────────────────────────────────────────────────────────

def send_otp(email: str, db: Session) -> str:
    """Generate, store, and return a 6-digit OTP for the given email.

    Raises:
        422 – invalid email format
        429 – rate limit exceeded (3 OTPs in 10 min)
    """
    _validate_email(email)

    now = datetime.now(timezone.utc)
    window_start = now - timedelta(minutes=_OTP_RATE_LIMIT_WINDOW)

    recent_count = (
        db.query(OtpSchema)
        .filter(
            OtpSchema.email == email,
            OtpSchema.created_at >= window_start,
        )
        .count()
    )
    if recent_count >= _OTP_RATE_LIMIT_COUNT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many OTP requests. Please wait before requesting a new code.",
        )

    code = str(secrets.randbelow(1_000_000)).zfill(6)
    otp_hash = _hash_otp(code)

    # Delete any previous unused OTPs for this email
    db.query(OtpSchema).filter(
        OtpSchema.email == email,
        OtpSchema.used == False,  # noqa: E712
    ).delete(synchronize_session=False)

    db.add(OtpSchema(
        email      = email,
        otp_hash   = otp_hash,
        expires_at = now + timedelta(minutes=_OTP_TTL_MINUTES),
    ))
    db.commit()
    return code


def verify_otp(email: str, code: str, db: Session) -> tuple[str, str]:
    """Verify the OTP and return (access_token, refresh_token).

    Raises:
        404 – no pending OTP found
        429 – too many failed attempts
        401 – invalid code
    """
    now = datetime.now(timezone.utc)

    record = (
        db.query(OtpSchema)
        .filter(
            OtpSchema.email == email,
            OtpSchema.used == False,  # noqa: E712
            OtpSchema.expires_at > now,
        )
        .order_by(OtpSchema.created_at.desc())
        .first()
    )

    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No pending OTP")

    record.attempts += 1
    if record.attempts >= _OTP_MAX_ATTEMPTS:
        record.used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Please request a new code.",
        )

    if record.otp_hash != _hash_otp(code):
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid code")

    record.used = True
    db.commit()

    # Find or create user by email (upsert)
    user = db.query(UserSchema).filter(UserSchema.email == email).first()
    if not user:
        user = UserSchema(email=email)
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

    access_token  = create_access_token(user.id, user.email)
    refresh_token = _new_refresh_token()

    db.add(RefreshTokenSchema(
        user_id    = user.id,
        token_hash = _hash_token(refresh_token),
        expires_at = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    ))
    db.commit()
    return access_token, refresh_token


def refresh_access_token(refresh_token: str, db: Session) -> tuple[str, str]:
    token_hash = _hash_token(refresh_token)
    now        = datetime.now(timezone.utc)

    record = db.query(RefreshTokenSchema).filter(
        RefreshTokenSchema.token_hash == token_hash
    ).first()

    if not record or record.revoked:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    expires = record.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < now:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    user = db.query(UserSchema).filter(
        UserSchema.id == record.user_id, UserSchema.is_active == True  # noqa: E712
    ).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    # Rotate — revoke old, issue new
    record.revoked = True
    new_refresh    = _new_refresh_token()
    new_access     = create_access_token(user.id, user.email)

    db.add(RefreshTokenSchema(
        user_id    = user.id,
        token_hash = _hash_token(new_refresh),
        expires_at = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    ))
    db.commit()
    return new_access, new_refresh


def logout_user(refresh_token: str, db: Session) -> None:
    token_hash = _hash_token(refresh_token)
    record = db.query(RefreshTokenSchema).filter(
        RefreshTokenSchema.token_hash == token_hash
    ).first()
    if record:
        record.revoked = True
        db.commit()
