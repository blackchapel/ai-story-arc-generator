import uuid
from sqlalchemy import Column, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.sql import func
from src.database import Base

class OutputSchema(Base):
    __tablename__ = "outputs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(Text, nullable=False)
    description = Column(Text)
    img = Column(Text)
    source_names = Column(ARRAY(Text), default=[])
    tag = Column(Text)
    tag_text_color = Column(Text)
    tag_background_color = Column(Text)
    html = Column(Text)