import { memo } from "react";
import type { NewsArticle } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { NewsCard } from "./NewsCard";
import { SkeletonNewsCard } from "./SkeletonNewsCard";

interface NewsFeedProps {
  articles: NewsArticle[];
  filterKey?: string;
  isBookmarked: (id: string) => boolean;
  onBookmark: (id: string) => void;
  onArticleClick: (jobId: string) => void;
  onSignInClick: () => void;
  onShowcaseArcClick?: (shareToken: string) => void;
  showcaseArcs?: NewsArticle[];
  showcaseLoading?: boolean;
  isLoading?: boolean;
}

export const NewsFeed = memo<NewsFeedProps>(
  ({
    articles,
    filterKey,
    isBookmarked,
    onBookmark,
    onArticleClick,
    onSignInClick,
    onShowcaseArcClick,
    showcaseArcs = [],
    showcaseLoading = false,
    isLoading = false,
  }) => {
    const { user, isLoading: authLoading } = useAuth();

    return (
      <section aria-label="Story Arcs">
        <div>
          {isLoading || authLoading || (!user && showcaseLoading) ? (
            Array.from({ length: 3 }).map((_, i) => (
              <SkeletonNewsCard key={i} index={i} />
            ))
          ) : !user ? (
            /* ── Unauthenticated: showcase arc cards ── */
            <div>
              {showcaseArcs.map((article, index) => (
                <NewsCard
                  key={article.id}
                  article={article}
                  index={index}
                  isBookmarked={false}
                  onBookmark={onSignInClick}
                  onClick={() => {
                    if (article.share_token) {
                      onShowcaseArcClick?.(article.share_token);
                    }
                  }}
                />
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{
                  background:
                    "linear-gradient(135deg,rgba(99,102,241,0.10),rgba(236,72,153,0.10))",
                }}
              >
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 26 26"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4 6h18M4 12h12M4 18h8"
                    stroke="#6366F1"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <p className="mb-1 text-[15px] font-bold text-[#0C0C0C]">
                No arcs yet
              </p>
              <p className="text-[13px] leading-relaxed text-[#8C8C8C]">
                Ask arc anything below to generate your first story arc.
              </p>
            </div>
          ) : (
            <div key={filterKey}>
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
          )}
        </div>
      </section>
    );
  },
);
NewsFeed.displayName = "NewsFeed";
