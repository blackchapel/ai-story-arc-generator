import { memo, useState, useEffect, useRef } from "react";
import type { ActiveJob } from "@/types";

interface InProgressSectionProps {
  jobs: ActiveJob[];
  onJobClick: (jobId: string) => void;
}

type DisplayJob = ActiveJob & { isExiting: boolean; isNew: boolean };

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  FETCHING_ARTICLES: "Fetching articles",
  ANALYZING_DATA:    "Analyzing data",
  GENERATING_IMAGES: "Generating images",
  ASSEMBLING:        "Assembling arc",
};

const STATUS_ORDER = [
  "FETCHING_ARTICLES",
  "ANALYZING_DATA",
  "GENERATING_IMAGES",
  "ASSEMBLING",
];

// ── StatusDots ────────────────────────────────────────────────────────────────

function StatusDots({ status }: { status: string }) {
  const current = STATUS_ORDER.indexOf(status);
  return (
    <div className="flex items-center gap-1" aria-hidden="true">
      {STATUS_ORDER.map((s, i) => (
        <div
          key={s}
          className="rounded-full transition-all duration-500"
          style={{
            width:  i === current ? 16 : 5,
            height: 5,
            background:
              i < current
                ? "linear-gradient(90deg,#6366F1,#8B5CF6)"
                : i === current
                  ? "linear-gradient(90deg,#6366F1,#EC4899)"
                  : "rgba(0,0,0,0.1)",
          }}
        />
      ))}
    </div>
  );
}

// ── InProgressCard ────────────────────────────────────────────────────────────

interface CardProps {
  job:      DisplayJob;
  onClick:  () => void;
}

const InProgressCard = memo<CardProps>(({ job, onClick }) => {
  const label = STATUS_LABEL[job.status] ?? "Processing";

  return (
    <button
      onClick={onClick}
      disabled={job.isExiting}
      className="mx-[18px] mb-3 flex w-[calc(100%-36px)] cursor-pointer items-center gap-3 rounded-2xl border-none bg-white px-4 py-3.5 text-left transition-transform active:scale-[0.98] disabled:pointer-events-none"
      style={{
        boxShadow: "0 2px 12px rgba(99,102,241,0.10), 0 0 0 1px rgba(99,102,241,0.10)",
        animation: job.isExiting
          ? "cardExit 0.32s cubic-bezier(0.4,0,0.2,1) both"
          : job.isNew
            ? "cardEnter 0.36s cubic-bezier(0.34,1.06,0.64,1) both"
            : undefined,
      }}
      aria-label={`Processing: ${job.prompt}`}
    >
      {/* Animated gradient ring */}
      <div className="relative flex-shrink-0">
        <div
          className="h-10 w-10 rounded-full"
          style={{
            background: "conic-gradient(from 0deg, #6366F1, #EC4899, #F5A623, #6366F1)",
            animation: "spin 2s linear infinite",
          }}
          aria-hidden="true"
        />
        <div className="absolute inset-[3px] flex items-center justify-center rounded-full bg-white">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 4h10M2 7h7M2 10h5" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-[#0C0C0C]">{job.prompt}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <StatusDots status={job.status} />
          <span className="text-[11px] text-[#8C8C8C]">{label}…</span>
        </div>
      </div>

      {/* Chevron */}
      <svg width="6" height="11" viewBox="0 0 6 11" fill="none" className="flex-shrink-0" aria-hidden="true">
        <path d="M1 1l4 4.5L1 10" stroke="#C0C0C0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
});
InProgressCard.displayName = "InProgressCard";

// ── InProgressSection ─────────────────────────────────────────────────────────

export const InProgressSection = memo<InProgressSectionProps>(({ jobs, onJobClick }) => {
  const [items, setItems] = useState<DisplayJob[]>(() =>
    jobs.map((j) => ({ ...j, isExiting: false, isNew: false })),
  );

  // Track previous job IDs to compute additions/removals synchronously
  const prevIdsRef = useRef(new Set(jobs.map((j) => j.job_id)));

  useEffect(() => {
    const currIds  = new Set(jobs.map((j) => j.job_id));
    const prevIds  = prevIdsRef.current;
    const currMap  = new Map(jobs.map((j) => [j.job_id, j]));

    const removedIds = new Set([...prevIds].filter((id) => !currIds.has(id)));
    const addedIds   = new Set([...currIds].filter((id) => !prevIds.has(id)));

    prevIdsRef.current = currIds;

    // Nothing changed structurally — just sync statuses
    if (removedIds.size === 0 && addedIds.size === 0) {
      setItems((prev) =>
        prev.map((item) => {
          if (item.isExiting) return item;
          const fresh = currMap.get(item.job_id);
          return fresh && fresh.status !== item.status
            ? { ...fresh, isExiting: false, isNew: false }
            : item;
        }),
      );
      return;
    }

    // Update existing, mark removed as exiting, append new
    setItems((prev) => {
      const next = prev.map((item) => {
        if (item.isExiting) return item;
        if (removedIds.has(item.job_id)) return { ...item, isExiting: true };
        const fresh = currMap.get(item.job_id);
        return fresh ? { ...fresh, isExiting: false, isNew: false } : item;
      });
      for (const j of jobs) {
        if (addedIds.has(j.job_id)) next.push({ ...j, isExiting: false, isNew: true });
      }
      return next;
    });

    // After card exit animation, prune exiting items
    if (removedIds.size > 0) {
      const t = setTimeout(
        () => setItems((prev) => prev.filter((j) => !j.isExiting)),
        360,
      );
      return () => clearTimeout(t);
    }
  }, [jobs]);

  // Nothing to show — fully gone
  if (items.length === 0) return null;

  // If every visible item is exiting, collapse the whole section simultaneously
  const allExiting = items.every((j) => j.isExiting);

  return (
    // CSS grid trick: animates height smoothly without knowing the actual height
    <div
      style={{
        display: "grid",
        gridTemplateRows: allExiting ? "0fr" : "1fr",
        opacity:  allExiting ? 0 : 1,
        overflow: "hidden",
        transition: "grid-template-rows 0.36s cubic-bezier(0.4,0,0.2,1), opacity 0.28s ease",
      }}
    >
      <div style={{ overflow: "hidden" }}>
        <section aria-label="In progress">
          <div className="px-[18px] pb-2 pt-4">
            <span
              className="text-[10.5px] font-bold uppercase tracking-[0.09em]"
              style={{
                background: "linear-gradient(90deg,#6366F1 0%,#EC4899 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              In Progress
            </span>
          </div>

          {items.map((job) => (
            <InProgressCard
              key={job.job_id}
              job={job}
              onClick={() => onJobClick(job.job_id)}
            />
          ))}
        </section>
      </div>
    </div>
  );
});

InProgressSection.displayName = "InProgressSection";

// ── Keyframes (injected once, guarded against HMR duplicates) ────────────────

if (!document.getElementById("in-progress-keyframes")) {
  const s = document.createElement("style");
  s.id = "in-progress-keyframes";
  s.textContent = `
    @keyframes spin      { from { transform:rotate(0deg); }  to { transform:rotate(360deg); } }
    @keyframes cardEnter { from { opacity:0; transform:translateY(10px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
    @keyframes cardExit  { from { opacity:1; transform:translateY(0) scale(1); } to { opacity:0; transform:translateY(-10px) scale(0.97); } }
  `;
  document.head.appendChild(s);
}
