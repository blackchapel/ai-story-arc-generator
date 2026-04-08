from datetime import datetime
from pydantic import BaseModel


class ActiveJobModel(BaseModel):
    job_id: str
    prompt: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
