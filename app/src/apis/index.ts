import type { NewsArticle, User, ActiveJob } from "@/types";
import type { SubmitJobResponse, StatusResponse } from "@/types/job";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

// Resolves once Firebase has restored auth state from IndexedDB (or confirmed
// the user is signed out). Prevents treating "not yet hydrated" as "logged out".
const _authReady: Promise<void> = new Promise((resolve) => {
  const unsub = onAuthStateChanged(auth, () => {
    unsub();
    resolve();
  });
});

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "";

// ── Error class ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Token helpers ─────────────────────────────────────────────────────────────

async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

// ── Core fetch ────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Wait for Firebase to restore auth from IndexedDB before sending any request.
  // Without this, a fresh tab (e.g. opened by a push notification) would race
  // the hydration and send requests with no token, then incorrectly sign out.
  await _authReady;

  const headers = new Headers(init.headers);

  const token = await getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (res.status === 401) {
    // Try a forced token refresh (Firebase SDK handles expiry internally,
    // but explicit refresh ensures we have a fresh token after a long idle).
    const user = auth.currentUser;
    if (user) {
      try {
        const freshToken = await user.getIdToken(/* forceRefresh */ true);
        const retryHeaders = new Headers(init.headers);
        retryHeaders.set("Authorization", `Bearer ${freshToken}`);
        const retryRes = await fetch(`${BASE_URL}${path}`, {
          ...init,
          headers: retryHeaders,
        });
        if (retryRes.ok) {
          if (retryRes.status === 204) return undefined as T;
          return retryRes.json() as Promise<T>;
        }
        if (retryRes.status === 401) {
          await signOut(auth);
          throw new ApiError(401, "Session expired. Please log in again.");
        }
        // Non-401 error from retry — fall through to error parser below
        const errBody = await retryRes.json().catch(() => null) as { detail?: string } | null;
        throw new ApiError(
          retryRes.status,
          errBody?.detail ?? `HTTP ${retryRes.status}`,
        );
      } catch (e) {
        if (e instanceof ApiError) throw e;
        await signOut(auth);
        throw new ApiError(401, "Session expired. Please log in again.");
      }
    }
    // auth.currentUser is null AND auth is fully hydrated — genuinely signed out.
    // Do NOT sign out here (it's a no-op and would fire unnecessary state events).
    throw new ApiError(401, "Session expired. Please log in again.");
  }

  if (!res.ok) {
    let message: string;
    try {
      const body = (await res.json()) as { detail?: string };
      message = typeof body.detail === "string" ? body.detail : `HTTP ${res.status}`;
    } catch {
      message = (await res.text().catch(() => "")) || `HTTP ${res.status}`;
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Auth API ──────────────────────────────────────────────────────────────────

export function fetchMe(): Promise<User> {
  return apiFetch<User>("/api/auth/me");
}

export function sendMagicLink(email: string): Promise<void> {
  return apiFetch<void>("/api/auth/send-magic-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

// ── Arc API ───────────────────────────────────────────────────────────────────

export function sendPrompt(prompt: string): Promise<SubmitJobResponse> {
  return apiFetch<SubmitJobResponse>("/api/arc/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
}

export function fetchStatus(jobId: string): Promise<StatusResponse> {
  return apiFetch<StatusResponse>(`/api/arc/status/${jobId}`);
}

export function fetchArcs(signal?: AbortSignal): Promise<NewsArticle[]> {
  return apiFetch<NewsArticle[]>("/api/arc/", { signal });
}

export function fetchOutput(jobId: string): Promise<NewsArticle> {
  return apiFetch<NewsArticle>(`/api/arc/${jobId}`);
}

export function toggleShare(arcId: string): Promise<{ is_shared: boolean; share_token: string | null }> {
  return apiFetch(`/api/arc/${arcId}/share`, { method: "PATCH" });
}

export function fetchSharedArc(shareToken: string): Promise<NewsArticle> {
  return apiFetch<NewsArticle>(`/api/arc/shared/${shareToken}`);
}

export function saveSharedArc(shareToken: string): Promise<{ message: string; arc_id: string }> {
  return apiFetch(`/api/arc/shared/${shareToken}/save`, { method: "POST" });
}

export function notifyArc(
  jobId: string,
  fcmToken: string,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/api/arc/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id: jobId, fcm_token: fcmToken }),
  });
}

export function fetchActiveJobs(): Promise<ActiveJob[]> {
  return apiFetch<ActiveJob[]>("/api/arc/jobs/active");
}

export function regenerateArc(arcId: string, replace = false): Promise<{ job_id: string }> {
  return apiFetch<{ job_id: string }>(`/api/arc/${arcId}/regenerate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ replace }),
  });
}

export function deleteArc(arcId: string): Promise<void> {
  return apiFetch<void>(`/api/arc/${arcId}`, { method: "DELETE" });
}

export function deleteAccount(): Promise<void> {
  return apiFetch<void>("/api/auth/me", { method: "DELETE" });
}
