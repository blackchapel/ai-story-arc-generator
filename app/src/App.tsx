import { useCallback, useEffect, useRef } from "react";
import { Outlet, useNavigate } from "react-router";

import { useAuthStore } from "@/store/authStore";
import { useArcStore } from "@/store/arcStore";
import { useAuthInit } from "@/hooks/useAuthInit";
import { useToast } from "@/hooks/useToast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Toast } from "@/components/Toast";
import { ToastContext } from "@/context/ToastContext";

// ── RootLayout ────────────────────────────────────────────────────────────────
// Wraps all routes. Responsibilities:
//   • Boot Firebase auth listener via useAuthInit
//   • Sync arc store with auth state (load/clear arcs when user changes)
//   • Session-expiry toast
//   • Foreground push-notification → navigate to arc
//   • Render global Toast overlay
//   • Provide ToastContext to all child routes via Outlet

export default function RootLayout() {
  useAuthInit();

  const navigate = useNavigate();
  const { toast, showToast, dismissToast } = useToast();

  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.isLoading);
  const pendingLinkSignIn = useAuthStore((s) => s.pendingLinkSignIn);

  const { loadArcs, clearArcs } = useArcStore.getState();

  // ── Open auth overlay on home when cross-device magic-link is detected ────
  useEffect(() => {
    if (pendingLinkSignIn) navigate("/", { state: { openAuth: true }, replace: true });
  }, [pendingLinkSignIn, navigate]);

  // ── Load / clear arcs when auth state settles ─────────────────────────────
  const prevUserRef = useRef(user);
  useEffect(() => {
    if (authLoading) return;

    const prevUser = prevUserRef.current;
    prevUserRef.current = user;

    if (!user) {
      clearArcs();
      // Show session-expiry toast only when transitioning from logged-in
      if (prevUser !== null) {
        showToast("Your session expired. Please log in again.");
      }
      return;
    }

    const ctrl = new AbortController();
    loadArcs(ctrl.signal).catch(() => {
      if (!ctrl.signal.aborted) showToast("Failed to load story arcs");
    });
    return () => ctrl.abort();
  }, [user, authLoading, loadArcs, clearArcs, showToast]);

  // ── Background notification click → navigate via SW message ─────────────
  useEffect(() => {
    if (!navigator.serviceWorker) return;
    const handler = (event: MessageEvent<{ type: string; url: string }>) => {
      if (event.data?.type !== "SW_NAVIGATE") return;
      try {
        const path = new URL(event.data.url).pathname;
        navigate(path);
      } catch {}
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [navigate]);

  // ── Foreground push notifications ─────────────────────────────────────────
  const { onForegroundMessage } = usePushNotifications();
  const handleForegroundMessage = useCallback(
    (jobId: string) => {
      showToast("Your arc is ready!", "success");
      setTimeout(() => {
        // App is open → there is history → back button can use -1
        navigate(`/arc/${jobId}`, { state: { from: "home" } });
      }, 800);
    },
    [navigate, showToast],
  );

  useEffect(() => {
    return onForegroundMessage(handleForegroundMessage);
  }, [onForegroundMessage, handleForegroundMessage]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      <Toast toast={toast} onDismiss={dismissToast} />
      <Outlet />
    </ToastContext.Provider>
  );
}
