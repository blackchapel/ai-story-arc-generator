import { useState, useCallback, useEffect } from "react";

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
} from "@/components";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";
import { useToast } from "@/hooks/useToast";
import { fetchArcs, sendPrompt } from "@/apis";
import { STORIES, TOPIC_FILTERS, PROMPT_CHIPS } from "@/data";
import type { NewsArticle } from "@/types";
import type { AppView } from "@/types/job";

export default function App() {
  const [view, setView] = useState<AppView>({ screen: "home" });

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [arcs, setArcs] = useState<NewsArticle[]>([]);

  const { isBookmarked, toggle: toggleBookmark } = useBookmarks();
  const { toast, showToast, dismissToast } = useToast();
  const kbOffset = useKeyboardOffset();

  // const filteredArticles = useMemo<NewsArticle1[]>(() => {
  //   if (activeFilter === "all") return NEWS_ARTICLES;
  //   const filter = TOPIC_FILTERS.find((f) => f.id === activeFilter);
  //   if (!filter || filter.category === "all") return NEWS_ARTICLES;
  //   return NEWS_ARTICLES.filter((a) => a.category === filter.category);
  // }, [activeFilter]);

  const goHome = useCallback(() => setView({ screen: "home" }), []);

  const handlePromptSubmit = useCallback(
    async (value: string) => {
      try {
        const { job_id } = await sendPrompt(value);
        setView({ screen: "processing", jobId: job_id });
      } catch (error) {
        console.log(error);
        showToast("Something went wrong. Please try again.");
      }
    },
    [showToast],
  );

  const handleProcessingComplete = useCallback((htmlContent: string) => {
    setView((prev) =>
      prev.screen === "processing"
        ? { screen: "result", jobId: prev.jobId, htmlContent }
        : prev,
    );
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
  const handleStoryClick = useCallback((_id: string) => {}, []);
  const handleAddStory = useCallback(() => {}, []);
  const handleArticleClick = useCallback((_id: string) => {}, []);
  const handleSeeAll = useCallback(() => {}, []);
  const handleProfileClick = useCallback(() => {}, []);

  const getArcs = async () => {
    setArcs(await fetchArcs());
  };
  useEffect(() => {
    getArcs();
  }, []);

  return (
    <>
      {/* Global error toast — above every screen */}
      <Toast toast={toast} onDismiss={dismissToast} />

      {/* Processing screen */}
      {view.screen === "processing" && (
        <ProcessingScreen
          jobId={view.jobId}
          onComplete={handleProcessingComplete}
          onError={handleProcessingError}
        />
      )}

      {/* Result screen */}
      {view.screen === "result" && (
        <ResultScreen htmlContent={view.htmlContent} onBack={goHome} />
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
                  filters={TOPIC_FILTERS}
                  activeId={activeFilter}
                  onSelect={handleFilterSelect}
                />
                <NewsFeed
                  articles={arcs}
                  isBookmarked={isBookmarked}
                  onBookmark={toggleBookmark}
                  onArticleClick={handleArticleClick}
                  onSeeAll={handleSeeAll}
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
