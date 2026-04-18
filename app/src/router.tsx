import { createBrowserRouter, Navigate } from "react-router";
import { useAuthStore } from "@/store/authStore";

import RootLayout from "@/App";
import HomePage from "@/pages/HomePage";
import { ResultScreen } from "@/components/ResultScreen";
import { SharedArcScreen } from "@/components/SharedArcScreen";

// ── ProtectedRoute ─────────────────────────────────────────────────────────────
// Redirects unauthenticated users to home (/ handles auth via overlay).

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user      = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) return null;
  if (!user)     return <Navigate to="/" replace />;

  return <>{children}</>;
}

// ── Router ─────────────────────────────────────────────────────────────────────
// Three routes only: home, arc result, shared arc.

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: HomePage },
      // Magic-link landing: initialFirebaseUrl is captured at module load before
      // this redirect fires, so useAuthInit still has the Firebase URL to complete sign-in.
      { path: "auth/verify", element: <Navigate to="/" replace /> },
      { path: "shared/:shareToken", Component: SharedArcScreen },
      {
        path: "arc/:jobId",
        element: (
          <ProtectedRoute>
            <ResultScreen />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
