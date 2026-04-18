import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { devtools } from "zustand/middleware";
import { signInWithEmailLink, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { sendMagicLink as sendMagicLinkApi } from "@/apis";
import { emailStore } from "@/utils/tokenStore";
import type { User } from "@/types";

// Captured at module load — before any router/history manipulation strips params.
export const initialHref = window.location.href;

// If the page was opened via our wrapped magic link (/auth/verify?magicUrl=...),
// extract the real Firebase URL so signInWithEmailLink() gets the right URL.
// Falls back to the current href for direct Firebase links (legacy / dev).
function extractFirebaseUrl(href: string): string {
  try {
    const wrapped = new URL(href).searchParams.get("magicUrl");
    return wrapped ? decodeURIComponent(wrapped) : href;
  } catch {
    return href;
  }
}

export const initialFirebaseUrl = extractFirebaseUrl(initialHref);

export function cleanSignInUrl(): void {
  try {
    const url = new URL(window.location.href);
    // Firebase params (present when using the raw Firebase URL directly)
    url.searchParams.delete("apiKey");
    url.searchParams.delete("oobCode");
    url.searchParams.delete("mode");
    url.searchParams.delete("lang");
    url.searchParams.delete("continueUrl");
    // Our wrapper param
    url.searchParams.delete("magicUrl");
    window.history.replaceState({}, document.title, url.toString());
  } catch {
    // Non-critical
  }
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  /** True when the URL is a Firebase sign-in link but we don't have the email (cross-device). */
  pendingLinkSignIn: boolean;

  // ── Internal setters (used by useAuthInit) ──────────────────────────────────
  _setUser: (user: User | null) => void;
  _setLoading: (loading: boolean) => void;
  _setPendingLinkSignIn: (pending: boolean) => void;

  // ── Public actions ──────────────────────────────────────────────────────────
  sendMagicLink: (email: string) => Promise<void>;
  completeLinkSignIn: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  forceLogout: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      user: null,
      isLoading: true,
      pendingLinkSignIn: false,

      _setUser: (user) => set({ user }),
      _setLoading: (isLoading) => set({ isLoading }),
      _setPendingLinkSignIn: (pendingLinkSignIn) => set({ pendingLinkSignIn }),

      sendMagicLink: async (email: string) => {
        await sendMagicLinkApi(email);
        emailStore.save(email);
      },

      completeLinkSignIn: async (email: string) => {
        set({ isLoading: true });
        try {
          await signInWithEmailLink(auth, email, initialFirebaseUrl);
          emailStore.clear();
          set({ pendingLinkSignIn: false });
          cleanSignInUrl();
          // onAuthStateChanged will fire → sets user + isLoading = false
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        await signOut(auth);
        emailStore.clear();
        set({ user: null });
      },

      forceLogout: () => {
        signOut(auth).catch(() => {});
        emailStore.clear();
        set({ user: null });
      },
    }),
    { name: "auth-store" },
  ),
);

// Convenience selector hooks
export const useUser = () => useAuthStore((s) => s.user);
export const useAuthLoading = () => useAuthStore((s) => s.isLoading);
export const usePendingLinkSignIn = () =>
  useAuthStore((s) => s.pendingLinkSignIn);

// ── Legacy compatibility: replaces useAuth() from AuthContext ─────────────────
// useShallow prevents infinite re-renders — without it the object literal
// returned from the selector creates a new reference on every call.
export function useAuth() {
  return useAuthStore(
    useShallow((s) => ({
      user: s.user,
      isLoading: s.isLoading,
      pendingLinkSignIn: s.pendingLinkSignIn,
      sendMagicLink: s.sendMagicLink,
      completeLinkSignIn: s.completeLinkSignIn,
      logout: s.logout,
      forceLogout: s.forceLogout,
    })),
  );
}
