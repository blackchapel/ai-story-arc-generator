<div align="center">

# arc.
### *Clean news for the curious mind.*

**ET Gen AI Hackathon — Phase 2 Build Sprint**
Problem Statement #8 · AI-Native News Experience

[![Live Demo](https://img.shields.io/badge/Live%20Demo-arc--frontend--silk.vercel.app-6366f1?style=for-the-badge&logo=vercel)](https://arc-frontend-silk.vercel.app/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20on%20GCP-4285F4?style=for-the-badge&logo=googlecloud)](https://arc-backend-199119995070.us-central1.run.app/)
[![Built With](https://img.shields.io/badge/Built%20With-Gemini%202.5%20Flash%20%2B%20Imagen%204.0-f0b429?style=for-the-badge&logo=google)](https://arc-frontend-silk.vercel.app/)

</div>

---

## The Problem

Business news in 2026 is still delivered like it's 2005.

Static text. One-size-fits-all homepage. The same article format whether you're a first-time reader or a seasoned analyst. Complex stories (wars, market crashes, geopolitical crises) reduced to a feed of disconnected headlines with no narrative thread, no context, and no sense of how each event connects to the next.

Most readers consume news reactively. They read one article, close the tab, and walk away without understanding *why* something happened, *what it means for them*, or *what to watch next*.

**arc** is the answer to that problem.

---

## What arc Does

arc transforms any topic (a geopolitical conflict, a market event, an election, a corporate story) into a **Story Arc**: a fully structured, visually rich, AI-generated intelligence briefing that reads like a narrative, not a news dump.

Type *"Russia's war in Ukraine"* or *"India 2024 elections"* or *"Adani vs Hindenburg"* and arc assembles the complete picture in under two minutes.

> **The question arc answers is not *"what happened today?"* It is *"what is actually going on, why does it matter, and what happens next?"***

---

## Live Demo

🌐 **[arc-frontend-silk.vercel.app](https://arc-frontend-silk.vercel.app/)**

Type any ongoing news topic in the search bar to generate a live Story Arc.

---

## Feature Walkthrough

### 🏠 Home Feed
A personalised, category-driven news feed on launch. Content is fetched live from Google News RSS, categorised by topic (AI & Tech, Markets, Politics, Cricket, World), and rendered as a ranked story list with source, read time, and category tag. Users can follow topics, bookmark stories, and set alerts. A persistent **"Ask arc anything"** bar sits at the bottom for instant topic querying.

### 📚 Arc History
Generated arcs are stored in PostgreSQL. Users can revisit any arc they have previously generated without re-running the pipeline. Each stored arc retains its full JSON payload and all six Imagen-generated panel images.

### ⚡ Story Arc Generator: The Core Feature

The flagship experience. Enter any topic and arc builds a complete intelligence briefing structured as eight analytical sections:

| Section | What it shows |
|---|---|
| **Stats Bar** | 3-5 headline numbers that define the scale of the story at a glance |
| **01 · The Story in Panels** | 6 AI-illustrated panels tracing the full narrative arc: Origin, Escalation, Crisis Peak, Structural Shift, Domestic Impact, Latest |
| **02 · Overview** | A 125-word editorial summary with the full arc and its direct consequence for the reader |
| **03 · Key Takeaways** | 4-5 structured insights with supporting evidence, showing what the story *actually means* |
| **04 · Timeline** | 8-10 chronological events with turning point markers, impact badges, and source attribution |
| **05 · Data Snapshot** | A dual-axis chart showing a non-obvious cause-to-effect correlation; not what the articles say, but what they imply together |
| **06 · Coverage Lenses** | 4-5 analytical angles (India impact, markets, geopolitics) each with a standout metric |
| **07 · Key Voices** | Verbatim quotes from key figures, sourced directly from the articles |
| **08 · Blindspots** | 3 genuinely underreported angles that mainstream coverage is missing |

### 🎨 AI Panel Illustrations
Each of the 6 story panels is illustrated using **Imagen 4.0**. Images are generated as standalone editorial visuals: atmospheric, cinematic, and meaningful on their own, not as literal illustrations of the panel text. Each panel also carries a `keyMetric` badge: the single most important number from that moment in the story, displayed as a visual callout.

### ⏳ Live Loading Experience
A transparent, step-by-step loader shows exactly what arc is doing:
1. **Fetching articles**: Scanning the web for relevant sources
2. **Analyzing data**: Gemini processes and structures the story
3. **Generating visuals**: Imagen 4.0 renders each panel illustration
4. **Assembling arc**: JSON assembled into the full briefing
5. **Ready**: Arc rendered

---

## How It Works: Technical Architecture

```
User enters topic
            │
            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React + Vite)                     │
│          Topic input  ──►  Loading states  ──►  Arc render           │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │  POST /generate-arc
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        BACKEND  (FastAPI / GCP Cloud Run)            │
│                                                                      │
│  1. FETCH  ──  RAG Pipeline                                          │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  SOURCE A: Vector DB (Semantic Retrieval)                    │    │
│  │  Topic query → text embeddings → similarity search           │    │
│  │  Output: historically relevant article chunks                │    │
│  └──────────────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  SOURCE B: Google News RSS (Live Fetch)                      │    │
│  │  feedparser → gnewsdecoder → trafilatura                     │    │
│  │  Output: 40–80 fresh full-text articles per topic            │    │
│  └──────────────────────────────────────────────────────────────┘    │
│       Vector DB results + RSS results → combined context             │
│                                                                      │
│  2. ANALYSE                                                          │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Combined context + topic query → Gemini 2.5 Flash           │    │
│  │  system_instruction + user_prompt → Story Arc 2.0 JSON       │    │
│  │  Sections: panels, timeline, chart, lenses, quotes,          │    │
│  │            takeaways, blindspots, stats                      │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  3. ILLUSTRATE                                                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  visualScene prompts (one per panel) → Imagen 4.0            │    │
│  │  6 standalone editorial images generated per arc             │    │
│  │  Referenced as panel_1.jpg through panel_6.jpg               │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  4. PERSIST                                                          │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Full arc JSON + image references → PostgreSQL               │    │
│  │  Arc stored by ID, retrievable for future visits             │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  5. ASSEMBLE                                                         │
│       JSON payload + image references merged                         │
│       Full arc returned to frontend                                  │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       FRONTEND renders Story Arc                     │
│              8 sections rendered from structured JSON payload        │
└──────────────────────────────────────────────────────────────────────┘
```

### The Prompt Engineering Layer

The intelligence quality of each arc is driven by a carefully engineered two-variable prompt system:

- **`system_instruction`**: defines arc's analyst persona, all behavioural rules (data integrity, panel arc structure, chart insight mandate, image generation spec, turning point detection, overview constraints), and quality guardrails
- **`user_prompt`**: injects the user's `{TOPIC}`, `{ARTICLE_COUNT}`, design tokens, the full output schema, and `{ARTICLES_HERE}`

Key prompt design decisions:
- The **topic query is a north star**: the model uses it to filter relevant articles from the 40–80 fetched, discarding tangential or duplicate coverage
- The **narrative perspective shifts with how the user frames the topic**: "Ram Mandir vs Babri Masjid" produces a contested-dispute arc while "Ram Mandir victory" produces a different narrative angle entirely. The same event, reframed by the user's intent, yields a structurally different arc
- The **colour palette and visual theme are content-driven**: Gemini derives the full design system (panel backgrounds, tag colours, mood tones) from the emotional register of the topic itself. A war story gets a different visual language than a market story or an election story, making visual storytelling an intrinsic part of the analysis
- The **chart must reveal a non-obvious connection**: a cause-to-domestic consequence, a leading-to-lagging indicator pair, or a scale contrast that the articles never make explicit
- **Panel bodies must end on "so what?"**: every panel's final sentence answers what this moment meant for ordinary people or India specifically
- **`keyMetric` is near-mandatory**: if no explicit number exists, the model expresses scale in human terms a non-expert understands
- **Turning points are flagged distinctly**: `isTurningPoint: true` marks 1-2 events after which the story could not return to its prior state
- **Images are standalone editorials**: Imagen 4.0 prompts describe mood, atmosphere, and setting independently; no text, labels, or literal illustration of panel content

---

## API Reference

### `POST /generate-arc`
Triggers the full arc generation pipeline for a given topic.

**Request body**
```json
{
  "topic": "Russia's war in Ukraine"
}
```

**Response**: full Story Arc 2.0 JSON payload including all 8 sections and panel image references.

| Field | Type | Description |
|---|---|---|
| `meta` | object | Brand label and live date |
| `topic` | object | Eyebrow, title, subtitle |
| `stats` | array | 3–5 headline stats |
| `panels` | array | 6 narrative panels with image paths |
| `overview` | string | 125-word HTML editorial summary |
| `takeaways` | array | 4–5 structured insights |
| `timeline` | array | 8–10 chronological events |
| `chart` | object | Dual-axis correlated data snapshot |
| `lenses` | array | 4–5 analytical coverage angles |
| `quotes` | array | Verbatim quotes from key figures |
| `blindspots` | array | 3 underreported angles |
| `sources` | array | Publisher names |

---

### `GET /feed`
Returns the RSS-driven home feed, categorised by topic.

**Query params**

| Param | Type | Description |
|---|---|---|
| `category` | string | e.g. `markets`, `ai`, `politics`, `cricket`, `world` |
| `limit` | integer | Number of stories to return (default: 20) |

**Response**: array of story objects with `title`, `source`, `summary`, `category`, `url`, `readTime`, `publishedAt`.

---

### `POST /bookmarks` / `GET /bookmarks`
Save and retrieve bookmarked stories for the current user session.

---

> *(Replace the placeholders below with actual screenshot image paths or URLs)*

**Home Feed**
![Home Feed](./screenshots/home-feed.png)

**Story Arc — Header & Stats**
![Arc Header](./screenshots/arc-header.png)

**Story Arc — Panels**
![Arc Panels](./screenshots/arc-panels.png)

**Story Arc — Timeline**
![Arc Timeline](./screenshots/arc-timeline.png)

**Story Arc — Data Snapshot Chart**
![Arc Chart](./screenshots/arc-chart.png)

**Loading State**
![Loading](./screenshots/arc-loading.png)

---

## Demo Video

> 🎬 **[Watch the demo](https://your-demo-video-link-here)** ← *(replace with actual link)*

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite + TypeScript |
| **Styling** | Tailwind CSS |
| **Backend** | FastAPI (Python) |
| **Database** | PostgreSQL (arc storage, user data, bookmarks) |
| **Vector DB** | Embeddings store for semantic article retrieval (RAG) |
| **Containerisation** | Docker |
| **Frontend Deployment** | Vercel |
| **Backend Deployment** | Google Cloud Platform (Cloud Run) |
| **AI: Analysis** | Gemini 2.5 Flash |
| **AI: Image Generation** | Imagen 4.0 |
| **News Fetching** | Google News RSS via `feedparser` |
| **Article Extraction** | `trafilatura` + `gnewsdecoder` |
| **Charts** | Chart.js (dual-axis, threshold colour-coded) |

---

## Project Structure

```
AI-STORY-ARC-GENERATOR/
│
├── app/                              # Frontend: React + Vite + TypeScript
│   ├── public/
│   └── src/
│       ├── apis/                     # API call handlers
│       ├── components/               # Arc sections, panels, timeline, chart, feed
│       ├── data/                     # Static/mock data
│       ├── hooks/                    # Custom React hooks
│       ├── types/                    # Story Arc 2.0 TypeScript type definitions
│       ├── utils/                    # Helper functions
│       ├── App.tsx
│       ├── main.tsx
│       └── index.css
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
│
└── backend/                          # Backend: FastAPI
    ├── src/
    │   ├── models/
    │   │   └── story_arc.py          # Story Arc 2.0 Pydantic data models
    │   ├── prompts/
    │   │   └── generate_news_data.py # system_instruction + user_prompt variables
    │   └── services/
    │       ├── generate_arc.py       # Gemini analysis + Imagen generation pipeline
    │       └── generate_feed.py      # Home feed generation service
    ├── main.py                       # FastAPI routes + app entry point
    ├── Dockerfile
    ├── .env.example
    └── requirements.txt
```

---

## Running Locally

### Prerequisites
- Node.js 18+
- Python 3.11+
- Google Cloud credentials with Gemini API and Imagen API access

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
```

### Frontend

```bash
cd app
npm install
npm run dev
```

Create a `.env` file in `app/` with:
```
VITE_API_URL=http://localhost:8000
```

### Environment Variables (Backend)

Copy `.env.example` to `.env` and fill in:
```
GOOGLE_API_KEY=your_gemini_and_imagen_api_key
GOOGLE_CLOUD_PROJECT=your_gcp_project_id
```

### Docker (Backend)

```bash
cd backend
docker build -t arc-backend .
docker run -p 8000:8000 --env-file .env arc-backend
```

---

## Why arc Answers the Brief

The problem statement asked for something that makes people say *"I can't go back to reading news the old way."*

arc achieves this through three design principles that no current news product applies together:

**1. Narrative over feed.**
News is not a list of events. It is a story with an origin, escalation, turning points, and stakes. arc treats every topic as a story and structures it accordingly: six panels, a timeline with turning point markers, and a closing insight that always lands on what it means *for you*.

**2. Non-obvious intelligence.**
The Data Snapshot chart is explicitly engineered to show a connection the user could not get from reading the articles. The blindspots section surfaces what mainstream coverage is missing. The contrarian framing in lenses challenges the dominant narrative rather than repeating it.

**3. Visual depth without noise.**
Each panel image is a standalone editorial illustration: atmospheric, cinematic, and meaningful in isolation. The keyMetric badge on every panel translates abstract geopolitical or economic events into a single human-scale number. The dark-mode arc template is designed to feel like a premium intelligence product, not a news aggregator.

---

## Roadmap

arc v1.0 is the foundation. Here's where it goes next:

**v1.1: Personalisation**
- User accounts with persistent arc history across devices
- Follow topics and get notified when a new arc is available for stories you are tracking
- Personalised home feed ranked by reading history and followed topics

**v1.2: Arc Intelligence Upgrades**
- **Arc refresh**: re-run analysis on a saved arc to get updated panels and timeline as the story evolves
- **Comparative arcs**: place two arcs side by side (e.g. *India 2019 Elections vs India 2024 Elections*)
- **Ask the arc**: a chat interface anchored to the arc's source articles, letting users ask follow-up questions grounded in the evidence

**v1.3: Formats and Distribution**
- Arc sharing as a standalone link with a rich social preview
- Arc export as a PDF briefing document
- Weekly digest: automatically generated arc for the top story of the week, delivered to subscribers

**v2.0: Platform**
- Publisher API: let ET or other publishers embed Story Arc as a native feature on article pages
- Arc for ET Prime: deep integration with ET's content library, surfacing premium content contextually within arcs
- Multi-language arcs: generate the full briefing in Hindi, Tamil, Bengali for regional audiences

---



## Team

Built with equal parts by three contributors:

| Name | GitHub |
|---|---|
| Rosita D'mello | [@rosita-dmello](https://github.com/rosita-dmello) |
| Kunal C | [@blackchapel](https://github.com/blackchapel) |
| Vidhita Pai | [@vidhitapai31](https://github.com/vidhitapai31) |

---

## Submission Details

- **Hackathon:** ET Gen AI Hackathon, Phase 2: Build Sprint
- **Problem Statement:** #8, AI-Native News Experience
- **Category:** Story Arc Tracker
- **Live URL:** [arc-frontend-silk.vercel.app](https://arc-frontend-silk.vercel.app/)
- **Version:** v1.0.0

---

<div align="center">

*arc. · Clean news for the curious mind.*

</div>