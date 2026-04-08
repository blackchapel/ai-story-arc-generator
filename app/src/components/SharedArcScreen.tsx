import { memo, useCallback, useEffect, useState } from "react";
import { fetchSharedArc, saveSharedArc, ApiError } from "@/apis";
import { useAuth } from "@/hooks/useAuth";
import type { NewsArticle } from "@/types";

interface SharedArcScreenProps {
  shareToken: string;
  onBack: () => void;
  onSignIn: () => void;
  onOwnArc: (arcId: string) => void;
}

export const SharedArcScreen = memo<SharedArcScreenProps>(({ shareToken, onBack, onSignIn, onOwnArc }) => {
  const { user } = useAuth();

  const [arc, setArc]             = useState<NewsArticle | null>(null);
  const [loaded, setLoaded]       = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [saveErr, setSaveErr]     = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchSharedArc(shareToken)
      .then((a) => { if (!ctrl.signal.aborted) setArc(a); })
      .catch(() => { if (!ctrl.signal.aborted) setFetchError(true); });
    return () => ctrl.abort();
  }, [shareToken]);

  const isOwner = !!user && !!arc && arc.user_id === user.id;

  // If the viewer is the owner, redirect to the canonical arc URL
  useEffect(() => {
    if (isOwner && arc) onOwnArc(arc.id);
  }, [isOwner, arc, onOwnArc]);
  const alreadySaved = arc?.is_saved ?? false;

  const handleSave = useCallback(async () => {
    if (!user) { onSignIn(); return; }
    if (saving || saved || alreadySaved) return;
    setSaving(true); setSaveErr(null);
    try {
      await saveSharedArc(shareToken);
      setSaved(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setSaved(true); // already own it
      } else {
        setSaveErr("Couldn't save. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }, [user, saving, saved, alreadySaved, shareToken, onSignIn]);

  const handleNativeShare = useCallback(() => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: arc?.title ?? "arc.", url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).catch(() => {});
    }
  }, [arc]);

  return (
    <div className="flex h-full w-full flex-col bg-white" style={{ animation: "resultSlideUp 0.45s cubic-bezier(0.34,1.06,0.64,1) both" }}>
      {/* Top bar — three-column flex */}
      <div className="relative flex h-[52px] flex-shrink-0 items-center px-4" style={{ borderBottom: "1px solid #EBEBEB" }}>
        <div className="absolute bottom-0 left-0 right-0 h-[2px] opacity-60" style={{ background: "linear-gradient(90deg,#6366F1 0%,#EC4899 40%,#F5A623 70%,#10B981 100%)" }} aria-hidden="true"/>

        <div className="flex flex-1 items-center">
          <button onClick={onBack} className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border-none bg-transparent px-2 text-[13px] font-semibold text-[#6366F1] transition-opacity active:opacity-60" aria-label="Back">
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none" aria-hidden="true"><path d="M6 1L1 6l5 5" stroke="#6366F1" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Home
          </button>
        </div>

        <span className="flex-shrink-0 select-none font-logo text-[22px] font-black leading-none tracking-[-1.5px] text-[#0C0C0C]">
          arc<span style={{ color: "#F5A623" }}>.</span>
        </span>

        <div className="flex flex-1 items-center justify-end">
          <button
            onClick={handleNativeShare}
            className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border-none bg-[#F5F5F5] px-2.5 text-[12px] font-semibold text-[#0C0C0C] transition-colors active:bg-[#EDEDED]"
            aria-label="Share"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <circle cx="10.5" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <circle cx="10.5" cy="10.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <circle cx="2.5" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M4 5.8l5-2.6M4 7.2l5 2.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Share
          </button>
        </div>
      </div>

      {/* Shared-by banner */}
      {arc && !isOwner && (
        <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: "1px solid #F5F5F5", background: "rgba(99,102,241,0.04)" }}>
          <div
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)" }}
          >
            {arc.title?.[0]?.toUpperCase() ?? "A"}
          </div>
          <p className="text-[12px] text-[#8C8C8C]">
            Shared arc · <span className="font-semibold text-[#0C0C0C]">{arc.title}</span>
          </p>
        </div>
      )}

      {/* Arc iframe */}
      <div className="relative flex-1 overflow-hidden">
        {(!arc || !loaded) && !fetchError && (
          <div className="absolute inset-0 z-10 bg-white">
            <div className="flex flex-col gap-4 p-5 pt-8">
              {[80,55,90,40,70].map((w,i) => (
                <div key={i} className="rounded-lg" style={{ height:i===0?180:16, width:`${w}%`, background:"linear-gradient(90deg,#F5F5F5 25%,#EDEDED 50%,#F5F5F5 75%)", backgroundSize:"800px 100%", animation:`shimmer 1.6s infinite ${i*0.1}s` }} aria-hidden="true"/>
              ))}
            </div>
          </div>
        )}

        {fetchError && (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(239,68,68,0.08)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="#EF4444" strokeWidth="1.6"/>
                <path d="M12 8v4M12 16h.01" stroke="#EF4444" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-[#0C0C0C]">This arc isn't available</p>
            <p className="text-[13px] leading-relaxed text-[#8C8C8C]">
              The link may be invalid or the owner has disabled sharing.
            </p>
            <button onClick={onBack} className="mt-2 rounded-xl border-none bg-[#F5F5F5] px-5 py-2.5 text-[13px] font-semibold text-[#0C0C0C] active:bg-[#EDEDED]">
              Go home
            </button>
          </div>
        )}

        {arc?.html && (
          <iframe
            src={arc.html}
            onLoad={() => setLoaded(true)}
            title={arc.title ?? "Shared arc"}
            className="h-full w-full border-none"
            sandbox="allow-scripts allow-popups"
            loading="eager"
          />
        )}
      </div>

      {/* Save to library banner (non-owners only) */}
      {arc && !isOwner && !fetchError && (
        <div
          className="flex-shrink-0 px-4 pb-safe pt-3"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom,16px) + 12px)",
            borderTop: "1px solid #F5F5F5",
            background: "rgba(255,255,255,0.96)",
          }}
        >
          {saveErr && (
            <p className="mb-2 text-center text-[12px] text-red-500">{saveErr}</p>
          )}
          <button
            onClick={handleSave}
            disabled={saving || saved || alreadySaved}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none py-[13px] text-[14px] font-bold text-white transition-opacity disabled:cursor-default disabled:opacity-60"
            style={{
              background: (saved || alreadySaved)
                ? "linear-gradient(135deg,#10B981 0%,#059669 100%)"
                : "linear-gradient(135deg,#6366F1 0%,#8B5CF6 100%)",
            }}
          >
            {saving ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <circle cx="7" cy="7" r="5.5" stroke="rgba(255,255,255,0.35)" strokeWidth="2"/>
                  <path d="M7 1.5a5.5 5.5 0 0 1 5.5 5.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Saving…
              </>
            ) : (saved || alreadySaved) ? (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M2 7l4 4 6-6" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Saved to your library
              </>
            ) : !user ? (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M7 1a6 6 0 1 1 0 12A6 6 0 0 1 7 1Z" stroke="white" strokeWidth="1.3"/>
                  <path d="M4.5 7h5M8 5l2 2-2 2" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Sign in to save to library
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M7 1v12M1 7h12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Save to my library
              </>
            )}
          </button>
        </div>
      )}

      <style>{`
        @keyframes resultSlideUp { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
      `}</style>
    </div>
  );
});
SharedArcScreen.displayName = "SharedArcScreen";
