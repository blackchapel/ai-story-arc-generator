from datetime import datetime
from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional


class OutputSummaryModel(BaseModel):
    id: UUID
    title: Optional[str] = None
    description: Optional[str] = None
    img: Optional[str] = None
    source_names: list[str] = Field(default_factory=list)
    tag: Optional[str] = None
    tag_text_color: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class OutputModel(OutputSummaryModel):
    html: Optional[str] = None
