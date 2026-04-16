import { createBrowserRouter, Navigate } from "react-router";
import { useAuthStore } from "@/store/authStore";

import RootLayout from "@/App";
import HomePage from "@/pages/HomePage";
import { AuthPage } from "@/components/AuthPage";
import { ProcessingScreen } from "@/components/ProcessingScreen";
import { ResultScreen } from "@/components/ResultScreen";
import { SharedArcScreen } from "@/components/SharedArcScreen";

// ── ProtectedRoute ─────────────────────────────────────────────────────────────
// Renders children once auth has settled. Redirects to /auth while loading.
// Keeps a loading skeleton while Firebase resolves instead of flashing a redirect.

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  // While Firebase is hydrating from IndexedDB, show nothing —
  // the skeleton states in each child component handle this.
  if (isLoading) return null;

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

// ── Router ─────────────────────────────────────────────────────────────────────

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      // Public routes
      { index: true, Component: HomePage },
      { path: "auth", Component: AuthPage },
      { path: "shared/:shareToken", Component: SharedArcScreen },

      // Protected routes — require authentication
      {
        path: "process/:jobId",
        element: (
          <ProtectedRoute>
            <ProcessingScreen />
          </ProtectedRoute>
        ),
      },
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
