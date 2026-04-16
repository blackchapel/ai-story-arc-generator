import { useState, useCallback, useEffect, useRef } from 'react'

export type ToastType = "error" | "success";

export interface Toast {
  id: number
  message: string
  type: ToastType
}

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string, type: ToastType = "error", durationMs = 4000) => {
    if (timerRef.current) clearTimeout(timerRef.current)

    setToast({ id: Date.now(), message, type })

    timerRef.current = setTimeout(() => {
      setToast(null)
    }, durationMs)
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
