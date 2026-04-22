import { useState, useCallback, useRef, useEffect, useMemo, memo } from "react";
import { FirebaseError } from "firebase/app";
import { useAuthStore } from "@/store/authStore";
import { useShallow } from "zustand/react/shallow";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";

type Step = "email" | "sent" | "otp" | "confirm-link" | "signed-in";

const SS_STEP  = "arc-auth-step";
const SS_EMAIL = "arc-auth-email";

function clearAuthSession() {
  sessionStorage.removeItem(SS_STEP);
  sessionStorage.removeItem(SS_EMAIL);
}

// ── Icon primitives ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="animate-spin" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="7" stroke="rgba(255,255,255,0.35)" strokeWidth="2.2" />
      <path d="M9 2a7 7 0 0 1 7 7" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect width="64" height="64" rx="20" fill="rgba(99,102,241,0.10)" />
      <rect x="12" y="19" width="40" height="28" rx="4" stroke="#6366F1" strokeWidth="2.2" fill="none" />
      <path d="M12 23l20 14 20-14" stroke="#6366F1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BackChevron() {
  return (
    <svg width="8" height="13" viewBox="0 0 8 13" fill="none" aria-hidden="true">
      <path d="M7 1.5L1.5 6.5L7 11.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── AuthPage ──────────────────────────────────────────────────────────────────

export interface AuthPageProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthPage = memo(function AuthPage({ onClose, onSuccess }: AuthPageProps) {
  const { user, sendMagicLink, sendOtp, verifyOtp, completeLinkSignIn, pendingLinkSignIn } =
    useAuthStore(
      useShallow((s) => ({
        user: s.user,
        sendMagicLink: s.sendMagicLink,
        sendOtp: s.sendOtp,
        verifyOtp: s.verifyOtp,
        completeLinkSignIn: s.completeLinkSignIn,
        pendingLinkSignIn: s.pendingLinkSignIn,
      })),
    );

  const kbOffset = useKeyboardOffset();

  const isIOSPWA = useMemo(() => {
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    return isIOS && isStandalone;
  }, []);

  // ── Closing animation ─────────────────────────────────────────────────────
  const [closing, setClosing] = useState(false);

  const dismiss = useCallback(() => {
    clearAuthSession();
    setClosing(true);
  }, []);

  const handlePageAnimEnd = useCallback(
    (e: React.AnimationEvent<HTMLDivElement>) => {
      if (closing && e.animationName === "authPageOut") onClose();
    },
    [closing, onClose],
  );

  // ── Steps ─────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>(() => {
    if (pendingLinkSignIn) return "confirm-link";
    const saved = sessionStorage.getItem(SS_STEP);
    if (saved === "sent") return "sent";
    if (saved === "otp")  return "otp";
    return "email";
  });

  const [email, setEmail] = useState(() => sessionStorage.getItem(SS_EMAIL) ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);

  // ── Cross-tab sign-in detection ───────────────────────────────────────────
  useEffect(() => {
    if (user && (step === "sent" || step === "otp")) {
      clearAuthSession();
      setStep("signed-in");
    }
  }, [user, step]);

  // ── Persist step + email ──────────────────────────────────────────────────
  useEffect(() => {
    if (step === "confirm-link" || step === "signed-in") return;
    sessionStorage.setItem(SS_STEP, step);
  }, [step]);

  useEffect(() => {
    if (step === "sent" || step === "otp") sessionStorage.setItem(SS_EMAIL, email);
  }, [step, email]);

  // ── Resend cooldown ───────────────────────────────────────────────────────
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const emailRef        = useRef<HTMLInputElement>(null);
  const confirmEmailRef = useRef<HTMLInputElement>(null);
  const otpRef          = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  useEffect(() => {
    if (step === "email")        { const t = setTimeout(() => emailRef.current?.focus(), 80);        return () => clearTimeout(t); }
    if (step === "confirm-link") { const t = setTimeout(() => confirmEmailRef.current?.focus(), 80); return () => clearTimeout(t); }
    if (step === "otp")          { const t = setTimeout(() => otpRef.current?.focus(), 80);          return () => clearTimeout(t); }
  }, [step]);

  const triggerShake      = useCallback(() => setShakeKey((k) => k + 1), []);
  const setErrorWithShake = useCallback((msg: string) => { setError(msg); if (msg) triggerShake(); }, [triggerShake]);

  const startCooldown = useCallback(() => {
    setResendCooldown(30);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { if (cooldownRef.current) clearInterval(cooldownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ── Auth success ──────────────────────────────────────────────────────────
  const handleAuthSuccess = useCallback(() => { onSuccess?.(); dismiss(); }, [onSuccess, dismiss]);

  // ── Step 1: send (magic link or OTP depending on platform) ───────────────
  const handleSendEmail = useCallback(async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setErrorWithShake("Please enter your email address."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setErrorWithShake("Please enter a valid email address."); return; }
    setLoading(true);
    setError("");
    try {
      if (isIOSPWA) {
        await sendOtp(trimmed);
        setEmail(trimmed);
        setStep("otp");
        startCooldown();
      } else {
        await sendMagicLink(trimmed);
        setEmail(trimmed);
        setStep("sent");
        startCooldown();
      }
    } catch (err: unknown) {
      setErrorWithShake(err instanceof Error ? err.message : "Failed to send. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [email, isIOSPWA, sendOtp, sendMagicLink, setErrorWithShake, startCooldown]);

  const handleResendMagicLink = useCallback(async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    setError("");
    try {
      await sendMagicLink(email);
      startCooldown();
    } catch (err: unknown) {
      setErrorWithShake(err instanceof Error ? err.message : "Failed to resend link.");
    } finally {
      setLoading(false);
    }
  }, [resendCooldown, loading, sendMagicLink, email, startCooldown, setErrorWithShake]);

  const handleResendOtp = useCallback(async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    setError("");
    try {
      await sendOtp(email);
      startCooldown();
    } catch (err: unknown) {
      setErrorWithShake(err instanceof Error ? err.message : "Failed to resend code.");
    } finally {
      setLoading(false);
    }
  }, [resendCooldown, loading, sendOtp, email, startCooldown, setErrorWithShake]);

  const handleBack = useCallback(() => {
    setStep("email");
    setError("");
    sessionStorage.setItem(SS_STEP, "email");
    setTimeout(() => emailRef.current?.focus(), 80);
  }, []);

  // ── OTP step ──────────────────────────────────────────────────────────────
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  const handleVerifyOtp = useCallback(async (code: string) => {
    if (code.length !== 6) return;
    setOtpLoading(true);
    setError("");
    try {
      await verifyOtp(email, code);
      handleAuthSuccess();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Invalid code. Please try again.";
      setErrorWithShake(msg);
      setOtpCode("");
    } finally {
      setOtpLoading(false);
    }
  }, [email, verifyOtp, handleAuthSuccess, setErrorWithShake]);

  const handleOtpChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtpCode(val);
    setError("");
    if (val.length === 6) handleVerifyOtp(val);
  }, [handleVerifyOtp]);

  // ── Cross-device: confirm email ───────────────────────────────────────────
  const [confirmEmail, setConfirmEmail] = useState("");

  const handleCompleteLinkSignIn = useCallback(async () => {
    const trimmed = confirmEmail.trim().toLowerCase();
    if (!trimmed) { setErrorWithShake("Please enter your email address."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setErrorWithShake("Please enter a valid email address."); return; }
    setLoading(true);
    setError("");
    try {
      await completeLinkSignIn(trimmed);
      handleAuthSuccess();
    } catch (err: unknown) {
      const message =
        err instanceof FirebaseError
          ? "This link has expired or is invalid. Please request a new one."
          : err instanceof Error ? err.message : "Sign-in failed. Please try again.";
      setErrorWithShake(message);
    } finally {
      setLoading(false);
    }
  }, [confirmEmail, completeLinkSignIn, handleAuthSuccess, setErrorWithShake]);

  const btnBottom  = kbOffset > 0 ? `${kbOffset + 16}px` : "calc(env(safe-area-inset-bottom, 16px) + 16px)";
  const panelBase  = "absolute inset-0 flex flex-col items-center";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-white"
      style={{ animation: closing ? "authPageOut 0.32s cubic-bezier(0.4,0,0.2,1) both" : "authPageIn 0.38s cubic-bezier(0.4,0,0.2,1) both" }}
      aria-label="Sign in"
      role="main"
      onAnimationEnd={handlePageAnimEnd}
    >
      {/* ── Step 1: Email ─────────────────────────────────────────────────── */}
      <div
        className={panelBase}
        aria-hidden={step !== "email"}
        {...(step !== "email" ? { inert: "" } : {})}
        style={{ transform: step === "email" ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.32s cubic-bezier(0.4,0,0.2,1)" }}
      >
        <div style={{ height: "env(safe-area-inset-top, 0px)" }} />
        <div className="flex w-full items-center px-5 pt-4">
          <button onClick={dismiss} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-black/[0.06] text-[#0C0C0C] transition-colors active:bg-black/[0.12]" aria-label="Go back">
            <BackChevron />
          </button>
        </div>
        <div className="flex w-full flex-col items-center pt-10 pb-8">
          <span className="select-none font-logo text-[40px] font-black leading-none tracking-[-2.5px] text-[#0C0C0C]" aria-label="arc.">
            arc<span style={{ color: "#F5A623" }}>.</span>
          </span>
        </div>
        <div className="w-full max-w-[360px] px-6">
          <h1 className="text-[26px] font-bold leading-tight text-[#0C0C0C]">Welcome</h1>
          <p className="mt-1.5 text-[15px] leading-relaxed text-[#8C8C8C]">
            {isIOSPWA
              ? "Enter your email and we'll send you a 6-digit sign-in code."
              : "Enter your email and we'll send you a secure sign-in link. No password needed."}
          </p>
        </div>
        <div
          className="mt-8 w-full max-w-[360px] px-6"
          key={`shake-email-${shakeKey}`}
          style={error && step === "email" ? { animation: "authShake 0.35s ease" } : undefined}
        >
          <input
            ref={emailRef}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus={step === "email"}
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSendEmail(); } }}
            placeholder="you@example.com"
            aria-label="Email address"
            aria-invalid={!!error && step === "email"}
            aria-describedby={error && step === "email" ? "email-error" : undefined}
            className="w-full rounded-2xl border bg-white px-4 py-[15px] text-[16px] text-[#0C0C0C] outline-none placeholder:text-[#ABABAB]"
            style={{ borderColor: error && step === "email" ? "#EF4444" : "#EBEBEB", transition: "border-color 0.2s, box-shadow 0.2s" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#6366F1"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = error && step === "email" ? "#EF4444" : "#EBEBEB"; e.currentTarget.style.boxShadow = "none"; }}
          />
          {error && step === "email" && (
            <p id="email-error" className="mt-2 text-[13px] text-[#EF4444]" role="alert">{error}</p>
          )}
        </div>
        <div className="absolute left-0 right-0 px-6" style={{ bottom: btnBottom, transition: "bottom 0.28s cubic-bezier(0.4,0,0.2,1)" }}>
          <button
            onClick={handleSendEmail}
            disabled={loading}
            aria-busy={loading}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-none py-[15px] text-[16px] font-bold text-white transition-opacity active:opacity-80 disabled:cursor-default disabled:opacity-75"
            style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", boxShadow: "0 4px 20px rgba(99,102,241,0.32)" }}
          >
            {loading ? <><Spinner /><span>{isIOSPWA ? "Sending code…" : "Sending link…"}</span></> : isIOSPWA ? "Send sign-in code" : "Send magic link"}
          </button>
        </div>
      </div>

      {/* ── Step 2a: Sent (magic link) — non-iOS only ────────────────────── */}
      <div
        className={panelBase}
        aria-hidden={step !== "sent"}
        {...(step !== "sent" ? { inert: "" } : {})}
        style={{ transform: step === "sent" ? "translateX(0)" : "translateX(100%)", transition: "transform 0.32s cubic-bezier(0.4,0,0.2,1)" }}
      >
        <div style={{ height: "env(safe-area-inset-top, 0px)" }} />
        <div className="flex w-full items-center px-5 pt-4">
          <button onClick={handleBack} aria-label="Back to email" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-black/[0.06] text-[#0C0C0C] transition-colors active:bg-black/[0.12]">
            <BackChevron />
          </button>
        </div>
        <div className="flex w-full flex-col items-center pt-10 pb-8">
          <span className="select-none font-logo text-[40px] font-black leading-none tracking-[-2.5px] text-[#0C0C0C]" aria-label="arc.">
            arc<span style={{ color: "#F5A623" }}>.</span>
          </span>
        </div>
        <div className="flex w-full flex-col items-center px-6">
          <MailIcon />
        </div>
        <div className="mt-6 w-full max-w-[360px] px-6">
          <h1 className="text-[26px] font-bold leading-tight text-[#0C0C0C]">Check your inbox</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[#8C8C8C]">
            We sent a magic link to <span className="font-semibold text-[#0C0C0C]">{email}</span>. Click it to sign in — no password needed.
          </p>
        </div>
        <div className="mt-6 flex flex-col items-center">
          <div><span className="text-[13px] text-[#8C8C8C]">Didn&apos;t receive it?</span></div>
          <div>
            <span className="text-[13px] text-[#8C8C8C]">{" Check your spam folder or "}</span>
            <button
              onClick={handleResendMagicLink}
              disabled={resendCooldown > 0 || loading}
              className="cursor-pointer border-none bg-transparent text-[13px] font-semibold text-[#6366F1] hover:underline underline-offset-2 transition-opacity disabled:cursor-default disabled:opacity-50"
            >
              {resendCooldown > 0 ? `resend in ${resendCooldown}s` : "resend the link"}
            </button>
          </div>
        </div>
        <div className="mt-3">
          <button onClick={handleBack} className="cursor-pointer border-none bg-transparent text-[13px] text-[#8C8C8C] underline underline-offset-2 transition-opacity active:opacity-60">
            Wrong email? Go back
          </button>
        </div>
        {error && step === "sent" && (
          <p className="mt-3 text-center text-[13px] text-[#EF4444]" role="alert">{error}</p>
        )}
      </div>

      {/* ── Step 2b: OTP — iOS PWA only ──────────────────────────────────── */}
      <div
        className={panelBase}
        aria-hidden={step !== "otp"}
        {...(step !== "otp" ? { inert: "" } : {})}
        style={{ transform: step === "otp" ? "translateX(0)" : "translateX(100%)", transition: "transform 0.32s cubic-bezier(0.4,0,0.2,1)" }}
      >
        <div style={{ height: "env(safe-area-inset-top, 0px)" }} />
        <div className="flex w-full items-center px-5 pt-4">
          <button onClick={handleBack} aria-label="Back to email" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-black/[0.06] text-[#0C0C0C] transition-colors active:bg-black/[0.12]">
            <BackChevron />
          </button>
        </div>
        <div className="flex w-full flex-col items-center pt-10 pb-8">
          <span className="select-none font-logo text-[40px] font-black leading-none tracking-[-2.5px] text-[#0C0C0C]" aria-label="arc.">
            arc<span style={{ color: "#F5A623" }}>.</span>
          </span>
        </div>
        <div className="flex w-full flex-col items-center px-6">
          <MailIcon />
        </div>
        <div className="mt-6 w-full max-w-[360px] px-6">
          <h1 className="text-[26px] font-bold leading-tight text-[#0C0C0C]">Enter your code</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[#8C8C8C]">
            We sent a 6-digit code to <span className="font-semibold text-[#0C0C0C]">{email}</span>. Enter it below to sign in.
          </p>
        </div>
        <div
          className="mt-8 w-full max-w-[360px] px-6"
          key={`shake-otp-${shakeKey}`}
          style={error && step === "otp" ? { animation: "authShake 0.35s ease" } : undefined}
        >
          <input
            ref={otpRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otpCode}
            onChange={handleOtpChange}
            placeholder="000000"
            maxLength={6}
            aria-label="6-digit sign-in code"
            aria-invalid={!!error && step === "otp"}
            aria-describedby={error && step === "otp" ? "otp-error" : undefined}
            className="w-full rounded-2xl border bg-white px-4 py-[15px] text-center text-[28px] font-bold tracking-[0.3em] text-[#0C0C0C] outline-none placeholder:text-[#DDDDE3] placeholder:font-normal placeholder:tracking-normal"
            style={{ borderColor: error && step === "otp" ? "#EF4444" : "#EBEBEB", transition: "border-color 0.2s, box-shadow 0.2s", letterSpacing: otpCode ? "0.3em" : undefined }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#6366F1"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = error && step === "otp" ? "#EF4444" : "#EBEBEB"; e.currentTarget.style.boxShadow = "none"; }}
          />
          {error && step === "otp" && (
            <p id="otp-error" className="mt-2 text-center text-[13px] text-[#EF4444]" role="alert">{error}</p>
          )}
        </div>
        <div className="mt-5 flex flex-col items-center gap-1">
          <div>
            <span className="text-[13px] text-[#8C8C8C]">Didn&apos;t receive it? </span>
            <button
              onClick={handleResendOtp}
              disabled={resendCooldown > 0 || loading}
              className="cursor-pointer border-none bg-transparent text-[13px] font-semibold text-[#6366F1] hover:underline underline-offset-2 transition-opacity disabled:cursor-default disabled:opacity-50"
            >
              {resendCooldown > 0 ? `resend in ${resendCooldown}s` : "resend code"}
            </button>
          </div>
          <button onClick={handleBack} className="cursor-pointer border-none bg-transparent text-[13px] text-[#8C8C8C] underline underline-offset-2 transition-opacity active:opacity-60">
            Wrong email? Go back
          </button>
        </div>
        <div className="absolute left-0 right-0 px-6" style={{ bottom: btnBottom, transition: "bottom 0.28s cubic-bezier(0.4,0,0.2,1)" }}>
          <button
            onClick={() => handleVerifyOtp(otpCode)}
            disabled={otpCode.length !== 6 || otpLoading}
            aria-busy={otpLoading}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-none py-[15px] text-[16px] font-bold text-white transition-opacity active:opacity-80 disabled:cursor-default disabled:opacity-75"
            style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", boxShadow: "0 4px 20px rgba(99,102,241,0.32)" }}
          >
            {otpLoading ? <><Spinner /><span>Signing in…</span></> : "Sign in"}
          </button>
        </div>
      </div>

      {/* ── Step 3: Confirm link (cross-device, non-iOS) ──────────────────── */}
      <div
        className={panelBase}
        aria-hidden={step !== "confirm-link"}
        {...(step !== "confirm-link" ? { inert: "" } : {})}
        style={{ transform: step === "confirm-link" ? "translateX(0)" : "translateX(100%)", transition: "transform 0.32s cubic-bezier(0.4,0,0.2,1)" }}
      >
        <div style={{ height: "env(safe-area-inset-top, 0px)" }} />
        <div className="flex w-full flex-col items-center pt-[calc(env(safe-area-inset-top,0px)+64px)] pb-8">
          <span className="select-none font-logo text-[40px] font-black leading-none tracking-[-2.5px] text-[#0C0C0C]" aria-label="arc.">
            arc<span style={{ color: "#F5A623" }}>.</span>
          </span>
        </div>
        <div className="w-full max-w-[360px] px-6">
          <h1 className="text-[26px] font-bold leading-tight text-[#0C0C0C]">Confirm your email</h1>
          <p className="mt-1.5 text-[15px] leading-relaxed text-[#8C8C8C]">Enter the email you used to request the magic link.</p>
        </div>
        <div
          className="mt-8 w-full max-w-[360px] px-6"
          key={`shake-confirm-${shakeKey}`}
          style={error && step === "confirm-link" ? { animation: "authShake 0.35s ease" } : undefined}
        >
          <input
            ref={confirmEmailRef}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={confirmEmail}
            onChange={(e) => { setConfirmEmail(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCompleteLinkSignIn(); } }}
            placeholder="you@example.com"
            aria-label="Email address"
            aria-invalid={!!error && step === "confirm-link"}
            aria-describedby={error && step === "confirm-link" ? "confirm-email-error" : undefined}
            className="w-full rounded-2xl border bg-white px-4 py-[15px] text-[16px] text-[#0C0C0C] outline-none placeholder:text-[#ABABAB]"
            style={{ borderColor: error && step === "confirm-link" ? "#EF4444" : "#EBEBEB", transition: "border-color 0.2s, box-shadow 0.2s" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#6366F1"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = error && step === "confirm-link" ? "#EF4444" : "#EBEBEB"; e.currentTarget.style.boxShadow = "none"; }}
          />
          {error && step === "confirm-link" && (
            <p id="confirm-email-error" className="mt-2 text-[13px] text-[#EF4444]" role="alert">{error}</p>
          )}
        </div>
        <div className="absolute left-0 right-0 px-6" style={{ bottom: btnBottom, transition: "bottom 0.28s cubic-bezier(0.4,0,0.2,1)" }}>
          <button
            onClick={handleCompleteLinkSignIn}
            disabled={loading}
            aria-busy={loading}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-none py-[15px] text-[16px] font-bold text-white transition-opacity active:opacity-80 disabled:cursor-default disabled:opacity-75"
            style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", boxShadow: "0 4px 20px rgba(99,102,241,0.32)" }}
          >
            {loading ? <><Spinner /><span>Signing in…</span></> : "Sign in"}
          </button>
        </div>
      </div>

      {/* ── Step 4: Signed-in (cross-tab confirmation) ────────────────────── */}
      <div
        className={panelBase}
        aria-hidden={step !== "signed-in"}
        {...(step !== "signed-in" ? { inert: "" } : {})}
        style={{ transform: step === "signed-in" ? "translateX(0)" : "translateX(100%)", transition: "transform 0.32s cubic-bezier(0.4,0,0.2,1)" }}
      >
        <div style={{ height: "env(safe-area-inset-top, 0px)" }} />
        <div className="flex w-full flex-col items-center pt-[calc(env(safe-area-inset-top,0px)+56px)] pb-8">
          <span className="select-none font-logo text-[40px] font-black leading-none tracking-[-2.5px] text-[#0C0C0C]" aria-label="arc.">
            arc<span style={{ color: "#F5A623" }}>.</span>
          </span>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full" style={{ background: "rgba(16,185,129,0.10)" }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <circle cx="18" cy="18" r="17" stroke="#10B981" strokeWidth="2" />
              <path d="M10 18l6 6 10-12" stroke="#10B981" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <div className="mt-6 w-full max-w-[360px] px-6 text-center">
          <h1 className="text-[26px] font-bold leading-tight text-[#0C0C0C]">You&apos;re signed in!</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[#8C8C8C]">
            Sign-in was completed in another tab. You can close this tab, or continue here.
          </p>
        </div>
        <div className="absolute left-0 right-0 px-6" style={{ bottom: btnBottom, transition: "bottom 0.28s cubic-bezier(0.4,0,0.2,1)" }}>
          <button
            onClick={handleAuthSuccess}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-none py-[15px] text-[16px] font-bold text-white transition-opacity active:opacity-80"
            style={{ background: "linear-gradient(135deg,#10B981,#059669)", boxShadow: "0 4px 20px rgba(16,185,129,0.28)" }}
          >
            Continue here
          </button>
        </div>
      </div>

      <style>{`
        @keyframes authPageIn  { from { opacity:0; transform:translateY(100%); } to { opacity:1; transform:translateY(0); } }
        @keyframes authPageOut { from { opacity:1; transform:translateY(0); }   to { opacity:0; transform:translateY(100%); } }
        @keyframes authShake   { 0%,100% { transform:translateX(0); } 25% { transform:translateX(-4px); } 75% { transform:translateX(4px); } }
      `}</style>
    </div>
  );
});

AuthPage.displayName = "AuthPage";
