import { useState, useCallback, useRef } from 'react'

export interface Toast {
  id: number
  message: string
}

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string, durationMs = 4000) => {
    if (timerRef.current) clearTimeout(timerRef.current)

    setToast({ id: Date.now(), message })

    timerRef.current = setTimeout(() => {
      setToast(null)
    }, durationMs)
  }, [])

  const dismissToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast(null)
  }, [])

  return { toast, showToast, dismissToast }
}
