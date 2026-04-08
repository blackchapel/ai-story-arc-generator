import { memo, useEffect, useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/apis";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "login" | "register";
  onSuccess?: () => void;
}

type Tab = "login" | "register";

// ── Schemas ───────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  username: z.string()
    .min(3, "3–50 chars, letters/digits/underscores only")
    .max(50, "3–50 chars, letters/digits/underscores only")
    .regex(/^[a-zA-Z0-9_]+$/, "3–50 chars, letters/digits/underscores only"),
  password: z.string()
    .min(8, "Needs: 8+ characters")
    .regex(/[A-Z]/, "Needs: uppercase")
    .regex(/[a-z]/, "Needs: lowercase")
    .regex(/\d/, "Needs: digit")
    .regex(/[^a-zA-Z0-9]/, "Needs: special character"),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Passwords do not match",
  path: ["confirm"],
});

type LoginFields    = z.infer<typeof loginSchema>;
type RegisterFields = z.infer<typeof registerSchema>;

// ── Icons ─────────────────────────────────────────────────────────────────────

const EyeOn = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M1.5 9C1.5 9 4 3.75 9 3.75S16.5 9 16.5 9 14 14.25 9 14.25 1.5 9 1.5 9Z" stroke="#8C8C8C" strokeWidth="1.4" strokeLinejoin="round"/>
    <circle cx="9" cy="9" r="2.25" stroke="#8C8C8C" strokeWidth="1.4"/>
  </svg>
);
const EyeOff = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M2.25 2.25L15.75 15.75" stroke="#8C8C8C" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M7.77 4.02A7.9 7.9 0 0 1 9 3.75c5 0 7.5 5.25 7.5 5.25a13.2 13.2 0 0 1-1.97 2.73M10.6 13.56A7.7 7.7 0 0 1 9 14.25c-5 0-7.5-5.25-7.5-5.25A13.1 13.1 0 0 1 4.44 5.7" stroke="#8C8C8C" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M6.88 6.88a2.25 2.25 0 0 0 3.18 3.18" stroke="#8C8C8C" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);
const Spinner = () => (
  <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.35)" strokeWidth="2"/>
    <path d="M8 2a6 6 0 0 1 6 6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// ── Component ─────────────────────────────────────────────────────────────────

