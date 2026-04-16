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
precacheAndRoute(
  (
    self as unknown as {
      __WB_MANIFEST: { url: string; revision: string | null }[];
    }
  ).__WB_MANIFEST,
);
cleanupOutdatedCaches();

registerRoute(
  new NavigationRoute(createHandlerBoundToURL("index.html"), {
    denylist: [/^\/api\//, /^\/output\//, /\.[^/]+$/],
  }),
);

// ── Firebase Cloud Messaging ──────────────────────────────────────────────────
const firebaseApp = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

const messaging = getMessaging(firebaseApp);

// Background Message Handler
// Message is data-only (no notification payload), so we always reach here
// and show the notification ourselves with data.url set for notificationclick.
onBackgroundMessage(messaging, async (payload) => {
  const data = payload.data as Record<string, string> | undefined;
  const arcUrl = data?.url ?? "/";
  const jobId = data?.job_id ?? "generic";

  return self.registration.showNotification("arc.", {
    body: "Your story arc has finished generating.",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    tag: `arc-ready-${jobId}`,
    data: { url: arcUrl },
    requireInteraction: true,
  } as NotificationOptions);
});

// ── Notification Click Logic ──────────────────────────────────────────────────
self.addEventListener("notificationclick", (event: any) => {
  event.notification.close();

  const data = event.notification.data as Record<string, string> | undefined;
  const targetUrl = data?.url ?? "/";
  const fullUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // App is already open — post a message so React Router navigates
        // without a full page reload, then bring the window to foreground.
        const existing = clientList[0] as WindowClient | undefined;
        if (existing) {
          existing.postMessage({ type: "SW_NAVIGATE", url: fullUrl });
          return existing.focus();
        }
        // App is closed — open it directly at the arc URL.
        return self.clients.openWindow(fullUrl);
      }),
  );
});
