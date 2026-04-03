import { memo, useEffect, useState, useCallback, useRef } from "react";
import { useJobPoller } from "@/hooks/useJobPoller";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";
import { notifyArc } from "@/apis";
import type { JobStatus } from "@/types/job";

interface StepMeta {
  status: JobStatus;
  label: string;
  sublabel: string;
  color: string;
  bg: string;
}

const STEPS: StepMeta[] = [
  {
    status: "FETCHING_ARTICLES",
    label: "Fetching articles",
    sublabel: "Scanning the web for relevant sources…",
    color: "#6366F1",
    bg: "rgba(99,102,241,0.10)",
  },
  {
    status: "ANALYZING_DATA",
    label: "Analyzing data",
    sublabel: "Understanding context and key insights…",
    color: "#0EA5E9",
    bg: "rgba(14,165,233,0.10)",
  },
  {
    status: "GENERATING_IMAGES",
    label: "Generating visuals",
    sublabel: "Creating imagery to accompany your story…",
    color: "#EC4899",
    bg: "rgba(236,72,153,0.10)",
  },
  {
    status: "ASSEMBLING",
    label: "Assembling arc",
    sublabel: "Putting the final story together…",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.10)",
  },
  {
    status: "COMPLETED",
    label: "Ready",
    sublabel: "Your arc is complete!",
    color: "#10B981",
    bg: "rgba(16,185,129,0.10)",
  },
];

const STATUS_ORDER: JobStatus[] = [
  "FETCHING_ARTICLES",
  "ANALYZING_DATA",
  "GENERATING_IMAGES",
  "ASSEMBLING",
  "COMPLETED",
];

function getStepIndex(status: JobStatus): number {
  return STATUS_ORDER.indexOf(status);
}

// ─── Utility: interpolate two hex colors ─────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}

// Sample the top-left pixel of the gradient orb to get the current
// status-bar color. We derive it mathematically instead of using canvas
// so there's zero DOM cost.
function getOrbTopColor(angle: number): string {
  // The orb gradient cycles through these stops
  const stops = ["#6366F1", "#EC4899", "#F5A623"];
  // Normalise angle to [0,1] over a full 360° cycle
  const t = ((angle % 360) + 360) % 360;
  const segment = t / 120; // 3 stops → 120° each
  const idx = Math.floor(segment) % stops.length;
  const next = (idx + 1) % stops.length;
  return lerpColor(stops[idx], stops[next], segment - Math.floor(segment));
}

