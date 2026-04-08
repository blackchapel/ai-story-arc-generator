import uuid
from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.sql import func

from src.database import Base


class OtpSchema(Base):
    __tablename__ = "otps"

    id         = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email      = Column(String(255), nullable=False, index=True)
    otp_hash   = Column(String(64), nullable=False)   # SHA-256 of the 6-digit code
    expires_at = Column(DateTime(timezone=True), nullable=False)
    attempts   = Column(Integer, default=0, nullable=False)
    used       = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
