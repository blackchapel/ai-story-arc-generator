import React, { memo, useRef, useState, useCallback, useEffect } from "react";
import type { PromptChip } from "@/types";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/utils/cn";

const CHIP_STYLES = [
  {
    color: "text-[#6366F1]",
    bg: "bg-[rgba(99,102,241,0.09)]",
    border: "border-[rgba(99,102,241,0.18)]",
  },
  {
    color: "text-[#EF4444]",
    bg: "bg-[rgba(239,68,68,0.09)]",
    border: "border-[rgba(239,68,68,0.18)]",
  },
  {
    color: "text-[#0EA5E9]",
    bg: "bg-[rgba(14,165,233,0.09)]",
    border: "border-[rgba(14,165,233,0.18)]",
  },
  {
    color: "text-[#10B981]",
    bg: "bg-[rgba(16,185,129,0.09)]",
    border: "border-[rgba(16,185,129,0.18)]",
  },
  {
    color: "text-[#8B5CF6]",
    bg: "bg-[rgba(139,92,246,0.09)]",
    border: "border-[rgba(139,92,246,0.18)]",
  },
];

interface PromptBarProps {
  chips: PromptChip[];
  onSubmit: (value: string) => Promise<void>;
  onAuthRequired: () => void;
  showToast: (message: string) => void;
}

