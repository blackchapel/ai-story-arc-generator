import os
import uuid
import json
import time
import base64
import logging
import requests
import feedparser
import trafilatura
from html.parser import HTMLParser
from datetime import datetime, timezone
from pathlib import Path
from collections.abc import Callable
from google import genai
from google.genai import types
from googlenewsdecoder import gnewsdecoder
from dotenv import load_dotenv

from src.models.arc_model import ArcModel, Quote, Lens, Blindspot, Takeaway, SentimentPoint
from src.prompts import generate_arc_data_prompt
from src.schemas.output_schema import OutputSchema
from src.schemas.notification_schema import NotificationSchema
from src.database import SessionLocal
from src.services.push_service import send_push_notification
from src.services.gcs_service import upload_bytes, upload_text

load_dotenv()

logger = logging.getLogger(__name__)

ARTICLE_LIMIT = 10
TEXT_MODEL = "publishers/google/models/gemini-2.5-flash"
IMAGE_MODEL = "publishers/google/models/imagen-4.0-generate-001"
REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    )
}

client = genai.Client(
    vertexai=True,
    project=os.environ["GOOGLE_PROJECT_ID"],
    location="us-central1",
)

# Absolute path to public/index.html — works regardless of cwd at process start.
_PUBLIC_INDEX = Path(__file__).resolve().parent.parent.parent / "public" / "index.html"


def get_raw_news(topic: str, limit: int) -> list[dict]:
    logger.info("Fetching news for: %s", topic)
    encoded = topic.replace(" ", "+")
    feed = feedparser.parse(
        f"https://news.google.com/rss/search?q={encoded}&hl=en-US&gl=US&ceid=US:en"
    )

    articles = []
    for entry in feed.entries[:limit]:
        try:
            decoded = gnewsdecoder(entry.link)
            real_url = decoded.get("decoded_url")
            if not real_url:
                continue
            resp = requests.get(real_url, headers=REQUEST_HEADERS, timeout=10)
            content = trafilatura.extract(resp.text)
            if content and len(content) > 500:
                pub_date = getattr(entry, "published", "") or getattr(entry, "updated", "")
                articles.append({
                    "title": entry.title,
                    "source": (entry.get("source") or {}).get("title", "Unknown"),
                    "published": pub_date,
                    "full_text": content[:5000],
                })
                logger.info("  Fetched: %s", entry.title[:60])
        except Exception:
            continue

    return articles


def generate_arc_data(articles: list[dict], job_id: str, topic: str) -> ArcModel:
    logger.info("Analyzing arc for job %s", job_id)
    today = datetime.now(timezone.utc).strftime("%B %d, %Y")
    date_context = f"TODAY'S DATE: {today}. Prioritise articles closest to today.\n\n"
    user_input = date_context + generate_arc_data_prompt.user_prompt + json.dumps(articles) + topic

    response = client.models.generate_content(
        model=TEXT_MODEL,
        contents=[generate_arc_data_prompt.system_instruction, user_input],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ArcModel,
        ),
    )

    return response.parsed


def validate_and_fix_arc(analysis: ArcModel) -> ArcModel:
    fixed = []

    if not analysis.quotes:
        fixed.append("quotes")
        analysis.quotes = [Quote(
            flag="📰", logoBg="rgba(240,180,41,0.1)", logoBorder="var(--border2)",
            text="Key stakeholder statements were not widely available in the sources.",
            attr="Analysis Gap",
        )]

    if not analysis.lenses:
        fixed.append("lenses")
        analysis.lenses = [Lens(
            cat="Coverage", icon="🔍", featured=False,
            head="Analytics Limitation",
            body="Source articles did not provide diverse analytical perspectives.",
            metricVal="1", metricLabel="Distinct viewpoint", metricType="warn",
        )]

    if not analysis.blindspots:
        fixed.append("blindspots")
        analysis.blindspots = [Blindspot(
            icon="🔦", tag="Data Gap", head="Underreported Angles",
            body="Check international sources or specialised publications for deeper coverage.",
        )]

    if not analysis.takeaways:
        fixed.append("takeaways")
        analysis.takeaways = [Takeaway(
            type="pos", head="Emerging Picture",
            body="The available coverage suggests an evolving situation. Monitor official sources.",
        )]

    if not analysis.timeline:
        fixed.append("timeline")
        analysis.timeline = [SentimentPoint(period="Now", score=0.0, eventLabel="Story ongoing")]

    if fixed:
        logger.warning("Placeholder data added for: %s", ", ".join(fixed))

    return analysis


