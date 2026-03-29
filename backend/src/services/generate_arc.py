import os
import json
import time
import base64
import requests
import feedparser
import trafilatura
from pathlib import Path
from google import genai
from google.genai import types
from google.oauth2 import service_account
from googlenewsdecoder import gnewsdecoder
from dotenv import load_dotenv

from src.models.story_arc import StoryArc
from src.prompts import generate_news_data

load_dotenv()

# ==========================================
# CONFIGURATION
# ==========================================
ARTICLE_LIMIT = 10
TEXT_MODEL = "publishers/google/models/gemini-2.5-flash"
IMAGE_MODEL = "publishers/google/models/imagen-4.0-generate-001"
# CREDENTIALS = service_account.Credentials.from_service_account_info(
#     json.loads(os.environ.get("GOOGLE_SERVICE_ACCOUNT_KEY")),
#     scopes=['https://www.googleapis.com/auth/cloud-platform']
# )

client = genai.Client(
    vertexai=True,
    project=str(os.environ.get("GOOGLE_PROJECT_ID")),
    location='us-central1',
    # credentials=CREDENTIALS
)

# ==========================================
# STEP 1: NEWS EXTRACTION
# ==========================================
def get_raw_news(topic, limit):
    print(f"[*] Fetching Google News RSS for: {topic}...")
    encoded_topic = topic.replace(" ", "+")
    rss_url = f"https://news.google.com/rss/search?q={encoded_topic}&hl=en-US&gl=US&ceid=US:en"
    feed = feedparser.parse(rss_url)
    
    articles = []
    headers = {"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"}

    for entry in feed.entries[:limit]:
        try:
            decoded = gnewsdecoder(entry.link)
            real_url = decoded.get("decoded_url")
            if not real_url: continue
            
            resp = requests.get(real_url, headers=headers, timeout=10)
            content = trafilatura.extract(resp.text)
            
            if content and len(content) > 500:
                articles.append({
                    "title": entry.title,
                    "source": entry.source.get('title', 'Unknown'),
                    "full_text": content[:5000]
                })
                print(f" [✓] Extracted: {entry.title[:50]}...")
            time.sleep(0.5)
        except Exception:
            continue
    return articles

# ==========================================
# STEP 2: GENERATE ARC DATA
# ==========================================
def generate_arc_data(articles: StoryArc, job_id: str, topic: str):
    print(f"[*] Analyzing narrative arc")
    
    sys_prompt = generate_news_data.system_instruction
    user_input = generate_news_data.user_prompt + json.dumps(articles) + topic
    
    response = client.models.generate_content(
        model=TEXT_MODEL, 
        contents=[sys_prompt, user_input],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=StoryArc
        )
    )
    
    with open(f"output/{job_id}/news.json", "w", encoding="utf-8") as f:
        json.dump(response.parsed.model_dump(), f, indent=4, ensure_ascii=False)
        
    return response.parsed

# ==========================================
# STEP 2b: VALIDATE & FIX EMPTY SECTIONS
# ==========================================
def validate_and_fix_arc(analysis: StoryArc, topic: str):
    """Ensure all sections have at least placeholder data to prevent empty renders."""
    from src.models.story_arc import Quote, Lens, Blindspot, Takeaway, SentimentPoint
    
    empty_sections = []
    
    # Check and fix quotes (Key Voices)
    if not analysis.quotes or len(analysis.quotes) == 0:
        empty_sections.append("Key Voices (quotes)")
        analysis.quotes = [
            Quote(
                flag="📰",
                logoBg="rgba(240, 180, 41, 0.1)",
                logoBorder="var(--border2)",
                text="Coverage was sparse on this aspect. Key stakeholder statements and expert commentary were not widely available in the primary sources.",
                attr="Analysis Gap"
            )
        ]
    
    # Check and fix lenses (Coverage Lenses)
    if not analysis.lenses or len(analysis.lenses) == 0:
        empty_sections.append("Coverage Lenses (lenses)")
        analysis.lenses = [
            Lens(
                cat="Coverage",
                icon="🔍",
                featured=False,
                head="Analytics Limitation",
                body="Limited lens coverage detected. The source articles did not provide diverse analytical perspectives on this story.",
                metricVal="1",
                metricLabel="Distinct viewpoint",
                metricType="warn"
            )
        ]
    
    # Check and fix blindspots
    if not analysis.blindspots or len(analysis.blindspots) == 0:
        empty_sections.append("Blindspots in Coverage (blindspots)")
        analysis.blindspots = [
            Blindspot(
                icon="🔦",
                tag="Data Gap",
                head="Underreported Angles",
                body="These articles did not include critical voices or perspectives. Check international sources or specialized publications for deeper coverage."
            )
        ]
    
    # Check and fix takeaways
    if not analysis.takeaways or len(analysis.takeaways) == 0:
        empty_sections.append("Key Takeaways (takeaways)")
        analysis.takeaways = [
            Takeaway(
                type="pos",
                head="Emerging Picture",
                body="The available coverage suggests an evolving situation. Monitor official sources for further developments and updates."
            )
        ]
    
    # Check and fix timeline
    if not analysis.timeline or len(analysis.timeline) == 0:
        empty_sections.append("Timeline (timeline)")
        analysis.timeline = [
            SentimentPoint(
                period="Now",
                score=0.0,
                eventLabel="Story ongoing"
            )
        ]
    
    # Log which sections were fixed
    if empty_sections:
        print(f"[⚠] Fixed empty sections: {', '.join(empty_sections)}")
    
    return analysis

