from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class OutputSummaryModel(BaseModel):
    id: str
    user_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    img: Optional[str] = None
    source_names: list[str] = Field(default_factory=list)
    tag: Optional[str] = None
    tag_text_color: Optional[str] = None
    created_at: Optional[datetime] = None
    is_shared: bool = False
    share_token: Optional[str] = None
    is_saved: bool = False

    model_config = {"from_attributes": True}


class OutputModel(OutputSummaryModel):
    html: Optional[str] = None
