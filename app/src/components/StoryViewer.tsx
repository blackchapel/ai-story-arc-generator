import { useState, useEffect, useCallback, memo, type MouseEvent } from "react";
import type { Story } from "@/types";

interface FeedEvent {
  headline: string;
  date: string;
  summary: string;
  image: string;
}

interface StoryViewerProps {
  story: Story;
  onClose: () => void;
}

const DURATION = 6000; // ms per slide

export const StoryViewer = memo<StoryViewerProps>(({ story, onClose }) => {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Fetch feed data
  useEffect(() => {
    setLoading(true);
    fetch("/feed/feed.json")
      .then((r) => r.json())
      .then((data: Array<{ category: string; events: FeedEvent[] }>) => {
        const cat = data.find(
          (c) => c.category.toLowerCase() === story.label.toLowerCase(),
        );
        setEvents(cat?.events ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [story.label]);

  // Reset img loaded state when slide changes
  useEffect(() => {
    setImgLoaded(false);
  }, [currentIndex]);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => {
      if (i + 1 >= events.length) {
        onClose();
        return i;
      }
      return i + 1;
    });
  }, [events.length, onClose]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  // Auto-advance timer — resets when currentIndex or imgLoaded changes
  useEffect(() => {
    if (loading || events.length === 0) return;
    const id = setTimeout(goNext, DURATION);
    return () => clearTimeout(id);
  }, [loading, currentIndex, imgLoaded, events.length, goNext]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, goNext, goPrev]);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleTap = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const x = e.clientX;
      const w = (e.currentTarget as HTMLDivElement).clientWidth;
      if (x < w / 2) goPrev();
      else goNext();
    },
    [goPrev, goNext],
  );

  const event = events[currentIndex];
  const totalSegments = events.length || 1;

  return (
    <>
      <style>{`
        @keyframes sv-fill {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes sv-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes sv-fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${story.label} stories`}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          background: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Background image */}
        {event && (
          <img
            key={event.image}
            src={`/feed/${event.image}`}
            alt={event.headline}
            onLoad={() => setImgLoaded(true)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center top",
              transition: "opacity 0.25s ease",
              opacity: imgLoaded ? 1 : 0,
            }}
          />
        )}

        {/* Top-to-bottom vignette */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 30%, transparent 50%, rgba(0,0,0,0.9) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Tap zone (below UI chrome) */}
        <div
          onClick={handleTap}
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
          }}
        />

        {/* ── Progress bars ── */}
        <div
          style={{
            position: "absolute",
            top: "max(env(safe-area-inset-top, 0px), 14px)",
            left: 12,
            right: 12,
            display: "flex",
            gap: 4,
            zIndex: 20,
            pointerEvents: "none",
          }}
        >
          {Array.from({ length: totalSegments }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 2.5,
                borderRadius: 2,
                background: "rgba(255,255,255,0.28)",
                overflow: "hidden",
              }}
            >
              <div
                key={i === currentIndex ? `active-${currentIndex}` : i}
                style={{
                  height: "100%",
                  background: "#fff",
                  transformOrigin: "left",
                  ...(i < currentIndex
                    ? { transform: "scaleX(1)" }
                    : i === currentIndex && !loading
                      ? {
                          transform: "scaleX(0)",
                          animation: `sv-fill ${DURATION}ms linear forwards`,
                        }
                      : { transform: "scaleX(0)" }),
                }}
              />
            </div>
          ))}
        </div>

        {/* ── Category header ── */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "calc(max(env(safe-area-inset-top, 0px), 14px) + 16px)",
            left: 14,
            right: 52,
            display: "flex",
            alignItems: "center",
            gap: 9,
            zIndex: 20,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: story.gradient,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              border: "2px solid rgba(255,255,255,0.35)",
            }}
          >
            {story.emoji}
          </div>
          <div>
            <p
              style={{
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                margin: 0,
                letterSpacing: 0.2,
                textShadow: "0 1px 6px rgba(0,0,0,0.7)",
              }}
            >
              {story.label}
            </p>
            {event && (
              <p
                style={{
                  color: "rgba(255,255,255,0.65)",
                  fontSize: 11,
                  margin: 0,
                  letterSpacing: 0.3,
                  textShadow: "0 1px 4px rgba(0,0,0,0.7)",
                }}
              >
                {event.date}
              </p>
            )}
          </div>
        </div>

        {/* ── Close button ── */}
        <button
          onClick={onClose}
          aria-label="Close stories"
          style={{
            position: "absolute",
            top: "calc(max(env(safe-area-inset-top, 0px), 14px) + 18px)",
            right: 14,
            zIndex: 30,
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "none",
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            color: "#fff",
            fontSize: 15,
            lineHeight: 1,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ✕
        </button>

        {/* ── Bottom content ── */}
        {event && !loading && (
          <div
            key={currentIndex}
            style={{
              position: "absolute",
              bottom: "max(env(safe-area-inset-bottom, 0px), 32px)",
              left: 20,
              right: 20,
              zIndex: 20,
              pointerEvents: "none",
              animation: "sv-fadeUp 0.3s ease both",
            }}
          >
            <h2
              style={{
                color: "#fff",
                fontSize: 20,
                fontWeight: 800,
                lineHeight: 1.3,
                margin: "0 0 10px 0",
                textShadow: "0 2px 12px rgba(0,0,0,0.6)",
              }}
            >
              {event.headline}
            </h2>
            <p
              style={{
                color: "rgba(255,255,255,0.78)",
                fontSize: 13.5,
                lineHeight: 1.55,
                margin: 0,
                textShadow: "0 1px 6px rgba(0,0,0,0.5)",
              }}
            >
              {event.summary}
            </p>
          </div>
        )}

        {/* ── Loading spinner ── */}
        {(loading || (event && !imgLoaded)) && (
          <div
            aria-label="Loading"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 25,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                border: "3px solid rgba(255,255,255,0.18)",
                borderTopColor: "rgba(255,255,255,0.85)",
                borderRadius: "50%",
                animation: "sv-spin 0.75s linear infinite",
              }}
            />
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && events.length === 0 && (
          <p
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: 14,
              textAlign: "center",
              zIndex: 25,
              padding: "0 24px",
            }}
          >
            No stories available for {story.label} yet.
          </p>
        )}
      </div>
    </>
  );
});

StoryViewer.displayName = "StoryViewer";
