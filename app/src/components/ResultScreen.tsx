import { memo, useCallback, useEffect, useState } from "react";
import { fetchOutput, toggleShare } from "@/apis";
import { useAuth } from "@/hooks/useAuth";
import type { NewsArticle } from "@/types";

interface ResultScreenProps {
  jobId: string;
  htmlUrl?: string;
  onBack: () => void;
}

export const ResultScreen = memo<ResultScreenProps>(({ jobId, htmlUrl: initialHtmlUrl, onBack }) => {
  const { user } = useAuth();
  const [loaded, setLoaded]         = useState(false);
  const [htmlUrl, setHtmlUrl]       = useState<string | null>(initialHtmlUrl ?? null);
  const [arc, setArc]               = useState<NewsArticle | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [sharing, setSharing]       = useState(false);
  const [copied, setCopied]         = useState(false);
  // "confirm" sheet visible when user wants to disable sharing
  const [confirmDisable, setConfirmDisable] = useState(false);

  useEffect(() => {
    if (initialHtmlUrl) return;
    const ctrl = new AbortController();
    fetchOutput(jobId)
      .then((a) => { if (!ctrl.signal.aborted) { setArc(a); setHtmlUrl(a.html ?? null); } })
      .catch(() => { if (!ctrl.signal.aborted) setFetchError(true); });
    return () => ctrl.abort();
  }, [jobId, initialHtmlUrl]);

  useEffect(() => {
    if (!initialHtmlUrl) return;
    fetchOutput(jobId).then(setArc).catch(() => {});
  }, [jobId, initialHtmlUrl]);

  const isOwner = !!user && !!arc && arc.user_id === user.id;

  // ── Enable sharing + immediately invoke native share / clipboard ──────────
  const handleEnableShare = useCallback(async () => {
    if (!arc || sharing) return;
    setSharing(true);
    try {
      const res = await toggleShare(arc.id);
      const updated = { ...arc, is_shared: res.is_shared, share_token: res.share_token ?? undefined };
      setArc(updated);
      if (res.is_shared && res.share_token) {
        const url = `${window.location.origin}/shared/${res.share_token}`;
        if (navigator.share) {
          navigator.share({ title: arc.title ?? "arc.", url }).catch(() => {});
        } else {
          await navigator.clipboard?.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }
    } catch { /* silent */ }
    finally { setSharing(false); }
  }, [arc, sharing]);

  // ── Disable sharing (called after confirmation) ───────────────────────────
  const handleDisableShare = useCallback(async () => {
    if (!arc || sharing) return;
    setConfirmDisable(false);
    setSharing(true);
    try {
      const res = await toggleShare(arc.id);
      setArc((prev) => prev ? { ...prev, is_shared: res.is_shared, share_token: res.share_token ?? undefined } : prev);
    } catch { /* silent */ }
    finally { setSharing(false); }
  }, [arc, sharing]);

  // ── Copy existing share link ──────────────────────────────────────────────
  const handleCopyLink = useCallback(async () => {
    if (!arc?.share_token) return;
    const url = `${window.location.origin}/shared/${arc.share_token}`;
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [arc]);

  return (
    <div className="flex h-full w-full flex-col bg-white" style={{ animation: "resultSlideUp 0.45s cubic-bezier(0.34,1.06,0.64,1) both" }}>
      {/* Top bar */}
      <div className="relative flex h-[52px] flex-shrink-0 items-center px-4" style={{ borderBottom: "1px solid #EBEBEB" }}>
        <div className="absolute bottom-0 left-0 right-0 h-[2px] opacity-60" style={{ background: "linear-gradient(90deg,#6366F1 0%,#EC4899 40%,#F5A623 70%,#10B981 100%)" }} aria-hidden="true"/>

        {/* Left */}
        <div className="flex flex-1 items-center">
          <button onClick={onBack} className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border-none bg-transparent px-2 text-[13px] font-semibold text-[#6366F1] transition-opacity active:opacity-60" aria-label="Back">
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none" aria-hidden="true"><path d="M6 1L1 6l5 5" stroke="#6366F1" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Home
          </button>
        </div>

        {/* Center */}
        <span className="flex-shrink-0 select-none font-logo text-[22px] font-black leading-none tracking-[-1.5px] text-[#0C0C0C]">
          arc<span style={{ color: "#F5A623" }}>.</span>
        </span>

        {/* Right */}
        <div className="flex flex-1 items-center justify-end gap-1.5">
          {isOwner && arc && (
            <>
              {/* Copy link — only visible when already shared */}
              {arc.is_shared && (
                <button
                  onClick={handleCopyLink}
                  className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border-none transition-colors active:opacity-70"
                  style={{ background: copied ? "rgba(16,185,129,0.12)" : "rgba(99,102,241,0.08)", color: copied ? "#10B981" : "#6366F1" }}
                  aria-label={copied ? "Link copied" : "Copy share link"}
                >
                  {copied ? (
                    <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 6l3 3 5-5" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden="true"><rect x="4" y="1" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1 4.5v5A1.5 1.5 0 0 0 2.5 11h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  )}
                </button>
              )}

              {/* Share / Shared toggle */}
              <button
                onClick={arc.is_shared ? () => setConfirmDisable(true) : handleEnableShare}
                disabled={sharing}
                className="flex h-8 flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border-none px-2.5 text-[12px] font-semibold transition-colors disabled:opacity-60"
                style={{ background: arc.is_shared ? "rgba(16,185,129,0.10)" : "#F5F5F5", color: arc.is_shared ? "#10B981" : "#0C0C0C" }}
                aria-label={arc.is_shared ? "Disable sharing" : "Share this arc"}
              >
                {sharing ? (
                  <svg className="animate-spin" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5"/><path d="M6 1.5a4.5 4.5 0 0 1 4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                ) : arc.is_shared ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 6l3 3 5-5" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><circle cx="9.5" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="9.5" cy="9.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="2.5" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M4 5.3l4-2.2M4 6.7l4 2.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                )}
                {arc.is_shared ? "Shared" : "Share"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="relative flex-1 overflow-hidden">
        {(!htmlUrl || !loaded) && !fetchError && (
          <div className="absolute inset-0 z-10 bg-white">
            <div className="flex flex-col gap-4 p-5 pt-8">
              {[80,55,90,40,70].map((w,i) => (
                <div key={i} className="rounded-lg" style={{ height: i===0?180:16, width:`${w}%`, background:"linear-gradient(90deg,#F5F5F5 25%,#EDEDED 50%,#F5F5F5 75%)", backgroundSize:"800px 100%", animation:`shimmer 1.6s infinite ${i*0.1}s` }} aria-hidden="true"/>
              ))}
            </div>
          </div>
        )}

        {fetchError && (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-[15px] font-semibold text-[#0C0C0C]">Couldn't load this arc</p>
            <p className="text-[13px] text-[#8C8C8C]">It may have been removed or you may not have access.</p>
            <button onClick={onBack} className="mt-2 rounded-xl border-none bg-[#F5F5F5] px-5 py-2.5 text-[13px] font-semibold text-[#0C0C0C] active:bg-[#EDEDED]">Go home</button>
          </div>
        )}

        {htmlUrl && (
          <iframe src={htmlUrl} onLoad={() => setLoaded(true)} title="Your arc story" className="h-full w-full border-none" sandbox="allow-scripts allow-popups" loading="eager"/>
        )}
      </div>

      {/* ── Disable-sharing confirmation sheet ────────────────────────────────── */}
      {confirmDisable && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            style={{ animation: "fadeIn 0.2s ease both" }}
            onClick={() => setConfirmDisable(false)}
            aria-hidden="true"
          />
          <div
            className="fixed left-0 right-0 z-50 rounded-t-3xl bg-white px-6 pt-6"
            style={{
              bottom: 0,
              paddingBottom: "calc(32px + env(safe-area-inset-bottom, 0px))",
              animation: "sheetUp 0.3s cubic-bezier(0.34,1.06,0.64,1) both",
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Disable sharing"
          >
            {/* Handle */}
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[#EBEBEB]" />

            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(239,68,68,0.08)]">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="15" cy="4" r="2.5" stroke="#EF4444" strokeWidth="1.4"/>
                <circle cx="15" cy="16" r="2.5" stroke="#EF4444" strokeWidth="1.4"/>
                <circle cx="5"  cy="10" r="2.5" stroke="#EF4444" strokeWidth="1.4"/>
                <path d="M7.3 8.9l5.4-3.3M7.3 11.1l5.4 3.3" stroke="#EF4444" strokeWidth="1.4" strokeLinecap="round"/>
                <path d="M8 10h8" stroke="#EF4444" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 1.5"/>
              </svg>
            </div>

            <h2 className="mt-3 text-[17px] font-bold text-[#0C0C0C]">Disable sharing?</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#8C8C8C]">
              Anyone with the current link will no longer be able to view this arc. You can re-enable sharing at any time.
            </p>

            <div className="mt-5 flex flex-col gap-2.5">
              <button
                onClick={handleDisableShare}
                className="flex w-full cursor-pointer items-center justify-center rounded-2xl border-none py-[14px] text-[15px] font-bold text-white transition-opacity active:opacity-80"
                style={{ background: "linear-gradient(135deg,#EF4444,#DC2626)", boxShadow: "0 4px 16px rgba(239,68,68,0.28)" }}
              >
                Yes, disable sharing
              </button>
              <button
                onClick={() => setConfirmDisable(false)}
                className="flex w-full cursor-pointer items-center justify-center rounded-2xl border-none bg-[#F5F5F5] py-[14px] text-[15px] font-semibold text-[#0C0C0C] transition-colors active:bg-[#EDEDED]"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes resultSlideUp { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes sheetUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
      `}</style>
    </div>
  );
});
ResultScreen.displayName = "ResultScreen";
