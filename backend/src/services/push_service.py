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

    message = messaging.Message(
        token=fcm_token,
        notification=messaging.Notification(
            title="Your arc is ready",
            body="The story arc you requested has finished generating.",
        ),
        data={
            "job_id": job_id,
            "url": arc_url,
        },
        webpush=messaging.WebpushConfig(
            notification=messaging.WebpushNotification(
                title="Your arc is ready",
                body="The story arc you requested has finished generating.",
                icon="/pwa-192x192.png",
                badge="/pwa-192x192.png",
                require_interaction=False,
                silent=False,
            ),
            fcm_options=messaging.WebpushFCMOptions(link=arc_url),
        ),
    )

    messaging.send(message)
    logger.info("Push notification sent for job %s", job_id)
