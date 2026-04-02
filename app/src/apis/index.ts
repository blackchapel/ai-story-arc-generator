import { NewsArticle } from "@/types";
import type { SubmitJobResponse, StatusResponse } from "@/types/job";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ─── Send prompt → get job_id ─────────────────────────────────────────────────

export async function sendPrompt(prompt: string): Promise<SubmitJobResponse> {
  const res = await fetch(`${BASE_URL}/api/arc/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: prompt }),
  });
  if (!res.ok) throw new Error(`sendPrompt failed: ${res.status}`);
  return res.json() as Promise<SubmitJobResponse>;
}

// ─── Poll status for a job ────────────────────────────────────────────────────

export async function fetchStatus(jobId: string): Promise<StatusResponse> {
  const res = await fetch(`${BASE_URL}/api/arc/status/${jobId}`);
  if (!res.ok) throw new Error(`fetchStatus failed: ${res.status}`);
  return res.json() as Promise<StatusResponse>;
}

// ─── Fetch the final rendered HTML output ─────────────────────────────────────

export async function fetchOutput(jobId: string): Promise<NewsArticle> {
  const res = await fetch(`${BASE_URL}/api/arc/${jobId}`);
  if (!res.ok) throw new Error(`fetchOutput failed: ${res.status}`);
  return res.json();
}

// ─── Register email notification for a job ───────────────────────────────────

export async function notifyArc(jobId: string, email: string): Promise<{ message: string }> {
  const res = await fetch(`${BASE_URL}/api/arc/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id: jobId, email }),
  });
  if (!res.ok) throw new Error(`notifyArc failed: ${res.status}`);
  return res.json();
}

// ─── Fetch generated arcs ────────────────────────────────────────────────────

export async function fetchArcs(signal?: AbortSignal): Promise<NewsArticle[]> {
  const res = await fetch(`${BASE_URL}/api/arc/`, { signal });
  if (!res.ok) throw new Error(`fetchArcs failed: ${res.status}`);
  return res.json() as Promise<NewsArticle[]>;
}