export const PromptBar = memo<PromptBarProps>(
  ({ chips, onSubmit, onAuthRequired, showToast }) => {
    const { user } = useAuth();
    const [value, setValue] = useState("");
    const [focused, setFocused] = useState(false);
    const [showChips, setShowChips] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const lockRef = useRef(false);
    const kbOffset = useKeyboardOffset();
    const hasText = value.trim().length > 0;

    const handleFocus = useCallback(() => {
      setFocused(true);
      setTimeout(() => setShowChips(true), 50);
    }, []);

    const handleBlur = useCallback(() => {
      setTimeout(() => {
        if (document.activeElement !== inputRef.current) {
          setFocused(false);
          setShowChips(false);
        }
      }, 160);
    }, []);

    const handleVoice = useCallback(() => {
      showToast("Coming soon");
    }, [showToast]);

    const handleSend = useCallback(async () => {
      const trimmed = value.trim();
      if (!trimmed || lockRef.current) return;
      if (!user) {
        onAuthRequired();
        return;
      }
      lockRef.current = true;
      setSubmitting(true);
      try {
        await onSubmit(trimmed);
        setValue("");
        inputRef.current?.blur();
      } finally {
        lockRef.current = false;
        setSubmitting(false);
      }
    }, [value, user, onSubmit, onAuthRequired]);

    const handleKey = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
      },
      [handleSend],
    );

    const handleChip = useCallback(
      (label: string) => (e: React.PointerEvent) => {
        e.preventDefault();
        setValue(label + ": ");
        inputRef.current?.focus();
      },
      [],
    );

    useEffect(() => {
      if (focused && !window.visualViewport) {
        const t = setTimeout(
          () =>
            inputRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            }),
          350,
        );
        return () => clearTimeout(t);
      }
    }, [focused]);

    return (
      <div
        role="search"
        aria-label="Ask arc"
        className="fixed left-1/2 z-100 w-full -translate-x-1/2 px-4"
        style={{
          bottom: kbOffset > 0 ? `${kbOffset}px` : 0,
          paddingBottom: "calc(env(safe-area-inset-bottom,14px) + 6px)",
          paddingTop: "9px",
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(28px) saturate(1.6)",
          WebkitBackdropFilter: "blur(28px) saturate(1.6)",
          borderTop: "1px solid rgba(235,235,235,0.8)",
          transition: "bottom 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {showChips && (
          <div
            className="mb-[8px] flex justify-center gap-[6px] overflow-x-auto pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-live="polite"
          >
            {chips.map((chip, i) => {
              const s = CHIP_STYLES[i % CHIP_STYLES.length];
              return (
                <button
                  key={chip.id}
                  onPointerDown={handleChip(chip.label)}
                  className={cn(
                    "flex h-[30px] shrink-0 cursor-pointer items-center gap-[5px] whitespace-nowrap rounded-full border px-[11px] text-[11.5px] font-semibold transition-colors active:opacity-70",
                    s.color,
                    s.bg,
                    s.border,
                  )}
                  style={{
                    animation: `chipsFadeIn 0.25s cubic-bezier(0.4,0,0.2,1) ${i * 0.04}s both`,
                  }}
                  aria-label={`Ask: ${chip.label}`}
                >
                  <span className="text-[12px]" aria-hidden="true">
                    {chip.icon}
                  </span>
                  {chip.label}
                </button>
              );
            })}
          </div>
        )}

        <div
          className="flex items-center gap-2 rounded-full px-[14px] py-2"
          style={{
            background: focused ? "#FFFFFF" : "#F5F5F5",
            border: focused
              ? "1.5px solid rgba(99,102,241,0.45)"
              : "1.5px solid #EBEBEB",
            boxShadow: focused ? "0 0 0 3px rgba(99,102,241,0.10)" : "none",
            transition:
              "border-color 0.22s, box-shadow 0.22s, background 0.22s",
          }}
        >
          <button
            onClick={handleVoice}
            className="flex h-[30px] w-[30px] flex-shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-[#8C8C8C] transition-colors active:bg-[#EDEDED] active:text-[#0C0C0C]"
            aria-label="Add"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M9 1.5v15M1.5 9h15"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <div
            className="h-[18px] w-px flex-shrink-0 bg-[#EBEBEB]"
            aria-hidden="true"
          />

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKey}
            placeholder={
              user ? "Ask arc anything…" : "Sign in to generate arcs…"
            }
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="sentences"
            spellCheck={false}
            aria-label="Type your question"
            className="min-w-0 flex-1 border-none bg-transparent font-body text-[14.5px] text-[#0C0C0C] outline-none placeholder:text-[#8C8C8C]"
          />

          <div className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center">
            {/* Voice */}
            <button
              onClick={handleVoice}
              className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full border-none text-white transition-all active:scale-[0.88]"
              style={{
                background: "linear-gradient(135deg,#0C0C0C 0%,#333 100%)",
                opacity: hasText ? 0 : 1,
                transform: hasText ? "scale(0.5)" : "scale(1)",
                pointerEvents: hasText ? "none" : "auto",
                transition:
                  "opacity 0.2s, transform 0.2s cubic-bezier(0.34,1.56,0.64,1)",
              }}
              aria-label="Voice input"
              aria-hidden={hasText}
            >
              <svg
                width="12"
                height="15"
                viewBox="0 0 12 15"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="3.5"
                  y="0.5"
                  width="5"
                  height="8"
                  rx="2.5"
                  fill="white"
                />
                <path
                  d="M1 7.5c0 2.761 2.239 5 5 5s5-2.239 5-5"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1="6"
                  y1="12.5"
                  x2="6"
                  y2="14.5"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            {/* Send */}
            <button
              onClick={handleSend}
              disabled={submitting}
              className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full border-none text-white active:scale-[0.88] disabled:cursor-default"
              style={{
                background: "linear-gradient(135deg,#6366F1 0%,#8B5CF6 100%)",
                boxShadow: "0 2px 10px rgba(99,102,241,0.35)",
                opacity: hasText ? 1 : 0,
                transform: hasText
                  ? "scale(1) rotate(0deg)"
                  : "scale(0.5) rotate(-20deg)",
                pointerEvents: hasText ? "auto" : "none",
                transition:
                  "opacity 0.22s, transform 0.22s cubic-bezier(0.34,1.56,0.64,1)",
              }}
              aria-label="Send"
              aria-hidden={!hasText}
            >
              {submitting ? (
                <svg
                  className="animate-spin"
                  width="13"
                  height="13"
                  viewBox="0 0 13 13"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="6.5"
                    cy="6.5"
                    r="5"
                    stroke="rgba(255,255,255,0.35)"
                    strokeWidth="2"
                  />
                  <path
                    d="M6.5 1.5a5 5 0 0 1 5 5"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 13 13"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M6.5 11V2M2 6.5l4.5-4.5 4.5 4.5"
                    stroke="white"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  },
);
PromptBar.displayName = "PromptBar";
