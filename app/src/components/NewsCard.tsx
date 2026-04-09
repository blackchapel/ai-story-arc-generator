import { memo, useCallback, useMemo } from "react";
import type { NewsArticle } from "@/types";
import { generateTagBackground } from "@/utils/tagColor";

interface NewsCardProps {
  article: NewsArticle;
  index: number;
  isBookmarked: boolean;
  onBookmark: (id: string) => void;
  onClick: (jobId: string) => void;
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

    const tagBg = useMemo(
      () => generateTagBackground(article.tag_text_color),
      [article.tag_text_color],
    );

    return (
      <article
        onClick={handleClick}
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleClick()}
        aria-label={`Read: ${article.title}`}
        className="relative flex items-center cursor-pointer gap-3 border-b border-[#EBEBEB] px-[18px] py-[14px] last:border-b-0 active:bg-[#F5F5F5]"
        style={{
          animation: `cardReveal 0.5s cubic-bezier(0.4,0,0.2,1) ${index * 0.05 + 0.04}s both`,
          outline: "none",
        }}
      >
        {/* Left accent bar */}
        <div
          className="absolute left-[18px] top-[18px] w-[2.5px] rounded-sm"
          style={{ bottom: "18px", backgroundColor: article.tag_text_color }}
          aria-hidden="true"
        />

        {/* Thumbnail */}
        <div className="relative ml-4 h-[86px] w-[86px] flex-shrink-0 overflow-hidden rounded-md bg-[#F5F5F5]">
          <img
            src={article.img}
            alt=""
            loading="lazy"
            width={86}
            height={86}
            className="h-full w-full object-cover"
            decoding="async"
          />
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <span
            className="mb-[5px] inline-flex w-fit items-center rounded-[4px] px-[7px] py-[2px] text-[9px] font-extrabold uppercase tracking-[0.08em]"
            style={{ color: article.tag_text_color, backgroundColor: tagBg }}
          >
            {article.tag}
          </span>

          <h3 className="mb-1 line-clamp-2 text-[13.5px] font-bold leading-[1.38] text-[#0C0C0C]">
            {article.title}
          </h3>

          <p className="line-clamp-2 text-[11.5px] leading-[1.48] text-[#8C8C8C]">
            {article.description}
          </p>

          <p className="mt-[7px] truncate text-[10px] font-bold text-[#0C0C0C]">
            {article.source_names.join(" · ")}
          </p>
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
