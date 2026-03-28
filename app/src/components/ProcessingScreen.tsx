import { memo, useEffect, useState, useCallback } from "react";
import { useJobPoller } from "@/hooks/useJobPoller";
import type { JobStatus } from "@/types/job";

// ─── Step meta ────────────────────────────────────────────────────────────────

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

// ─── Idle dot ─────────────────────────────────────────────────────────────────

const IdleDot = memo(() => (
  <div
    className="h-5 w-5 rounded-full"
    style={{ background: "#EDEDED" }}
    aria-hidden="true"
  />
));
IdleDot.displayName = "IdleDot";

// ─── Single step row ──────────────────────────────────────────────────────────

type StepState = "done" | "active" | "idle";

interface StepRowProps {
  meta: StepMeta;
  state: StepState;
  index: number;
  isLast: boolean;
}

const StepRow = memo<StepRowProps>(({ meta, state, index, isLast }) => {
  return (
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
      {/* Icon column */}
      <div className="flex flex-col items-center">
        <div className="flex h-5 w-5 items-center justify-center">
          {state === "done" && <Tick color={meta.color} delay={index * 60} />}
          {state === "active" && <Spinner color={meta.color} />}
          {state === "idle" && <IdleDot />}
        </div>

        {/* Connector line */}
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

      {/* Text column */}
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
            style={{
              animation: `fadeIn 0.3s ease ${index * 60 + 100}ms both`,
            }}
          >
            {meta.sublabel}
          </p>
        )}
      </div>
    </div>
  );
});
StepRow.displayName = "StepRow";

// ─── Processing Screen ────────────────────────────────────────────────────────

interface ProcessingScreenProps {
  jobId: string;
  onComplete: (htmlContent: string) => void;
  onError: (message: string) => void;
}

export const ProcessingScreen = memo<ProcessingScreenProps>(
  ({ jobId, onComplete, onError }) => {
    const { state, stop } = useJobPoller(jobId);

    // Animated gradient angle
    const [gradAngle, setGradAngle] = useState(135);
    useEffect(() => {
      let frame: number;
      let angle = 135;
      const tick = () => {
        angle = (angle + 0.3) % 360;
        setGradAngle(angle);
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(frame);
    }, []);

    // Route outcomes
    useEffect(() => {
      if (state.phase === "done") {
        stop();
        onComplete(state.htmlContent);
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
        style={{
          animation: "pageFadeIn 0.4s cubic-bezier(0.4,0,0.2,1) both",
        }}
      >
        {/* Top gradient orb */}
        <div className="relative flex-shrink-0 overflow-hidden px-6 pb-8 pt-16">
          <div
            className="absolute left-1/2 top-0 h-[200px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-[80px]"
            style={{
              background: `linear-gradient(${gradAngle}deg, #6366F1, #EC4899, #F5A623)`,
              transition: "background 0.1s linear",
            }}
            aria-hidden="true"
          />

          <div className="relative">
            {/* Logo */}
            <p className="mb-2 select-none font-logo text-[26px] font-black leading-none tracking-[-1.5px] text-[#0C0C0C]">
              arc<span style={{ color: "#F5A623" }}>.</span>
            </p>

            <h1 className="text-[22px] font-bold leading-tight text-[#0C0C0C]">
              Building your arc
            </h1>
            <p className="mt-1 text-[13px] text-[#8C8C8C]">
              Sit tight — this usually takes under a minute.
            </p>
          </div>
        </div>

        {/* Steps */}
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

        {/* Bottom hint */}
        <div
          className="flex-shrink-0 px-6 pb-10 pt-4 text-center text-[11px] text-[#ABABAB]"
          style={{ borderTop: "1px solid #F5F5F5" }}
        >
          You can close this tab — we'll keep it warm.
        </div>

        {/* Keyframes injected inline for isolation */}
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
