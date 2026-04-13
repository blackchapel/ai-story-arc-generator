import logging
import os
from firebase_admin import messaging
from firebase_admin.exceptions import FirebaseError
from src.firebase_init import _get_app   # ensure app is initialized

logger = logging.getLogger(__name__)

_APP_BASE_URL = os.environ.get("APP_BASE_URL", "").rstrip("/")


def send_push_notification(fcm_token: str, job_id: str) -> None:
    """Send an FCM push notification to a single registration token.

    Raises FirebaseError on hard failures (invalid token, quota exceeded, etc.).
    Logs and swallows transient errors internally so callers can decide handling.
    """
    _get_app()  # ensure Firebase Admin is initialised

    arc_url = f"{_APP_BASE_URL}/arc/{job_id}"

    # Data-only message — no `notification` field at any level.
    # When FCM sees a `notification` field (including webpush.notification),
    # the browser auto-shows it AND our service worker's onBackgroundMessage
    # also calls showNotification, resulting in two notifications.
    # With only `data`, onBackgroundMessage fires once and is the sole handler.
    message = messaging.Message(
        token=fcm_token,
        data={
            "job_id": job_id,
            "url": arc_url,
        },
        webpush=messaging.WebpushConfig(
            fcm_options=messaging.WebpushFCMOptions(link=arc_url),
        ),
    )

    messaging.send(message)
    logger.info("Push notification sent for job %s", job_id)
