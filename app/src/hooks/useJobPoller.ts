import { useState, useEffect, useRef, useCallback } from "react";
import { fetchStatus, fetchOutput } from "@/apis";
import type { JobStatus } from "@/types/job";

export type PollerState =
  | { phase: "polling"; status: JobStatus }
  | { phase: "done"; htmlContent: string }
  | { phase: "error"; message: string };

const POLL_INTERVAL_MS = 2_000; // 2 s between polls
const MAX_POLL_ATTEMPTS = 150; // 5 min ceiling at 2 s cadence

export function useJobPoller(jobId: string) {
  const [state, setState] = useState<PollerState>({
    phase: "polling",
    status: "FETCHING_ARTICLES",
  });

  // Allow caller to request an abort (e.g. user navigates away)
  const abortRef = useRef(false);
  const attemptsRef = useRef(0);

  const stop = useCallback(() => {
    abortRef.current = true;
  }, []);

  useEffect(() => {
    if (!jobId) return;
    abortRef.current = false;
    attemptsRef.current = 0;

    let timeoutId: ReturnType<typeof setTimeout>;

    async function poll() {
      if (abortRef.current) return;

      if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
        setState({
          phase: "error",
          message: "Timed out waiting for your arc.",
        });
        return;
      }

      try {
        const { status } = await fetchStatus(jobId);

        if (abortRef.current) return;

        if (status === "FAILED") {
          setState({
            phase: "error",
            message: "Something went wrong generating your arc.",
          });
          return;
        }

        if (status === "COMPLETED") {
          const html = await fetchOutput(jobId);
          if (abortRef.current) return;
          setState({ phase: "done", htmlContent: html });
          return;
        }

        // Still in progress — update displayed status and keep polling
        setState({ phase: "polling", status });
        attemptsRef.current += 1;
        timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (abortRef.current) return;
        // Retry on network hiccup — don't surface transient errors
        attemptsRef.current += 1;
        timeoutId = setTimeout(poll, POLL_INTERVAL_MS * 2);
      }
    }

    poll();

    return () => {
      abortRef.current = true;
      clearTimeout(timeoutId);
    };
  }, [jobId]);

  return { state, stop };
}
