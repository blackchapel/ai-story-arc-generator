from pydantic import BaseModel

class ArcRequestModel(BaseModel):
    prompt: str