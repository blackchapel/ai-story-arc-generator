system_instructions = '''
You are Story Arc, an elite intelligence analyst and data visualizer. Your goal is to transform raw news JSON into a structured narrative briefing that matches the "Story Arc" dashboard schema perfectly.

COLOR PALETTE & THEMING RULES:
Generate a complete theme object for the arc. news template JSON based on the news topic provided.
Rules:

Match the emotional tone of the story — wars and crises feel different from tech launches or sports events. Let the topic drive the palette, not habit.
Vary the base mode deliberately — do not default to dark. Use this distribution as a rough guide:

Dark background: conflicts, crime, disasters, space, geopolitics
Light background: health, science breakthroughs, economics, elections
Sepia/warm: history, culture, long-form investigations
Saturated/vibrant: sports, entertainment, tech product launches

Background layers must have visible depth — bg should be darker/lighter than card, and card darker/lighter than surface. Never make them the same value.
Text contrast is non-negotiable:

textBright must have strong contrast against card
text is the body reading color — comfortable, not harsh
textDim is for labels, timestamps, secondary info — muted but legible


appbarBg should always be a semi-transparent version of bg so the sticky header looks frosted. Format: rgba(r,g,b,0.92).
chartGrid should be subtle — barely visible against card, just enough to read data.
Do not use pure black #000000 or pure white #ffffff for backgrounds — always use near-black or near-white with a slight hue tint that matches the story mood.
The overrides block is for fine-tuning only — use it if one derived rgba variant looks wrong (e.g. a bg tint is too green). Otherwise leave it empty {}.

DATA INTEGRITY:
1. Extract facts only. If a stat (like 'financialImpact' or 'chart' data) isn't in the text, use null or a logical 100-base index.
2. Overview HTML: Use <span class='hl-neg'>, <span class='hl-pos'>, and <span class='hl-tag1'> (for secondary accents) within the 'overview' string to highlight key entities or shifts.
3. SVG Logic (sceneHtml): Generate clean, abstract SVG code (viewBox='0 0 264 155'). Use geometric shapes and gradients that match the 'sceneBg' and 'colourMood'. Avoid complex illustrations; focus on atmospheric minimalism.

NARRATIVE STRUCTURE:
- Exactly 6 'panels' following the arc: Origin → First Strike → Escalation → Secondary Front → Current Impact → Latest Status.
- Timeline: 8-10 chronological events.
- Chart: Identify a numerical trend (e.g., price, percentage, or count) across the date range. Generate 6-8 logical data points based on the news events.
'''

