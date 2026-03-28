import React, { memo, useCallback } from "react";
import type { NewsArticle } from "@/types";
import { CATEGORY_META } from "@/data";

interface NewsCardProps {
  article: NewsArticle;
  index: number;
  isBookmarked: boolean;
  onBookmark: (id: string) => void;
  onClick: (id: string) => void;
}

const BookmarkIcon = memo<{ filled: boolean }>(({ filled }) => (
  <svg
    width="14"
    height="16"
    viewBox="0 0 14 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M2 2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v13l-5-3-5 3V2Z"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
));
BookmarkIcon.displayName = "BookmarkIcon";

export const NewsCard = memo<NewsCardProps>(
  ({ article, index, isBookmarked, onBookmark, onClick }) => {
    const meta = CATEGORY_META[article.category];

    const handleBookmark = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onBookmark(article.id);
      },
      [onBookmark, article.id],
    );

    const handleClick = useCallback(
      () => onClick(article.id),
      [onClick, article.id],
    );

    return (
      <article
        onClick={handleClick}
        tabIndex={0}
        role="button"
        onKeyDown={(e) => e.key === "Enter" && handleClick()}
        aria-label={`Read: ${article.title}`}
        className="relative flex items-center cursor-pointer items-start gap-3 border-b border-[#EBEBEB] px-[18px] py-[14px] last:border-b-0 active:bg-[#F5F5F5]"
        style={{
          animation: `cardReveal 0.5s cubic-bezier(0.4,0,0.2,1) ${index * 0.05 + 0.04}s both`,
          outline: "none",
        }}
      >
        {/* Left accent bar */}
        <div
          className={`absolute left-[18px] top-[18px] w-[2.5px] rounded-sm ${meta.accentBar}`}
          style={{ bottom: "18px" }}
          aria-hidden="true"
        />

        {/* Thumbnail */}
        <div
          className="ml-4 relative h-[86px] w-[86px] flex-shrink-0 overflow-hidden rounded-md bg-[#F5F5F5]"
          style={{ boxShadow: `inset 0 3px 0 var(--thumb-color, transparent)` }}
        >
          <img
            src={article.imageUrl}
            alt={article.imageAlt}
            loading="lazy"
            width={86}
            height={86}
            className="h-full w-full object-cover transition-transform duration-300 group-active:scale-[1.04]"
            decoding="async"
          />
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Category tag */}
          <span
            className={`mb-[5px] inline-flex w-fit items-center rounded-[4px] px-[7px] py-[2px] text-[9px] font-extrabold uppercase tracking-[0.08em] ${meta.color} ${meta.bg}`}
          >
            {article.category}
          </span>

          {/* Title */}
          <h3 className="mb-1 line-clamp-2 text-[13.5px] font-bold leading-[1.38] text-[#0C0C0C]">
            {article.title}
          </h3>

          {/* Description */}
          <p className="line-clamp-2 text-[11.5px] leading-[1.48] text-[#8C8C8C]">
            {article.description}
          </p>

          {/* Meta row */}
          <div className="mt-[7px] flex items-center gap-[5px]">
            <div className="flex h-[14px] w-[14px] flex-shrink-0 items-center justify-center overflow-hidden rounded-[3px] bg-[#EDEDED] text-[9px]">
              {article.sourceIcon}
            </div>
            <span className="text-[10px] font-bold text-[#0C0C0C]">
              {article.sourceName}
            </span>
            {/* Colored meta dot */}
            <div
              className={`h-[2px] w-[2px] flex-shrink-0 rounded-full ${meta.accentBar}`}
              aria-hidden="true"
            />
            <span className="text-[10px] text-[#8C8C8C]">
              {article.timeAgo}
            </span>
            <span className="text-[10px] text-[#8C8C8C]">
              · {article.readTimeMin} min read
            </span>
          </div>
        </div>

        {/* Bookmark */}
        <button
          onClick={handleBookmark}
          aria-label={isBookmarked ? "Remove bookmark" : "Bookmark article"}
          className={`-mr-1 flex h-7 w-7 flex-shrink-0 cursor-pointer items-center justify-center self-center rounded-[8px] border-none bg-transparent transition-colors duration-150 ${
            isBookmarked
              ? "text-[#F5A623]"
              : "text-[#8C8C8C] active:bg-[rgba(245,166,35,0.12)] active:text-[#F5A623]"
          }`}
        >
          <BookmarkIcon filled={isBookmarked} />
        </button>
      </article>
    );
  },
);

NewsCard.displayName = "NewsCard";
