import { useState, useCallback, useEffect, useMemo } from "react";

import {
  Header,
  StoriesRow,
  TopicPills,
  NewsFeed,
  PromptBar,
  SideMenu,
  Toast,
  ProcessingScreen,
  ResultScreen,
  StoryViewer,
} from "@/components";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";
import { useToast } from "@/hooks/useToast";
import { fetchArcs, sendPrompt } from "@/apis";
import { STORIES, PROMPT_CHIPS } from "@/data";
import type { NewsArticle, Story } from "@/types";
import type { AppView } from "@/types/job";

// ─── Navigation helpers ───────────────────────────────────────────────────────

function resolveViewFromPath(path: string): AppView {
  const arcMatch = path.match(/^\/arc\/(.+)$/);
  const processMatch = path.match(/^\/process\/(.+)$/);
  if (arcMatch) return { screen: "result", jobId: arcMatch[1] };
  if (processMatch) return { screen: "processing", jobId: processMatch[1] };
  return { screen: "home" };
}

// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<AppView>({ screen: "home" });
  const [menuOpen, setMenuOpen] = useState(false);
  const [openStory, setOpenStory] = useState<Story | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [arcs, setArcs] = useState<NewsArticle[]>([]);
  const [isLoadingArcs, setIsLoadingArcs] = useState(true);

  const { isBookmarked, toggle: toggleBookmark } = useBookmarks();
  const { toast, showToast, dismissToast } = useToast();
  const kbOffset = useKeyboardOffset();

  const topicFilters = useMemo(() => {
    const seen = new Set<string>();
    const filters = [{ id: "all", label: "All" }];
    for (const arc of arcs) {
      if (arc.tag && !seen.has(arc.tag)) {
        seen.add(arc.tag);
        filters.push({ id: arc.tag, label: arc.tag });
      }
    }
    return filters;
  }, [arcs]);

  const filteredArcs = useMemo(
    () => (activeFilter === "all" ? arcs : arcs.filter((a) => a.tag === activeFilter)),
    [arcs, activeFilter],
  );

  // ─── Navigation ────────────────────────────────────────────────────────────

  const navigate = useCallback((nextView: AppView, url: string, replace = false) => {
    if (replace) {
      history.replaceState(nextView, "", url);
    } else {
      history.pushState(nextView, "", url);
    }
    setView(nextView);
  }, []);

  const refreshArcs = useCallback(async () => {
    try {
      setArcs(await fetchArcs());
    } catch {
      // non-critical background refresh
    }
  }, []);

  const goHome = useCallback(() => {
    navigate({ screen: "home" }, "/", true);
    refreshArcs();
  }, [navigate, refreshArcs]);

  // ─── Restore state on initial load & handle deep links ─────────────────────
  // If the user opens the app directly to /arc/xxx (e.g. from a notification or
  // shared link), we inject a synthetic home entry at the bottom of the history
  // stack so the back gesture always has somewhere to land instead of closing
  // the app or leaving the PWA scope.
  useEffect(() => {
    const path = window.location.pathname;
    const initialView = resolveViewFromPath(path);

    if (initialView.screen !== "home") {
      // Lay down home at position 0, then push the deep-link destination.
      history.replaceState({ screen: "home" } satisfies AppView, "", "/");
      history.pushState(initialView, "", path);
    } else {
      // Tag the home entry so popstate can read it.
      history.replaceState(initialView, "", "/");
    }

    setView(initialView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount

  // ─── popstate — back/forward gesture and browser buttons ───────────────────
  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const nextView: AppView = e.state ?? resolveViewFromPath(window.location.pathname);
      setView(nextView);
      if (nextView.screen === "home") refreshArcs();
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [refreshArcs]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handlePromptSubmit = useCallback(
    async (value: string) => {
      try {
        const { job_id } = await sendPrompt(value);
        navigate({ screen: "processing", jobId: job_id }, `/process/${job_id}`);
      } catch {
        showToast("Something went wrong. Please try again.");
      }
    },
    [navigate, showToast],
  );

  const handleProcessingComplete = useCallback(
    (htmlUrl: string, jobId: string) => {
      // Replace the /process entry so back goes home, not back to processing.
      navigate({ screen: "result", jobId, htmlUrl }, `/arc/${jobId}`, true);
    },
    [navigate],
  );

  const handleProcessingError = useCallback(
    (message: string) => {
      showToast(message);
      goHome();
    },
    [showToast, goHome],
  );

  const handleArticleClick = useCallback(
    (jobId: string) => navigate({ screen: "result", jobId }, `/arc/${jobId}`),
    [navigate],
  );

  const handleStoryClick = useCallback(
    (id: string) => setOpenStory(STORIES.find((s) => s.id === id) ?? null),
    [],
  );

  // ─── Initial arc fetch ──────────────────────────────────────────────────────

  useEffect(() => {
    const controller = new AbortController();
    setIsLoadingArcs(true);
    fetchArcs(controller.signal)
      .then(setArcs)
      .catch((err) => {
        if (!controller.signal.aborted) showToast("Failed to load story arcs");
        console.error(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingArcs(false);
      });
    return () => controller.abort();
  }, [showToast]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Toast toast={toast} onDismiss={dismissToast} />

      {openStory && (
        <StoryViewer story={openStory} onClose={() => setOpenStory(null)} />
      )}

      {view.screen === "processing" && (
        <ProcessingScreen
          jobId={view.jobId}
          onComplete={handleProcessingComplete}
          onError={handleProcessingError}
          onBack={goHome}
        />
      )}

      {view.screen === "result" && (
        <ResultScreen
          jobId={view.jobId}
          htmlUrl={view.htmlUrl}
          onBack={goHome}
        />
      )}

      {view.screen === "home" && (
        <>
          <SideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

          <div
            className="relative flex h-dvh w-full flex-col overflow-hidden bg-white"
            style={{
              boxShadow: "0 0 0 0.5px rgba(0,0,0,0.08), 0 32px 80px rgba(0,0,0,0.18)",
              animation: "homeEnter 0.38s cubic-bezier(0.4,0,0.2,1) both",
            }}
          >
            <div
              className="flex-shrink-0"
              style={{ height: "env(safe-area-inset-top, 0px)", background: "#fff" }}
            />

            <Header
              onMenuClick={() => setMenuOpen(true)}
              onProfileClick={() => {}}
            />

            <main
              className="flex-1 overflow-x-hidden overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{
                maxHeight:
                  kbOffset > 0
                    ? `calc(100dvh - env(safe-area-inset-top, 0px) - 58px - ${kbOffset}px - 72px)`
                    : undefined,
                transition: "max-height 0.28s cubic-bezier(0.4,0,0.2,1)",
              }}
              aria-label="Main content"
            >
              <div style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}>
                <StoriesRow stories={STORIES} onStoryClick={handleStoryClick} />
                <TopicPills
                  filters={topicFilters}
                  activeId={activeFilter}
                  onSelect={setActiveFilter}
                />
                <NewsFeed
                  articles={filteredArcs}
                  isBookmarked={isBookmarked}
                  onBookmark={toggleBookmark}
                  onArticleClick={handleArticleClick}
                  isLoading={isLoadingArcs && arcs.length === 0}
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
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
              }}
            >
              <PromptBar chips={PROMPT_CHIPS} onSubmit={handlePromptSubmit} />
            </div>
          </div>

          <style>{`
            @keyframes homeEnter {
              from { opacity: 0; transform: translateY(12px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </>
      )}
    </>
  );
}
