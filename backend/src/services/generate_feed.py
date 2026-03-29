import os
import json
import time
import requests
import feedparser
import trafilatura
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv
from googlenewsdecoder import gnewsdecoder

load_dotenv()

# ==========================================
# CONFIGURATION
# ==========================================
FETCH_LIMIT = 25       # RSS entries to attempt per category
ARTICLE_LIMIT = 12     # Max successfully extracted articles to send to Gemini
EVENTS_PER_CATEGORY = 5

TEXT_MODEL = "publishers/google/models/gemini-2.5-flash"
IMAGE_MODEL = "publishers/google/models/imagen-4.0-generate-001"

CATEGORIES = [
    {"name": "AI & Tech",  "query": "artificial intelligence technology"},
    {"name": "Markets",    "query": "stock market finance economy"},
    {"name": "Politics",   "query": "politics government election policy"},
    {"name": "Sports",     "query": "sports athletics championship"},
    {"name": "World",      "query": "world news international"},
    {"name": "Science",    "query": "science research discovery"},
    {"name": "Film & TV",  "query": "film television entertainment movies"},
]

client = genai.Client(
    vertexai=True,
    project=str(os.environ.get("GOOGLE_PROJECT_ID")),
    location="us-central1",
)

# ==========================================
# DATA MODELS
# ==========================================
class FeedEvent(BaseModel):
    headline: str
    summary: str          # 1-2 sentence plain-English summary
    date: str             # Human-readable e.g. "Mar 27, 2026"
    visualScene: str      # Imagen 4.0 prompt
    colourMood: str       # 3-6 words e.g. "deep crimson and charcoal"
    image: str = ""       # Filled in after image generation

class CategoryFeed(BaseModel):
    category: str
    events: List[FeedEvent]

# ==========================================
# STEP 1: FETCH & EXTRACT ARTICLES
# ==========================================
def fetch_articles(query: str) -> List[dict]:
    print(f"  [*] Fetching RSS: {query}")
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    encoded = query.replace(" ", "+")
    rss_url = (
        f"https://news.google.com/rss/search"
        f"?q={encoded}+after:{thirty_days_ago}&hl=en-US&gl=US&ceid=US:en"
    )
    feed = feedparser.parse(rss_url)

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
            "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        )
    }

    articles = []
    for entry in feed.entries[:FETCH_LIMIT]:
        if len(articles) >= ARTICLE_LIMIT:
            break
        try:
            decoded = gnewsdecoder(entry.link)
            real_url = decoded.get("decoded_url")
            if not real_url:
                continue

            resp = requests.get(real_url, headers=headers, timeout=10)
            content = trafilatura.extract(resp.text)

            if content and len(content) > 300:
                pub_date = getattr(entry, "published", "") or getattr(entry, "updated", "")
                articles.append({
                    "title": entry.title,
                    "source": entry.source.get("title", "Unknown"),
                    "published": pub_date,
                    "full_text": content[:4000],
                })
                print(f"    [✓] {entry.title[:60]}...")
            time.sleep(0.4)
        except Exception:
            continue

    return articles

# ==========================================
# STEP 2: PICK 5 KEY EVENTS VIA GEMINI
# ==========================================
ANALYSIS_SYSTEM_PROMPT = """
You are a senior news editor. You receive a batch of recent news articles for a specific category
and must select the 5 most significant, distinct events from the past 30 days.

RULES:
- Choose events that are genuinely impactful, not just trending noise.
- Each event must be distinct — no duplicates or minor variations of the same story.
- Prefer events with the most recent published dates.
- For each event write:
    * headline: A sharp, factual headline (max 12 words). No clickbait.
    * summary: 1-2 plain-English sentences explaining what happened and why it matters.
    * date: The date of the event in "Mon DD, YYYY" format (e.g. "Mar 27, 2026").
    * visualScene: A standalone Imagen 4.0 image prompt. The image must convey the mood and
      stakes of the event independently WITHOUT any text, labels, numbers, flags, or real faces.
      Describe: physical setting, dominant objects/symbols, lighting, camera angle, emotional tone.
      Style: atmospheric photorealism or dramatic editorial illustration. 3-4 sentences.
    * colourMood: Dominant colour palette in 3-6 words (e.g. "cold steel blue and grey fog").

Return ONLY a valid JSON array of exactly 5 objects matching this schema.
"""

