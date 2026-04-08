import type { NewsArticle, User, ActiveJob } from "@/types";
import type { SubmitJobResponse, StatusResponse } from "@/types/job";
import { tokenStore, triggerForceLogout } from "@/utils/tokenStore";

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

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

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// ── Refresh queue ─────────────────────────────────────────────────────────────

let _isRefreshing = false;
type QItem = { resolve: (t: string) => void; reject: (e: unknown) => void };
let _queue: QItem[] = [];

function _flushQueue(token: string | null, err: unknown = null) {
  _queue.forEach((item) => (token ? item.resolve(token) : item.reject(err)));
  _queue = [];
}

// ── Core fetch ────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isAuthPath = path.startsWith("/api/auth/");
  const headers = new Headers(init.headers);

  const accessToken = tokenStore.getAccessToken();
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    if (res.status === 401 && !isAuthPath) {
      const refreshToken = tokenStore.getRefreshToken();
      if (!refreshToken) {
        tokenStore.clear();
        triggerForceLogout();
        throw new ApiError(401, "Session expired. Please log in again.");
      }

      if (_isRefreshing) {
        return new Promise<T>((resolve, reject) => {
          _queue.push({
            resolve: (newToken) => {
              const rh = new Headers(init.headers);
              rh.set("Authorization", `Bearer ${newToken}`);
              resolve(apiFetch<T>(path, { ...init, headers: rh }));
            },
            reject,
          });
        });
      }

      _isRefreshing = true;
      try {
        const rRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!rRes.ok) throw new Error("refresh_failed");
        const data = (await rRes.json()) as TokenResponse;
        tokenStore.setTokens(data.access_token, data.refresh_token);
        _flushQueue(data.access_token);
        _isRefreshing = false;
        const rh = new Headers(init.headers);
        rh.set("Authorization", `Bearer ${data.access_token}`);
        return apiFetch<T>(path, { ...init, headers: rh });
      } catch (e) {
        _flushQueue(null, e);
        _isRefreshing = false;
        tokenStore.clear();
        triggerForceLogout();
        throw new ApiError(401, "Session expired. Please log in again.");
      }
    }

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

export function sendOtp(email: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/api/auth/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export function verifyOtp(email: string, code: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/api/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
}

export function logoutUser(refresh_token: string): Promise<void> {
  return apiFetch<void>("/api/auth/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token }),
  });
}

export function fetchMe(): Promise<User> {
  return apiFetch<User>("/api/auth/me");
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

export function notifyArc(jobId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/api/arc/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id: jobId }),
  });
}

export function fetchActiveJobs(): Promise<ActiveJob[]> {
  return apiFetch<ActiveJob[]>("/api/arc/jobs/active");
}