// Write to <meta name="theme-color"> — browsers re-read this live
function setThemeColor(color: string) {
  let meta = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  if (meta.content !== color) meta.content = color;
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

const Spinner = memo<{ color: string }>(({ color }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    className="animate-spin"
    aria-hidden="true"
  >
    <circle
      cx="10"
      cy="10"
      r="8"
      stroke={color}
      strokeOpacity="0.2"
      strokeWidth="2.5"
      fill="none"
    />
    <path
      d="M10 2a8 8 0 0 1 8 8"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
));
Spinner.displayName = "Spinner";

// ─── Tick ─────────────────────────────────────────────────────────────────────

const Tick = memo<{ color: string; delay: number }>(({ color, delay }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    aria-hidden="true"
    style={{
      animation: `tickPop 0.4s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms both`,
    }}
  >
    <circle cx="10" cy="10" r="9" fill={color} fillOpacity="0.12" />
    <path
      d="M6 10.5l3 3 5-5.5"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      style={{
        strokeDasharray: 12,
        strokeDashoffset: 0,
        animation: `drawTick 0.35s ease ${delay + 80}ms both`,
      }}
    />
  </svg>
));
Tick.displayName = "Tick";

const IdleDot = memo(() => (
  <div
    className="h-5 w-5 rounded-full"
    style={{ background: "#EDEDED" }}
    aria-hidden="true"
  />
));
IdleDot.displayName = "IdleDot";

type StepState = "done" | "active" | "idle";

interface StepRowProps {
  meta: StepMeta;
  state: StepState;
  index: number;
  isLast: boolean;
}

const StepRow = memo<StepRowProps>(({ meta, state, index, isLast }) => (
  <div
    className="flex items-start gap-4"
    style={{
      animation:
        state !== "idle"
          ? `slideUp 0.45s cubic-bezier(0.4,0,0.2,1) ${index * 60}ms both`
          : "none",
      opacity: state === "idle" ? 0.38 : 1,
      transition: "opacity 0.4s ease",
    }}
  >
    <div className="flex flex-col items-center">
      <div className="flex h-5 w-5 items-center justify-center">
        {state === "done" && <Tick color={meta.color} delay={index * 60} />}
        {state === "active" && <Spinner color={meta.color} />}
        {state === "idle" && <IdleDot />}
      </div>
      {!isLast && (
        <div
          className="mt-2 w-[1.5px] flex-1 rounded-full"
          style={{
            minHeight: 28,
            background:
              state === "done"
                ? `linear-gradient(to bottom, ${meta.color} 0%, #EDEDED 100%)`
                : "#EDEDED",
            transition: "background 0.5s ease",
          }}
          aria-hidden="true"
        />
      )}
    </div>
    <div className="pb-7">
      <p
        className="text-[14px] font-bold leading-tight"
        style={{
          color:
            state === "active"
              ? meta.color
              : state === "done"
                ? "#0C0C0C"
                : "#ABABAB",
          transition: "color 0.3s ease",
        }}
      >
        {meta.label}
      </p>
      {state !== "idle" && (
        <p
          className="mt-[3px] text-[11.5px] leading-snug text-[#8C8C8C]"
          style={{ animation: `fadeIn 0.3s ease ${index * 60 + 100}ms both` }}
        >
          {meta.sublabel}
        </p>
      )}
    </div>
  </div>
));
StepRow.displayName = "StepRow";

// ─── Processing Screen ────────────────────────────────────────────────────────

interface ProcessingScreenProps {
  jobId: string;
  onComplete: (htmlUrl: string, jobId: string) => void;
  onError: (message: string) => void;
  onBack: () => void;
}

export const ProcessingScreen = memo<ProcessingScreenProps>(
  ({ jobId, onComplete, onError, onBack }) => {
    const { state, stop } = useJobPoller(jobId);
    const kbOffset = useKeyboardOffset();
    const [gradAngle, setGradAngle] = useState(135);
    const angleRef = useRef(135);

    // ── Notify modal ──────────────────────────────────────────────────────────
    const STORAGE_KEY = `arc-notified-${jobId}`;

    type ModalState = "closed" | "form" | "submitting" | "confirmed";
    const [modalState, setModalState] = useState<ModalState>("closed");
    const [email, setEmail] = useState("");
    const [notifyError, setNotifyError] = useState<string | null>(null);
    // Persisted email — set on successful submission and restored on mount
    const [notifiedEmail, setNotifiedEmail] = useState<string | null>(
      () => localStorage.getItem(STORAGE_KEY),
    );

    const openModal = useCallback(() => {
      setModalState("form");
      setNotifyError(null);
    }, []);
    const closeModal = useCallback(() => setModalState("closed"), []);

    const handleNotifySubmit = useCallback(async () => {
      if (!email.trim()) return;
      setNotifyError(null);
      setModalState("submitting");
      try {
        await notifyArc(jobId, email.trim());
        localStorage.setItem(STORAGE_KEY, email.trim());
        setNotifiedEmail(email.trim());
        setModalState("confirmed");
      } catch {
        setNotifyError("Something went wrong. Please try again.");
        setModalState("form");
      }
    }, [jobId, email, STORAGE_KEY]);

    // Rotating gradient + live theme-color sync
    useEffect(() => {
      let frame: number;

      const tick = () => {
        angleRef.current = (angleRef.current + 0.3) % 360;
        setGradAngle(angleRef.current);

        // Derive the color that sits at the very top of the orb and
        // apply it to the browser chrome / status bar
        const topColor = getOrbTopColor(angleRef.current);

        // Blend it heavily toward white so the status bar stays light
        // and readable (icons stay dark). Pure orb color is too saturated.
        const blended = lerpColor(topColor, "#ffffff", 0.82);
        setThemeColor(blended);

        frame = requestAnimationFrame(tick);
      };

      frame = requestAnimationFrame(tick);

      return () => {
        cancelAnimationFrame(frame);
        // Restore neutral white when leaving this screen
        setThemeColor("#ffffff");
      };
    }, []);

    useEffect(() => {
      if (state.phase === "done") {
        stop();
        onComplete(state.htmlUrl, jobId);
      } else if (state.phase === "error") {
        stop();
        onError(state.message);
      }
    }, [state, stop, onComplete, onError]);

    const currentIndex =
      state.phase === "polling" ? getStepIndex(state.status) : STEPS.length - 1;

    const getStepState = useCallback(
      (idx: number): StepState => {
        if (idx < currentIndex) return "done";
        if (idx === currentIndex) return "active";
        return "idle";
      },
      [currentIndex],
    );

    return (
      <div
        className="flex min-h-dvh w-full flex-col bg-white"
        style={{ animation: "pageFadeIn 0.4s cubic-bezier(0.4,0,0.2,1) both" }}
      >
        {/*
         * The orb sits behind the content including the safe-area zone.
         * We let it bleed into the top with a negative margin so the
         * gradient visually continues into the status bar region.
         */}
        <div
          className="relative flex-shrink-0 overflow-visible px-6 pb-8"
          style={{
            // Extend above the safe area so color fills the status bar zone
            paddingTop: "calc(env(safe-area-inset-top, 24px) + 40px)",
            marginTop: 0,
          }}
        >
          {/* Gradient orb — bleeds upward into status bar area */}
          <div
            className="absolute left-1/2 top-0 h-[260px] w-[400px] -translate-x-1/2 -translate-y-[40%] rounded-full opacity-25 blur-[72px]"
            style={{
              background: `linear-gradient(${gradAngle}deg, #6366F1, #EC4899, #F5A623)`,
            }}
            aria-hidden="true"
          />

          <div className="relative">
            <div className="mb-2 flex items-center justify-between">
              <p className="select-none font-logo text-[26px] font-black leading-none tracking-[-1.5px] text-[#0C0C0C]">
                arc<span style={{ color: "#F5A623" }}>.</span>
              </p>
              <button
                onClick={onBack}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-black/[0.06] text-[#8C8C8C] transition-colors active:bg-black/[0.12]"
                aria-label="Close"
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                  <path d="M1 1l9 9M10 1l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <h1 className="text-[22px] font-bold leading-tight text-[#0C0C0C]">
              Building your arc
            </h1>
            <p className="mt-1 text-[13px] text-[#8C8C8C]">
              Sit tight — this usually takes a few minutes.
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          {STEPS.map((meta, i) => (
            <StepRow
              key={meta.status}
              meta={meta}
              state={getStepState(i)}
              index={i}
              isLast={i === STEPS.length - 1}
            />
          ))}
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 px-6 pb-10 pt-4 text-center"
          style={{ borderTop: "1px solid #F5F5F5" }}
        >
          <button
            onClick={notifiedEmail ? undefined : openModal}
            disabled={!!notifiedEmail}
            className={`mb-3 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-[11px] text-[13px] font-semibold transition-colors ${
              notifiedEmail
                ? "cursor-default border-[#E8F5F0] bg-[rgba(16,185,129,0.07)] text-[#10B981]"
                : "cursor-pointer border-[#EBEBEB] bg-[#F5F5F5] text-[#0C0C0C] active:bg-[#EDEDED]"
            }`}
          >
            {notifiedEmail ? (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M2 7l4 4 6-6" stroke="#10B981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                You're on the list
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                  <path d="M7.5 1a6.5 6.5 0 1 1 0 13A6.5 6.5 0 0 1 7.5 1Z" stroke="#6366F1" strokeWidth="1.3" />
                  <path d="M7.5 4.5v4l2.5 1.5" stroke="#6366F1" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Notify me when it's ready
              </>
            )}
          </button>
          <p className="text-[11px] text-[#ABABAB]">
            You can close this tab — we'll keep it warm.
          </p>
        </div>

        {/* Notify modal — bottom sheet */}
        {modalState !== "closed" && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/30"
              style={{ animation: "fadeIn 0.2s ease both" }}
              onClick={closeModal}
              aria-hidden="true"
            />

            {/* Sheet */}
            <div
              className="fixed left-0 right-0 z-50 rounded-t-2xl bg-white px-6 pt-5"
              style={{
                bottom: kbOffset,
                animation: "sheetUp 0.32s cubic-bezier(0.34,1.06,0.64,1) both",
                paddingBottom:
                  kbOffset > 0
                    ? "24px"
                    : "calc(40px + env(safe-area-inset-bottom, 0px))",
                transition:
                  "bottom 0.28s cubic-bezier(0.4,0,0.2,1), padding-bottom 0.28s cubic-bezier(0.4,0,0.2,1)",
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Notify me"
            >
              {/* Header */}
              <div className="mb-5 flex items-center justify-between">
                <span className="text-[16px] font-bold text-[#0C0C0C]">
                  {modalState === "confirmed"
                    ? "You're on the list"
                    : "Notify me when ready"}
                </span>
                <button
                  onClick={closeModal}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none bg-[#F5F5F5] text-[#8C8C8C] transition-colors active:bg-[#EDEDED]"
                  aria-label="Close"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M1 1l8 8M9 1l-8 8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>

              {modalState === "confirmed" ? (
                /* ── Confirmed state ── */
                <div style={{ animation: "fadeIn 0.25s ease both" }}>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(16,185,129,0.1)]">
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 22 22"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M4 11.5l5 5 9-9"
                        stroke="#10B981"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <p className="mb-1 text-[14px] font-semibold text-[#0C0C0C]">
                    We'll email you at
                  </p>
                  <p className="mb-3 text-[14px] font-bold text-[#6366F1]">
                    {notifiedEmail}
                  </p>
                  <p className="text-[13px] leading-relaxed text-[#8C8C8C]">
                    As soon as your arc is done generating, you'll get a link
                    straight to it. Feel free to close this tab in the meantime.
                  </p>
                </div>
              ) : (
                /* ── Form state ── */
                <>
                  <p className="mb-4 text-[13px] leading-relaxed text-[#8C8C8C]">
                    Arc generation usually takes a few minutes. Drop your email
                    and we'll send you a direct link the moment it's ready.
                  </p>

                  <label className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wide text-[#8C8C8C]">
                    Your email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleNotifySubmit()}
                    placeholder="you@example.com"
                    className="mb-2 w-full rounded-xl border border-[#EBEBEB] bg-[#F9F9F9] px-4 py-[11px] text-[14px] text-[#0C0C0C] outline-none transition-colors focus:border-[#6366F1] focus:bg-white"
                  />

                  {notifyError && (
                    <p className="mb-2 text-[12px] text-red-500">
                      {notifyError}
                    </p>
                  )}

                  <button
                    onClick={handleNotifySubmit}
                    disabled={modalState === "submitting" || !email.trim()}
                    className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none px-4 py-[13px] text-[14px] font-bold text-white transition-opacity disabled:opacity-50"
                    style={{
                      background:
                        "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
                    }}
                  >
                    {modalState === "submitting" ? (
                      <>
                        <svg
                          className="animate-spin"
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                          aria-hidden="true"
                        >
                          <circle
                            cx="7"
                            cy="7"
                            r="5.5"
                            stroke="rgba(255,255,255,0.35)"
                            strokeWidth="2"
                          />
                          <path
                            d="M7 1.5a5.5 5.5 0 0 1 5.5 5.5"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                        Submitting…
                      </>
                    ) : (
                      "Notify"
                    )}
                  </button>
                </>
              )}
            </div>
          </>
        )}

        <style>{`
          @keyframes tickPop {
            from { transform: scale(0.4); opacity: 0; }
            to   { transform: scale(1);   opacity: 1; }
          }
          @keyframes drawTick {
            from { stroke-dashoffset: 12; }
            to   { stroke-dashoffset: 0;  }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(14px); }
            to   { opacity: 1; transform: translateY(0);    }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes pageFadeIn {
            from { opacity: 0; transform: translateY(24px); }
            to   { opacity: 1; transform: translateY(0);    }
          }
          @keyframes sheetUp {
            from { transform: translateY(100%); }
            to   { transform: translateY(0);    }
          }
        `}</style>
      </div>
    );
  },
);

ProcessingScreen.displayName = "ProcessingScreen";
