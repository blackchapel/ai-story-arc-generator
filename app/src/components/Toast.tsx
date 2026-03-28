import { memo, useEffect, useState } from "react";
import type { Toast as ToastType } from "@/hooks/useToast";

interface ToastProps {
  toast: ToastType | null;
  onDismiss: () => void;
}

export const Toast = memo<ToastProps>(({ toast, onDismiss }) => {
  // Drive a local "visible" flag so the exit animation plays before unmount
  const [visible, setVisible] = useState(false);
  const [currentToast, setCurrentToast] = useState<ToastType | null>(null);

  useEffect(() => {
    if (toast) {
      setCurrentToast(toast);
      // Tiny rAF delay lets the enter animation fire cleanly
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      // Remove from DOM only after the exit transition finishes
      const t = setTimeout(() => setCurrentToast(null), 350);
      return () => clearTimeout(t);
    }
  }, [toast]);

  if (!currentToast) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="pointer-events-none fixed left-1/2 top-0 z-[200] w-full max-w-[390px] -translate-x-1/2 px-4"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
    >
      <div
        onClick={onDismiss}
        className="pointer-events-auto flex cursor-pointer items-start gap-3 rounded-xl px-4 py-3 shadow-lg"
        style={{
          background: "#FFF0F0",
          border: "1px solid rgba(239,68,68,0.2)",
          transform: visible
            ? "translateY(0) scale(1)"
            : "translateY(-16px) scale(0.96)",
          opacity: visible ? 1 : 0,
          transition:
            "transform 0.32s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease",
        }}
      >
        {/* Error icon */}
        <div
          className="mt-[1px] flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: "#EF4444" }}
          aria-hidden="true"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M5 2.5v3M5 7.5h.005"
              stroke="white"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Message */}
        <p
          className="flex-1 text-[13px] font-semibold leading-[1.4]"
          style={{ color: "#991B1B" }}
        >
          {currentToast.message}
        </p>

        {/* Dismiss × */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          aria-label="Dismiss notification"
          className="flex-shrink-0 border-none bg-transparent p-0 text-[#B91C1C] opacity-60 transition-opacity active:opacity-100"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M1 1l10 10M11 1L1 11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
});

Toast.displayName = "Toast";
