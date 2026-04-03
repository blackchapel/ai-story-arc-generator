from pydantic import BaseModel, field_validator


class ArcRequestModel(BaseModel):
    prompt: str

    @field_validator("prompt")
    @classmethod
    def prompt_must_be_non_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Prompt must not be empty")
        if len(v) > 500:
            raise ValueError("Prompt must be 500 characters or fewer")
        return v
