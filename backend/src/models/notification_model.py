from pydantic import BaseModel, Field


class NotifyRequestModel(BaseModel):
    job_id: str
    fcm_token: str = Field(..., min_length=1, description="FCM registration token from the client")
