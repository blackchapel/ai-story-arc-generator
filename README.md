<div align="center">

# arc.
### *Clean news for the curious mind.*

**ET Gen AI Hackathon — Phase 2 Build Sprint**
Problem Statement #8 · AI-Native News Experience

[![Live Demo](https://img.shields.io/badge/Live%20Demo-arc--frontend--silk.vercel.app-6366f1?style=for-the-badge&logo=vercel)](https://arc-frontend-silk.vercel.app/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20on%20GCP-4285F4?style=for-the-badge&logo=googlecloud)](https://arc-frontend-silk.vercel.app/)
[![Built With](https://img.shields.io/badge/Built%20With-Gemini%202.5%20Flash%20%2B%20Imagen%204.0-f0b429?style=for-the-badge&logo=google)](https://arc-frontend-silk.vercel.app/)

</div>

---

## The Problem

Business news in 2026 is still delivered like it's 2005.

Static text. One-size-fits-all homepage. The same article format whether you're a first-time reader or a seasoned analyst. Complex stories — wars, market crashes, geopolitical crises — reduced to a feed of disconnected headlines with no narrative thread, no context, and no sense of how each event connects to the next.

Most readers consume news reactively. They read one article, close the tab, and walk away without understanding *why* something happened, *what it means for them*, or *what to watch next*.

**arc** is the answer to that problem.

---

## What arc Does

arc transforms any topic — a geopolitical conflict, a market event, an election, a corporate story — into a **Story Arc**: a fully structured, visually rich, AI-generated intelligence briefing that reads like a narrative, not a news dump.

Type *"Russia's war in Ukraine"* or *"India 2024 elections"* or *"Adani vs Hindenburg"* — and arc assembles the complete picture in under two minutes.

> **The question arc answers is not *"what happened today?"* — it's *"what is actually going on, why does it matter, and what happens next?"***

---

## Live Demo

🌐 **[arc-frontend-silk.vercel.app](https://arc-frontend-silk.vercel.app/)**

Type any ongoing news topic in the search bar to generate a live Story Arc.

---

## Feature Walkthrough

### 🏠 Home Feed
A personalised, category-driven news feed on launch. Users can follow topics (AI & Tech, Markets, Politics, Cricket, World), bookmark stories, and set alerts. A persistent **"Ask arc anything"** bar sits at the bottom for instant topic querying. The home screen also surfaces a **Following** strip of topic channels the user tracks.

### ⚡ Story Arc Generator — The Core Feature

The flagship experience. Enter any topic and arc builds a complete intelligence briefing structured as eight analytical sections:

| Section | What it shows |
|---|---|
| **Stats Bar** | 3–5 headline numbers that define the scale of the story at a glance |
| **01 · The Story in Panels** | 6 AI-illustrated panels tracing the full narrative arc — Origin → Escalation → Crisis Peak → Structural Shift → Domestic Impact → Latest |
| **02 · Overview** | A 125-word editorial summary with the full arc and its direct consequence for the reader |
| **03 · Key Takeaways** | 4–5 structured insights with supporting evidence — what the story *actually means* |
| **04 · Timeline** | 8–10 chronological events with turning point markers, impact badges, and source attribution |
| **05 · Data Snapshot** | A dual-axis chart showing a non-obvious cause→effect correlation — not what the articles say, but what they imply together |
| **06 · Coverage Lenses** | 4–5 analytical angles (India impact, markets, geopolitics) each with a standout metric |
| **07 · Key Voices** | Verbatim quotes from key figures, sourced directly from the articles |
| **08 · Blindspots** | 3 genuinely underreported angles that mainstream coverage is missing |

### 🎨 AI Panel Illustrations
Each of the 6 story panels is illustrated using **Imagen 4.0**. Images are generated as standalone editorial visuals — atmospheric, cinematic, and meaningful on their own — not as literal illustrations of the panel text. Each panel also carries a `keyMetric` badge: the single most important number from that moment in the story, displayed as a visual callout.

### ⏳ Live Loading Experience
A transparent, step-by-step loader shows exactly what arc is doing:
1. **Fetching articles** — Scanning the web for relevant sources
2. **Analyzing data** — Gemini processes and structures the story
3. **Generating visuals** — Imagen 4.0 renders each panel illustration
4. **Assembling arc** — JSON assembled into the full briefing
5. **Ready** — Arc rendered

---

## How It Works — Technical Architecture

```
User enters topic
       │
       ▼
┌─────────────────────────────────────────────────────┐
│                   FRONTEND (React)                   │
│  Topic input → Loading states → Arc render           │
└────────────────────┬────────────────────────────────┘
                     │ POST /generate-arc
                     ▼
┌─────────────────────────────────────────────────────┐
│                  BACKEND (FastAPI / GCP)             │
│                                                      │
│  1. FETCH                                            │
│     Google News RSS → feedparser                     │
│     Real URLs decoded via gnewsdecoder               │
│     Full article text extracted via trafilatura      │
│     40–80 articles collected per topic               │
│                                                      │
│  2. ANALYSE                                          │
│     Articles + topic query → Gemini 2.5 Flash        │
│     System prompt: Story Arc analyst persona         │
│     Output: structured Story Arc 2.0 JSON            │
│     (panels, timeline, chart, lenses, quotes, etc.)  │
│                                                      │
│  3. ILLUSTRATE                                       │
│     visualScene prompts → Imagen 4.0                 │
│     6 editorial images generated per arc             │
│     Stored and referenced as panel_1.jpg … panel_6   │
│                                                      │
│  4. ASSEMBLE                                         │
│     JSON + image references merged                   │
│     Full arc payload returned to frontend            │
└─────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│              FRONTEND renders Story Arc              │
│  8 sections rendered from structured JSON payload   │
└─────────────────────────────────────────────────────┘
```

### The Prompt Engineering Layer

The intelligence quality of each arc is driven by a carefully engineered two-variable prompt system:

- **`system_instruction`** — defines arc's analyst persona, all behavioural rules (data integrity, panel arc structure, chart insight mandate, image generation spec, turning point detection, overview constraints), and quality guardrails
- **`user_prompt`** — injects the user's `{TOPIC}`, `{ARTICLE_COUNT}`, design tokens, the full output schema, and `{ARTICLES_HERE}`

Key prompt design decisions:
- The **topic query is a north star** — the model uses it to filter relevant articles from the 40–80 fetched, discarding tangential or duplicate coverage
- The **chart must reveal a non-obvious connection** — a cause→domestic consequence, a leading→lagging indicator pair, or a scale contrast that the articles never make explicit
- **Panel bodies must end on "so what?"** — every panel's final sentence answers what this moment meant for ordinary people or India specifically
- **`keyMetric` is near-mandatory** — if no explicit number exists, the model expresses scale in human terms a non-expert understands
- **Turning points are flagged distinctly** — `isTurningPoint: true` marks 1–2 events after which the story could not return to its prior state
- **Images are standalone editorials** — Imagen 4.0 prompts describe mood, atmosphere, and setting independently; no text, labels, or literal illustration of panel content

---

## Screenshots

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



| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite + TypeScript |
| **Backend** | FastAPI (Python) |
| **Containerisation** | Docker |
| **Frontend Deployment** | Vercel |
| **Backend Deployment** | Google Cloud Platform (Cloud Run) |
| **AI — Analysis** | Gemini 2.5 Flash |
| **AI — Image Generation** | Imagen 4.0 |
| **News Fetching** | Google News RSS via `feedparser` |
| **Article Extraction** | `trafilatura` + `gnewsdecoder` |
| **Charts** | Chart.js (dual-axis, threshold colour-coded) |

---

## Project Structure

```
AI-STORY-ARC-GENERATOR/
│
├── app/                              # Frontend — React + Vite + TypeScript
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
└── backend/                          # Backend — FastAPI
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
- Google Cloud credentials (Gemini + Imagen API access)

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Set the backend URL in your `.env`:
```
VITE_API_URL=http://localhost:8000
```

### Environment Variables (Backend)

```
GOOGLE_API_KEY=your_gemini_api_key
GOOGLE_CLOUD_PROJECT=your_gcp_project_id
```

---

## Why arc Answers the Brief

The problem statement asked for something that makes people say *"I can't go back to reading news the old way."*

arc achieves this through three design principles that no current news product applies together:

**1. Narrative over feed.**
News is not a list of events. It's a story with an origin, escalation, turning points, and stakes. arc treats every topic as a story and structures it accordingly — six panels, a timeline with turning point markers, and a closing insight that always lands on what it means *for you*.

**2. Non-obvious intelligence.**
The Data Snapshot chart is explicitly engineered to show a connection the user couldn't get from reading the articles. The blindspots section surfaces what mainstream coverage is missing. The contrarian framing in lenses challenges the dominant narrative rather than repeating it.

**3. Visual depth without noise.**
Each panel image is a standalone editorial illustration — atmospheric, cinematic, and meaningful in isolation. The keyMetric badge on every panel translates abstract geopolitical or economic events into a single human-scale number. The dark-mode arc template is designed to feel like a premium intelligence product, not a news aggregator.

---

## Team

Built with equal parts by three contributors:

| Name | GitHub |
|---|---|
| RD *(name to be filled)* | [@username](https://github.com/username) |
| KC *(name to be filled)* | [@username](https://github.com/username) |
| VP *(name to be filled)* | [@username](https://github.com/username) |

---

## Submission Details

- **Hackathon:** ET Gen AI Hackathon — Phase 2: Build Sprint
- **Problem Statement:** #8 — AI-Native News Experience
- **Category:** Story Arc Tracker
- **Live URL:** [arc-frontend-silk.vercel.app](https://arc-frontend-silk.vercel.app/)
- **Version:** v1.0.0

---

<div align="center">

*arc. · Clean news for the curious mind.*

</div>