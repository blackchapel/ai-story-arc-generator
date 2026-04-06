import { memo } from "react";
import type { NewsArticle } from "@/types";
import { NewsCard } from "./NewsCard";
import { SkeletonNewsCard } from "./SkeletonNewsCard";

interface NewsFeedProps {
  articles: NewsArticle[];
  isBookmarked: (id: string) => boolean;
  onBookmark: (id: string) => void;
  onArticleClick: (jobId: string) => void;
  isLoading?: boolean;
}

export const NewsFeed = memo<NewsFeedProps>(
  ({
    articles,
    isBookmarked,
    onBookmark,
    onArticleClick,
    isLoading = false,
  }) => {
    return (
      <section aria-label="Top stories">
        {/* Feed header */}
        <div className="flex items-center justify-between px-[18px] pb-0 pt-4">
          <span
            className="text-[10.5px] font-bold uppercase tracking-[0.09em]"
            style={{
              background: "linear-gradient(90deg, #F59E0B 0%, #EF4444 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Story Arcs
          </span>
        </div>

        {/* Cards */}
        <div>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <SkeletonNewsCard key={`skeleton-${index}`} index={index} />
            ))
          ) : articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.10), rgba(236,72,153,0.10))" }}
              >
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
                  <path
                    d="M4 6h18M4 12h12M4 18h8"
                    stroke="#6366F1"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <p className="mb-1 text-[15px] font-bold text-[#0C0C0C]">No arcs yet</p>
              <p className="text-[13px] leading-relaxed text-[#8C8C8C]">
                Ask arc anything below to generate your first story arc.
              </p>
            </div>
          ) : (
            articles.map((article, index) => (
              <NewsCard
                key={article.id}
                article={article}
                index={index}
                isBookmarked={isBookmarked(article.id)}
                onBookmark={onBookmark}
                onClick={onArticleClick}
              />
            ))
          )}
        </div>
      </section>
    );
  },
);

NewsFeed.displayName = "NewsFeed";
