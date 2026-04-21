/// <reference lib="webworker" />
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging/sw";

declare const self: ServiceWorkerGlobalScope;

// ── Notification Click Logic ──────────────────────────────────────────────────
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  const data = event.notification.data || {};

  const url =
    data.FCM_MSG?.notification?.click_action ||
    data.FCM_MSG?.notification?.fcm_options?.link;

  if (!url) {
    return;
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // App is already open — post a message so React Router navigates
        // without a full page reload, then bring the window to foreground.
        for (const client of clientList) {
          if (client.url === url && "focus" in client) {
            return client.focus();
          }
        }

        // App is closed — open it directly at the arc URL.
        return self.clients.openWindow(url);
      }),
  );
  event.notification.close();
});

// ── Workbox precaching ────────────────────────────────────────────────────────
const manifest =
  (
    self as unknown as {
      __WB_MANIFEST: { url: string; revision: string | null }[];
    }
  ).__WB_MANIFEST ?? [];

precacheAndRoute(manifest);
cleanupOutdatedCaches();

// Only valid in production where index.html is actually precached.
if (manifest.length > 0) {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL("index.html"), {
      denylist: [/^\/api\//, /^\/output\//, /\.[^/]+$/],
    }),
  );
}

// ── Firebase Cloud Messaging ──────────────────────────────────────────────────
const firebaseApp = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

getMessaging(firebaseApp);
