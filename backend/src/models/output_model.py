from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional, List

class OutputModel(BaseModel):
    id: UUID
    title: Optional[str] = None
    description: Optional[str] = None
    img: Optional[str] = None
    source_names: List[str] = Field(default_factory=list)
    tag: Optional[str] = None
    tag_text_color: Optional[str] = None
    tag_background_color: Optional[str] = None
    html: Optional[str] = None

    class Config:
        from_attributes = True