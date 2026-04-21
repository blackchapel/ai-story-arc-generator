import { memo, useCallback, useEffect, useState } from "react";
import type { NotificationItem } from "@/hooks/useNotifications";

interface NotificationCardProps {
  item: NotificationItem;
  onDismiss: () => void;
}

export const NotificationCard = memo<NotificationCardProps>(
  ({ item, onDismiss }) => {
    const [leaving, setLeaving] = useState(false);

    const dismiss = useCallback(() => {
      if (!leaving) setLeaving(true);
    }, [leaving]);

    const handleAction = useCallback(() => {
      item.onAction?.();
      dismiss();
    }, [item, dismiss]);

    useEffect(() => {
      const t = setTimeout(dismiss, item.durationMs);
      return () => clearTimeout(t);
    }, [item.durationMs, dismiss]);

    return (
      <div
        className="pointer-events-auto mx-4 overflow-hidden rounded-2xl bg-white"
        style={{
          border: "1px solid rgba(0,0,0,0.07)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.11), 0 2px 8px rgba(0,0,0,0.06)",
          animation: leaving
            ? "notifOut 0.26s cubic-bezier(0.4,0,0.2,1) both"
            : "notifIn 0.42s cubic-bezier(0.34,1.3,0.64,1) both",
        }}
        onAnimationEnd={(e) => {
          if (leaving && e.animationName === "notifOut") onDismiss();
        }}
      >
        {/* ── Header row ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-1.5">
          <div className="flex items-center gap-2">
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-[#ABABAB] transition-colors active:bg-[#F5F5F5]"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M1 1l8 8M9 1L1 9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <p className="text-[15px] font-bold leading-snug text-[#0C0C0C]">
              Your arc is ready<span style={{ color: "#F5A623" }}>.</span>
            </p>
          </div>

          {item.onAction && (
            <button
              onClick={handleAction}
              className="flex flex-shrink-0 cursor-pointer items-center gap-1 rounded-xl border-none px-3.5 py-2 text-[12.5px] font-bold text-white transition-opacity active:opacity-80"
              style={{
                background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                boxShadow: "0 2px 10px rgba(99,102,241,0.28)",
              }}
            >
              {item.actionLabel ?? "View"}
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2 5h6M5.5 2.5L8 5l-2.5 2.5"
                  stroke="white"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>

        {/* ── Auto-dismiss progress bar ────────────────────────────────────────── */}
        <div className="h-[2.5px] w-full" style={{ background: "#F0F0F0" }}>
          <div
            className="h-full origin-left"
            style={{
              background: "linear-gradient(90deg, #6366F1, #EC4899, #F5A623)",
              animation: `notifProgress ${item.durationMs}ms linear both`,
            }}
          />
        </div>
      </div>
    );
  },
);

NotificationCard.displayName = "NotificationCard";
