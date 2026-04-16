import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { registerSW } from "virtual:pwa-register";

import "./index.css";
import { router } from "./router";

// ─── PWA Service Worker ───────────────────────────────────────────────────────
registerSW({
  onNeedRefresh() {
    console.info("[arc] New content available. Refresh to update.");
  },
  onOfflineReady() {
    console.info("[arc] App ready to work offline.");
  },
});

// ─── React root ───────────────────────────────────────────────────────────────
const container = document.getElementById("root");

if (!container) {
  throw new Error("[arc] Root element #root not found. Check your index.html.");
}

createRoot(container).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
