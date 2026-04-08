from pydantic import BaseModel


class NotifyRequestModel(BaseModel):
    job_id: str
