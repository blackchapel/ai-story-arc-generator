from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from src.database import get_db
from src.schemas.user_schema import UserSchema
from src.services.auth_service import _decode_access_token

_bearer = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_db),
) -> UserSchema:
    payload = _decode_access_token(credentials.credentials)
    user = (
        db.query(UserSchema)
        .filter(UserSchema.id == payload["sub"], UserSchema.is_active == True)  # noqa: E712
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user