def generate_panel_images(analysis: ArcModel) -> None:
    logger.info("Generating panel images")
    for i, panel in enumerate(analysis.panels, start=1):
        prompt = (
            "STYLE: Noir comic book art, heavy ink, high contrast, stylized illustration. "
            f"SCENE: {panel.visualScene}. MOOD: {panel.colourMood}. "
            "AVOID: photorealism, real human faces, 3D renders, specific politicians."
        )
        try:
            response = client.models.generate_images(
                model=IMAGE_MODEL,
                prompt=prompt,
                config=types.GenerateImagesConfig(number_of_images=1, aspect_ratio="1:1"),
            )
            if response.generated_images:
                img_bytes = response.generated_images[0].image.image_bytes
                panel.image = f"data:image/jpeg;base64,{base64.b64encode(img_bytes).decode()}"
                logger.info("  Panel %d generated", i)
        except Exception as exc:
            logger.error("  Panel %d failed: %s", i, exc)


def assemble_arc(analysis: ArcModel) -> str:
    logger.info("Assembling HTML")
    with open(_PUBLIC_INDEX, "r", encoding="utf-8") as f:
        html = f.read()
    return html.replace("{{ARC_DATA}}", json.dumps(analysis.model_dump(), ensure_ascii=True))


def upload_arc_assets(job_id: str, html: str, thumbnail_b64: str) -> tuple[str, str]:
    logger.info("Uploading to GCS")
    html_url = upload_text(html, f"arcs/{job_id}/arc.html")
    logger.info("  HTML uploaded: %s", html_url)

    b64_data = thumbnail_b64.split(",", 1)[1] if "," in thumbnail_b64 else thumbnail_b64
    img_bytes = base64.b64decode(b64_data)
    img_url = upload_bytes(img_bytes, f"arcs/{job_id}/thumbnail.jpg", "image/jpeg")
    logger.info("  Thumbnail uploaded: %s", img_url)

    return html_url, img_url


class _TagStripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self._parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self._parts.append(data)

    def get_text(self) -> str:
        return "".join(self._parts)


def _strip_tags(html: str) -> str:
    s = _TagStripper()
    s.feed(html)
    return s.get_text()


def _save_arc_to_db(
    job_id: str,
    title: str,
    description: str,
    img: str,
    source_names: list[str],
    tag: str,
    tag_text_color: str,
    html: str,
    user_id: str,
) -> None:
    db = SessionLocal()
    try:
        db.add(OutputSchema(
            id=str(uuid.UUID(job_id)),
            user_id=user_id,
            title=title,
            description=description,
            img=img,
            source_names=source_names,
            tag=tag,
            tag_text_color=tag_text_color,
            html=html,
        ))
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def _dispatch_notifications(job_id: str) -> None:
    """Send FCM push notifications for all pending subscriptions for this job."""
    db = SessionLocal()
    try:
        pending = (
            db.query(NotificationSchema)
            .filter(
                NotificationSchema.job_id == job_id,
                NotificationSchema.sent_at.is_(None),
                NotificationSchema.fcm_token.isnot(None),
            )
            .all()
        )
        for n in pending:
            try:
                send_push_notification(n.fcm_token, job_id)  # type: ignore[arg-type]
                n.sent_at = datetime.now(timezone.utc)
            except Exception as exc:
                logger.error(
                    "Push notification failed for job %s (token …%s): %s",
                    job_id,
                    n.fcm_token[-8:] if n.fcm_token else "?",
                    exc,
                )
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.error("Notification dispatch error for job %s: %s", job_id, exc)
    finally:
        db.close()


def run_pipeline(
    topic: str,
    job_id: str,
    on_status: Callable[[str], None] | None = None,
    user_id: str = "",
) -> None:
    start = time.time()

    def emit(s: str) -> None:
        if on_status:
            on_status(s)

    try:
        emit("FETCHING_ARTICLES")
        articles = get_raw_news(topic, ARTICLE_LIMIT)

        emit("ANALYZING_DATA")
        analysis = generate_arc_data(articles, job_id, topic)
        analysis = validate_and_fix_arc(analysis)

        emit("GENERATING_IMAGES")
        generate_panel_images(analysis)

        emit("ASSEMBLING")
        html = assemble_arc(analysis)
        html_url, img_url = upload_arc_assets(job_id, html, analysis.panels[0].image)
        _save_arc_to_db(
            job_id,
            _strip_tags(analysis.topic.title),
            analysis.topic.subtitle,
            img_url,
            analysis.sources,
            analysis.topic.eyebrow.split(".")[0].strip(),
            analysis.theme.accent,
            html_url,
            user_id=user_id,
        )

        emit("COMPLETED")
        _dispatch_notifications(job_id)
        logger.info("Pipeline complete in %.1fs", time.time() - start)

    except Exception:
        emit("FAILED")
        logger.exception("Pipeline FAILED for job %s", job_id)
        raise


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("topic", help="Topic to generate arc for")
    parser.add_argument("--job-id", default=str(uuid.uuid4()))
    args = parser.parse_args()
    run_pipeline(args.topic, args.job_id)
