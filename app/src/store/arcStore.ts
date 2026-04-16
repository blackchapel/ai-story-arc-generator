import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { fetchArcs, fetchActiveJobs } from "@/apis";
import type { NewsArticle, ActiveJob } from "@/types";

interface ArcState {
  arcs: NewsArticle[];
  activeJobs: ActiveJob[];
  loadingArcs: boolean;

  // Called by RootLayout when auth resolves and on route transitions
  loadArcs: (signal?: AbortSignal) => Promise<void>;
  refreshArcs: () => Promise<void>;
  refreshActiveJobs: () => Promise<void>;

  // Called on logout / user becomes null
  clearArcs: () => void;
}

export const useArcStore = create<ArcState>()(
  devtools(
    (set) => ({
      arcs: [],
      activeJobs: [],
      loadingArcs: true,

      loadArcs: async (signal?: AbortSignal) => {
        set({ loadingArcs: true });
        try {
          const arcs = await fetchArcs(signal);
          if (!signal?.aborted) set({ arcs, loadingArcs: false });
        } catch (err) {
          if (!signal?.aborted) {
            console.error("[arcStore] Failed to load arcs", err);
            set({ loadingArcs: false });
          }
        }
      },

      refreshArcs: async () => {
        try {
          const arcs = await fetchArcs();
          set({ arcs });
        } catch {
          // Silent refresh — don't reset state on failure
        }
      },

      refreshActiveJobs: async () => {
        try {
          const activeJobs = await fetchActiveJobs();
          set({ activeJobs });
        } catch {
          // Silent
        }
      },

      clearArcs: () => set({ arcs: [], activeJobs: [], loadingArcs: false }),
    }),
    { name: "arc-store" },
  ),
);
