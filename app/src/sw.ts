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

  // If the Python code sent a 'notification' object, the browser shows it automatically.
  // We return early to avoid showing a duplicate.
  if (payload.notification) return;

  // Fallback: If for some reason the notification object is missing, manually show it.
  const data = payload.data as Record<string, string> | undefined;
  const arcUrl = data?.url ?? "/";
  const jobId = data?.job_id ?? "generic";

  return self.registration.showNotification("arc.", {
    body: "Your story arc has finished generating.",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    tag: `arc-ready-${jobId}`,
    data: { url: arcUrl }, // Store the URL for the click event
    requireInteraction: true,
  } as NotificationOptions);
});

// ── Notification Click Logic ──────────────────────────────────────────────────
self.addEventListener("notificationclick", (event: any) => {
  event.notification.close();

  // 1. Try to get the URL from the data payload we sent from Python
  // 2. Fallback to fcm_options.link (if provided)
  // 3. Fallback to home page
  const url =
    event.notification.data?.url || event.notification.fcmOptions?.link || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // If an app tab is already open, navigate it to the arc and focus it
        for (const client of windowClients) {
          if (client.url === url && "focus" in client) {
            return client.focus();
          }
          if ("navigate" in client && "focus" in client) {
            return client.navigate(url).then((c: any) => c?.focus());
          }
        }
        // Otherwise, open a new window/tab
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      }),
  );
});
