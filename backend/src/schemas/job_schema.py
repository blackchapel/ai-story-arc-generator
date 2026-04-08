import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from src.database import Base


class JobSchema(Base):
    __tablename__ = "jobs"

    id         = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id    = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    prompt     = Column(Text, nullable=False)
    status     = Column(String(30), nullable=False, default="FETCHING_ARTICLES")
    arc_id     = Column(String(36), ForeignKey("outputs.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
