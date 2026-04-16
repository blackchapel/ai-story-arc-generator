import { memo, useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { useJobPoller } from "@/hooks/useJobPoller";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useShowToast } from "@/context/ToastContext";
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

type NotifyState =
  | "idle" // Not started
  | "loading" // Permission requested or token being fetched
  | "done" // Successfully registered
  | "denied" // User blocked notifications
  | "unsupported" // Browser doesn't support push
  | "ios-no-pwa" // iOS Safari without PWA install
  | "error"; // Network/API error

export const ProcessingScreen = memo(function ProcessingScreen() {
  const { jobId = "" } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const showToast = useShowToast();
  const { state, stop } = useJobPoller(jobId);
  // ── Notify (single-tap, no modal) ─────────────────────────────────────────
  const { permissionState, requestAndGetToken } = usePushNotifications();

  const STORAGE_KEY = `arc-push-${jobId}`;
  const [notifyState, setNotifyState] = useState<NotifyState>(() => {
    if (localStorage.getItem(STORAGE_KEY)) return "done";
    return "idle";
  });

  const handleNotify = useCallback(async () => {
    if (notifyState !== "idle" && notifyState !== "error") return;

    // Surface non-permission states immediately without asking
    if (permissionState === "unsupported") {
      setNotifyState("unsupported");
      return;
    }
    if (permissionState === "ios-no-pwa") {
      setNotifyState("ios-no-pwa");
      return;
    }
    if (permissionState === "denied") {
      setNotifyState("denied");
      return;
    }

    setNotifyState("loading");
    try {
      const token = await requestAndGetToken();
      if (!token) {
        // requestAndGetToken returns null when permission is denied or unsupported
        const current = Notification.permission;
        setNotifyState(current === "denied" ? "denied" : "unsupported");
        return;
      }
      await notifyArc(jobId, token);
      localStorage.setItem(STORAGE_KEY, "1");
      setNotifyState("done");
    } catch {
      setNotifyState("error");
      setTimeout(() => setNotifyState("idle"), 2500);
    }
  }, [jobId, notifyState, permissionState, requestAndGetToken, STORAGE_KEY]);


  useEffect(() => {
    if (state.phase === "done") {
      stop();
      navigate(`/arc/${jobId}`, {
        replace: true,
        state: { htmlUrl: state.htmlUrl },
      });
    } else if (state.phase === "error") {
      stop();
      showToast(state.message);
      navigate(-1);
    }
  }, [state, stop, jobId, navigate, showToast]);

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
          className="pointer-events-none absolute left-1/2 top-0 h-[260px] w-[400px] -translate-x-1/2 -translate-y-[40%] rounded-full opacity-25 blur-[72px]"
          style={{
            background: "linear-gradient(135deg, #6366F1, #EC4899, #F5A623)",
          }}
          aria-hidden="true"
        />

        <button
          onClick={() => navigate(-1)}
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
        className="flex flex-col flex-shrink-0 items-center px-6 pb-10 pt-4 text-center"
        style={{ borderTop: "1px solid #F5F5F5" }}
      >
        <button
          onClick={handleNotify}
          disabled={
            notifyState === "loading" ||
            notifyState === "done" ||
            notifyState === "denied" ||
            notifyState === "unsupported" ||
            notifyState === "ios-no-pwa"
          }
          aria-label={
            notifyState === "done"
              ? "Push notification registered"
              : notifyState === "denied"
                ? "Notifications blocked in browser settings"
                : notifyState === "unsupported"
                  ? "Push notifications not supported in this browser"
                  : notifyState === "ios-no-pwa"
                    ? "Install arc to your home screen to enable notifications"
                    : "t when this arc is ready"
          }
          className="flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-[13px] font-semibold transition-all disabled:cursor-default"
          style={
            notifyState === "done"
              ? {
                  background: "rgba(16,185,129,0.08)",
                  borderColor: "rgba(16,185,129,0.3)",
                  color: "#10B981",
                }
              : notifyState === "denied" ||
                  notifyState === "unsupported" ||
                  notifyState === "ios-no-pwa"
                ? {
                    background: "rgba(0,0,0,0.03)",
                    borderColor: "#EBEBEB",
                    color: "#ABABAB",
                    cursor: "not-allowed",
                  }
                : notifyState === "error"
                  ? {
                      background: "rgba(239,68,68,0.06)",
                      borderColor: "rgba(239,68,68,0.2)",
                      color: "#EF4444",
                    }
                  : {
                      background: "rgba(99,102,241,0.06)",
                      borderColor: "rgba(99,102,241,0.2)",
                      color: "#6366F1",
                    }
          }
        >
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
                  stroke="currentColor"
                  strokeOpacity="0.3"
                  strokeWidth="1.8"
                />
                <path
                  d="M7 1.5a5.5 5.5 0 0 1 5.5 5.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              <span>Setting up…</span>
            </>
          )}
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
                  d="M2.5 7l3.5 3.5 5.5-7"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>You'll be notified</span>
            </>
          )}
          {notifyState === "denied" && (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="7"
                  cy="7"
                  r="6"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path
                  d="M7 4v4M7 9.5v.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <span>Notifications blocked</span>
            </>
          )}
          {notifyState === "unsupported" && (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M7 2a5 5 0 1 0 0 10A5 5 0 0 0 7 2zM4.5 4.5l5 5M9.5 4.5l-5 5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <span>Not supported</span>
            </>
          )}
          {notifyState === "ios-no-pwa" && (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="3"
                  y="1"
                  width="8"
                  height="12"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path
                  d="M5 11h4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <span>Install app to notify</span>
            </>
          )}
          {(notifyState === "idle" || notifyState === "error") && (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M7 1.5C4.5 1.5 2.5 3.5 2.5 6v3l-1 1.5h11L11.5 9V6C11.5 3.5 9.5 1.5 7 1.5z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path
                  d="M5.5 10.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <span>
                {notifyState === "error"
                  ? "Failed — tap to retry"
                  : "Notify me when ready"}
              </span>
            </>
          )}
        </button>
        <p className="mt-3 text-[11px] text-[#ABABAB]">
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
});

ProcessingScreen.displayName = "ProcessingScreen";
