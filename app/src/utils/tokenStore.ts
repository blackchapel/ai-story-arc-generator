// Stores the email used to initiate a magic-link sign-in.
// Firebase requires the same email when completing the sign-in from the link.
const EMAIL_FOR_SIGNIN_KEY = "arc_email_for_signin";

export const emailStore = {
  save: (email: string): void =>
    localStorage.setItem(EMAIL_FOR_SIGNIN_KEY, email),
  get: (): string | null => localStorage.getItem(EMAIL_FOR_SIGNIN_KEY),
  clear: (): void => localStorage.removeItem(EMAIL_FOR_SIGNIN_KEY),
};
