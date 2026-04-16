// ─── Job API ──────────────────────────────────────────────────────────────────

export type JobStatus =
  | "FETCHING_ARTICLES"
  | "ANALYZING_DATA"
  | "GENERATING_IMAGES"
  | "ASSEMBLING"
  | "COMPLETED"
  | "FAILED";

export interface SubmitJobResponse {
  job_id: string;
}

export interface StatusResponse {
  job_id: string;
  status: JobStatus;
  message?: string;
}

