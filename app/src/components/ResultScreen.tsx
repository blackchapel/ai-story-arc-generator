import { memo, useCallback, useEffect, useState } from "react";
import { fetchOutput } from "@/apis";

interface ResultScreenProps {
  jobId: string;
  htmlUrl?: string;
  onBack: () => void;
}

export const ResultScreen = memo<ResultScreenProps>(
  ({ jobId, htmlUrl: initialHtmlUrl, onBack }) => {
    const [loaded, setLoaded] = useState(false);
    const [htmlUrl, setHtmlUrl] = useState<string | null>(initialHtmlUrl ?? null);
    const [fetchError, setFetchError] = useState(false);

    // Fetch the GCS URL if not passed in (card tap or direct URL navigation)
    useEffect(() => {
      if (initialHtmlUrl) return;
      const controller = new AbortController();
      fetchOutput(jobId)
        .then((arc) => { if (!controller.signal.aborted) setHtmlUrl(arc.html ?? null); })
        .catch(() => { if (!controller.signal.aborted) setFetchError(true); });
      return () => controller.abort();
    }, [jobId, initialHtmlUrl]);

    const handleShare = useCallback(() => {
      if (navigator.share) {
        navigator.share({ title: "arc. story", url: window.location.href }).catch(() => {});
      } else {
        navigator.clipboard?.writeText(window.location.href).catch(() => {});
      }
    }, []);

    return (
      <div
        className="flex h-full w-full flex-col bg-white"
        style={{ animation: "resultSlideUp 0.45s cubic-bezier(0.34,1.06,0.64,1) both" }}
      >
        {/* Top bar */}
        <div
          className="relative flex h-[52px] flex-shrink-0 items-center justify-between px-4"
          style={{ borderBottom: "1px solid #EBEBEB" }}
        >
          <div
            className="absolute bottom-0 left-0 right-0 h-[2px] opacity-60"
            style={{
              background: "linear-gradient(90deg, #6366F1 0%, #EC4899 40%, #F5A623 70%, #10B981 100%)",
            }}
            aria-hidden="true"
          />

          <button
            onClick={onBack}
            className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border-none bg-transparent px-2 text-[13px] font-semibold text-[#6366F1] transition-opacity active:opacity-60"
            aria-label="Back to home"
          >
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none" aria-hidden="true">
              <path d="M6 1L1 6l5 5" stroke="#6366F1" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Home
          </button>

          <span className="absolute left-1/2 -translate-x-1/2 select-none font-logo text-[22px] font-black leading-none tracking-[-1.5px] text-[#0C0C0C]">
            arc<span style={{ color: "#F5A623" }}>.</span>
          </span>

          <button
            onClick={handleShare}
            className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-none bg-[#F5F5F5] px-3 text-[12px] font-semibold text-[#0C0C0C] transition-colors active:bg-[#EDEDED]"
            aria-label="Share this arc"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <circle cx="10.5" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
              <circle cx="10.5" cy="10.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
              <circle cx="2.5" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M4 5.8l5-2.6M4 7.2l5 2.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            Share
          </button>
        </div>

        {/* Content */}
        <div className="relative flex-1 overflow-hidden">
          {/* Shimmer while GCS URL is loading or iframe hasn't painted */}
          {(!htmlUrl || !loaded) && !fetchError && (
            <div className="absolute inset-0 z-10 bg-white">
              <div className="flex flex-col gap-4 p-5 pt-8">
                {[80, 55, 90, 40, 70].map((w, i) => (
                  <div
                    key={i}
                    className="rounded-lg"
                    style={{
                      height: i === 0 ? 180 : 16,
                      width: `${w}%`,
                      background: "linear-gradient(90deg, #F5F5F5 25%, #EDEDED 50%, #F5F5F5 75%)",
                      backgroundSize: "800px 100%",
                      animation: `shimmer 1.6s infinite ${i * 0.1}s`,
                    }}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
          )}

          {fetchError && (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="text-[15px] font-semibold text-[#0C0C0C]">Couldn't load this arc</p>
              <p className="text-[13px] text-[#8C8C8C]">It may have expired or been removed.</p>
              <button
                onClick={onBack}
                className="mt-2 rounded-xl border-none bg-[#F5F5F5] px-5 py-2.5 text-[13px] font-semibold text-[#0C0C0C] active:bg-[#EDEDED]"
              >
                Go home
              </button>
            </div>
          )}

          {/* Iframe points directly at the public GCS URL — no blob needed */}
          {htmlUrl && (
            <iframe
              src={htmlUrl}
              onLoad={() => setLoaded(true)}
              title="Your arc story"
              className="h-full w-full border-none"
              sandbox="allow-scripts allow-popups"
              loading="eager"
            />
          )}
        </div>

        <style>{`
          @keyframes resultSlideUp {
            from { opacity: 0; transform: translateY(100%); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes shimmer {
            0%   { background-position: -400px 0; }
            100% { background-position:  400px 0; }
          }
        `}</style>
      </div>
    );
  },
);

ResultScreen.displayName = "ResultScreen";
