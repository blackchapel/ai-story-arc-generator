from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any

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
    overrides: Dict[str, Any] = {}

class Meta(BaseModel):
    brand: str = "story<em>arc</em>"
    liveLabel: str

# --- Topic and Sections ---

class Topic(BaseModel):
    eyebrow: str = Field(..., description="3 segments separated by ' · '. Max 6 words.")
    title: str = Field(..., description="3-6 word title using <em> for emphasis.")
    subtitle: str = Field(..., description="One sentence summary. Max 25 words.")

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
    label: str = Field(..., description="Short metric name. Max 3 words.")
    value: str = Field(..., description="1-4 characters. e.g. 'HIGH', '$92'.")
    sub: str = Field(..., description="One-line context. Max 5 words.")
    chipClass: Optional[str] = None
    valClass: Literal["warn", "up", "ok"]

class Panel(BaseModel):
    tag: str = Field(..., description="ALL CAPS chapter label.")
    tagBg: str = Field(..., description="rgba() background for the tag chip.")
    tagColor: str = Field(..., description="Hex or name for tag text.")
    dateColor: str = Field(..., description="Hex matching sentiment.")
    date: str = Field(..., description="Date with optional ' · Recent' or ' · Now' suffix.")
    head: str = Field(..., description="One punchy sentence. Max 12 words.")
    body: str = Field(..., description="2-3 short sentences. Max 35 words.")
    image: str = Field(..., description="Linear string index e.g. '1', '2'.")
    visualScene: str = Field(..., description="Detailed AI prompt for the image.")
    colourMood: str
    sentiment: Literal["negative", "positive", "neutral", "warning"]

class TimelineEvent(BaseModel):
    type: Literal["neg", "pos", "tag1", "tag2", "hot"]
    date: str
    head: str = Field(..., description="Max 12 words.")
    body: str = Field(..., description="Max 50 words including stats.")
    callout: Optional[str] = Field(None, description="Audience-specific impact.")
    badge: str = Field(..., description="Symbol + Label. Max 3 words.")
    badgeType: Literal["neg", "pos", "tag1", "tag2", "neu"]
    source: Optional[str] = None

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
    yAxisID: Literal["y", "y1"]
    thresholds: Optional[Thresholds] = None
    dashed: Optional[bool] = False

class AxisConfig(BaseModel):
    min: float
    max: float
    label: str
    color: str
    prefix: Optional[str] = None
    position: Optional[Literal["right"]] = None

class Chart(BaseModel):
    title: str
    subtitle: str
    labels: List[str]
    datasets: List[Dataset]
    yAxes: Dict[str, AxisConfig]

# --- Analysis & Insights ---

class Lens(BaseModel):
    cat: str
    icon: str
    featured: Optional[bool] = False
    head: str = Field(..., description="Max 8 words.")
    body: str = Field(..., description="Max 40 words mechanism explanation.")
    metricVal: str
    metricLabel: str
    metricType: Literal["warn", "up", "ok"]

class Quote(BaseModel):
    flag: str
    logoBg: str
    logoBorder: str
    accentColor: Optional[str] = None
    text: str = Field(..., description="Exact quote. Max 25 words.")
    attr: str = Field(..., description="Name — Role · Date.")

class Takeaway(BaseModel):
    type: Optional[Literal["tag1", "tag2"]] = None
    head: str = Field(..., description="Max 15 words.")
    body: str = Field(..., description="Max 50 words with <strong> highlights.")

class Blindspot(BaseModel):
    icon: str = "🔦"
    tag: str = Field(..., description="Actor · Coverage status.")
    head: str = Field(..., description="Provocative sentence. Max 12 words.")
    body: str = Field(..., description="Explanation of the gap. Max 50 words.")

# --- Root Model ---

class StoryArc(BaseModel):
    meta: Meta
    theme: Theme
    topic: Topic
    sections: Sections
    stats: List[Stat]
    panels: List[Panel]
    overview: str = Field(..., description="HTML paragraph, 150-200 words.")
    timeline: List[TimelineEvent]
    chart: Chart
    lenses: List[Lens]
    quotes: List[Quote]
    takeaways: List[Takeaway]
    blindspots: List[Blindspot]
    sources: List[str]