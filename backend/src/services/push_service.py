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
        # Data-only for web — no notification payload so Firebase does NOT
        # auto-show a notification. Our service worker (sw.ts) handles
        # showNotification() with the correct data.url so notificationclick
        # can navigate the user directly to the arc.
        data={
            "url": arc_url,
            "job_id": job_id,
        },
        webpush=messaging.WebpushConfig(
            headers={"TTL": "86400"},
        ),
    )

    try:
        messaging.send(message)
        logger.info("Push notification sent for job %s", job_id)
    except messaging.UnregisteredError:
        logger.warning("Token %s is no longer valid. Remove from DB.", fcm_token)
    except Exception as e:
        logger.error("Failed to send push: %s", e)
