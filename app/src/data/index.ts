import type { Story, PromptChip, Category } from "@/types";

// ─── Category meta ───────────────────────────────────────────────────────────

export const CATEGORY_META: Record<
  Category,
  { color: string; bg: string; border: string; accentBar: string }
> = {
  Technology: {
    color: "text-[#6366F1]",
    bg: "bg-[rgba(99,102,241,0.09)]",
    border: "border-[rgba(99,102,241,0.18)]",
    accentBar: "bg-[#6366F1]",
  },
  Markets: {
    color: "text-[#10B981]",
    bg: "bg-[rgba(16,185,129,0.09)]",
    border: "border-[rgba(16,185,129,0.18)]",
    accentBar: "bg-[#10B981]",
  },
  Science: {
    color: "text-[#0EA5E9]",
    bg: "bg-[rgba(14,165,233,0.09)]",
    border: "border-[rgba(14,165,233,0.18)]",
    accentBar: "bg-[#0EA5E9]",
  },
  Politics: {
    color: "text-[#EF4444]",
    bg: "bg-[rgba(239,68,68,0.09)]",
    border: "border-[rgba(239,68,68,0.18)]",
    accentBar: "bg-[#EF4444]",
  },
  Sports: {
    color: "text-[#F59E0B]",
    bg: "bg-[rgba(245,158,11,0.09)]",
    border: "border-[rgba(245,158,11,0.18)]",
    accentBar: "bg-[#F59E0B]",
  },
  Health: {
    color: "text-[#EC4899]",
    bg: "bg-[rgba(236,72,153,0.09)]",
    border: "border-[rgba(236,72,153,0.18)]",
    accentBar: "bg-[#EC4899]",
  },
  Business: {
    color: "text-[#8B5CF6]",
    bg: "bg-[rgba(139,92,246,0.09)]",
    border: "border-[rgba(139,92,246,0.18)]",
    accentBar: "bg-[#8B5CF6]",
  },
};

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
