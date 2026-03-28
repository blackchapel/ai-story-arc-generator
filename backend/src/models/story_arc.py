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
    tag: str
    tagBg: str
    tagColor: str
    dateColor: str
    date: str
    head: str
    body: str
    sceneBg: str = Field(..., description="CSS linear-gradient e.g. 'linear-gradient(135deg,#1a0508 0%,#3d0d0d 100%)'. Never a flat hex.")
    visualScene: str
    colourMood: str
    keyMetric: Optional[str] = None
    image: str  # e.g. panel_1.jpg
    sentiment: str  # "negative" | "positive" | "neutral" | "warning"

class TimelineEvent(BaseModel):
    type: str  # "neg" | "pos" | "tag1" | "tag2" | "hot"
    date: str
    head: str
    body: str
    callout: Optional[str] = None
    badge: str
    badgeType: str  # "neg" | "pos" | "tag1" | "tag2" | "neu"
    source: Optional[str] = None
    isLatest: bool = False

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
    period: str
    score: float  # -1.0 to +1.0
    eventLabel: str

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