const ACCESS_KEY  = "arc_access_token";
const REFRESH_KEY = "arc_refresh_token";
const USER_KEY    = "arc_user";

export interface StoredUser {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export const tokenStore = {
  getAccessToken:  (): string | null => localStorage.getItem(ACCESS_KEY),
  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_KEY),

  setTokens: (access: string, refresh: string): void => {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },

  getUser: (): StoredUser | null => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) ?? "null") as StoredUser | null;
    } catch {
      return null;
    }
  },

  setUser: (user: StoredUser): void => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clear: (): void => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

// Callback so apiFetch can signal React to clear auth state when refresh fails
let _forceLogoutFn: (() => void) | null = null;
export const registerForceLogout = (fn: () => void): void => { _forceLogoutFn = fn; };
export const triggerForceLogout  = (): void => _forceLogoutFn?.();
