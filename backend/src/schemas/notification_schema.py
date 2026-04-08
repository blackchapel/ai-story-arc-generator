import uuid
from sqlalchemy import Column, Text, DateTime, String
from sqlalchemy.sql import func
from src.database import Base


class NotificationSchema(Base):
    __tablename__ = "notifications"

    id         = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id     = Column(Text, nullable=False, index=True)
    email      = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    sent_at    = Column(DateTime(timezone=True), nullable=True)