export const AuthModal = memo<AuthModalProps>(({ isOpen, onClose, initialTab = "login", onSuccess }) => {
  const { sendOtp, verifyOtp } = useAuth();
  const kbOffset = useKeyboardOffset();

  const [tab, setTab]         = useState<Tab>(initialTab);
  const [showPw, setShowPw]   = useState(false);
  const [showCfm, setShowCfm] = useState(false);
  const [closing, setClosing] = useState(false);
  const [globalErr, setGlobalErr] = useState<string | null>(null);

  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef  = useRef<HTMLInputElement>(null);

  // ── Forms ──────────────────────────────────────────────────────────────────

  const loginForm = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm<RegisterFields>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", password: "", confirm: "" },
  });

  const activeForm = tab === "login" ? loginForm : registerForm;

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  const dismiss = useCallback(() => setClosing(true), []);

  const handleAnimationEnd = useCallback((e: React.AnimationEvent) => {
    if (closing && e.animationName === "sheetDown") {
      setClosing(false);
      onClose();
    }
  }, [closing, onClose]);

  useEffect(() => {
    if (isOpen) {
      setClosing(false);
      setTab(initialTab);
      setShowPw(false); setShowCfm(false);
      setGlobalErr(null);
      loginForm.reset();
      registerForm.reset();
    }
  }, [isOpen, initialTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchTab = useCallback((t: Tab) => {
    if (t === tab) return;
    setTab(t);
    setShowPw(false); setShowCfm(false);
    setGlobalErr(null);
    loginForm.reset();
    registerForm.reset();
  }, [tab, loginForm, registerForm]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [isOpen, dismiss]);

  // ── Submit handlers ────────────────────────────────────────────────────────

  const onLoginSubmit = loginForm.handleSubmit(async (data) => {
    setGlobalErr(null);
    try {
      await sendOtp(data.username);
      onSuccess?.();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        const { status, message } = err;
        if      (status === 429) setGlobalErr("Too many attempts. Please wait a minute.");
        else if (status === 403) setGlobalErr("Your account has been disabled.");
        else if (status === 422) setGlobalErr(message);
        else setGlobalErr("Something went wrong. Please try again.");
      } else {
        setGlobalErr("Connection error. Please check your internet.");
      }
    }
  });

  const onRegisterSubmit = registerForm.handleSubmit(async (data) => {
    setGlobalErr(null);
    try {
      await verifyOtp(data.username, data.password);
      onSuccess?.();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        const { status, message } = err;
        if      (status === 409) registerForm.setError("username", { message: "Already taken" });
        else if (status === 422) {
          const d = message.toLowerCase();
          if      (d.includes("password")) registerForm.setError("password", { message });
          else if (d.includes("username")) registerForm.setError("username", { message });
          else setGlobalErr(message);
        }
        else if (status === 429) setGlobalErr("Too many attempts. Please wait a minute.");
        else if (status === 403) setGlobalErr("Your account has been disabled.");
        else setGlobalErr("Something went wrong. Please try again.");
      } else {
        setGlobalErr("Connection error. Please check your internet.");
      }
    }
  });

  // onMouseDown on eye buttons: preventDefault keeps input focused so keyboard stays open
  const stopEyeBlur = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  if (!isOpen && !closing) return null;

  const submitting = activeForm.formState.isSubmitting;

  return (
    <>
      <style>{`
        @keyframes sheetUp   { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes sheetDown { from { transform: translateY(0) }    to { transform: translateY(100%) } }
        @keyframes fadeInBg  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fadeOutBg { from { opacity: 1 } to { opacity: 0 } }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/40"
        style={{ animation: closing ? "fadeOutBg 0.28s ease both" : "fadeInBg 0.2s ease both" }}
        onPointerDown={dismiss}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={tab === "login" ? "Sign in" : "Create account"}
        className="fixed left-0 right-0 z-[61] rounded-t-[24px] bg-white"
        style={{
          bottom: kbOffset > 0 ? `${kbOffset}px` : 0,
          paddingBottom: "env(safe-area-inset-bottom, 24px)",
          animation: closing
            ? "sheetDown 0.28s cubic-bezier(0.32,0.72,0,1) both"
            : "sheetUp 0.3s cubic-bezier(0.32,0.72,0,1) both",
          transition: "bottom 0.28s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.14)",
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={handleAnimationEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pb-1 pt-3" aria-hidden="true">
          <div className="h-1 w-9 rounded-full bg-[#E5E5E5]" />
        </div>

        {/* Tabs + close */}
        <div className="flex items-center justify-between px-5 pb-4 pt-3">
          <div className="flex gap-1 rounded-full bg-[#F5F5F5] p-[3px]" role="tablist">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => switchTab(t)}
                className="rounded-full px-4 py-[6px] text-[13px] font-semibold transition-colors duration-150"
                style={tab === t ? { background: "rgba(99,102,241,0.1)", color: "#6366F1" } : { color: "#8C8C8C" }}
              >
                {t === "login" ? "Sign in" : "Register"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-[#F5F5F5] text-[#8C8C8C] transition-colors active:bg-[#EBEBEB]"
            aria-label="Close"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-6">
          {globalErr && (
            <div className="mb-4 rounded-xl border border-red-200 bg-[#FFF5F5] px-4 py-3 text-[13px] leading-snug text-red-700" role="alert">
              {globalErr}
            </div>
          )}

          {/* ── Login form ── */}
          {tab === "login" && (
            <form onSubmit={onLoginSubmit} noValidate className="flex flex-col gap-[10px]">
              <div>
                <input
                  {...loginForm.register("username")}
                  placeholder="Username"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); passwordRef.current?.focus(); }
                  }}
                  className="w-full rounded-xl border bg-[#F9F9F9] py-[11px] pl-4 pr-4 text-[14px] text-[#0C0C0C] outline-none transition-colors placeholder:text-[#ABABAB] focus:bg-white"
                  style={{ borderColor: loginForm.formState.errors.username ? "#FCA5A5" : "#EBEBEB", backgroundColor: loginForm.formState.errors.username ? "#FEF2F2" : undefined }}
                />
                {loginForm.formState.errors.username && (
                  <p className="mt-1 text-[11.5px] text-red-500">{loginForm.formState.errors.username.message}</p>
                )}
              </div>

              <div>
                <div className="relative">
                  <input
                    {...loginForm.register("password")}
                    ref={(el) => {
                      loginForm.register("password").ref(el);
                      (passwordRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
                    }}
                    placeholder="Password"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    enterKeyHint="done"
                    className="w-full rounded-xl border bg-[#F9F9F9] py-[11px] pl-4 pr-10 text-[14px] text-[#0C0C0C] outline-none transition-colors placeholder:text-[#ABABAB] focus:bg-white"
                    style={{ borderColor: loginForm.formState.errors.password ? "#FCA5A5" : "#EBEBEB", backgroundColor: loginForm.formState.errors.password ? "#FEF2F2" : undefined }}
                  />
                  <button
                    type="button"
                    onMouseDown={stopEyeBlur}
                    onClick={() => setShowPw((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer border-none bg-transparent p-1"
                    aria-label={showPw ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff /> : <EyeOn />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="mt-1 text-[11.5px] text-red-500">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-[13px] text-[14px] font-bold text-white transition-opacity disabled:cursor-default disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)" }}
              >
                {submitting && <Spinner />}
                {submitting ? "Please wait…" : "Sign in"}
              </button>
            </form>
          )}

          {/* ── Register form ── */}
          {tab === "register" && (
            <form onSubmit={onRegisterSubmit} noValidate className="flex flex-col gap-[10px]">
              <div>
                <input
                  {...registerForm.register("username")}
                  placeholder="Username"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); passwordRef.current?.focus(); }
                  }}
                  className="w-full rounded-xl border bg-[#F9F9F9] py-[11px] pl-4 pr-4 text-[14px] text-[#0C0C0C] outline-none transition-colors placeholder:text-[#ABABAB] focus:bg-white"
                  style={{ borderColor: registerForm.formState.errors.username ? "#FCA5A5" : "#EBEBEB", backgroundColor: registerForm.formState.errors.username ? "#FEF2F2" : undefined }}
                />
                {registerForm.formState.errors.username && (
                  <p className="mt-1 text-[11.5px] text-red-500">{registerForm.formState.errors.username.message}</p>
                )}
              </div>

              <div>
                <div className="relative">
                  <input
                    {...registerForm.register("password")}
                    ref={(el) => {
                      registerForm.register("password").ref(el);
                      (passwordRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
                    }}
                    placeholder="Password"
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
                    enterKeyHint="next"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); confirmRef.current?.focus(); }
                    }}
                    className="w-full rounded-xl border bg-[#F9F9F9] py-[11px] pl-4 pr-10 text-[14px] text-[#0C0C0C] outline-none transition-colors placeholder:text-[#ABABAB] focus:bg-white"
                    style={{ borderColor: registerForm.formState.errors.password ? "#FCA5A5" : "#EBEBEB", backgroundColor: registerForm.formState.errors.password ? "#FEF2F2" : undefined }}
                  />
                  <button
                    type="button"
                    onMouseDown={stopEyeBlur}
                    onClick={() => setShowPw((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer border-none bg-transparent p-1"
                    aria-label={showPw ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff /> : <EyeOn />}
                  </button>
                </div>
                {registerForm.formState.errors.password && (
                  <p className="mt-1 text-[11.5px] text-red-500">{registerForm.formState.errors.password.message}</p>
                )}
              </div>

              <div>
                <div className="relative">
                  <input
                    {...registerForm.register("confirm")}
                    ref={(el) => {
                      registerForm.register("confirm").ref(el);
                      (confirmRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
                    }}
                    placeholder="Confirm password"
                    type={showCfm ? "text" : "password"}
                    autoComplete="new-password"
                    enterKeyHint="done"
                    className="w-full rounded-xl border bg-[#F9F9F9] py-[11px] pl-4 pr-10 text-[14px] text-[#0C0C0C] outline-none transition-colors placeholder:text-[#ABABAB] focus:bg-white"
                    style={{ borderColor: registerForm.formState.errors.confirm ? "#FCA5A5" : "#EBEBEB", backgroundColor: registerForm.formState.errors.confirm ? "#FEF2F2" : undefined }}
                  />
                  <button
                    type="button"
                    onMouseDown={stopEyeBlur}
                    onClick={() => setShowCfm((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer border-none bg-transparent p-1"
                    aria-label={showCfm ? "Hide" : "Show"}
                    tabIndex={-1}
                  >
                    {showCfm ? <EyeOff /> : <EyeOn />}
                  </button>
                </div>
                {registerForm.formState.errors.confirm && (
                  <p className="mt-1 text-[11.5px] text-red-500">{registerForm.formState.errors.confirm.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-[13px] text-[14px] font-bold text-white transition-opacity disabled:cursor-default disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)" }}
              >
                {submitting && <Spinner />}
                {submitting ? "Please wait…" : "Create account"}
              </button>
            </form>
          )}

          <p className="mt-5 text-center text-[13px] text-[#8C8C8C]">
            {tab === "login" ? (
              <>Don&apos;t have an account?{" "}
                <button type="button" onClick={() => switchTab("register")} className="cursor-pointer border-none bg-transparent font-semibold text-[#6366F1]">
                  Create one
                </button>
              </>
            ) : (
              <>Already have one?{" "}
                <button type="button" onClick={() => switchTab("login")} className="cursor-pointer border-none bg-transparent font-semibold text-[#6366F1]">
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </>
  );
});
AuthModal.displayName = "AuthModal";
