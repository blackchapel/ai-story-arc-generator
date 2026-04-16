import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router";

import { useAuthStore } from "@/store/authStore";
import { useArcStore } from "@/store/arcStore";
import { useShowToast } from "@/context/ToastContext";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";
import { sendPrompt, fetchShowcaseArcs } from "@/apis";
import { STORIES, PROMPT_CHIPS } from "@/data";
import type { NewsArticle, Story } from "@/types";

import {
  Header,
  StoriesRow,
  TopicPills,
  NewsFeed,
  PromptBar,
  SideMenu,
  InProgressSection,
  StoryViewer,
} from "@/components";

// ── Sign-in CTA card (shown at the bottom for logged-out users) ───────────────
function SignInCard({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="px-4 py-3">
      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-3"
        style={{
          background: "linear-gradient(135deg,rgba(99,102,241,0.06) 0%,rgba(139,92,246,0.06) 100%)",
          border: "1px solid rgba(99,102,241,0.12)",
        }}
      >
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Z"
              stroke="white"
              strokeWidth="1.3"
            />
            <path
              d="M5 8h6M9 6l2 2-2 2"
              stroke="white"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-[#0C0C0C]">
            Generate your own arcs
          </p>
          <p className="text-[11.5px] text-[#8C8C8C]">
            Sign in to create personalized story arcs
          </p>
        </div>
        <button
          onClick={onSignIn}
          className="flex-shrink-0 cursor-pointer rounded-xl border-none px-4 py-2 text-[12.5px] font-bold text-white transition-opacity active:opacity-80"
          style={{
            background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
            boxShadow: "0 2px 10px rgba(99,102,241,0.30)",
          }}
        >
          Sign in
        </button>
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const showToast = useShowToast();

  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.isLoading);

  const arcs = useArcStore((s) => s.arcs);
  const activeJobs = useArcStore((s) => s.activeJobs);
  const loadingArcs = useArcStore((s) => s.loadingArcs);
  const { refreshArcs, refreshActiveJobs } = useArcStore.getState();

  const [menuOpen, setMenuOpen] = useState(false);
  const [openStory, setOpenStory] = useState<Story | null>(null);
  const [activeFilter, setFilter] = useState("all");
  const [showcaseArcs, setShowcaseArcs] = useState<NewsArticle[]>([]);
  const [showcaseLoading, setShowcaseLoading] = useState(false);

  const { isBookmarked, toggle: toggleBookmark } = useBookmarks();
  const kbOffset = useKeyboardOffset();

  // ── Showcase arcs for logged-out users ───────────────────────────────────
  useEffect(() => {
    if (authLoading || user) return;
    const ctrl = new AbortController();
    setShowcaseLoading(true);
    fetchShowcaseArcs()
      .then((arcs) => { if (!ctrl.signal.aborted) { setShowcaseArcs(arcs); setShowcaseLoading(false); } })
      .catch(() => { if (!ctrl.signal.aborted) setShowcaseLoading(false); });
    return () => ctrl.abort();
  }, [user, authLoading]);

  // ── Active jobs: initial fetch + live polling ─────────────────────────────
  useEffect(() => {
    if (authLoading || !user) return;
    refreshActiveJobs();
  }, [user, authLoading, refreshActiveJobs]);

  useEffect(() => {
    if (!user || activeJobs.length === 0) return;
    const id = setInterval(refreshActiveJobs, 3000);
    return () => clearInterval(id);
  }, [user, activeJobs.length, refreshActiveJobs]);

  // ── Refresh arcs when a job completes (job count decreases) ──────────────
  const prevJobCountRef = useRef(activeJobs.length);
  useEffect(() => {
    if (activeJobs.length < prevJobCountRef.current) refreshArcs();
    prevJobCountRef.current = activeJobs.length;
  }, [activeJobs.length, refreshArcs]);

  // ── Filters ───────────────────────────────────────────────────────────────
  const sourceArcs = user ? arcs : showcaseArcs;

  const topicFilters = useMemo(() => {
    const seen = new Set<string>();
    const out = [{ id: "all", label: "All" }];
    for (const a of sourceArcs) {
      if (a.tag && !seen.has(a.tag)) {
        seen.add(a.tag);
        out.push({ id: a.tag, label: a.tag });
      }
    }
    return out;
  }, [sourceArcs]);

  const filteredArcs = useMemo(
    () =>
      activeFilter === "all" ? arcs : arcs.filter((a) => a.tag === activeFilter),
    [arcs, activeFilter],
  );

  const filteredShowcaseArcs = useMemo(
    () =>
      activeFilter === "all"
        ? showcaseArcs
        : showcaseArcs.filter((a) => a.tag === activeFilter),
    [showcaseArcs, activeFilter],
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handlePromptSubmit = useCallback(
    async (value: string) => {
      if (!user) {
        navigate("/auth", { state: { pendingPrompt: value } });
        return;
      }
      try {
        const { job_id } = await sendPrompt(value);
        navigate(`/process/${job_id}`);
      } catch {
        showToast("Something went wrong. Please try again.");
      }
    },
    [user, navigate, showToast],
  );

  const handleArticleClick = useCallback(
    (jobId: string) => navigate(`/arc/${jobId}`),
    [navigate],
  );

  const handleShowcaseArcClick = useCallback(
    (shareToken: string) => navigate(`/shared/${shareToken}?showcase=true`),
    [navigate],
  );

  const handleStoryClick = useCallback(
    (id: string) => setOpenStory(STORIES.find((s) => s.id === id) ?? null),
    [],
  );

  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const closeStory = useCallback(() => setOpenStory(null), []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {openStory && <StoryViewer story={openStory} onClose={closeStory} />}

      <SideMenu isOpen={menuOpen} onClose={closeMenu} />

      <div
        className="relative flex h-dvh w-full flex-col overflow-hidden bg-white"
        style={{
          boxShadow:
            "0 0 0 0.5px rgba(0,0,0,0.08), 0 32px 80px rgba(0,0,0,0.18)",
          animation: "homeEnter 0.38s cubic-bezier(0.4,0,0.2,1) both",
        }}
      >
        <div
          className="flex-shrink-0"
          style={{ height: "env(safe-area-inset-top, 0px)", background: "#fff" }}
        />

        <Header
          onMenuClick={openMenu}
          onProfileClick={() => navigate("/auth")}
        />

        <main
          className="flex-1 overflow-x-hidden overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            maxHeight:
              kbOffset > 0
                ? `calc(100dvh - env(safe-area-inset-top,0px) - 58px - ${kbOffset}px - 72px)`
                : undefined,
            transition: "max-height 0.28s cubic-bezier(0.4,0,0.2,1)",
          }}
          aria-label="Main content"
        >
          <div style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom,0px))" }}>
            <StoriesRow stories={STORIES} onStoryClick={handleStoryClick} />
            <InProgressSection
              jobs={activeJobs}
              onJobClick={(jobId) => navigate(`/process/${jobId}`)}
            />
            <TopicPills
              filters={topicFilters}
              activeId={activeFilter}
              onSelect={setFilter}
            />
            <NewsFeed
              articles={filteredArcs}
              filterKey={activeFilter}
              isBookmarked={isBookmarked}
              onBookmark={toggleBookmark}
              onArticleClick={handleArticleClick}
              onSignInClick={() => navigate("/auth")}
              onShowcaseArcClick={handleShowcaseArcClick}
              showcaseArcs={filteredShowcaseArcs}
              showcaseLoading={showcaseLoading}
              isLoading={loadingArcs && arcs.length === 0}
            />
          </div>
        </main>

        <div
          className="flex-shrink-0"
          style={{
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(28px) saturate(1.6)",
            WebkitBackdropFilter: "blur(28px) saturate(1.6)",
            borderTop: "1px solid rgba(235,235,235,0.8)",
            paddingBottom: "env(safe-area-inset-bottom,0px)",
          }}
        >
          {!authLoading && !user ? (
            <SignInCard onSignIn={() => navigate("/auth")} />
          ) : (
            <PromptBar
              chips={PROMPT_CHIPS}
              onSubmit={handlePromptSubmit}
              onAuthRequired={() => navigate("/auth")}
              showToast={showToast}
            />
          )}
        </div>
      </div>

      <style>{`@keyframes homeEnter{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </>
  );
}
