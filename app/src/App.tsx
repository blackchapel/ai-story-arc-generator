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
    () =>
      activeFilter === "all"
        ? arcs
        : arcs.filter((a) => a.tag === activeFilter),
    [arcs, activeFilter],
  );

  const refreshArcs = useCallback(async () => {
    try {
      const data = await fetchArcs();
      setArcs(data);
    } catch (error) {
      console.error("Error refreshing arcs:", error);
    }
  }, []);

  const goHome = useCallback(() => {
    history.replaceState(null, "", "/");
    setView({ screen: "home" });
    refreshArcs();
  }, [refreshArcs]);

  const handlePromptSubmit = useCallback(
    async (value: string) => {
      try {
        const { job_id } = await sendPrompt(value);
        history.pushState(null, "", `/process/${job_id}`);
        setView({ screen: "processing", jobId: job_id });
      } catch (error) {
        console.log(error);
        showToast("Something went wrong. Please try again.");
      }
    },
    [showToast],
  );

  const handleProcessingComplete = useCallback(
    (htmlContent: string, jobId: string) => {
      history.replaceState(null, "", `/arc/${jobId}`);
      setView({ screen: "result", jobId, htmlContent });
    },
    [],
  );

  const handleArticleClick = useCallback((jobId: string) => {
    history.pushState(null, "", `/arc/${jobId}`);
    setView({ screen: "result", jobId });
  }, []);

  const handleProcessingError = useCallback(
    (message: string) => {
      showToast(message);
      goHome();
    },
    [showToast, goHome],
  );

  const handleMenuOpen = useCallback(() => setMenuOpen(true), []);
  const handleMenuClose = useCallback(() => setMenuOpen(false), []);
  const handleFilterSelect = useCallback(
    (id: string) => setActiveFilter(id),
    [],
  );
  const handleStoryClick = useCallback((id: string) => {
    const s = STORIES.find((story) => story.id === id) ?? null;
    setOpenStory(s);
  }, []);
  const handleStoryClose = useCallback(() => setOpenStory(null), []);
  const handleAddStory = useCallback(() => {}, []);
  const handleProfileClick = useCallback(() => {}, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadArcs = async () => {
      setIsLoadingArcs(true);
      try {
        const data = await fetchArcs(controller.signal);
        setArcs(data);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Error fetching arcs:", error);
        showToast("Failed to load story arcs");
      } finally {
        if (!controller.signal.aborted) setIsLoadingArcs(false);
      }
    };

    loadArcs();
    return () => controller.abort();
  }, [showToast]);

  // Restore screen from URL on initial load
  useEffect(() => {
    const path = window.location.pathname;
    const arcMatch = path.match(/^\/arc\/(.+)$/);
    const processMatch = path.match(/^\/process\/(.+)$/);
    if (arcMatch) {
      setView({ screen: "result", jobId: arcMatch[1] });
    } else if (processMatch) {
      setView({ screen: "processing", jobId: processMatch[1] });
    }
  }, []);

  return (
    <>
      {/* Global error toast — above every screen */}
      <Toast toast={toast} onDismiss={dismissToast} />

      {/* Stories viewer overlay */}
      {openStory && (
        <StoryViewer story={openStory} onClose={handleStoryClose} />
      )}

      {/* Processing screen */}
      {view.screen === "processing" && (
        <ProcessingScreen
          jobId={view.jobId}
          onComplete={handleProcessingComplete}
          onError={handleProcessingError}
          onBack={goHome}
        />
      )}

      {/* Result screen */}
      {view.screen === "result" && (
        <ResultScreen jobId={view.jobId} htmlContent={view.htmlContent} onBack={goHome} />
      )}

      {/* Home screen */}
      {view.screen === "home" && (
        <>
          <SideMenu isOpen={menuOpen} onClose={handleMenuClose} />

          <div
            className="relative flex h-dvh w-full flex-col overflow-hidden bg-white"
            style={{
              boxShadow:
                "0 0 0 0.5px rgba(0,0,0,0.08), 0 32px 80px rgba(0,0,0,0.18)",
              animation: "homeEnter 0.38s cubic-bezier(0.4,0,0.2,1) both",
            }}
          >
            {/* Safe-area top spacer */}
            <div
              className="flex-shrink-0"
              style={{
                height: "env(safe-area-inset-top, 0px)",
                background: "#fff",
              }}
            />

            <Header
              onMenuClick={handleMenuOpen}
              onProfileClick={handleProfileClick}
            />

            {/*
             * flex-1 but capped by the keyboard height so the prompt bar
             * stays visible above the keyboard without the page shifting up.
             * We subtract kbOffset from the available height here instead of
             * translating the whole shell.
             */}
            <main
              className="flex-1 overflow-x-hidden overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{
                // When keyboard is open, shrink main so the prompt bar
                // above the keyboard is still reachable without any upward shift
                maxHeight:
                  kbOffset > 0
                    ? `calc(100dvh - env(safe-area-inset-top, 0px) - 58px - ${kbOffset}px - 72px)`
                    : undefined,
                transition: "max-height 0.28s cubic-bezier(0.4,0,0.2,1)",
              }}
              aria-label="Main content"
            >
              <div
                style={{
                  // Enough bottom padding so last card clears the prompt bar
                  paddingBottom:
                    "calc(80px + env(safe-area-inset-bottom, 0px))",
                }}
              >
                <StoriesRow
                  stories={STORIES}
                  onStoryClick={handleStoryClick}
                  onAddStory={handleAddStory}
                />
                <TopicPills
                  filters={topicFilters}
                  activeId={activeFilter}
                  onSelect={handleFilterSelect}
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

            {/*
             * Prompt bar sits here in normal flex flow — flex-shrink-0 keeps
             * it from being squeezed. No position:fixed, no translateY.
             * The keyboard slides up underneath it natively.
             */}
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
        to   { opacity: 1; transform: translateY(0);    }
      }
    `}</style>
        </>
      )}
    </>
  );
}
