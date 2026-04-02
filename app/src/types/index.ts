// ─── Category ────────────────────────────────────────────────────────────────

export type Category =
  | "Technology"
  | "Markets"
  | "Science"
  | "Politics"
  | "Sports"
  | "Health"
  | "Business";

// ─── Story ───────────────────────────────────────────────────────────────────

export interface Story {
  id: string;
  label: string;
  emoji: string;
  gradient: string;
}

// ─── NewsArticle ─────────────────────────────────────────────────────────────

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  img: string;
  tag: string;
  tag_text_color: string;
  source_names: string[];
  html?: string;
}

// ─── TopicFilter ─────────────────────────────────────────────────────────────

export interface TopicFilter {
  id: string;
  label: string;
}

// ─── PromptChip ──────────────────────────────────────────────────────────────

export interface PromptChip {
  id: string;
  label: string;
  icon: string;
}
