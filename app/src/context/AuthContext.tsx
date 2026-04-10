import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  isSignInWithEmailLink,
  signOut,
  type ActionCodeSettings,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { fetchMe } from "@/apis";
import { emailStore } from "@/utils/tokenStore";
import type { User } from "@/types";

// Captured at module load time — before App.tsx's deep-link handler can call
// history.replaceState and strip the Firebase query params from the URL.
const _initialHref = window.location.href;

export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  /** True when the current URL is a Firebase sign-in link but the email is
   *  unknown (cross-device scenario). Show an email-confirmation prompt. */
  pendingLinkSignIn: boolean;
  sendMagicLink: (email: string) => Promise<void>;
  /** Complete a cross-device magic-link sign-in by providing the email. */
  completeLinkSignIn: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  forceLogout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function getActionCodeSettings(): ActionCodeSettings {
  return {
    // Firebase redirects here after the user clicks the magic link.
    // Must be an authorised domain in Firebase Console → Auth → Settings.
    url: import.meta.env.VITE_APP_BASE_URL ?? window.location.origin,
    handleCodeInApp: true,
  };
}

function cleanSignInUrl(): void {
  try {
    const url = new URL(window.location.href);
    // Firebase appends these query params to the magic-link redirect URL.
    url.searchParams.delete("apiKey");
    url.searchParams.delete("oobCode");
    url.searchParams.delete("mode");
    url.searchParams.delete("lang");
    url.searchParams.delete("continueUrl");
    window.history.replaceState({}, document.title, url.toString());
  } catch {
    // Non-critical — ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingLinkSignIn, setPendingLinkSignIn] = useState(false);

  // True while signInWithEmailLink is in flight — suppresses the intermediate
  // onAuthStateChanged(null) that would otherwise flash the logged-out UI.
  const isCompletingSignInRef = useRef(
    isSignInWithEmailLink(auth, _initialHref) && !!emailStore.get(),
  );

  // ── Detect & complete magic-link sign-in on page load ──────────────────────
  useEffect(() => {
    if (!isSignInWithEmailLink(auth, _initialHref)) return;

    const savedEmail = emailStore.get();
    if (!savedEmail) {
      // Cross-device: email is not in localStorage — ask the user for it.
      setIsLoading(false);
      setPendingLinkSignIn(true);
      return;
    }

    signInWithEmailLink(auth, savedEmail, _initialHref)
      .then(() => {
        emailStore.clear();
        cleanSignInUrl();
      })
      .catch((err: unknown) => {
        console.error("[Auth] Magic link completion failed:", err);
        emailStore.clear();
        isCompletingSignInRef.current = false;
        // onAuthStateChanged(null) will now be allowed through
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Firebase auth state listener ───────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: FirebaseUser | null) => {
        if (!firebaseUser) {
          // Suppress the transient null that fires before signInWithEmailLink
          // resolves — without this the UI flashes to logged-out state.
          if (isCompletingSignInRef.current) return;
          setUser(null);
          setIsLoading(false);
          return;
        }

        isCompletingSignInRef.current = false;

        try {
          // Sync user record with our backend (creates user on first sign-in)
          const me = await fetchMe();
          setUser(me);
        } catch {
          // Backend unreachable or error — fall back to Firebase claims
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email ?? "",
            is_active: true,
            created_at: new Date().toISOString(),
          });
        } finally {
          setIsLoading(false);
        }
      },
    );
    return unsubscribe;
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────

  const sendMagicLink = useCallback(async (email: string): Promise<void> => {
    await sendSignInLinkToEmail(auth, email, getActionCodeSettings());
    emailStore.save(email); // saved for auto-completion on same device
  }, []);

  const completeLinkSignIn = useCallback(
    async (email: string): Promise<void> => {
      setIsLoading(true);
      try {
        await signInWithEmailLink(auth, email, _initialHref);
        emailStore.clear();
        setPendingLinkSignIn(false);
        cleanSignInUrl();
        // onAuthStateChanged will fire and set user + isLoading = false
      } catch (err: unknown) {
        setIsLoading(false);
        throw err; // re-throw so the UI can show an error
      }
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    await signOut(auth);
    emailStore.clear();
    setUser(null);
  }, []);

  const forceLogout = useCallback((): void => {
    signOut(auth).catch(() => {});
    emailStore.clear();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      pendingLinkSignIn,
      sendMagicLink,
      completeLinkSignIn,
      logout,
      forceLogout,
    }),
    [
      user,
      isLoading,
      pendingLinkSignIn,
      sendMagicLink,
      completeLinkSignIn,
      logout,
      forceLogout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
