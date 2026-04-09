import type { Story, PromptChip } from "@/types";

// ─── Stories ─────────────────────────────────────────────────────────────────

export const STORIES: Story[] = [
  {
    id: "tech",
    label: "AI & Tech",
    emoji: "🤖",
    gradient: "linear-gradient(155deg, #0F0C29 0%, #302B63 50%, #24243E 100%)",
  },
  {
    id: "markets",
    label: "Markets",
    emoji: "📈",
    gradient: "linear-gradient(155deg, #11998e 0%, #38ef7d 100%)",
  },
  {
    id: "politics",
    label: "Politics",
    emoji: "🗳️",
    gradient: "linear-gradient(155deg, #c0392b 0%, #8e44ad 100%)",
  },
  {
    id: "sports",
    label: "Sports",
    emoji: "🏆",
    gradient: "linear-gradient(155deg, #005C97 0%, #363795 100%)",
  },
  {
    id: "world",
    label: "World",
    emoji: "🌍",
    gradient: "linear-gradient(155deg, #f7971e 0%, #f5a623 60%, #f7c36a 100%)",
  },
  {
    id: "science",
    label: "Science",
    emoji: "🔬",
    gradient: "linear-gradient(155deg, #1CB5E0 0%, #000046 100%)",
  },
  {
    id: "entertainment",
    label: "Film & TV",
    emoji: "🎬",
    gradient: "linear-gradient(155deg, #f953c6 0%, #b91d73 100%)",
  },
];

// ─── Prompt Chips ─────────────────────────────────────────────────────────────

export const PROMPT_CHIPS: PromptChip[] = [
  { id: "1", label: "Generate Panels", icon: "📰" },
  { id: "2", label: "Generate Arc", icon: "🌐" },
];
