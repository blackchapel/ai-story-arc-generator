import logging
import os
from firebase_admin import messaging
from firebase_admin.exceptions import FirebaseError
from src.firebase_init import _get_app   # ensure app is initialized

logger = logging.getLogger(__name__)

_APP_BASE_URL = os.environ.get("APP_BASE_URL", "").rstrip("/")


def send_push_notification(fcm_token: str, job_id: str) -> None:
    _get_app() 

    arc_url = f"{_APP_BASE_URL}/arc/{job_id}"

    message = messaging.Message(
        token=fcm_token,
        # 1. Standard Notification (Universal fallback)
        notification=messaging.Notification(
            title="arc.",
            body="Your story arc has finished generating.",
        ),
        # 2. Custom Data (For your Service Worker logic)
        data={
            "job_id": job_id,
            "url": arc_url,
        },
        # 3. Web-Specific Options (For PWA/Browser behavior)
        webpush=messaging.WebpushConfig(
            notification=messaging.WebpushNotification(
                title="arc.",
                body="Your story arc has finished generating.",
                icon="/pwa-192x192.png",
                badge="/pwa-192x192.png",
                tag=f"arc-ready-{job_id}", # Prevents duplicate notifications
                require_interaction=True,   # Keeps it visible until clicked
            ),
            fcm_options=messaging.WebpushFCMOptions(link=arc_url),
        ),
    )

    try:
        messaging.send(message)
        logger.info("Push notification sent for job %s", job_id)
    except messaging.UnregisteredError:
        # Handle the case where the user uninstalled the PWA
        logger.warning("Token %s is no longer valid. Remove from DB.", fcm_token)
    except Exception as e:
        logger.error("Failed to send push: %s", e)
