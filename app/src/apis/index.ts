import type { NewsArticle } from "@/types";
import type { SubmitJobResponse, StatusResponse } from "@/types/job";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export { ApiError };

export function sendPrompt(prompt: string): Promise<SubmitJobResponse> {
  return apiFetch("/api/arc/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
}

export function fetchStatus(jobId: string): Promise<StatusResponse> {
  return apiFetch(`/api/arc/status/${jobId}`);
}

export function fetchOutput(jobId: string): Promise<NewsArticle> {
  return apiFetch(`/api/arc/${jobId}`);
}

export function notifyArc(jobId: string, email: string): Promise<{ message: string }> {
  return apiFetch("/api/arc/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id: jobId, email }),
  });
}

export function fetchArcs(signal?: AbortSignal): Promise<NewsArticle[]> {
  return apiFetch("/api/arc/", { signal });
}
