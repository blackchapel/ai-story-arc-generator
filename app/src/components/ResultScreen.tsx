import { memo, useCallback, useEffect, useRef, useState } from "react";

interface ResultScreenProps {
  htmlContent: string;
  onBack: () => void;
}

export const ResultScreen = memo<ResultScreenProps>(
  ({ htmlContent, onBack }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [loaded, setLoaded] = useState(false);

    // Write HTML into the sandboxed iframe via srcdoc
    // srcdoc is XSS-safe when sandbox restricts scripts appropriately
    const handleLoad = useCallback(() => {
      setLoaded(true);
    }, []);

    // Blob URL approach for full fidelity (scripts, styles, relative assets)
    const [blobUrl, setBlobUrl] = useState<string | null>(null);

    useEffect(() => {
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
      return () => URL.revokeObjectURL(url);
    }, [htmlContent]);

    return (
      <div
        className="flex h-full w-full flex-col bg-white"
        style={{
          animation: "resultSlideUp 0.45s cubic-bezier(0.34,1.06,0.64,1) both",
        }}
      >
        {/* Top bar */}
        <div
          className="relative flex h-[52px] flex-shrink-0 items-center justify-between px-4"
          style={{ borderBottom: "1px solid #EBEBEB" }}
        >
          {/* Gradient underline */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[2px] opacity-60"
            style={{
              background:
                "linear-gradient(90deg, #6366F1 0%, #EC4899 40%, #F5A623 70%, #10B981 100%)",
            }}
            aria-hidden="true"
          />

          {/* Back button */}
          <button
            onClick={onBack}
            className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border-none bg-transparent px-2 text-[13px] font-semibold text-[#6366F1] transition-opacity active:opacity-60"
            aria-label="Back to home"
          >
            <svg
              width="7"
              height="12"
              viewBox="0 0 7 12"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 1L1 6l5 5"
                stroke="#6366F1"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Home
          </button>

          {/* Logo */}
          <span className="absolute left-1/2 -translate-x-1/2 select-none font-logo text-[22px] font-black leading-none tracking-[-1.5px] text-[#0C0C0C]">
            arc<span style={{ color: "#F5A623" }}>.</span>
          </span>

          {/* Share button */}
          <button
            className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-none bg-[#F5F5F5] px-3 text-[12px] font-semibold text-[#0C0C0C] transition-colors active:bg-[#EDEDED]"
            aria-label="Share this arc"
            onClick={() => {
              if (navigator.share) {
                navigator
                  .share({ title: "arc. story", url: window.location.href })
                  .catch(() => {});
              }
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 13 13"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="10.5"
                cy="2.5"
                r="1.5"
                stroke="currentColor"
                strokeWidth="1.3"
              />
              <circle
                cx="10.5"
                cy="10.5"
                r="1.5"
                stroke="currentColor"
                strokeWidth="1.3"
              />
              <circle
                cx="2.5"
                cy="6.5"
                r="1.5"
                stroke="currentColor"
                strokeWidth="1.3"
              />
              <path
                d="M4 5.8l5-2.6M4 7.2l5 2.6"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
            Share
          </button>
        </div>

        {/* Iframe content area */}
        <div className="relative flex-1 overflow-hidden scrollbar-hide">
          {/* Shimmer skeleton while iframe loads */}
          {!loaded && (
            <div className="absolute inset-0 z-10 bg-white">
              <div className="flex flex-col gap-4 p-5 pt-8">
                {[80, 55, 90, 40, 70].map((w, i) => (
                  <div
                    key={i}
                    className="rounded-lg"
                    style={{
                      height: i === 0 ? 180 : 16,
                      width: `${w}%`,
                      background:
                        "linear-gradient(90deg, #F5F5F5 25%, #EDEDED 50%, #F5F5F5 75%)",
                      backgroundSize: "800px 100%",
                      animation: `shimmer 1.6s infinite ${i * 0.1}s`,
                    }}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
          )}

          {blobUrl && (
            <iframe
              ref={iframeRef}
              src={blobUrl}
              onLoad={handleLoad}
              title="Your arc story"
              className="h-full w-full border-none scrollbar-hide"
              // sandbox grants just enough: allow-scripts for any interactivity in the output,
              // allow-same-origin so blob:// resolves correctly.
              sandbox="allow-scripts allow-same-origin allow-popups"
              loading="eager"
            />
          )}
        </div>

        <style>{`
        @keyframes resultSlideUp {
          from { opacity: 0; transform: translateY(100%); }
          to   { opacity: 1; transform: translateY(0);    }
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
