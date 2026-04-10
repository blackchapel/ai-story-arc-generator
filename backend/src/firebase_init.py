import os
import threading
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from firebase_admin.exceptions import FirebaseError

_lock = threading.Lock()
_app: firebase_admin.App | None = None


def _get_app() -> firebase_admin.App:
    global _app
    if _app is not None:
        return _app
    with _lock:
        if _app is not None:
            return _app
        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if not cred_path:
            raise RuntimeError(
                "Set GOOGLE_APPLICATION_CREDENTIALS"
            )
        cred = credentials.Certificate(cred_path)
        _app = firebase_admin.initialize_app(cred)
    return _app


def verify_firebase_token(id_token: str) -> dict:
    """Verify a Firebase ID token. Returns decoded claims dict.
    Raises FirebaseError on invalid/expired token.
    """
    _get_app()
    return firebase_auth.verify_id_token(id_token, check_revoked=True)