def pick_key_events(category: str, articles: List[dict]) -> List[FeedEvent]:
    print(f"  [*] Selecting key events for: {category}")
    today = datetime.now(timezone.utc).strftime("%B %d, %Y")
    user_msg = (
        f"TODAY'S DATE: {today}\n"
        f"CATEGORY: {category}\n\n"
        f"ARTICLES:\n{json.dumps(articles, ensure_ascii=True)}"
    )

    response = client.models.generate_content(
        model=TEXT_MODEL,
        contents=[ANALYSIS_SYSTEM_PROMPT, user_msg],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=list[FeedEvent],
        ),
    )

    return response.parsed

# ==========================================
# STEP 3: GENERATE IMAGES
# ==========================================
def generate_event_images(
    events: List[FeedEvent], category: str, images_dir: Path
) -> List[FeedEvent]:
    """Generate images, save as .jpg files, store relative path in event.image."""
    print(f"  [*] Generating images for: {category}")
    safe_name = "".join(
        c if c.isalnum() else "_" for c in category.lower().replace(" ", "_")
    )
    cat_dir = images_dir / safe_name
    cat_dir.mkdir(parents=True, exist_ok=True)

    for i, event in enumerate(events, start=1):
        prompt = (
            f"STYLE: Dramatic editorial illustration or atmospheric photorealism. "
            f"SCENE: {event.visualScene} "
            f"MOOD: {event.colourMood}. "
            f"AVOID: text, labels, numbers, flags, real human faces, news-room cliches."
        )
        try:
            resp = client.models.generate_images(
                model=IMAGE_MODEL,
                prompt=prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio="9:16",  # Instagram/Facebook Story format
                ),
            )
            if resp.generated_images:
                img_bytes = resp.generated_images[0].image.image_bytes
                img_file = cat_dir / f"event_{i}.jpg"
                with open(img_file, "wb") as f:
                    f.write(img_bytes)
                # Path relative to the output root e.g. "images/ai___tech/event_1.jpg"
                event.image = str(img_file.relative_to(images_dir.parent))
                print(f"    [✓] Saved {event.image}")
        except Exception as e:
            print(f"    [X] Image {i} failed: {e}")

    return events

# ==========================================
# STEP 4: SAVE OUTPUT
# ==========================================
def save_feed(feed: List[CategoryFeed], output_dir: Path):
    output_dir.mkdir(parents=True, exist_ok=True)

    # Build a compact index: category -> list of {headline, date, summary, image}
    index = []
    for cf in feed:
        index.append({
            "category": cf.category,
            "events": [
                {
                    "headline": e.headline,
                    "date": e.date,
                    "summary": e.summary,
                    "image": e.image,   # relative path e.g. "images/ai___tech/event_1.jpg"
                }
                for e in cf.events
            ]
        })

    index_file = output_dir / "feed.json"
    with open(index_file, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, ensure_ascii=False)

    print(f"\n[\u2713] Index saved to {index_file}")
    return index_file

# ==========================================
# MAIN PIPELINE
# ==========================================
def run_feed_pipeline(
    categories: List[dict] = None,
    output_dir: str = "output/feed",
) -> Path:
    if categories is None:
        categories = CATEGORIES

    start = time.time()
    feed: List[CategoryFeed] = []
    out = Path(output_dir)
    images_dir = out / "images"

    for cat in categories:
        print(f"\n[===] {cat['name']} [===]")
        try:
            articles = fetch_articles(cat["query"])
            if not articles:
                print(f"  [!] No articles extracted for {cat['name']}, skipping")
                continue

            events = pick_key_events(cat["name"], articles)
            events = generate_event_images(events, cat["name"], images_dir)
            feed.append(CategoryFeed(category=cat["name"], events=events))
        except Exception as e:
            print(f"  [X] Failed for {cat['name']}: {e}")
            continue

    output_path = save_feed(feed, out)
    print(f"\n[*] Total time: {round(time.time() - start, 1)}s")
    return output_path


if __name__ == "__main__":
    run_feed_pipeline()
