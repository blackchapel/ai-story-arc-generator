from typing import Annotated
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin.exceptions import FirebaseError
from sqlalchemy.orm import Session

from src.database import get_db
from src.firebase_init import verify_firebase_token
from src.schemas.user_schema import UserSchema
from src.services.auth_service import get_or_create_user

logger = logging.getLogger(__name__)
_bearer = HTTPBearer()


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> UserSchema:
    try:
        claims: dict = verify_firebase_token(credentials.credentials)
    except FirebaseError as exc:
        logger.debug("Firebase token verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    firebase_uid: str | None = claims.get("uid")
    email: str | None = claims.get("email")

    if not firebase_uid or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing required claims",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = get_or_create_user(firebase_uid=firebase_uid, email=email, db=db)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    return user
