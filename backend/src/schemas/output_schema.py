import uuid
from sqlalchemy import Column, Text, DateTime, String, Boolean, JSON, ForeignKey
from sqlalchemy.sql import func
from src.database import Base


class OutputSchema(Base):
    __tablename__ = "outputs"

    id             = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id        = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    title          = Column(Text, nullable=False)
    description    = Column(Text)
    img            = Column(Text)
    source_names   = Column(JSON, default=list)
    tag            = Column(Text)
    tag_text_color = Column(Text)
    html           = Column(Text)
    is_shared      = Column(Boolean, default=False, nullable=False)
    share_token    = Column(String(64), nullable=True, unique=True, index=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
