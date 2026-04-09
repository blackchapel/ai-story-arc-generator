import { memo, useCallback, useEffect, useRef, useState } from "react";
import { fetchOutput, toggleShare, regenerateArc, deleteArc } from "@/apis";
import { useAuth } from "@/hooks/useAuth";
import type { NewsArticle } from "@/types";

interface ResultScreenProps {
  jobId: string;
  htmlUrl?: string;
  onBack: () => void;
  onRegenerate: (jobId: string) => void;
  onDeleted: () => void;
}

// ── Icon primitives ───────────────────────────────────────────────────────────

const ShareIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="13" cy="3" r="2" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="13" cy="13" r="2" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="3" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="M5 7.1l6-3.2M5 8.9l6 3.2"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

const CheckIcon = ({ color = "currentColor" }: { color?: string }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M3 8.5l3.5 3.5 6.5-7"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const RefreshIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M13.5 8A5.5 5.5 0 1 1 8 2.5a5.5 5.5 0 0 1 4.5 2.34"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
    <path
      d="M10.5 2l2.5 2.8-2.5 1.4"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TrashIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M2.5 4.5h11M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M6.5 7.5v4M9.5 7.5v4M3.5 4.5l.8 8a1 1 0 0 0 1 .9h5.4a1 1 0 0 0 1-.9l.8-8"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CopyIcon = ({ copied }: { copied: boolean }) =>
  copied ? (
    <svg
      width="13"
      height="13"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 6l3 3 5-5"
        stroke="#10B981"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg
      width="13"
      height="13"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="1"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M1 4.5v5A1.5 1.5 0 0 0 2.5 11h5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );

// ── Spinner ───────────────────────────────────────────────────────────────────

const Spinner = ({ color = "currentColor" }: { color?: string }) => (
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
      stroke={color}
      strokeOpacity="0.3"
      strokeWidth="2"
    />
    <path
      d="M7 1.5a5.5 5.5 0 0 1 5.5 5.5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

// ── Sheet backdrop + panel ────────────────────────────────────────────────────

function SheetBackdrop({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 bg-black/30"
      style={{ animation: "fadeIn 0.2s ease both" }}
      onClick={onClose}
      aria-hidden="true"
    />
  );
}

interface SheetPanelProps {
  children: React.ReactNode;
  label: string;
}

function SheetPanel({ children, label }: SheetPanelProps) {
  return (
    <div
      className="fixed left-0 right-0 z-50 rounded-t-3xl bg-white px-5 pt-4"
      style={{
        bottom: 0,
        paddingBottom: "calc(28px + env(safe-area-inset-bottom, 0px))",
        animation: "sheetUp 0.3s cubic-bezier(0.34,1.06,0.64,1) both",
      }}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      {/* Drag handle */}
      <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#EBEBEB]" />
      {children}
    </div>
  );
}

// ── ResultScreen ──────────────────────────────────────────────────────────────

export const ResultScreen = memo<ResultScreenProps>(
  ({ jobId, htmlUrl: initialHtmlUrl, onBack, onRegenerate, onDeleted }) => {
    const { user } = useAuth();

    const [loaded, setLoaded] = useState(false);
    const [htmlUrl, setHtmlUrl] = useState<string | null>(
      initialHtmlUrl ?? null,
    );
    const [arc, setArc] = useState<NewsArticle | null>(null);
    const [fetchError, setFetchError] = useState(false);
    const [copied, setCopied] = useState(false);
    const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Sheet / dialog visibility ─────────────────────────────────────────────
    type Sheet =
      | "none"
      | "menu"
      | "confirm-disable"
      | "confirm-regen"
      | "confirm-delete";
    const [sheet, setSheet] = useState<Sheet>("none");

    // ── Action loading states ─────────────────────────────────────────────────
    const [sharingLoading, setSharingLoading] = useState(false);
    const [regenLoading, setRegenLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const isOwner = !!user && !!arc && arc.user_id === user.id;

    // ── Fetch arc details ─────────────────────────────────────────────────────
    useEffect(() => {
      if (!initialHtmlUrl) return;
      fetchOutput(jobId)
        .then(setArc)
        .catch(() => {});
    }, [jobId, initialHtmlUrl]);

    useEffect(() => {
      if (initialHtmlUrl) return;
      const ctrl = new AbortController();
      fetchOutput(jobId)
        .then((a) => {
          if (!ctrl.signal.aborted) {
            setArc(a);
            setHtmlUrl(a.html ?? null);
          }
        })
        .catch(() => {
          if (!ctrl.signal.aborted) setFetchError(true);
        });
      return () => ctrl.abort();
    }, [jobId, initialHtmlUrl]);

    // ── Copy link ─────────────────────────────────────────────────────────────
    const handleCopyLink = useCallback(async () => {
      if (!arc?.share_token) return;
      const url = `${window.location.origin}/shared/${arc.share_token}`;
      await navigator.clipboard?.writeText(url);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    }, [arc]);

    useEffect(
      () => () => {
        if (copiedTimer.current) clearTimeout(copiedTimer.current);
      },
      [],
    );

    // ── Enable sharing ────────────────────────────────────────────────────────
    const handleEnableShare = useCallback(async () => {
      if (!arc || sharingLoading) return;
      setSharingLoading(true);
      setSheet("none");
      try {
        const res = await toggleShare(arc.id);
        const updated = {
          ...arc,
          is_shared: res.is_shared,
          share_token: res.share_token ?? undefined,
        };
        setArc(updated);
        if (res.is_shared && res.share_token) {
          const url = `${window.location.origin}/shared/${res.share_token}`;
          if (navigator.share) {
            navigator
              .share({ title: arc.title ?? "arc.", url })
              .catch(() => {});
          } else {
            await navigator.clipboard?.writeText(url);
            setCopied(true);
            if (copiedTimer.current) clearTimeout(copiedTimer.current);
            copiedTimer.current = setTimeout(() => setCopied(false), 2000);
          }
        }
      } catch {
        /* silent */
      } finally {
        setSharingLoading(false);
      }
    }, [arc, sharingLoading]);

    // ── Disable sharing (after confirmation) ─────────────────────────────────
    const handleDisableShare = useCallback(async () => {
      if (!arc || sharingLoading) return;
      setSheet("none");
      setSharingLoading(true);
      try {
        const res = await toggleShare(arc.id);
        setArc((prev) =>
          prev
            ? {
                ...prev,
                is_shared: res.is_shared,
                share_token: res.share_token ?? undefined,
              }
            : prev,
        );
      } catch {
        /* silent */
      } finally {
        setSharingLoading(false);
      }
    }, [arc, sharingLoading]);

    // ── Regenerate ────────────────────────────────────────────────────────────
    const handleRegenerate = useCallback(async () => {
      if (!arc || regenLoading) return;
      setSheet("none");
      setRegenLoading(true);
      try {
        const { job_id } = await regenerateArc(arc.id);
        onRegenerate(job_id);
      } catch {
        /* silent */
      } finally {
        setRegenLoading(false);
      }
    }, [arc, regenLoading, onRegenerate]);

    // ── Delete ────────────────────────────────────────────────────────────────
    const handleDelete = useCallback(async () => {
      if (!arc || deleteLoading) return;
      setSheet("none");
      setDeleteLoading(true);
      try {
        await deleteArc(arc.id);
        onDeleted();
      } catch {
        /* silent */
      } finally {
        setDeleteLoading(false);
      }
    }, [arc, deleteLoading, onDeleted]);

    const closeSheet = useCallback(() => setSheet("none"), []);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
      <div
        className="flex h-full w-full flex-col bg-white"
        style={{
          animation: "resultSlideUp 0.45s cubic-bezier(0.34,1.06,0.64,1) both",
        }}
      >
        {/* ── Top bar ───────────────────────────────────────────────────────── */}
        <div
          className="relative flex h-[52px] flex-shrink-0 items-center px-4"
          style={{ borderBottom: "1px solid #EBEBEB" }}
        >
          <div
            className="absolute bottom-0 left-0 right-0 h-[2px] opacity-60"
            style={{
              background:
                "linear-gradient(90deg,#6366F1 0%,#EC4899 40%,#F5A623 70%,#10B981 100%)",
            }}
            aria-hidden="true"
          />

          {/* Left — back */}
          <div className="flex flex-1 items-center">
            <button
              onClick={onBack}
              className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border-none bg-transparent px-2 text-[13px] font-semibold text-[#6366F1] transition-opacity active:opacity-60"
              aria-label="Back"
            >
              <svg
                width="7"
                height="12"
                viewBox="0 0 7 12"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M6 1L1 6l5 5"
                  stroke="#6366F1"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Home
            </button>
          </div>

          {/* Center — logo */}
          <span className="flex-shrink-0 select-none font-logo text-[22px] font-black leading-none tracking-[-1.5px] text-[#0C0C0C]">
            arc<span style={{ color: "#F5A623" }}>.</span>
          </span>

          {/* Right — copy link + more menu */}
          <div className="flex flex-1 items-center justify-end gap-1.5">
            {/* Copy link — only when shared */}
            {isOwner && arc?.is_shared && (
              <button
                onClick={handleCopyLink}
                className="flex h-8 flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border-none px-2.5 text-[12px] font-semibold transition-colors active:opacity-70"
                style={{
                  background: copied
                    ? "rgba(16,185,129,0.10)"
                    : "rgba(99,102,241,0.08)",
                  color: copied ? "#10B981" : "#6366F1",
                }}
                aria-label={copied ? "Link copied!" : "Copy share link"}
              >
                <CopyIcon copied={copied} />
                <span>{copied ? "Copied!" : "Copy link"}</span>
              </button>
            )}

            {/* More options */}
            {isOwner && arc && (
              <button
                onClick={() => setSheet("menu")}
                disabled={sharingLoading || regenLoading || deleteLoading}
                className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-[#F5F5F5] text-[#0C0C0C] transition-colors active:bg-[#EDEDED] disabled:opacity-50"
                aria-label="More options"
              >
                {sharingLoading || regenLoading || deleteLoading ? (
                  <Spinner />
                ) : (
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 15 15"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle cx="7.5" cy="3" r="1.2" fill="currentColor" />
                    <circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" />
                    <circle cx="7.5" cy="12" r="1.2" fill="currentColor" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ── Content ───────────────────────────────────────────────────────── */}
        <div className="relative flex-1 overflow-hidden">
          {(!htmlUrl || !loaded) && !fetchError && (
            <div className="absolute inset-0 z-10 bg-white">
              <div className="flex flex-col gap-4 p-5 pt-8">
                {[80, 55, 90, 40, 70].map((w, i) => (
                  <div
                    key={i}
                    className="rounded-lg"
                    style={{
                      height: i === 0 ? 180 : 16,
                      width: `${w}%`,
                      background:
                        "linear-gradient(90deg,#F5F5F5 25%,#EDEDED 50%,#F5F5F5 75%)",
                      backgroundSize: "800px 100%",
                      animation: `shimmer 1.6s infinite ${i * 0.1}s`,
                    }}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
          )}

          {fetchError && (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="text-[15px] font-semibold text-[#0C0C0C]">
                Couldn't load this arc
              </p>
              <p className="text-[13px] text-[#8C8C8C]">
                It may have been removed or you may not have access.
              </p>
              <button
                onClick={onBack}
                className="mt-2 rounded-xl border-none bg-[#F5F5F5] px-5 py-2.5 text-[13px] font-semibold text-[#0C0C0C] active:bg-[#EDEDED]"
              >
                Go home
              </button>
            </div>
          )}

          {htmlUrl && (
            <iframe
              src={htmlUrl}
              onLoad={() => setLoaded(true)}
              title="Your arc story"
              className="h-full w-full border-none"
              sandbox="allow-scripts allow-popups"
              loading="eager"
            />
          )}
        </div>

        {/* ── Options menu sheet ─────────────────────────────────────────────── */}
        {sheet === "menu" && (
          <>
            <SheetBackdrop onClose={closeSheet} />
            <SheetPanel label="Arc options">
              {/* Share row */}
              <button
                onClick={
                  arc?.is_shared
                    ? () => setSheet("confirm-disable")
                    : handleEnableShare
                }
                className="flex w-full cursor-pointer items-center gap-3.5 rounded-2xl border-none px-4 py-3.5 text-left transition-colors active:opacity-80"
                style={{
                  background: arc?.is_shared
                    ? "rgba(16,185,129,0.07)"
                    : "#F9F9F9",
                  marginBottom: 8,
                }}
              >
                <div
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: arc?.is_shared
                      ? "rgba(16,185,129,0.12)"
                      : "rgba(99,102,241,0.10)",
                  }}
                >
                  {arc?.is_shared ? (
                    <CheckIcon color="#10B981" />
                  ) : (
                    <span style={{ color: "#6366F1" }}>
                      <ShareIcon />
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className="text-[14px] font-semibold"
                    style={{ color: arc?.is_shared ? "#10B981" : "#0C0C0C" }}
                  >
                    {arc?.is_shared ? "Shared" : "Share arc"}
                  </p>
                  <p className="text-[11.5px] text-[#8C8C8C]">
                    {arc?.is_shared
                      ? "Anyone with the link can view"
                      : "Create a shareable link"}
                  </p>
                </div>
                {arc?.is_shared && (
                  <span className="text-[11px] font-medium text-[#8C8C8C]">
                    Tap to disable
                  </span>
                )}
              </button>

              {/* Regenerate row */}
              <button
                onClick={() => setSheet("confirm-regen")}
                className="flex w-full cursor-pointer items-center gap-3.5 rounded-2xl border-none bg-[#F9F9F9] px-4 py-3.5 text-left transition-colors active:opacity-80"
                style={{ marginBottom: 8 }}
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[rgba(14,165,233,0.10)] text-[#0EA5E9]">
                  <RefreshIcon />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-[#0C0C0C]">
                    Update arc
                  </p>
                  <p className="text-[11.5px] text-[#8C8C8C]">
                    Regenerate with the latest news
                  </p>
                </div>
              </button>

              {/* Delete row */}
              <button
                onClick={() => setSheet("confirm-delete")}
                className="flex w-full cursor-pointer items-center gap-3.5 rounded-2xl border-none bg-[rgba(239,68,68,0.05)] px-4 py-3.5 text-left transition-colors active:opacity-80"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[rgba(239,68,68,0.10)] text-[#EF4444]">
                  <TrashIcon />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-[#EF4444]">
                    Delete arc
                  </p>
                  <p className="text-[11.5px] text-[#8C8C8C]">
                    Permanently remove this arc
                  </p>
                </div>
              </button>
            </SheetPanel>
          </>
        )}

        {/* ── Disable-sharing confirmation ──────────────────────────────────── */}
        {sheet === "confirm-disable" && (
          <>
            <SheetBackdrop onClose={closeSheet} />
            <SheetPanel label="Disable sharing">
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(239,68,68,0.08)]">
                <span className="text-[#EF4444]">
                  <ShareIcon />
                </span>
              </div>
              <h2 className="mt-3 text-[17px] font-bold text-[#0C0C0C]">
                Disable sharing?
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#8C8C8C]">
                Anyone with the current link will no longer be able to view this
                arc. You can re-enable sharing at any time.
              </p>
              <div className="mt-5 flex flex-col gap-2.5">
                <button
                  onClick={handleDisableShare}
                  className="flex w-full cursor-pointer items-center justify-center rounded-2xl border-none py-[14px] text-[15px] font-bold text-white transition-opacity active:opacity-80"
                  style={{
                    background: "linear-gradient(135deg,#EF4444,#DC2626)",
                    boxShadow: "0 4px 16px rgba(239,68,68,0.28)",
                  }}
                >
                  Yes, disable sharing
                </button>
                <button
                  onClick={closeSheet}
                  className="flex w-full cursor-pointer items-center justify-center rounded-2xl border-none bg-[#F5F5F5] py-[14px] text-[15px] font-semibold text-[#0C0C0C] active:bg-[#EDEDED]"
                >
                  Cancel
                </button>
              </div>
            </SheetPanel>
          </>
        )}

        {/* ── Regenerate confirmation ───────────────────────────────────────── */}
        {sheet === "confirm-regen" && (
          <>
            <SheetBackdrop onClose={closeSheet} />
            <SheetPanel label="Update arc">
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(14,165,233,0.10)] text-[#0EA5E9]">
                <RefreshIcon />
              </div>
              <h2 className="mt-3 text-[17px] font-bold text-[#0C0C0C]">
                Update this arc?
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#8C8C8C]">
                We'll regenerate the arc using the same topic but with the
                latest news. This creates a new arc — your current one stays
                untouched.
              </p>
              <div className="mt-5 flex flex-col gap-2.5">
                <button
                  onClick={handleRegenerate}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-none py-[14px] text-[15px] font-bold text-white transition-opacity active:opacity-80"
                  style={{
                    background: "linear-gradient(135deg,#0EA5E9,#6366F1)",
                    boxShadow: "0 4px 16px rgba(14,165,233,0.28)",
                  }}
                >
                  {regenLoading ? (
                    <Spinner color="rgba(255,255,255,0.8)" />
                  ) : null}
                  Regenerate arc
                </button>
                <button
                  onClick={closeSheet}
                  className="flex w-full cursor-pointer items-center justify-center rounded-2xl border-none bg-[#F5F5F5] py-[14px] text-[15px] font-semibold text-[#0C0C0C] active:bg-[#EDEDED]"
                >
                  Cancel
                </button>
              </div>
            </SheetPanel>
          </>
        )}

        {/* ── Delete confirmation ───────────────────────────────────────────── */}
        {sheet === "confirm-delete" && (
          <>
            <SheetBackdrop onClose={closeSheet} />
            <SheetPanel label="Delete arc">
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(239,68,68,0.10)] text-[#EF4444]">
                <TrashIcon />
              </div>
              <h2 className="mt-3 text-[17px] font-bold text-[#0C0C0C]">
                Delete this arc?
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#8C8C8C]">
                This will permanently remove the arc and revoke any shared
                links. This action cannot be undone.
              </p>
              <div className="mt-5 flex flex-col gap-2.5">
                <button
                  onClick={handleDelete}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-none py-[14px] text-[15px] font-bold text-white transition-opacity active:opacity-80"
                  style={{
                    background: "linear-gradient(135deg,#EF4444,#DC2626)",
                    boxShadow: "0 4px 16px rgba(239,68,68,0.28)",
                  }}
                >
                  {deleteLoading ? (
                    <Spinner color="rgba(255,255,255,0.8)" />
                  ) : null}
                  Yes, delete permanently
                </button>
                <button
                  onClick={closeSheet}
                  className="flex w-full cursor-pointer items-center justify-center rounded-2xl border-none bg-[#F5F5F5] py-[14px] text-[15px] font-semibold text-[#0C0C0C] active:bg-[#EDEDED]"
                >
                  Cancel
                </button>
              </div>
            </SheetPanel>
          </>
        )}

        <style>{`
        @keyframes resultSlideUp { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer       { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @keyframes fadeIn        { from{opacity:0} to{opacity:1} }
        @keyframes sheetUp       { from{transform:translateY(100%)} to{transform:translateY(0)} }
      `}</style>
      </div>
    );
  },
);

ResultScreen.displayName = "ResultScreen";
