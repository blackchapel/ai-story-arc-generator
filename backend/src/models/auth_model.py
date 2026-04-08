from datetime import datetime
from pydantic import BaseModel, ConfigDict


class SendOtpRequest(BaseModel):
    email: str  # validated via regex in auth_service


class VerifyOtpRequest(BaseModel):
    email: str
    code: str   # 6-digit string


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    email: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
