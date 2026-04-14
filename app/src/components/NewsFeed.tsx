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
  isLoading?: boolean;
}

const DEMO_ARC: NewsArticle = {
  id: "__demo__",
  title: "How AI Is Reshaping the Global Economy",
  description:
    "From manufacturing to finance, artificial intelligence is restructuring industries and redefining what it means to work in the 21st century.",
  img: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=200&q=80",
  tag: "Technology",
  tag_text_color: "#6366F1",
  source_names: ["The Economist", "MIT Tech Review", "Wired"],
  is_shared: false,
  is_saved: false,
};

export const NewsFeed = memo<NewsFeedProps>(
  ({
    articles,
    filterKey,
    isBookmarked,
    onBookmark,
    onArticleClick,
    onSignInClick,
    isLoading = false,
  }) => {
    const { user, isLoading: authLoading } = useAuth();

    return (
      <section aria-label="Story Arcs">
        <div>
          {isLoading || authLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <SkeletonNewsCard key={i} index={i} />
            ))
          ) : !user ? (
            /* ── Unauthenticated state ── */
            <div
              className="relative overflow-hidden"
              style={{ height: "260px" }}
            >
              {/* Ghost cards — blurred behind the overlay, clipped to container */}
              <div
                style={{
                  filter: "blur(5px)",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
                aria-hidden="true"
              >
                <NewsCard
                  article={DEMO_ARC}
                  index={0}
                  isBookmarked={false}
                  onBookmark={() => {}}
                  onClick={() => {}}
                />
                <NewsCard
                  article={DEMO_ARC}
                  index={1}
                  isBookmarked={false}
                  onBookmark={() => {}}
                  onClick={() => {}}
                />
              </div>

              {/* Frosted overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.75) 25%, rgba(255,255,255,0.97) 45%, #fff 100%)",
                }}
                aria-hidden="true"
              />

              {/* CTA — vertically centred in the lower clean half */}
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2.5 px-6 pb-5 pt-4">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-2xl"
                  style={{
                    background:
                      "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.12))",
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                  >
                    <rect
                      x="3"
                      y="8"
                      width="14"
                      height="10"
                      rx="2"
                      stroke="#6366F1"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M6.5 8V6a3.5 3.5 0 0 1 7 0v2"
                      stroke="#6366F1"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <p className="text-center text-[14px] font-bold leading-snug text-[#0C0C0C]">
                  Your story arcs live here
                </p>
                <p className="text-center text-[12px] leading-relaxed text-[#8C8C8C]">
                  Sign in to generate and view your personalised story arcs.
                </p>
                <button
                  onClick={onSignInClick}
                  className="mt-0.5 flex cursor-pointer items-center gap-2 rounded-full border-none px-5 py-[10px] text-[13px] font-bold text-white transition-opacity active:opacity-80"
                  style={{
                    background:
                      "linear-gradient(135deg,#6366F1 0%,#8B5CF6 100%)",
                    boxShadow: "0 4px 16px rgba(99,102,241,0.32)",
                  }}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 13 13"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M6.5 1C3.46 1 1 3.46 1 6.5S3.46 12 6.5 12 12 9.54 12 6.5 9.54 1 6.5 1Z"
                      stroke="white"
                      strokeWidth="1.3"
                    />
                    <path
                      d="M4.5 6.5h4M7 5l1.5 1.5L7 8"
                      stroke="white"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Sign in to get started
                </button>
              </div>
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
