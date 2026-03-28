from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


# --- Theme and Meta ---

class Theme(BaseModel):
    bg: str
    surface: str
    card: str
    cardHover: str
    border: str
    border2: str
    divider: str
    appbarBg: str
    text: str
    textBright: str
    textDim: str
    accent: str
    accentDark: str
    neg: str
    pos: str
    blue: str
    tag1: str
    tag2: str
    chartGrid: str
    overrides: Dict[str, str] = {}


class Meta(BaseModel):
    brand: str = "story<em>arc</em>"
    liveLabel: str


# --- Topic and Sections ---

class Topic(BaseModel):
    eyebrow: str
    title: str
    subtitle: str


class SectionInfo(BaseModel):
    num: str
    title: str


class Sections(BaseModel):
    panels: SectionInfo
    overview: SectionInfo
    timeline: SectionInfo
    chart: SectionInfo
    lenses: SectionInfo
    quotes: SectionInfo
    takeaways: SectionInfo
    blindspots: SectionInfo


# --- Components ---

class Stat(BaseModel):
    label: str
    value: str
    sub: str
    chipClass: Optional[str] = None
    valClass: str  # "warn" | "up" | "ok" | "accent"


class Panel(BaseModel):
    tag: str = Field(..., description="ALL CAPS chapter label e.g. ORIGIN, ESCALATION.")
    tagBg: str = Field(..., description="rgba() background for the tag chip.")
    tagColor: str = Field(..., description="#fff or #0b0c0f depending on tagBg brightness.")
    dateColor: str = Field(..., description="Hex matching tagBg hue.")
    date: str
    head: str = Field(..., description="Punchy headline. Max 12 words.")
    body: str = Field(..., description="2-3 sentences. Last sentence must answer 'so what?'")
    sceneBg: str = Field(
        ...,
        description="CSS linear-gradient matching colourMood. NEVER a flat hex. "
                    "Example: 'linear-gradient(135deg,#1a0508 0%,#3d0d0d 100%)'"
    )
    visualScene: str = Field(
        ...,
        description="Standalone Imagen 4.0 prompt. No text/labels/flags/real faces. "
                    "3-5 sentences describing setting, lighting, mood, camera angle."
    )
    colourMood: str = Field(..., description="Dominant palette in 3-6 words.")
    keyMetric: Optional[str] = Field(
        None,
        description="Standout number or human-scale equivalent. Use null only if no quantification possible."
    )
    keyMetricLabel: Optional[str] = Field(
        None,
        description="3-5 word label for keyMetric. Omit if keyMetric is null."
    )
    image: str = Field(..., description="Filename e.g. panel_1.jpg up to panel_6.jpg.")
    sentiment: str  # "negative" | "positive" | "neutral" | "warning"


class TimelineEvent(BaseModel):
    type: str  # "neg" | "pos" | "tag1" | "tag2" | "hot"
    date: str
    head: str = Field(..., description="One sentence. Max 12 words.")
    body: str = Field(..., description="2-3 sentences of context.")
    callout: Optional[str] = Field(None, description="One-line downstream impact insight.")
    badge: str = Field(..., description="Symbol + label e.g. '↓ War declared'.")
    badgeType: str  # "neg" | "pos" | "tag1" | "tag2" | "neu"
    source: Optional[str] = None
    isLatest: bool = False
    isTurningPoint: Optional[bool] = Field(
        None,
        description="Set to true only for 1-2 genuine turning points. Omit entirely for all other events."
    )


# --- Charting ---

class Thresholds(BaseModel):
    high: float
    highColor: str
    mid: float
    midColor: str
    lowColor: str


class Dataset(BaseModel):
    label: str
    data: List[float]
    color: str
    yAxisID: str  # "y" | "y1"
    inferred: bool = False
    thresholds: Optional[Thresholds] = None
    dashed: Optional[bool] = False


class AxisConfig(BaseModel):
    min: float
    max: float
    label: str
    color: str
    prefix: Optional[str] = None
    position: Optional[str] = None  # "right" or omit for left


class Chart(BaseModel):
    title: str
    subtitle: str
    labels: List[str]
    datasets: List[Dataset]
    yAxes: Dict[str, AxisConfig]


# --- Sentiment River ---

class SentimentPoint(BaseModel):
    period: str = Field(..., description="Display label e.g. 'Oct 23'.")
    score: float  # -1.0 to +1.0
    eventLabel: str = Field(..., description="2-4 word descriptor.")


# --- Analysis & Insights ---

class Lens(BaseModel):
    cat: str
    icon: str
    featured: bool = False
    head: str
    body: str
    metricVal: str
    metricLabel: str
    metricType: str  # "warn" | "up" | "ok"


class Quote(BaseModel):
    flag: str
    logoBg: str
    logoBorder: str
    accentColor: Optional[str] = None
    text: str
    attr: str


class Takeaway(BaseModel):
    type: Optional[str] = None  # "tag1" | "tag2" | "neg" | "pos"
    head: str
    body: str


class Blindspot(BaseModel):
    icon: str = "🔦"
    tag: str
    head: str
    body: str


# --- Root Model ---

class StoryArc(BaseModel):
    meta: Meta
    theme: Theme
    topic: Topic
    sections: Sections
    stats: List[Stat]
    panels: List[Panel]
    overview: str
    takeaways: List[Takeaway]
    timeline: List[TimelineEvent]
    chart: Chart
    sentimentRiver: List[SentimentPoint]
    lenses: List[Lens]
    quotes: List[Quote]
    blindspots: List[Blindspot]
    sources: List[str]
