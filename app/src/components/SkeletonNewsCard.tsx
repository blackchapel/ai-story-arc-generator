import { memo } from "react";

interface SkeletonNewsCardProps {
  index: number;
}

export const SkeletonNewsCard = memo<SkeletonNewsCardProps>(({ index }) => {
  return (
    <article
      className="relative flex items-center gap-3 border-b border-[#EBEBEB] px-[18px] py-[14px]"
      style={{
        animation: `cardReveal 0.5s cubic-bezier(0.4,0,0.2,1) ${index * 0.05 + 0.04}s both`,
      }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-[18px] top-[18px] w-[2.5px] rounded-sm"
        style={{
          bottom: "18px",
          backgroundColor: "#E5E7EB",
        }}
        aria-hidden="true"
      />

      {/* Thumbnail skeleton */}
      <div
        className="ml-4 relative h-[86px] w-[86px] flex-shrink-0 overflow-hidden rounded-md bg-[#F5F5F5]"
        style={{
          background:
            "linear-gradient(90deg, #f0f0f0 0%, #ffffff 50%, #f0f0f0 100%)",
          backgroundSize: "400px 100%",
          animation: "shimmer 2s infinite",
        }}
        aria-hidden="true"
      />

      {/* Content skeleton */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* Category tag skeleton */}
        <div
          className="h-4 w-16 rounded-[4px] bg-[#E5E7EB]"
          style={{
            background:
              "linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%)",
            backgroundSize: "400px 100%",
            animation: "shimmer 2s infinite",
          }}
          aria-hidden="true"
        />

        {/* Title skeleton - 2 lines */}
        <div className="flex flex-col gap-2">
          <div
            className="h-3 w-full rounded-[2px] bg-[#E5E7EB]"
            style={{
              background:
                "linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%)",
              backgroundSize: "400px 100%",
              animation: "shimmer 2s infinite",
            }}
            aria-hidden="true"
          />
          <div
            className="h-3 w-4/5 rounded-[2px] bg-[#E5E7EB]"
            style={{
              background:
                "linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%)",
              backgroundSize: "400px 100%",
              animation: "shimmer 2s infinite",
            }}
            aria-hidden="true"
          />
        </div>

        {/* Description skeleton - 2 lines */}
        <div className="flex flex-col gap-2">
          <div
            className="h-2 w-full rounded-[2px] bg-[#E5E7EB]"
            style={{
              background:
                "linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%)",
              backgroundSize: "400px 100%",
              animation: "shimmer 2s infinite",
            }}
            aria-hidden="true"
          />
          <div
            className="h-2 w-3/4 rounded-[2px] bg-[#E5E7EB]"
            style={{
              background:
                "linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%)",
              backgroundSize: "400px 100%",
              animation: "shimmer 2s infinite",
            }}
            aria-hidden="true"
          />
        </div>

        {/* Meta skeleton */}
        <div className="mt-1 flex items-center gap-[5px]">
          <div
            className="h-2 w-20 rounded-[2px] bg-[#E5E7EB]"
            style={{
              background:
                "linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%)",
              backgroundSize: "400px 100%",
              animation: "shimmer 2s infinite",
            }}
            aria-hidden="true"
          />
          <div
            className="h-[2px] w-[2px] flex-shrink-0 rounded-full bg-[#E5E7EB]"
            aria-hidden="true"
          />
          <div
            className="h-2 w-16 rounded-[2px] bg-[#E5E7EB]"
            style={{
              background:
                "linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%)",
              backgroundSize: "400px 100%",
              animation: "shimmer 2s infinite",
            }}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Bookmark skeleton */}
      <div
        className="flex h-7 w-7 flex-shrink-0 cursor-pointer items-center justify-center self-center rounded-[8px] bg-[#E5E7EB]"
        style={{
          background:
            "linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%)",
          backgroundSize: "400px 100%",
          animation: "shimmer 2s infinite",
        }}
        aria-hidden="true"
      />
    </article>
  );
});

SkeletonNewsCard.displayName = "SkeletonNewsCard";
