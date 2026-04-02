from pydantic import BaseModel, EmailStr


class NotifyRequestModel(BaseModel):
    job_id: str
    email: EmailStr
