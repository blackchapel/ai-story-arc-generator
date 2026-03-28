import React, { memo, useCallback } from 'react'
import type { NewsArticle } from '@/types'
import { NewsCard } from './NewsCard'

interface NewsFeedProps {
  articles: NewsArticle[]
  isBookmarked: (id: string) => boolean
  onBookmark: (id: string) => void
  onArticleClick: (id: string) => void
  onSeeAll: () => void
}

export const NewsFeed = memo<NewsFeedProps>(
  ({ articles, isBookmarked, onBookmark, onArticleClick, onSeeAll }) => {
    const handleSeeAll = useCallback(() => onSeeAll(), [onSeeAll])

    return (
      <section aria-label="Top stories">
        {/* Feed header */}
        <div className="flex items-center justify-between px-[18px] pb-0 pt-4">
          <span
            className="text-[10.5px] font-bold uppercase tracking-[0.09em]"
            style={{
              background: 'linear-gradient(90deg, #F59E0B 0%, #EF4444 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Top Stories
          </span>
          <button
            onClick={handleSeeAll}
            className="cursor-pointer border-none bg-transparent py-1 text-[12px] font-bold text-[#6366F1]"
          >
            See all →
          </button>
        </div>

        {/* Cards */}
        <div>
          {articles.map((article, index) => (
            <NewsCard
              key={article.id}
              article={article}
              index={index}
              isBookmarked={isBookmarked(article.id)}
              onBookmark={onBookmark}
              onClick={onArticleClick}
            />
          ))}
        </div>
      </section>
    )
  },
)

NewsFeed.displayName = 'NewsFeed'
