import { memo, useEffect, useState, useCallback, useRef } from "react";
import { useJobPoller } from "@/hooks/useJobPoller";
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
    const [gradAngle, setGradAngle] = useState(135);
    const angleRef = useRef(135);

    // ── Notify (single-tap, no modal) ─────────────────────────────────────────
    const STORAGE_KEY = `arc-notified-${jobId}`;
    type NotifyState = "idle" | "loading" | "done" | "error";
    const [notifyState, setNotifyState] = useState<NotifyState>(() =>
      localStorage.getItem(STORAGE_KEY) ? "done" : "idle",
    );

    const handleNotify = useCallback(async () => {
      if (notifyState !== "idle" && notifyState !== "error") return;
      setNotifyState("loading");
      try {
        await notifyArc(jobId);
        localStorage.setItem(STORAGE_KEY, "1");
        setNotifyState("done");
      } catch {
        setNotifyState("error");
        // Reset after 2 s so user can retry
        setTimeout(() => setNotifyState("idle"), 2000);
      }
    }, [jobId, notifyState, STORAGE_KEY]);

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

          <button
            onClick={onBack}
            className=" flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-black/[0.06] text-[#8C8C8C] transition-colors active:bg-black/[0.12]"
            aria-label="Go back"
          >
            <svg
              width="8"
              height="13"
              viewBox="0 0 8 13"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M7 1.5L1.5 6.5L7 11.5"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="relative mt-8 ml-6 mb-2">
            <div className="mb-2 flex items-center">
              <p className="select-none font-logo text-[26px] font-black leading-none tracking-[-1.5px] text-[#0C0C0C]">
                arc<span style={{ color: "#F5A623" }}>.</span>
              </p>
            </div>
            <h1 className="text-[22px] font-bold leading-tight text-[#0C0C0C]">
              Building your arc
            </h1>
            <p className="mt-1 text-[13px] text-[#8C8C8C]">
              Sit tight — this usually takes a few minutes.
            </p>
          </div>
        </div>

        <div className="ml-6 flex-1 overflow-y-auto px-6">
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
            onClick={handleNotify}
            disabled={notifyState !== "idle"}
            className={`mb-3 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-[11px] text-[13px] font-semibold transition-all ${
              notifyState === "done"
                ? "cursor-default border-[#E8F5F0] bg-[rgba(16,185,129,0.07)] text-[#10B981]"
                : notifyState === "error"
                  ? "cursor-default border-[#FEE2E2] bg-[rgba(239,68,68,0.06)] text-[#EF4444]"
                  : notifyState === "loading"
                    ? "cursor-default border-[#EBEBEB] bg-[#F5F5F5] text-[#8C8C8C]"
                    : "cursor-pointer border-[#EBEBEB] bg-[#F5F5F5] text-[#0C0C0C] active:bg-[#EDEDED]"
            }`}
            aria-live="polite"
          >
            {notifyState === "done" && (
              <>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 7l4 4 6-6"
                    stroke="#10B981"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                You will receive an email when ready!
              </>
            )}
            {notifyState === "error" && (
              <>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M7 3v4M7 9.5v.5"
                    stroke="#EF4444"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
                Failed — tap to retry
              </>
            )}
            {notifyState === "loading" && (
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
                    stroke="#ABABAB"
                    strokeWidth="2"
                    strokeOpacity="0.3"
                  />
                  <path
                    d="M7 1.5a5.5 5.5 0 0 1 5.5 5.5"
                    stroke="#8C8C8C"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                Setting up notification…
              </>
            )}
            {notifyState === "idle" && (
              <>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 15 15"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M7.5 1a6.5 6.5 0 1 1 0 13A6.5 6.5 0 0 1 7.5 1Z"
                    stroke="#6366F1"
                    strokeWidth="1.3"
                  />
                  <path
                    d="M7.5 4.5v4l2.5 1.5"
                    stroke="#6366F1"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Notify me when it's ready
              </>
            )}
          </button>
          <p className="text-[11px] text-[#ABABAB]">
            You can close this tab — we'll keep it warm.
          </p>
        </div>

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
        `}</style>
      </div>
    );
  },
);

ProcessingScreen.displayName = "ProcessingScreen";
