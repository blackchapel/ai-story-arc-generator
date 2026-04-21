import { useState, useCallback, useEffect, useRef } from 'react'

export type ToastType = "error" | "success";

export interface ToastOptions {
  type?: ToastType;
  subtitle?: string;
  tag?: string;
  /** Called when the user taps the toast body or the action button. */
  onAction?: () => void;
  /** Label for the action button. Defaults to "View" when onAction is set. */
  actionLabel?: string;
  durationMs?: number;
}

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  subtitle?: string;
  tag?: string;
  onAction?: () => void;
  actionLabel?: string;
}

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string, typeOrOptions?: ToastType | ToastOptions) => {
    if (timerRef.current) clearTimeout(timerRef.current)

    const opts: ToastOptions =
      typeof typeOrOptions === "string"
        ? { type: typeOrOptions }
        : (typeOrOptions ?? {});

    const type = opts.type ?? "error";
    const duration = opts.durationMs ?? (opts.onAction ? 7000 : 4000);

    setToast({
      id: Date.now(),
      message,
      type,
      subtitle: opts.subtitle,
      tag: opts.tag,
      onAction: opts.onAction,
      actionLabel: opts.actionLabel,
    })

    timerRef.current = setTimeout(() => setToast(null), duration)
  }, [])

  const dismissToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast(null)
  }, [])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  return { toast, showToast, dismissToast }
}
