import os
import threading
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from firebase_admin.exceptions import FirebaseError

_lock = threading.Lock()
_app: firebase_admin.App | None = None


def _get_app() -> firebase_admin.App:
    global _app
    if _app is None:
        _app = firebase_admin.initialize_app()
    return _app


def verify_firebase_token(id_token: str) -> dict:
    """Verify a Firebase ID token. Returns decoded claims dict.
    Raises FirebaseError on invalid/expired token.
    """
    _get_app()
    return firebase_auth.verify_id_token(id_token, check_revoked=True)


def generate_magic_link(email: str, redirect_url: str) -> str:
    """Generate a Firebase email sign-in link via Admin SDK."""
    _get_app()
    settings = firebase_auth.ActionCodeSettings(
        url=redirect_url,
        handle_code_in_app=True,
    )
    return firebase_auth.generate_sign_in_with_email_link(email, settings)


def get_or_create_firebase_user(email: str) -> str:
    """Return the Firebase UID for the given email, creating the user if needed."""
    _get_app()
    try:
        user = firebase_auth.get_user_by_email(email)
        return user.uid
    except firebase_auth.UserNotFoundError:
        user = firebase_auth.create_user(email=email)
        return user.uid


def create_custom_token(uid: str) -> str:
    """Generate a Firebase custom token for the given UID."""
    _get_app()
    token_bytes: bytes = firebase_auth.create_custom_token(uid)
    return token_bytes.decode("utf-8")