user_prompt = '''
### TASK
Synthesize the provided [NUMBER] news articles into a single JSON object. Follow the "arc-data-json" schema exactly.

### DESIGN TOKENS (Apply to JSON)
- Tag1: #f97316 (Orange)
- Tag2: #c084fc (Purple)
- Neg: #ef4444
- Pos: #10b981

### TARGET JSON SCHEMA
{
  "meta": {
    "brand": "story<em>arc</em>",
    "liveLabel": "Live · Mar 26, 2026"
  },

  "theme": {
    "_comment": "── Every colour here maps to a CSS variable. Hex values auto-generate bg (0.08α), tint (0.04α), border (0.22α) variants. Use 'overrides' to hardcode any specific derived value. ──",

    "bg":         "#0b0c0f",
    "surface":    "#13151a",
    "card":       "#191c23",
    "cardHover":  "#1e2128",
    "border":     "#232730",
    "border2":    "#2d3240",
    "divider":    "#232730",
    "appbarBg":   "rgba(11,12,15,0.94)",

    "text":       "#c9cdd8",
    "textBright": "#eceef4",
    "textDim":    "#606878",

    "accent":     "#f0b429",
    "accentDark": "#e8920e",

    "neg":        "#f05252",
    "pos":        "#34d399",
    "blue":       "#60a5fa",
    "tag1":       "#f97316",
    "tag2":       "#c084fc",

    "chartGrid":  "#1f2530",

    "overrides": {}
  },

  "_themeGuide": {
    "darkMode":  { "bg":"#0b0c0f","card":"#191c23","text":"#c9cdd8","textBright":"#eceef4","textDim":"#606878","appbarBg":"rgba(11,12,15,0.94)" },
    "lightMode": { "bg":"#ffffff","surface":"#f5f5f5","card":"#ffffff","cardHover":"#f9f9f9","border":"#ebebeb","border2":"#e0e0e0","divider":"#ebebeb","appbarBg":"rgba(255,255,255,0.92)","text":"#3a3a3a","textBright":"#0c0c0c","textDim":"#8c8c8c","chartGrid":"#e8e8e8" },
    "sepiaMode": { "bg":"#1a1208","card":"#231a0c","border":"#2e2210","text":"#c8b89a","textBright":"#f0e0c0","textDim":"#7a6a50" }
  },

  "topic": {
    "eyebrow":  "Primary category · Region or domain · Specific angle e.g. 'Geopolitics · Middle East · India Impact'. 3 segments separated by ' · '. Max 6 words total.",
    "title":    "A punchy 3-6 word title using <em> to emphasise one key word. e.g. '<em>Israel</em> vs Iran'.",
    "subtitle": "One sentence — what is at stake and for whom. Covers the full arc and the audience-specific angle. Max 25 words. e.g. 'From Oct 7 to today — what it means for India's fuel security and the global order'."
  },

  "sections": {
    "_comment": "Each section has a two-digit 'num' (zero-padded) and a short 'title' (2-4 words). These drive the nav sidebar. Keep titles consistent across stories.",
    "panels":     { "num": "01", "title": "The Story in Panels" },
    "overview":   { "num": "02", "title": "Overview" },
    "timeline":   { "num": "03", "title": "Timeline" },
    "chart":      { "num": "04", "title": "Data Snapshot" },
    "lenses":     { "num": "05", "title": "Coverage Lenses" },
    "quotes":     { "num": "06", "title": "Key Voices" },
    "takeaways":  { "num": "07", "title": "Key Takeaways" },
    "blindspots": { "num": "08", "title": "Blindspots in Coverage" }
  },

  "stats": [
    {
      "_comment": "Each stat card is a single KPI. 3-5 stats total. Mix chip styles for visual variety.",
      "label": "Short metric name. Max 3 words. e.g. '🇮🇳 LPG Risk'. Use a flag emoji for country-specific metrics.",
      "value": "The number, percentage, or severity label. Keep to 1-4 characters where possible. e.g. 'HIGH', '$92', '60%', '85%', '6'.",
      "sub":   "One-line context or trend direction. Max 5 words. e.g. 'Hormuz threat live', '↑ from $68 baseline'. Use ↑/↓ arrows for direction.",
      "chipClass": "Optional. 'tag1-chip' for orange highlight, 'tag2-chip' for purple. Omit for default styling.",
      "valClass":  "'warn' = amber/red pulsing, 'up' = rising/negative, 'ok' = stable/green. Drives the value colour."
    }
  ],

  "panels": [
    {
      "_comment": "Exactly 5-6 panels covering the full narrative arc: origin → escalation → crisis peak → turning point → current state. Each panel is a visual story beat.",
      "tag":      "1-2 word chapter label. ALL CAPS. e.g. 'ORIGIN', 'FIRST STRIKE', 'OIL WARFARE', 'NUCLEAR', '🇮🇳 INDIA', 'LATEST'. Use flag emoji for country-specific panels.",
      "tagBg":    "rgba() background for the tag chip. Use the sentiment colour at 0.8-0.88 alpha. e.g. 'rgba(240,82,82,0.85)' for negative, 'rgba(52,211,153,0.8)' for positive.",
      "tagColor": "Tag text colour. '#fff' on dark backgrounds, '#0b0c0f' on light/bright backgrounds.",
      "dateColor":"Hex colour matching the panel's sentiment. Must match a theme colour. e.g. '#f05252' for negative, '#34d399' for positive, '#f0b429' for warning.",
      "date":     "Date or date range. Add ' · Recent' suffix for events within 60 days, ' · Now' for current week, ' · India Impact' for country-specific. e.g. 'Oct 7, 2023', 'Feb 8, 2026 · Recent', 'Mar 23–26, 2026 · Now'.",
      "head":     "One punchy sentence — what happens in this panel. Max 12 words. e.g. 'Hamas launches the deadliest attack in Israel's history'.",
      "body":     "2-3 short sentences of context and consequence. Include one specific number or stat. End with the implication. Max 35 words. e.g. '1,200+ killed. Gaza war ignites. Iran's proxy network mobilises. The entire region enters a new phase.'",
      "image":    "just write panel-N.jpg' where N is panel number. Just give 1, 2, 3 and so on linearly"
      "visualScene": "A detailed description of exactly what should be illustrated in this panel for an AI image generator. Describe the setting, objects, colours, mood, lighting, and composition. Be specific about what is in the foreground and background. Do not mention people's faces or real individuals. 3-5 sentences.",
      "colourMood": "The dominant colour palette for this panel e.g. 'deep orange and black', 'cold blue and grey', 'green and gold'",
      "sentiment": "negative | positive | neutral | warning"
    }
    // exactly 6 panels total, covering the full narrative arc: trigger → escalation → crisis peak → turning point → current state or outlook
  ],

  "overview": "A single HTML-formatted paragraph (150-200 words) that tells the complete story arc in prose. Use <span class='hl-neg'>text</span> for negative events, <span class='hl-tag1'>text</span> for audience-specific (e.g. India) impacts, <span class='hl-accent'>text</span> for key data points, <span class='hl-tag2'>text</span> for secondary threat tracks (e.g. nuclear). Use <strong>text</strong> for the audience's unique position. Start with the origin, move through escalation, land on current stakes. End with the audience's specific dilemma. e.g. 'What began as Hamas's <span class=\"hl-neg\">October 7 assault</span> grew into a full regional war...'",

  "timeline": [
    {
      "_comment": "All significant events in chronological order. Give recent events more weight. At least 7-8 events if data supports it. Final event must have the 'hot' type.",
      "type":    "Sentiment type: 'neg' for negative/escalation, 'pos' for positive/de-escalation, 'tag1' for audience-specific (e.g. India), 'tag2' for secondary track (e.g. nuclear), 'hot' for the latest/current event.",
      "date":    "Date or range. Add ' · NOW' suffix for the latest event. e.g. 'Oct 7, 2023', 'Mar 3–10, 2026', 'Mar 23–26, 2026 · NOW'.",
      "head":    "One sentence headline. Max 12 words. What happened. e.g. 'Hamas attacks Israel — the war begins'.",
      "body":    "2-3 sentences of context. Include at least one specific number, stat, or market reaction. End with the implication or consequence. Max 50 words.",
      "callout": "Optional. One sentence highlighting the audience-specific (e.g. India) impact of this event. Max 12 words. Omit if no direct audience impact. e.g. 'Immediate LPG cost impact on Gulf imports'.",
      "badge":   "Short badge label. Format: '↓ Negative label' for escalation, '↑ Positive label' for de-escalation, '⚠ Warning label' for threshold events, '🇮🇳 Country label' for audience events, '~ Status · watching' for unresolved. Max 3 words after the symbol.",
      "badgeType":"Matches sentiment: 'neg', 'pos', 'tag1', 'tag2', 'neu'. Drives badge colour.",
      "source":  "Optional. Publisher attribution. Use ' / ' separator for multiple sources. e.g. 'Reuters / Bloomberg'. Omit for the first event if widely known."
    }
    // all significant events in chronological order, give recent events more weight in the analysis, at least 9-10 events if the data supports it
  ],

  "chart": {
    "_comment": "A dual-axis line chart comparing a global metric with an audience-specific metric. Exactly 2 datasets. 6-10 data points.",
    "title":    "Chart title. Max 8 words. Name both metrics. e.g. 'Brent Crude vs India LPG Cost Index'.",
    "subtitle": "Axis labels and baseline context. Format: 'Metric1 unit · Metric2 unit (baseline explanation)'. e.g. 'Brent USD/bbl · India LPG import cost index (100 = Jan 2026 baseline)'.",
    "labels":   ["Array of date labels for the x-axis. Short format: 'Mon DD' or 'Mon YY'. 6-10 labels evenly spaced across the story's timeframe. e.g. 'Jan 26', 'Feb 8', 'Mar 26'."],
    "datasets": [
      {
        "label":   "Dataset name with unit. Max 4 words. e.g. 'Brent (USD/bbl)'.",
        "data":    ["Array of numeric values matching the labels array. Same length as labels."],
        "color":   "Hex colour from theme. Use 'accent' colour for primary dataset. e.g. '#f0b429'.",
        "yAxisID": "'y' for left axis (primary dataset), 'y1' for right axis (secondary dataset).",
        "thresholds": {
          "_comment": "Optional. Only for the primary dataset. Defines colour zones on the chart.",
          "high": "Numeric threshold for danger zone. e.g. 100.",
          "highColor": "Hex colour for values above 'high'. Use theme 'neg' colour. e.g. '#f05252'.",
          "mid": "Numeric threshold for warning zone. e.g. 93.",
          "midColor": "Hex colour for values between 'mid' and 'high'. Use theme 'accent' colour. e.g. '#f0b429'.",
          "lowColor": "Hex colour for values below 'mid'. Use theme 'pos' colour. e.g. '#34d399'."
        }
      },
      {
        "label":   "Secondary dataset name with unit. e.g. 'India LPG Index'.",
        "data":    ["Array of numeric values matching the labels array."],
        "color":   "Hex colour from theme. Use 'tag1' for audience-specific. e.g. '#f97316'.",
        "yAxisID": "'y1' for right axis.",
        "dashed":  "Boolean. true for secondary dataset to visually distinguish from primary."
      }
    ],
    "yAxes": {
      "y":  { "min": "Number. Floor for left axis with ~10% padding below lowest value.", "max": "Number. Ceiling with ~10% padding above highest value.", "label": "Short axis label. Max 2 words. e.g. 'Brent'.", "color": "Hex. Must match the primary dataset colour.", "prefix": "Optional unit prefix. e.g. '$', '₹'. Omit for indices." },
      "y1": { "min": "Number. Floor for right axis.", "max": "Number. Ceiling for right axis.", "label": "Short axis label. e.g. 'LPG Idx'.", "color": "Hex. Must match secondary dataset colour.", "position": "'right'. Always right for second axis." }
    }
  },

  "lenses": [
    {
      "_comment": "3-5 analytical lenses. The first lens should be 'featured':true (gets larger card). Each lens is a distinct angle on the story.",
      "cat":      "Category label. Format: 'Domain' or 'Country · Domain'. Max 3 words. e.g. 'India · LPG', 'Oil Markets', 'Nuclear Track', 'Trade & Shipping', 'Diplomacy'.",
      "icon":     "One emoji representing this lens. Use flag emojis for country-specific lenses. e.g. '🇮🇳', '🛢️', '⚛️', '🚢', '🌏'.",
      "featured": "Optional boolean. true for the most audience-relevant lens. Only one lens should be featured.",
      "head":     "Punchy headline. Max 8 words. e.g. '300 million households, one chokepoint'.",
      "body":     "2-3 sentences of analysis. Include at least one specific number. Explain the mechanism, not just the outcome. Max 40 words. e.g. 'India imports 85% of its LPG through the Persian Gulf corridor. A Hormuz closure would trigger rationing within weeks.'",
      "metricVal":   "The single most important number for this lens. Use currency symbols and abbreviations. e.g. '₹65k cr', '+34%', '60%', '+220%', '6'.",
      "metricLabel": "One-line explanation of the metric. Max 8 words. e.g. 'Extra annual cost per $10/bbl rise', 'From pre-conflict baseline'.",
      "metricType":  "'warn' for danger metrics, 'up' for rising/negative trend, 'ok' for stable/neutral. Drives metric colour."
    }
  ],

  "quotes": [
    {
      "_comment": "3-5 key quotes from different actors. Mix opposing viewpoints for tension. Each quote should reveal a position or contradiction.",
      "flag":       "Flag emoji or symbol for the speaker's country/domain. e.g. '🇮🇷', '🇺🇸', '🇮🇳', '⚛️'.",
      "logoBg":     "rgba() background for the quote card accent. Use the speaker's national or domain colour at low alpha (0.12-0.25). e.g. 'rgba(34,75,139,.25)' for Iran blue.",
      "logoBorder": "rgba() border for the quote card. Same base colour at slightly higher alpha (0.3-0.4). e.g. 'rgba(34,75,139,.4)'.",
      "accentColor":"Optional. Hex colour for the quote attribution text. Use a theme colour. Omit for the first quote (uses default). e.g. '#f0b429', '#f97316', '#c084fc'.",
      "text":       "The exact quote. One or two sentences. Max 25 words. Should reveal the speaker's position, a contradiction, or a key claim. e.g. 'No negotiations have been held with the US. This is fake news to manipulate financial and oil markets.'",
      "attr":       "Speaker name — Title/Role · Date. e.g. 'Mohammad Bagher Ghalibaf — Iranian Parliament Speaker · Mar 23, 2026'. Use full name, then dash, then role, then dot-separated date."
    }
  ],

  "takeaways": [
    {
      "_comment": "4-5 key takeaways. Mix types: some audience-specific (tag1), some thematic (tag2), some general (no type). Each should be an insight, not a summary. Lead with the most audience-relevant.",
      "type": "Optional. 'tag1' for audience-specific (orange border), 'tag2' for secondary track (purple border). Omit for general takeaways (default border).",
      "head": "One clear sentence. Max 15 words. State the insight, not the event. e.g. 'India's LPG supply is more exposed than the government admits'.",
      "body": "2-3 sentences of evidence and analysis. Use <strong>text</strong> to highlight the most critical phrase in each takeaway. Include at least one specific data point. End with why this matters. Max 50 words. e.g. 'With <strong>85% of LPG imported and no publicly disclosed strategic LPG reserve</strong>, a 30-day Hormuz closure would force rationing decisions.'"
    }
  ],

  "blindspots": [
    {
      "_comment": "4-5 blindspots. These are things the coverage is missing, underreporting, or getting wrong. Each should challenge a mainstream narrative.",
      "icon": "🔦 for all blindspot items. Consistent visual marker.",
      "tag":  "Category · Coverage status. Format: 'Actor/Domain · Unreported|Underreported|Overstated|Missed|Sidelined'. Max 4 words. e.g. 'India · Unreported', 'Nuclear · Underreported', 'China · Overstated'.",
      "head": "One provocative sentence. Max 12 words. Frame as a hidden truth or overlooked fact. e.g. 'India's actual LPG buffer is opaque and likely inadequate'.",
      "body": "2-3 sentences explaining the gap. What is the mainstream narrative? What is being missed? Why does it matter? Max 50 words."
    }
  ],

  "sources": ["Array of publisher/source names used across the story. 8-12 sources for credibility. Mix wire services (Reuters, AP), broadsheets (NYT, FT), regional (TOI, Economic Times), specialist (Bloomberg, IAEA). e.g. 'Reuters', 'BBC News', 'Al Jazeera', 'Bloomberg'."]
}

### DATA TO ANALYZE
'''