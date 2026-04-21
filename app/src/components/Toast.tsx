import { memo, useEffect, useState } from "react";
import type { Toast as ToastType } from "@/hooks/useToast";

interface ToastProps {
  toast: ToastType | null;
  onDismiss: () => void;
}

const STYLES = {
  error: {
    background: "#FFF0F0",
    border: "1px solid rgba(239,68,68,0.2)",
    iconBg: "#EF4444",
    textColor: "#991B1B",
    subtitleColor: "#B91C1C",
    dismissColor: "#B91C1C",
    actionBg: "rgba(239,68,68,0.10)",
    actionColor: "#B91C1C",
  },
  success: {
    background: "#F0FDF4",
    border: "1px solid rgba(16,185,129,0.2)",
    iconBg: "#10B981",
    textColor: "#065F46",
    subtitleColor: "#047857",
    dismissColor: "#047857",
    actionBg: "rgba(16,185,129,0.12)",
    actionColor: "#047857",
  },
} as const;

function ErrorIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M5 2.5v3M5 7.5h.005" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function SuccessIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M1.5 5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const Toast = memo<ToastProps>(({ toast, onDismiss }) => {
  const [visible, setVisible] = useState(false);
  const [currentToast, setCurrentToast] = useState<ToastType | null>(null);

  useEffect(() => {
    if (toast) {
      setCurrentToast(toast);
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      const t = setTimeout(() => setCurrentToast(null), 350);
      return () => clearTimeout(t);
    }
  }, [toast]);

  if (!currentToast) return null;

  const type = currentToast.type ?? "error";
  const s = STYLES[type];
  const hasAction = !!currentToast.onAction;

  const handleAction = () => {
    currentToast.onAction?.();
    onDismiss();
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="pointer-events-none fixed left-1/2 top-0 z-[200] w-full -translate-x-1/2 px-4"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
    >
      <div
        onClick={hasAction ? handleAction : onDismiss}
        className="pointer-events-auto flex cursor-pointer items-start gap-3 rounded-xl px-4 py-3 shadow-lg"
        style={{
          background: s.background,
          border: s.border,
          transform: visible ? "translateY(0) scale(1)" : "translateY(-16px) scale(0.96)",
          opacity: visible ? 1 : 0,
          transition: "transform 0.32s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease",
        }}
      >
        {/* Icon */}
        <div
          className="mt-[2px] flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: s.iconBg }}
          aria-hidden="true"
        >
          {type === "success" ? <SuccessIcon /> : <ErrorIcon />}
        </div>

        {/* Text */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-semibold leading-[1.4]" style={{ color: s.textColor }}>
              {currentToast.message}
            </p>
            {currentToast.tag && (
              <span
                className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{ background: s.actionBg, color: s.actionColor }}
              >
                {currentToast.tag}
              </span>
            )}
          </div>
          {currentToast.subtitle && (
            <p className="text-[11.5px] leading-snug opacity-80" style={{ color: s.subtitleColor }}>
              {currentToast.subtitle}
            </p>
          )}
          {hasAction && (
            <button
              onClick={(e) => { e.stopPropagation(); handleAction(); }}
              className="mt-1.5 w-fit rounded-lg border-none px-2.5 py-1 text-[11.5px] font-bold transition-opacity active:opacity-70"
              style={{ background: s.actionBg, color: s.actionColor }}
            >
              {currentToast.actionLabel ?? "View"}
            </button>
          )}
        </div>

        {/* Dismiss × */}
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          aria-label="Dismiss notification"
          className="mt-[2px] flex-shrink-0 border-none bg-transparent p-0 opacity-50 transition-opacity active:opacity-100"
          style={{ color: s.dismissColor }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
});

Toast.displayName = "Toast";
