import { useState, useCallback, useRef, useEffect, memo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";
import type { AppView } from "@/types/job";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthPageProps {
  onSuccess: (redirectAfter?: AppView) => void;
  onBack: () => void;
  redirectAfter?: AppView;
}

type Step = "email" | "otp";

// ── Session persistence ───────────────────────────────────────────────────────
// Survives mobile tab-switching / iOS Safari backgrounding within the same session.

const SS_STEP = "arc-auth-step";
const SS_EMAIL = "arc-auth-email";

function clearAuthSession() {
  sessionStorage.removeItem(SS_STEP);
  sessionStorage.removeItem(SS_EMAIL);
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="9"
        cy="9"
        r="7"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="2.2"
      />
      <path
        d="M9 2a7 7 0 0 1 7 7"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── AuthPage ──────────────────────────────────────────────────────────────────

export const AuthPage = memo<AuthPageProps>(
  ({ onSuccess, onBack: onBackProp, redirectAfter }) => {
    const { sendOtp, verifyOtp } = useAuth();
    const kbOffset = useKeyboardOffset();

    // ── Page-level closing animation ──────────────────────────────────────────
    const [closing, setClosing] = useState(false);

    const dismiss = useCallback(() => {
      clearAuthSession();
      setClosing(true);
    }, []);

    const handlePageAnimEnd = useCallback(
      (e: React.AnimationEvent<HTMLDivElement>) => {
        if (closing && e.animationName === "authPageOut") onBackProp();
      },
      [closing, onBackProp],
    );

    // ── Step & form state — restored from sessionStorage on mount ─────────────
    const [step, setStep] = useState<Step>(() =>
      sessionStorage.getItem(SS_STEP) === "otp" ? "otp" : "email",
    );
    const [email, setEmail] = useState(
      () => sessionStorage.getItem(SS_EMAIL) ?? "",
    );
    const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [shakeKey, setShakeKey] = useState(0);

    // ── Persist step + email so the page survives tab switching ──────────────
    useEffect(() => {
      sessionStorage.setItem(SS_STEP, step);
    }, [step]);

    useEffect(() => {
      if (step === "otp") sessionStorage.setItem(SS_EMAIL, email);
    }, [step, email]);

    // ── Resend cooldown ───────────────────────────────────────────────────────
    const [resendCooldown, setResendCooldown] = useState(0);
    const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Refs ──────────────────────────────────────────────────────────────────
    const digitRefs = useRef<HTMLInputElement[]>([]);
    const autoSubmitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const emailRef = useRef<HTMLInputElement>(null);

    // ── Cleanup on unmount ────────────────────────────────────────────────────
    useEffect(
      () => () => {
        if (cooldownRef.current) clearInterval(cooldownRef.current);
        if (autoSubmitTimer.current) clearTimeout(autoSubmitTimer.current);
      },
      [],
    );

    // ── Focus first OTP box when step changes ────────────────────────────────
    useEffect(() => {
      if (step === "otp") {
        const t = setTimeout(() => digitRefs.current[0]?.focus(), 80);
        return () => clearTimeout(t);
      }
    }, [step]);

    // ── Error helpers ─────────────────────────────────────────────────────────
    const triggerShake = useCallback(() => setShakeKey((k) => k + 1), []);
    const setErrorWithShake = useCallback(
      (msg: string) => {
        setError(msg);
        if (msg) triggerShake();
      },
      [triggerShake],
    );

    // ── Resend cooldown ───────────────────────────────────────────────────────
    const startCooldown = useCallback(() => {
      setResendCooldown(30);
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      cooldownRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            if (cooldownRef.current) clearInterval(cooldownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, []);

    // ── Step 1: send OTP ──────────────────────────────────────────────────────
    const handleSendOtp = useCallback(async () => {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed) {
        setErrorWithShake("Please enter your email address.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setErrorWithShake("Please enter a valid email address.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        await sendOtp(trimmed);
        setEmail(trimmed);
        setStep("otp");
        startCooldown();
      } catch (err: unknown) {
        setErrorWithShake(
          err instanceof Error
            ? err.message
            : "Failed to send code. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    }, [email, sendOtp, setErrorWithShake, startCooldown]);

    // ── Step 2: verify OTP ────────────────────────────────────────────────────
    const handleVerifyOtp = useCallback(
      async (code: string) => {
        if (code.length !== 6) {
          setErrorWithShake("Please enter the 6-digit code.");
          return;
        }
        setLoading(true);
        setError("");
        try {
          await verifyOtp(email, code);
          clearAuthSession();
          onSuccess(redirectAfter);
        } catch (err: unknown) {
          setErrorWithShake(
            err instanceof Error
              ? err.message
              : "Invalid code. Please try again.",
          );
          setDigits(Array(6).fill(""));
          setTimeout(() => digitRefs.current[0]?.focus(), 50);
        } finally {
          setLoading(false);
        }
      },
      [email, verifyOtp, onSuccess, redirectAfter, setErrorWithShake],
    );

    // ── Auto-submit ───────────────────────────────────────────────────────────
    const scheduleAutoSubmit = useCallback(
      (filled: string[]) => {
        if (autoSubmitTimer.current) clearTimeout(autoSubmitTimer.current);
        if (filled.every((d) => d !== "")) {
          autoSubmitTimer.current = setTimeout(
            () => handleVerifyOtp(filled.join("")),
            300,
          );
        }
      },
      [handleVerifyOtp],
    );

    // ── Digit box handlers ────────────────────────────────────────────────────
    const handleDigitChange = useCallback(
      (index: number, value: string) => {
        const char = value.replace(/\D/g, "").slice(-1);
        const next = [...digits];
        next[index] = char;
        setDigits(next);
        setError("");
        if (char && index < 5) digitRefs.current[index + 1]?.focus();
        scheduleAutoSubmit(next);
      },
      [digits, scheduleAutoSubmit],
    );

    const handleDigitKeyDown = useCallback(
      (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace") {
          if (digits[index] !== "") {
            const next = [...digits];
            next[index] = "";
            setDigits(next);
            scheduleAutoSubmit(next);
          } else if (index > 0) {
            const next = [...digits];
            next[index - 1] = "";
            setDigits(next);
            digitRefs.current[index - 1]?.focus();
            scheduleAutoSubmit(next);
          }
          e.preventDefault();
        } else if (e.key === "ArrowLeft" && index > 0) {
          digitRefs.current[index - 1]?.focus();
        } else if (e.key === "ArrowRight" && index < 5) {
          digitRefs.current[index + 1]?.focus();
        }
      },
      [digits, scheduleAutoSubmit],
    );

    const handleDigitPaste = useCallback(
      (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasted = e.clipboardData
          .getData("text")
          .replace(/\D/g, "")
          .slice(0, 6);
        if (!pasted) return;
        const next = Array(6).fill("") as string[];
        for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
        setDigits(next);
        setError("");
        digitRefs.current[Math.min(pasted.length, 5)]?.focus();
        scheduleAutoSubmit(next);
      },
      [scheduleAutoSubmit],
    );

    // ── Resend ────────────────────────────────────────────────────────────────
    const handleResend = useCallback(async () => {
      if (resendCooldown > 0 || loading) return;
      setLoading(true);
      setError("");
      setDigits(Array(6).fill(""));
      try {
        await sendOtp(email);
        startCooldown();
        setTimeout(() => digitRefs.current[0]?.focus(), 50);
      } catch (err: unknown) {
        setErrorWithShake(
          err instanceof Error ? err.message : "Failed to resend code.",
        );
      } finally {
        setLoading(false);
      }
    }, [
      resendCooldown,
      loading,
      sendOtp,
      email,
      startCooldown,
      setErrorWithShake,
    ]);

    // ── Back to email step ────────────────────────────────────────────────────
    const handleBack = useCallback(() => {
      if (autoSubmitTimer.current) clearTimeout(autoSubmitTimer.current);
      setStep("email");
      setDigits(Array(6).fill(""));
      setError("");
      // Keep email in sessionStorage but reset step
      sessionStorage.setItem(SS_STEP, "email");
      setTimeout(() => emailRef.current?.focus(), 80);
    }, []);

    // ── Derived ───────────────────────────────────────────────────────────────
    const otpCode = digits.join("");
    const otpFilled = otpCode.length === 6;

    const btnBottom =
      kbOffset > 0
        ? `${kbOffset + 16}px`
        : "calc(env(safe-area-inset-bottom, 16px) + 16px)";

    // ── Shared panel styles ───────────────────────────────────────────────────
    const panelBase = "absolute inset-0 flex flex-col items-center";

    // ── Render ────────────────────────────────────────────────────────────────
    return (
      <div
        className="fixed inset-0 z-50 overflow-hidden bg-white"
        style={{
          animation: closing
            ? "authPageOut 0.32s cubic-bezier(0.4,0,0.2,1) both"
            : "authPageIn 0.38s cubic-bezier(0.4,0,0.2,1) both",
        }}
        aria-label="Login"
        role="main"
        onAnimationEnd={handlePageAnimEnd}
      >
        {/* ── Step 1: Email ───────────────────────────────────────────────── */}
        <div
          className={panelBase}
          aria-hidden={step !== "email"}
          {...(step !== "email" ? { inert: "" } : {})}
          style={{
            transform: step === "email" ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.32s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <div style={{ height: "env(safe-area-inset-top, 0px)" }} />

          <div className="flex w-full items-center px-5 pt-4">
            <button
              onClick={dismiss}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-black/[0.06] text-[#0C0C0C] transition-colors active:bg-black/[0.12]"
              aria-label="Go back"
            >
              <svg
                width="8"
                height="13"
                viewBox="0 0 8 13"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M7 1.5L1.5 6.5L7 11.5"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <div className="flex w-full flex-col items-center pt-10 pb-8">
            <span
              className="select-none font-logo text-[40px] font-black leading-none tracking-[-2.5px] text-[#0C0C0C]"
              aria-label="arc."
            >
              arc<span style={{ color: "#F5A623" }}>.</span>
            </span>
          </div>

          <div className="w-full max-w-[360px] px-6">
            <h1 className="text-[26px] font-bold leading-tight text-[#0C0C0C]">
              Welcome
            </h1>
            <p className="mt-1.5 text-[15px] leading-relaxed text-[#8C8C8C]">
              Enter your email to login or sign up
            </p>
          </div>

          <div
            className="mt-8 w-full max-w-[360px] px-6"
            key={`shake-email-${shakeKey}`}
            style={
              error && step === "email"
                ? { animation: "authShake 0.35s ease" }
                : undefined
            }
          >
            <input
              ref={emailRef}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus={step === "email"}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSendOtp();
                }
              }}
              placeholder="you@example.com"
              aria-label="Email address"
              aria-invalid={!!error && step === "email"}
              aria-describedby={
                error && step === "email" ? "email-error" : undefined
              }
              className="w-full rounded-2xl border bg-white px-4 py-[15px] text-[16px] text-[#0C0C0C] outline-none placeholder:text-[#ABABAB]"
              style={{
                borderColor: error && step === "email" ? "#EF4444" : "#EBEBEB",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLInputElement).style.borderColor =
                  "#6366F1";
                (e.currentTarget as HTMLInputElement).style.boxShadow =
                  "0 0 0 3px rgba(99,102,241,0.12)";
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLInputElement).style.borderColor =
                  error && step === "email" ? "#EF4444" : "#EBEBEB";
                (e.currentTarget as HTMLInputElement).style.boxShadow = "none";
              }}
            />
            {error && step === "email" && (
              <p
                id="email-error"
                className="mt-2 text-[13px] text-[#EF4444]"
                role="alert"
              >
                {error}
              </p>
            )}
          </div>

          {/* CTA — absolute within panel, lifts with keyboard */}
          <div
            className="absolute left-0 right-0 px-6"
            style={{
              bottom: btnBottom,
              transition: "bottom 0.28s cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            <button
              onClick={handleSendOtp}
              disabled={loading}
              aria-busy={loading}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-none py-[15px] text-[16px] font-bold text-white transition-opacity active:opacity-80 disabled:cursor-default disabled:opacity-75"
              style={{
                background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
                boxShadow: "0 4px 20px rgba(99,102,241,0.32)",
              }}
            >
              {loading ? (
                <>
                  <Spinner />
                  <span>Sending code…</span>
                </>
              ) : (
                "Login / Sign up"
              )}
            </button>
          </div>
        </div>

        {/* ── Step 2: OTP ─────────────────────────────────────────────────── */}
        <div
          className={panelBase}
          aria-hidden={step !== "otp"}
          {...(step !== "otp" ? { inert: "" } : {})}
          style={{
            transform: step === "otp" ? "translateX(0)" : "translateX(100%)",
            transition: "transform 0.32s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <div style={{ height: "env(safe-area-inset-top, 0px)" }} />

          <div className="flex w-full items-center px-5 pt-4">
            <button
              onClick={handleBack}
              aria-label="Back to email"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-black/[0.06] text-[#0C0C0C] transition-colors active:bg-black/[0.12]"
            >
              <svg
                width="8"
                height="13"
                viewBox="0 0 8 13"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M7 1.5L1.5 6.5L7 11.5"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <div className="flex w-full flex-col items-center pt-10 pb-8">
            <span
              className="select-none font-logo text-[40px] font-black leading-none tracking-[-2.5px] text-[#0C0C0C]"
              aria-label="arc."
            >
              arc<span style={{ color: "#F5A623" }}>.</span>
            </span>
          </div>

          <div className="w-full max-w-[360px] px-6">
            <h1 className="text-[26px] font-bold leading-tight text-[#0C0C0C]">
              Check your email
            </h1>
            <p className="mt-1.5 text-[15px] leading-relaxed text-[#8C8C8C]">
              We sent a 6-digit code to{" "}
              <span className="font-semibold text-[#0C0C0C]">{email}</span>
            </p>
          </div>

          <div
            className="mt-8 w-full max-w-[360px] px-6"
            key={`shake-otp-${shakeKey}`}
            style={
              error && step === "otp"
                ? { animation: "authShake 0.35s ease" }
                : undefined
            }
          >
            <div
              className="flex justify-between gap-2"
              role="group"
              aria-label="Verification code"
            >
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    if (el) digitRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  autoComplete="one-time-code"
                  aria-label={`Digit ${i + 1}`}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(i, e)}
                  onPaste={handleDigitPaste}
                  onFocus={(e) =>
                    (e.currentTarget as HTMLInputElement).select()
                  }
                  className="h-16 rounded-2xl border text-center text-[22px] font-bold text-[#0C0C0C] outline-none"
                  style={{
                    width: "calc((100% - 40px) / 6)",
                    borderColor: digit ? "#10B981" : "#EBEBEB",
                    background: digit ? "rgba(16,185,129,0.04)" : "#fff",
                    transition:
                      "border-color 0.18s, box-shadow 0.18s, transform 0.18s",
                  }}
                  onFocusCapture={(e) => {
                    const el = e.currentTarget as HTMLInputElement;
                    el.style.borderColor = "#6366F1";
                    el.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)";
                    el.style.transform = "scale(1.05)";
                  }}
                  onBlurCapture={(e) => {
                    const el = e.currentTarget as HTMLInputElement;
                    el.style.borderColor = el.value ? "#10B981" : "#EBEBEB";
                    el.style.boxShadow = "none";
                    el.style.transform = "scale(1)";
                  }}
                />
              ))}
            </div>
            {error && step === "otp" && (
              <p
                className="mt-3 text-center text-[13px] text-[#EF4444]"
                role="alert"
              >
                {error}
              </p>
            )}
          </div>

          <div className="mt-5 flex items-center gap-1">
            <span className="text-[13px] text-[#8C8C8C]">
              Didn&apos;t get it?
            </span>
            <button
              onClick={handleResend}
              disabled={resendCooldown > 0 || loading}
              className="cursor-pointer border-none bg-transparent text-[13px] font-semibold text-[#6366F1] transition-opacity disabled:cursor-default disabled:opacity-50"
              aria-label={
                resendCooldown > 0
                  ? `Resend code in ${resendCooldown}s`
                  : "Resend code"
              }
            >
              {resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : "Resend code"}
            </button>
          </div>

          {/* CTA — absolute within panel, lifts with keyboard */}
          <div
            className="absolute left-0 right-0 px-6"
            style={{
              bottom: btnBottom,
              transition: "bottom 0.28s cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            <button
              onClick={() => handleVerifyOtp(otpCode)}
              disabled={loading || !otpFilled}
              aria-busy={loading}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-none py-[15px] text-[16px] font-bold text-white transition-opacity active:opacity-80 disabled:cursor-default disabled:opacity-75"
              style={{
                background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
                boxShadow: "0 4px 20px rgba(99,102,241,0.32)",
              }}
            >
              {loading ? <Spinner /> : "Verify"}
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
  },
);

AuthPage.displayName = "AuthPage";