# ==========================================
# STEP 3: IMAGE GENERATION
# ==========================================
def generate_panel_images(analysis: StoryArc, job_id: str):
    print(f"[*] Generating panel images...")
    
    for i, panel in enumerate(analysis.panels, start=1):
        print(f"[*] Drawing Panel {i}: {panel.head}")

        image_prompt = (
            f"STYLE: Noir comic book art, heavy ink, high contrast, stylized illustration. "
            f"SCENE: {panel.visualScene}. "
            f"MOOD: {panel.colourMood}. "
            f"AVOID: photorealism, real human faces, 3D renders, blurry textures, specific politicians."
        )
        
        try:
            response = client.models.generate_images(
                model=IMAGE_MODEL,
                prompt=image_prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio="1:1"
                )
            )
            
            if response.generated_images:
                img_bytes = response.generated_images[0].image.image_bytes
                # Convert to base64 and store as data URI
                img_base64 = base64.b64encode(img_bytes).decode('utf-8')
                panel.image = f"data:image/jpeg;base64,{img_base64}"
                print(f"  [✓] Panel {i} embedded")
            
        except Exception as e:
            print(f"  [X] Failed to draw panel {i}: {e}")

# ==========================================
# STEP 4: ASSEMBLE ARC
# ==========================================
def assemble_arc(analysis: StoryArc, job_id: str):
    print("[*] Building HTML")
    
    template_path = "public/index.html"
    with open(template_path, "r", encoding="utf-8") as f:
        html_content = f.read()

    # Images are already base64 data URIs in analysis.panels[].image
    # Use ensure_ascii=True so all emojis/unicode are \uXXXX escaped (ASCII-safe for any host/CDN)
    json_data = json.dumps(analysis.model_dump(), ensure_ascii=True)
    html_content = html_content.replace("{{ARC_DATA}}", json_data)

    output_dir = Path(f"output/{job_id}")
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / "index.html"
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"[✓] Saved to {output_file}")

# ==========================================
# MAIN EXECUTION
# ==========================================
def run_pipeline(topic: str, job_id: str, jobs=None):
    start_time = time.time()
    output_path = "output/" + str(job_id)
    Path(output_path).mkdir(parents=True, exist_ok=True)

    try:
        if jobs is not None:
            jobs[job_id]["status"] = "FETCHING_ARTICLES"
        articles = get_raw_news(topic, ARTICLE_LIMIT)

        if jobs is not None:
            jobs[job_id]["status"] = "ANALYZING_DATA"
        analysis = generate_arc_data(articles, job_id, topic)
        
        # Validate and fix empty sections
        analysis = validate_and_fix_arc(analysis, topic)

        if jobs is not None:
            jobs[job_id]["status"] = "GENERATING_IMAGES"
        generate_panel_images(analysis, job_id)

        if jobs is not None:
            jobs[job_id]["status"] = "ASSEMBLING"
        assemble_arc(analysis, job_id)

        if jobs is not None:
            jobs[job_id]["status"] = "COMPLETED"
            jobs[job_id]["output_url"] = f"https://arc-backend-liart.vercel.app/output/{job_id}/index.html"

        runtime = round(time.time() - start_time, 1)
        print(f"\n[*] Complete Story Arc processed in {runtime}s")

    except Exception as e:
        if jobs is not None:
            jobs[job_id]["status"] = "FAILED"
            jobs[job_id]["error"] = str(e)
        raise

if __name__ == "__main__":
    run_pipeline("us election 2024", "123")

    