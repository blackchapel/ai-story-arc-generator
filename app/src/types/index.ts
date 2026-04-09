import type { JobStatus } from "@/types/job";

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

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
  user_id?: string;
  title: string;
  description: string;
  img: string;
  tag: string;
  tag_text_color: string;
  source_names: string[];
  html?: string;
  is_shared: boolean;
  share_token?: string;
  is_saved: boolean;
}

// ─── ActiveJob ───────────────────────────────────────────────────────────────

export interface ActiveJob {
  job_id: string;
  prompt: string;
  status: JobStatus;
  created_at: string;
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
