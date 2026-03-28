import os
import json
import time
import requests
import feedparser
import trafilatura
from pathlib import Path
from google import genai
from google.genai import types
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

client = genai.Client(
    vertexai=True,
    project='focal-pager-329818',
    location='us-central1'
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
# STEP 2: GENERATE JSON DATA
# ==========================================
def analyze_story(articles: StoryArc, job_id: str):
    print(f"[*] Analyzing narrative arc")
    
    sys_prompt = generate_news_data.system_instructions
    user_input = generate_news_data.user_prompt+ json.dumps(articles)
    
    response = client.models.generate_content(
        model=TEXT_MODEL, 
        contents=[sys_prompt, user_input],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=StoryArc
        )
    )
    
    with open(f"output/{job_id}/news.json", "w") as f:
        json.dump(response.parsed.model_dump(), f, indent=4)
        
    return response.parsed

# ==========================================
# STEP 3: IMAGE GENERATION
# ==========================================
def generate_comic_panels(analysis: StoryArc, job_id: str):

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
                img_path = f"output/{job_id}/panel_{i}.jpg"
                with open(img_path, "wb") as f:
                    f.write(response.generated_images[0].image.image_bytes)
            
        except Exception as e:
            print(f"  [X] Failed to draw panel {i}: {e}")

# ==========================================
# STEP 3: ASSEMBLE HTML
# ==========================================
def build_static_arc(analysis: StoryArc, job_id: str):
    print("[*] Building HTML")
    
    template_path = "public/index.html"
    with open(template_path, "r", encoding="utf-8") as f:
        html_content = f.read()

    json_data = analysis.model_dump_json()
    html_content = html_content.replace("{{ARC_DATA}}", json_data)

    output_dir = Path(f"output/{job_id}")
    output_file = output_dir / "index.html"
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"[✓] Saved to {output_file}")

# ==========================================
# MAIN EXECUTION
# ==========================================
def run_pipeline(topic: str, job_id: str):
    start_time = time.time()
    output_path = "output/" + str(job_id)
    Path(output_path).mkdir(parents=True, exist_ok=True)

    articles = get_raw_news(topic, ARTICLE_LIMIT)
    analysis = analyze_story(articles, job_id)
    generate_comic_panels(analysis, job_id)
    build_static_arc(analysis, job_id)

    runtime = round(time.time() - start_time, 1)
    print(f"\n[*] Complete Story Arc processed in {runtime}s")

if __name__ == "__main__":
    run_pipeline("Ram mandir & babri masjid saga", "123")