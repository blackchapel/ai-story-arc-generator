/// <reference lib="webworker" />
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

declare const self: ServiceWorkerGlobalScope;

// ── Workbox precaching ────────────────────────────────────────────────────────
// __WB_MANIFEST is replaced at build time with the list of assets to precache.
precacheAndRoute(
  (self as unknown as { __WB_MANIFEST: { url: string; revision: string | null }[] })
    .__WB_MANIFEST,
);
cleanupOutdatedCaches();

// SPA navigation fallback — serve index.html for all unmatched navigation requests
registerRoute(
  new NavigationRoute(createHandlerBoundToURL("index.html"), {
    denylist: [/^\/api\//, /^\/output\//, /\.[^/]+$/],
  }),
);

// ── Firebase Cloud Messaging — background push ────────────────────────────────
// Handles push notifications when the app is closed or in the background.
// Vite processes this file, so import.meta.env.VITE_* values are substituted.
const firebaseApp = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

const messaging = getMessaging(firebaseApp);

onBackgroundMessage(messaging, (payload) => {
  // Backend sends data-only messages (no notification field), so we always
  // show the notification ourselves — no browser auto-display, no duplicates.
  const data = payload.data as Record<string, string> | undefined;
  const jobId = data?.["job_id"];
  const arcUrl = data?.["url"] ?? "/";

  self.registration.showNotification("arc.", {
    body: "Your story arc has finished generating.",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    // tag deduplicates: only one notification per arc
    tag: `arc-ready-${jobId ?? Date.now()}`,
    // renotify is part of the Notifications spec but not yet in TS lib types
    ...(({ renotify: false } as unknown) as NotificationOptions),
    data: { url: arcUrl },
  } as NotificationOptions);
});

// ── Notification click — open or focus the app at the arc URL ─────────────────
self.addEventListener("notificationclick", (event) => {
  (event as NotificationEvent).notification.close();
  const url: string =
    ((event as NotificationEvent).notification.data as { url?: string } | null)?.url ?? "/";

  (event as ExtendableEvent).waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Focus + navigate an existing app window if one is open
        for (const client of windowClients) {
          if ("navigate" in client && "focus" in client) {
            return (client as WindowClient)
              .navigate(url)
              .then((c) => c?.focus());
          }
        }
        // No window open — launch the app
        return self.clients.openWindow(url);
      }),
  );
});
