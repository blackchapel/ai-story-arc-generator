import { useState, useEffect, useRef, useCallback } from "react";
import { fetchOutput } from "@/apis";
import type { JobStatus } from "@/types/job";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export type PollerState =
  | { phase: "polling"; status: JobStatus }
  | { phase: "done"; htmlContent: string }
  | { phase: "error"; message: string };

export function useJobPoller(jobId: string) {
  const [state, setState] = useState<PollerState>({
    phase: "polling",
    status: "FETCHING_ARTICLES",
  });

  const stoppedRef = useRef(false);

  const stop = useCallback(() => {
    stoppedRef.current = true;
  }, []);

  useEffect(() => {
    if (!jobId) return;
    stoppedRef.current = false;

    const es = new EventSource(`${BASE_URL}/api/arc/stream/${jobId}`);

    es.onmessage = async (event: MessageEvent) => {
      if (stoppedRef.current) {
        es.close();
        return;
      }

      let status: JobStatus;
      try {
        ({ status } = JSON.parse(event.data) as { status: JobStatus });
      } catch {
        return;
      }

      if (status === "FAILED") {
        es.close();
        setState({ phase: "error", message: "Something went wrong generating your arc." });
        return;
      }

      if (status === "COMPLETED") {
        es.close();
        try {
          const res = await fetchOutput(jobId);
          if (!stoppedRef.current && res.html) {
            setState({ phase: "done", htmlContent: res.html });
          }
        } catch {
          if (!stoppedRef.current) {
            setState({ phase: "error", message: "Failed to load your arc." });
          }
        }
        return;
      }

      setState({ phase: "polling", status });
    };

    es.onerror = () => {
      if (stoppedRef.current) return;
      es.close();
      setState({ phase: "error", message: "Lost connection to server. Please try again." });
    };

    return () => {
      stoppedRef.current = true;
      es.close();
    };
  }, [jobId]);

  return { state, stop };
}
