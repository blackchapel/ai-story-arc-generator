import { createContext, useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { sendOtp, verifyOtp, logoutUser, fetchMe } from "@/apis";
import { tokenStore, registerForceLogout } from "@/utils/tokenStore";
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  forceLogout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from localStorage — no network call on mount
  useEffect(() => {
    const storedUser  = tokenStore.getUser();
    const storedToken = tokenStore.getAccessToken();
    if (storedUser && storedToken) setUser(storedUser);
    setIsLoading(false);
  }, []);

  const forceLogout = useCallback((): void => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    registerForceLogout(forceLogout);
  }, [forceLogout]);

  const handleSendOtp = useCallback(async (email: string): Promise<void> => {
    await sendOtp(email);
  }, []);

  const handleVerifyOtp = useCallback(async (email: string, code: string): Promise<void> => {
    const data = await verifyOtp(email, code);
    tokenStore.setTokens(data.access_token, data.refresh_token);
    const me = await fetchMe();
    tokenStore.setUser(me);
    setUser(me);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    const rt = tokenStore.getRefreshToken();
    if (rt) logoutUser(rt).catch(() => {});
    tokenStore.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, sendOtp: handleSendOtp, verifyOtp: handleVerifyOtp, logout, forceLogout }}>
      {children}
    </AuthContext.Provider>
  );
}
