import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from src.database import Base


class SavedArcSchema(Base):
    __tablename__ = "saved_arcs"

    id       = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id  = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    arc_id   = Column(String(36), ForeignKey("outputs.id", ondelete="CASCADE"), nullable=False)
    saved_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "arc_id", name="uq_saved_arc_per_user"),
    )
