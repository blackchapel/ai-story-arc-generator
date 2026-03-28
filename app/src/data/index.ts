import type { Story, NewsArticle, TopicFilter, PromptChip, Category } from '@/types'

// ─── Category meta ───────────────────────────────────────────────────────────

export const CATEGORY_META: Record<
  Category,
  { color: string; bg: string; border: string; accentBar: string }
> = {
  Technology: {
    color:     'text-[#6366F1]',
    bg:        'bg-[rgba(99,102,241,0.09)]',
    border:    'border-[rgba(99,102,241,0.18)]',
    accentBar: 'bg-[#6366F1]',
  },
  Markets: {
    color:     'text-[#10B981]',
    bg:        'bg-[rgba(16,185,129,0.09)]',
    border:    'border-[rgba(16,185,129,0.18)]',
    accentBar: 'bg-[#10B981]',
  },
  Science: {
    color:     'text-[#0EA5E9]',
    bg:        'bg-[rgba(14,165,233,0.09)]',
    border:    'border-[rgba(14,165,233,0.18)]',
    accentBar: 'bg-[#0EA5E9]',
  },
  Politics: {
    color:     'text-[#EF4444]',
    bg:        'bg-[rgba(239,68,68,0.09)]',
    border:    'border-[rgba(239,68,68,0.18)]',
    accentBar: 'bg-[#EF4444]',
  },
  Sports: {
    color:     'text-[#F59E0B]',
    bg:        'bg-[rgba(245,158,11,0.09)]',
    border:    'border-[rgba(245,158,11,0.18)]',
    accentBar: 'bg-[#F59E0B]',
  },
  Health: {
    color:     'text-[#EC4899]',
    bg:        'bg-[rgba(236,72,153,0.09)]',
    border:    'border-[rgba(236,72,153,0.18)]',
    accentBar: 'bg-[#EC4899]',
  },
  Business: {
    color:     'text-[#8B5CF6]',
    bg:        'bg-[rgba(139,92,246,0.09)]',
    border:    'border-[rgba(139,92,246,0.18)]',
    accentBar: 'bg-[#8B5CF6]',
  },
}

// ─── Stories ─────────────────────────────────────────────────────────────────

export const STORIES: Story[] = [
  {
    id: 'tech',
    label: 'AI & Tech',
    emoji: '🤖',
    gradient: 'linear-gradient(155deg, #0F0C29 0%, #302B63 50%, #24243E 100%)',
  },
  {
    id: 'markets',
    label: 'Markets',
    emoji: '📈',
    gradient: 'linear-gradient(155deg, #11998e 0%, #38ef7d 100%)',
  },
  {
    id: 'politics',
    label: 'Politics',
    emoji: '🗳️',
    gradient: 'linear-gradient(155deg, #c0392b 0%, #8e44ad 100%)',
  },
  {
    id: 'sports',
    label: 'Sports',
    emoji: '🏆',
    gradient: 'linear-gradient(155deg, #005C97 0%, #363795 100%)',
  },
  {
    id: 'world',
    label: 'World',
    emoji: '🌍',
    gradient: 'linear-gradient(155deg, #f7971e 0%, #f5a623 60%, #f7c36a 100%)',
  },
  {
    id: 'science',
    label: 'Science',
    emoji: '🔬',
    gradient: 'linear-gradient(155deg, #1CB5E0 0%, #000046 100%)',
  },
  {
    id: 'entertainment',
    label: 'Film & TV',
    emoji: '🎬',
    gradient: 'linear-gradient(155deg, #f953c6 0%, #b91d73 100%)',
  },
]

// ─── Topic Filters ───────────────────────────────────────────────────────────

export const TOPIC_FILTERS: TopicFilter[] = [
  { id: 'all',       label: 'For You',  emoji: '✦',  category: 'all'        },
  { id: 'tech',      label: 'AI',       emoji: '🤖', category: 'Technology' },
  { id: 'markets',   label: 'Markets',  emoji: '📊', category: 'Markets'    },
  { id: 'cricket',   label: 'Cricket',  emoji: '🏏', category: 'Sports'     },
  { id: 'world',     label: 'World',    emoji: '🌍', category: 'Science'    },
  { id: 'science',   label: 'Science',  emoji: '🔬', category: 'Science'    },
  { id: 'health',    label: 'Health',   emoji: '💊', category: 'Health'     },
]

