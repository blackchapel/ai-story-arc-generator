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
onBackgroundMessage(messaging, async (payload) => {
  console.log("[sw] Background message received:", payload);

  if (payload.notification) return;

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

  console.log("[sw] Notification clicked. Data:", event.notification.data);

  const targetUrl =
    event.notification.data?.url || event.notification.fcmOptions?.link || "/";

  const fullUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === fullUrl && "focus" in client) {
            return client.focus();
          }
          if ("navigate" in client && "focus" in client) {
            return client.navigate(fullUrl).then((c: any) => c?.focus());
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(fullUrl);
        }
      }),
  );
});
