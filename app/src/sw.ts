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

const messaging = getMessaging(firebaseApp);

// Show our own notification so we control the data.url for notificationclick.
// This suppresses Firebase's auto-show when a notification payload is present.
onBackgroundMessage(messaging, async (payload) => {
  const link = payload.fcmOptions?.link || payload.data?.link;
  const notificationTitle = payload.notification?.title || "arc.";
  const notificationOptions = {
    body:
      payload.notification?.body || "Your story arc has finished generating.",
    icon: "/pwa-192x192.png",
    data: { url: link },
  };

  return self.registration.showNotification(
    notificationTitle,
    notificationOptions,
  );
});

// ── Notification Click Logic ──────────────────────────────────────────────────
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const url = event.notification.data.url;
        if (!url) return;

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
});