// ─── News Articles ────────────────────────────────────────────────────────────

export const NEWS_ARTICLES: NewsArticle[] = [
  {
    id: '1',
    category: 'Technology',
    title: 'OpenAI unveils next-gen reasoning model with human-level science benchmarks',
    description: 'The new model outperforms PhD-level researchers on biology, chemistry, and physics tests.',
    imageUrl: 'https://picsum.photos/seed/aitech2026/200/200',
    imageAlt: 'AI chip circuitry',
    sourceName: 'The Verge',
    sourceIcon: '🔵',
    timeAgo: '2h ago',
    readTimeMin: 4,
  },
  {
    id: '2',
    category: 'Markets',
    title: 'S&P 500 surges to record high as inflation data beats expectations',
    description: 'Major indices soared after CPI came in well below forecasts, reigniting rate-cut hopes.',
    imageUrl: 'https://picsum.photos/seed/stockmarket99/200/200',
    imageAlt: 'Stock market chart',
    sourceName: 'Bloomberg',
    sourceIcon: '📊',
    timeAgo: '4h ago',
    readTimeMin: 3,
  },
  {
    id: '3',
    category: 'Science',
    title: 'SpaceX Starship completes first fully successful orbital mission',
    description: 'The giant rocket achieved all objectives and landed intact, a landmark for deep-space travel.',
    imageUrl: 'https://picsum.photos/seed/rocketspace/200/200',
    imageAlt: 'Rocket launch',
    sourceName: 'Space.com',
    sourceIcon: '🚀',
    timeAgo: '6h ago',
    readTimeMin: 5,
  },
  {
    id: '4',
    category: 'Politics',
    title: 'G7 leaders sign landmark international agreement on AI safety rules',
    description: 'The binding framework sets global standards for frontier AI deployment for the first time.',
    imageUrl: 'https://picsum.photos/seed/g7summit/200/200',
    imageAlt: 'World leaders at summit',
    sourceName: 'Reuters',
    sourceIcon: '🌐',
    timeAgo: '8h ago',
    readTimeMin: 4,
  },
  {
    id: '5',
    category: 'Sports',
    title: 'India clinches ICC Champions Trophy in last-ball thriller against Australia',
    description: "Rohit Sharma's side held nerves to seal a 2-wicket win with one delivery remaining.",
    imageUrl: 'https://picsum.photos/seed/cricket2026/200/200',
    imageAlt: 'Cricket stadium',
    sourceName: 'ESPNcricinfo',
    sourceIcon: '🏏',
    timeAgo: '10h ago',
    readTimeMin: 3,
  },
  {
    id: '6',
    category: 'Health',
    title: 'Novel immunotherapy shows 94% remission rate in Phase 3 cancer trial',
    description: 'The treatment targets multiple cancer types simultaneously with fewer side effects than chemo.',
    imageUrl: 'https://picsum.photos/seed/medresearch/200/200',
    imageAlt: 'Medical research lab',
    sourceName: 'Nature',
    sourceIcon: '💊',
    timeAgo: '12h ago',
    readTimeMin: 6,
  },
  {
    id: '7',
    category: 'Business',
    title: "Apple's Q2 earnings smash forecasts driven by record services revenue",
    description: 'Services hit $26B as Apple Intelligence features drove a surge in subscription upgrades.',
    imageUrl: 'https://picsum.photos/seed/applebiz/200/200',
    imageAlt: 'Tech product launch event',
    sourceName: 'WSJ',
    sourceIcon: '🍎',
    timeAgo: '14h ago',
    readTimeMin: 3,
  },
]

// ─── Prompt Chips ─────────────────────────────────────────────────────────────

export const PROMPT_CHIPS: PromptChip[] = [
  { id: '1', label: 'Summarise news', icon: '📰' },
  { id: '2', label: 'Fact-check',     icon: '🔍' },
  { id: '3', label: 'Translate',      icon: '🌐' },
  { id: '4', label: 'Explain',        icon: '🤔' },
  { id: '5', label: 'Deep dive',      icon: '💡' },
]
