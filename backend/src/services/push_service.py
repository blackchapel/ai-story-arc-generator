import logging
import os
from firebase_admin import messaging
from src.firebase_init import _get_app

logger = logging.getLogger(__name__)

_APP_BASE_URL = os.environ.get("APP_BASE_URL", "").rstrip("/")


def send_push_notification(fcm_token: str, job_id: str) -> None:
    _get_app() 

    arc_url = f"{_APP_BASE_URL}/arc/{job_id}"
    notification = messaging.Notification(
        title="arc.",
            body="Your story arc is ready!",
    )
    webpush_config = messaging.WebpushConfig(
        fcm_options=messaging.WebpushFCMOptions(link=arc_url)
    )
    
    message = messaging.Message(
        token=fcm_token,
        notification=notification,
        webpush=webpush_config
    )

    try:
        messaging.send(message)
        logger.info("Push notification sent for job %s", job_id)
    except messaging.UnregisteredError:
        logger.warning("Token %s is no longer valid. Remove from DB.", fcm_token)
    except Exception as e:
        logger.error("Failed to send push: %s", e)
