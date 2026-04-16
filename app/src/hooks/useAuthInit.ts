/**
 * Wires Firebase auth listeners to the Zustand authStore.
 * Must be called exactly once, at the top of the component tree (RootLayout).
 */
import { useEffect, useRef } from "react";
import {
  onAuthStateChanged,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";
import type { User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { fetchMe } from "@/apis";
import { emailStore } from "@/utils/tokenStore";
import {
  useAuthStore,
  initialHref,
  cleanSignInUrl,
} from "@/store/authStore";

export function useAuthInit(): void {
  // True while signInWithEmailLink is in-flight — suppresses the intermediate
  // onAuthStateChanged(null) that would otherwise flash the logged-out UI.
  const isCompletingSignInRef = useRef(
    isSignInWithEmailLink(auth, initialHref) && !!emailStore.get(),
  );

  const { _setUser, _setLoading, _setPendingLinkSignIn } = useAuthStore.getState();

  useEffect(() => {
    // ── Detect & auto-complete same-device magic-link sign-in ─────────────────
    if (!isSignInWithEmailLink(auth, initialHref)) return;

    const savedEmail = emailStore.get();
    if (!savedEmail) {
      // Cross-device: email unknown — show confirmation UI
      _setLoading(false);
      _setPendingLinkSignIn(true);
      return;
    }

    signInWithEmailLink(auth, savedEmail, initialHref)
      .then(() => {
        emailStore.clear();
        cleanSignInUrl();
      })
      .catch((err: unknown) => {
        console.error("[Auth] Magic link completion failed:", err);
        emailStore.clear();
        isCompletingSignInRef.current = false;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // ── Firebase auth state listener ──────────────────────────────────────────
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: FirebaseUser | null) => {
        if (!firebaseUser) {
          if (isCompletingSignInRef.current) return;
          _setUser(null);
          _setLoading(false);
          return;
        }

        isCompletingSignInRef.current = false;

        try {
          const me = await fetchMe();
          _setUser(me);
        } catch {
          _setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email ?? "",
            is_active: true,
            created_at: new Date().toISOString(),
          });
        } finally {
          _setLoading(false);
        }
      },
    );
    return unsubscribe;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
