import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Tracks keyboard height using the VisualViewport API.
 * Returns the pixel offset the bottom sheet should move up.
 *
 * Keyboard-open updates are immediate; keyboard-close is debounced by 120ms
 * so focus switches between inputs (which briefly report height=0) don't
 * cause the sheet to jump down then back up.
 */
export function useKeyboardOffset(): number {
  const [offset, setOffset] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const update = useCallback(() => {
    if (!window.visualViewport) return
    const kbHeight = Math.max(
      0,
      window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop,
    )
    if (kbHeight > 50) {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
      setOffset(kbHeight)
    } else {
      // Debounce collapse — avoids jitter when focus moves between inputs
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => { timerRef.current = null; setOffset(0) }, 120)
    }
  }, [])

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    vv.addEventListener('resize', update, { passive: true })
    vv.addEventListener('scroll', update, { passive: true })
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [update])

  return offset
}
