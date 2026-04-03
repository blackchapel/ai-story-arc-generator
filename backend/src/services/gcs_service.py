import os
from functools import lru_cache
from google.cloud import storage

_BUCKET_NAME = os.environ.get("GOOGLE_BUCKET_NAME")


@lru_cache(maxsize=1)
def _client() -> storage.Client:
    return storage.Client()


def upload_bytes(data: bytes, path: str, content_type: str) -> str:
    """Upload raw bytes to GCS and return the public URL."""
    if not _BUCKET_NAME:
        raise RuntimeError("GOOGLE_BUCKET_NAME environment variable is not set")
    blob = _client().bucket(_BUCKET_NAME).blob(path)
    blob.upload_from_string(data, content_type=content_type)
    return f"https://storage.googleapis.com/{_BUCKET_NAME}/{path}"


def upload_text(text: str, path: str, content_type: str = "text/html; charset=utf-8") -> str:
    """Upload a UTF-8 string to GCS and return the public URL."""
    return upload_bytes(text.encode("utf-8"), path, content_type)
