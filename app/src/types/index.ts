// ─── Category ────────────────────────────────────────────────────────────────

export type Category =
  | 'Technology'
  | 'Markets'
  | 'Science'
  | 'Politics'
  | 'Sports'
  | 'Health'
  | 'Business'

// ─── Story ───────────────────────────────────────────────────────────────────

export interface Story {
  id: string
  label: string
  emoji: string
  gradient: string
}

// ─── NewsArticle ─────────────────────────────────────────────────────────────

export interface NewsArticle {
  id: string
  category: Category
  title: string
  description: string
  imageUrl: string
  imageAlt: string
  sourceName: string
  sourceIcon: string
  timeAgo: string
  readTimeMin: number
}

// ─── TopicFilter ─────────────────────────────────────────────────────────────

export interface TopicFilter {
  id: string
  label: string
  emoji: string
  category: Category | 'all'
}

// ─── PromptChip ──────────────────────────────────────────────────────────────

export interface PromptChip {
  id: string
  label: string
  icon: string
}
