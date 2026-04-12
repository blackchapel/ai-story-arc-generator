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
    """Generate a Firebase email sign-in link via Admin SDK.
    The link is a standard Firebase magic link — the client SDK's
    signInWithEmailLink() will verify it normally.
    Raises FirebaseError on failure.
    """
    _get_app()
    settings = firebase_auth.ActionCodeSettings(
        url=redirect_url,
        handle_code_in_app=True,
    )
    return firebase_auth.generate_sign_in_with_email_link(email, settings)
