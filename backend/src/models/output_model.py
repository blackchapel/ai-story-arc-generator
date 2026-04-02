from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional, List


class OutputSummaryModel(BaseModel):
    """Used for list responses — excludes html to keep payload small."""
    id: UUID
    title: Optional[str] = None
    description: Optional[str] = None
    img: Optional[str] = None
    source_names: List[str] = Field(default_factory=list)
    tag: Optional[str] = None
    tag_text_color: Optional[str] = None

    class Config:
        from_attributes = True


class OutputModel(OutputSummaryModel):
    """Used for single-arc responses — includes html."""
    html: Optional[str] = None