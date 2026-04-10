from typing import Annotated
import logging

from fastapi import APIRouter, Depends

from src.dependencies.auth import get_current_user
from src.models.auth_model import UserResponse
from src.schemas.user_schema import UserSchema

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/me", response_model=UserResponse)
def me(
    current_user: Annotated[UserSchema, Depends(get_current_user)],
) -> UserResponse:
    return UserResponse.model_validate(current_user)
