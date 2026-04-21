import { useCallback, useEffect, useState } from "react";
import { getToken, onMessage, type Messaging } from "firebase/messaging";
import { getFirebaseMessaging } from "@/lib/firebase";

export type PushPermissionState =
  | "checking" // Determining initial state
  | "unsupported" // Notification API or SW not available
  | "ios-no-pwa" // iOS Safari without PWA install — no push support
  | "default" // Not yet asked
  | "granted" // Already granted
  | "denied"; // Blocked by user

export interface ForegroundMessage {
  jobId: string;
  url: string;
}

export interface UsePushNotificationsReturn {
  permissionState: PushPermissionState;
  /** Request permission + fetch FCM token. Returns the token on success or null on failure. */
  requestAndGetToken: () => Promise<string | null>;
  /** Set up foreground message listener. Calls handler with structured message when push received while app is open. */
  onForegroundMessage: (
    handler: (msg: ForegroundMessage) => void,
  ) => () => void;
}

function detectPermissionState(): PushPermissionState {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return "unsupported";
  }
  // iOS without PWA: no push support
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  if (isIOS && !isStandalone) return "ios-no-pwa";

  const perm = Notification.permission;
  if (perm === "granted") return "granted";
  if (perm === "denied") return "denied";
  return "default";
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [permissionState, setPermissionState] =
    useState<PushPermissionState>("checking");

  useEffect(() => {
    setPermissionState(detectPermissionState());
  }, []);

  const requestAndGetToken = useCallback(async (): Promise<string | null> => {
    const current = detectPermissionState();

    if (current === "unsupported" || current === "ios-no-pwa") return null;

    if (current === "denied") {
      setPermissionState("denied");
      return null;
    }

    // Request permission if not already granted
    if (current === "default") {
      const result = await Notification.requestPermission();
      if (result !== "granted") {
        setPermissionState("denied");
        return null;
      }
      setPermissionState("granted");
    }

    try {
      const messaging = getFirebaseMessaging();
      if (!messaging) return null;

      // Use the app's own service worker registration (injectManifest strategy)
      const registration = await navigator.serviceWorker.ready;

      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY as string,
        serviceWorkerRegistration: registration,
      });

      return token || null;
    } catch (err) {
      console.error("[PushNotifications] getToken failed:", err);
      return null;
    }
  }, []);

  const onForegroundMessage = useCallback(
    (handler: (msg: ForegroundMessage) => void): (() => void) => {
      const messaging: Messaging | null = getFirebaseMessaging();
      if (!messaging) return () => {};

      const unsubscribe = onMessage(messaging, (payload) => {
        const data = payload.data as Record<string, string> | undefined;
        const jobId = data?.["job_id"] ?? "";
        const url =
          data?.["url"] ??
          (payload.fcmOptions as { link?: string } | undefined)?.link ??
          "/";

        handler({ jobId, url });
      });

      return unsubscribe;
    },
    [],
  );

  return { permissionState, requestAndGetToken, onForegroundMessage };
}
