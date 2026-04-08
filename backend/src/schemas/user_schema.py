import uuid
from sqlalchemy import Boolean, Column, DateTime, String
from sqlalchemy.sql import func

from src.database import Base


class UserSchema(Base):
    __tablename__ = "users"

    id         = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email      = Column(String(255), unique=True, nullable=False, index=True)
    is_active  = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
