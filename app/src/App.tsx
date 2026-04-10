import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

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
  SharedArcScreen,
  StoryViewer,
  AuthPage,
  InProgressSection,
} from "@/components";
import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";
import { useToast } from "@/hooks/useToast";
import { fetchArcs, sendPrompt, fetchActiveJobs } from "@/apis";
import { STORIES, PROMPT_CHIPS } from "@/data";
import type { NewsArticle, Story, ActiveJob } from "@/types";
import type { AppView } from "@/types/job";

// ── URL → view state ──────────────────────────────────────────────────────────

function resolveView(path: string): AppView {
  const arcMatch = path.match(/^\/arc\/(.+)$/);
  const processMatch = path.match(/^\/process\/(.+)$/);
  const sharedMatch = path.match(/^\/shared\/(.+)$/);
  const authMatch = path === "/auth";
  if (arcMatch) return { screen: "result", jobId: arcMatch[1] };
  if (processMatch) return { screen: "processing", jobId: processMatch[1] };
  if (sharedMatch) return { screen: "shared", shareToken: sharedMatch[1] };
  if (authMatch) return { screen: "auth" };
  return { screen: "home" };
}

// ── Inner app (consumes AuthContext) ──────────────────────────────────────────

function AppInner() {
  const { user, isLoading: authLoading, pendingLinkSignIn } = useAuth();

  const [view, setView] = useState<AppView>({ screen: "home" });
  const [menuOpen, setMenuOpen] = useState(false);
  const [openStory, setOpenStory] = useState<Story | null>(null);
  const [activeFilter, setFilter] = useState("all");
  const [arcs, setArcs] = useState<NewsArticle[]>([]);
  // Start true so NewsFeed stays in skeleton state across the auth→arcs handoff,
  // preventing the one-frame "no arcs yet" flash on reload while logged in.
  const [loadingArcs, setLoadingArcs] = useState(true);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);

  const [pendingPrompt, setPending] = useState<string | null>(null);

  const { isBookmarked, toggle: toggleBookmark } = useBookmarks();
  const { toast, showToast, dismissToast } = useToast();
  const kbOffset = useKeyboardOffset();
  const { onForegroundMessage } = usePushNotifications();

  // ── Session expiry detection ──────────────────────────────────────────────
  const prevUserRef = useRef(user);
  useEffect(() => {
    if (prevUserRef.current !== null && user === null) {
      showToast("Your session expired. Please log in again.");
    }
    prevUserRef.current = user;
  }, [user, showToast]);

  // ── Derived: filters + filtered list ─────────────────────────────────────
  const topicFilters = useMemo(() => {
    const seen = new Set<string>();
    const out = [{ id: "all", label: "All" }];
    for (const a of arcs) {
      if (a.tag && !seen.has(a.tag)) {
        seen.add(a.tag);
        out.push({ id: a.tag, label: a.tag });
      }
    }
    return out;
  }, [arcs]);

  const filteredArcs = useMemo(
    () =>
      activeFilter === "all"
        ? arcs
        : arcs.filter((a) => a.tag === activeFilter),
    [arcs, activeFilter],
  );

  // ── Navigation ────────────────────────────────────────────────────────────

  // Ref so navigate() never changes identity (avoids cascading dep invalidations)
  const viewRef = useRef(view);
  viewRef.current = view;

  const navigate = useCallback(
    (nextView: AppView, url: string, replace = false) => {
      // Push when going FROM home to a screen  → creates [home, screen]
      // Replace when already on a non-home screen → keeps [home, screen], no accumulation
      const shouldReplace = replace || viewRef.current.screen !== "home";
      shouldReplace
        ? history.replaceState(nextView, "", url)
        : history.pushState(nextView, "", url);
      setView(nextView);
    },
    [],
  );

  // ── Foreground push notifications ─────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onForegroundMessage((jobId, url) => {
      showToast("Your arc is ready!");
      // Navigate to the arc after a brief moment so the toast is visible
      setTimeout(() => {
        navigate({ screen: "result", jobId }, url, true);
      }, 800);
    });
    return unsubscribe;
  }, [onForegroundMessage, navigate, showToast]);

  const refreshArcs = useCallback(async () => {
    if (!user) {
      setArcs([]);
      return;
    }
    try {
      setArcs(await fetchArcs());
    } catch {
      /* silent */
    }
  }, [user]);

  const refreshActiveJobs = useCallback(async () => {
    if (!user) {
      setActiveJobs([]);
      return;
    }
    try {
      setActiveJobs(await fetchActiveJobs());
    } catch {
      /* silent */
    }
  }, [user]);

  const goHome = useCallback(() => {
    if (viewRef.current.screen !== "home") {
      // Pop back to the home entry already in the stack.
      // The popstate handler will call setView + refreshArcs + refreshActiveJobs.
      history.back();
    } else {
      // Already home (e.g. called programmatically after auth) — just refresh.
      refreshArcs();
      refreshActiveJobs();
    }
  }, [refreshArcs, refreshActiveJobs]);

  // ── Deep-link handling on mount ───────────────────────────────────────────
  useEffect(() => {
    const path = window.location.pathname;
    const initialView = resolveView(path);
    if (initialView.screen !== "home") {
      history.replaceState({ screen: "home" } satisfies AppView, "", "/");
      history.pushState(initialView, "", path);
    } else {
      history.replaceState(initialView, "", "/");
    }
    setView(initialView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      const nextView: AppView =
        e.state ?? resolveView(window.location.pathname);
      setView(nextView);
      if (nextView.screen === "home") refreshArcs();
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [refreshArcs]);

  // ── Active jobs fetch + live polling ────────────────────────────────────
  useEffect(() => {
    if (authLoading || !user || view.screen !== "home") {
      if (!user) setActiveJobs([]);
      return;
    }
    refreshActiveJobs();
  }, [user, authLoading, view.screen, refreshActiveJobs]);

  useEffect(() => {
    if (view.screen !== "home" || !user || activeJobs.length === 0) return;
    const id = setInterval(refreshActiveJobs, 3000);
    return () => clearInterval(id);
  }, [view.screen, user, activeJobs.length, refreshActiveJobs]);

  // ── Refresh arcs when a job completes ────────────────────────────────────
  const prevJobCountRef = useRef(activeJobs.length);
  useEffect(() => {
    if (activeJobs.length < prevJobCountRef.current) refreshArcs();
    prevJobCountRef.current = activeJobs.length;
  }, [activeJobs.length, refreshArcs]);

  // ── Arc fetch (only when logged in) ──────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setArcs([]);
      setLoadingArcs(false);
      return;
    }
    const ctrl = new AbortController();
    setLoadingArcs(true);
    fetchArcs(ctrl.signal)
      .then(setArcs)
      .catch((err) => {
        if (!ctrl.signal.aborted) showToast("Failed to load story arcs");
        console.error(err);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoadingArcs(false);
      });
    return () => ctrl.abort();
  }, [user, authLoading, showToast]);

  // ── Open auth ─────────────────────────────────────────────────────────────
  const openAuth = useCallback(() => {
    navigate({ screen: "auth" }, "/auth");
  }, [navigate]);

  // ── Prompt submit ─────────────────────────────────────────────────────────
  const handlePromptSubmit = useCallback(
    async (value: string) => {
      if (!user) {
        setPending(value);
        openAuth();
        return;
      }
      try {
        const { job_id } = await sendPrompt(value);
        navigate({ screen: "processing", jobId: job_id }, `/process/${job_id}`);
      } catch {
        showToast("Something went wrong. Please try again.");
      }
    },
    [user, navigate, showToast, openAuth],
  );

  // ── Auth success ──────────────────────────────────────────────────────────
  const handleAuthSuccess = useCallback(
    (redirect?: AppView) => {
      if (redirect) {
        navigate(
          redirect,
          redirect.screen === "processing"
            ? `/process/${(redirect as { screen: "processing"; jobId: string }).jobId}`
            : "/",
        );
      } else if (pendingPrompt) {
        const p = pendingPrompt;
        setPending(null);
        goHome();
        // Submit after navigation completes
        handlePromptSubmit(p);
      } else {
        goHome();
      }
    },
    [pendingPrompt, navigate, goHome, handlePromptSubmit],
  );

  // ── Other handlers ────────────────────────────────────────────────────────
  const handleProcessingComplete = useCallback(
    (htmlUrl: string, jobId: string) => {
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
    (jobId: string) => {
      navigate({ screen: "result", jobId }, `/arc/${jobId}`);
    },
    [navigate],
  );

  const handleStoryClick = useCallback((id: string) => {
    setOpenStory(STORIES.find((s) => s.id === id) ?? null);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Toast toast={toast} onDismiss={dismissToast} />

      {openStory && (
        <StoryViewer story={openStory} onClose={() => setOpenStory(null)} />
      )}

      {(view.screen === "auth" || pendingLinkSignIn) && (
        <AuthPage
          redirectAfter={view.screen === "auth" ? view.redirectAfter : undefined}
          onSuccess={handleAuthSuccess}
          onBack={pendingLinkSignIn && view.screen !== "auth" ? () => {} : goHome}
        />
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
          onRegenerate={(newJobId) =>
            navigate(
              { screen: "processing", jobId: newJobId },
              `/process/${newJobId}`,
              true,
            )
          }
          onDeleted={() => {
            refreshArcs();
            goHome();
          }}
        />
      )}

      {view.screen === "shared" && (
        <SharedArcScreen
          shareToken={view.shareToken}
          onBack={goHome}
          onSignIn={openAuth}
          onOwnArc={(arcId) =>
            navigate({ screen: "result", jobId: arcId }, `/arc/${arcId}`, true)
          }
        />
      )}

      {view.screen === "home" && (
        <>
          <SideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

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
              style={{
                height: "env(safe-area-inset-top, 0px)",
                background: "#fff",
              }}
            />

            <Header
              onMenuClick={() => setMenuOpen(true)}
              onProfileClick={openAuth}
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
              <div
                style={{
                  paddingBottom: "calc(80px + env(safe-area-inset-bottom,0px))",
                }}
              >
                <StoriesRow stories={STORIES} onStoryClick={handleStoryClick} />
                <InProgressSection
                  jobs={activeJobs}
                  onJobClick={(jobId) =>
                    navigate(
                      { screen: "processing", jobId },
                      `/process/${jobId}`,
                    )
                  }
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
                  onSignInClick={openAuth}
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
              <PromptBar
                chips={PROMPT_CHIPS}
                onSubmit={handlePromptSubmit}
                onAuthRequired={openAuth}
                showToast={showToast}
              />
            </div>
          </div>

          <style>{`@keyframes homeEnter{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
        </>
      )}
    </>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
