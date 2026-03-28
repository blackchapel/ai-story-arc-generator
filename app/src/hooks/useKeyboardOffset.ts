import { useState, useEffect, useCallback } from 'react'

/**
 * Tracks keyboard height using the VisualViewport API.
 * Returns the pixel offset the prompt bar should move up.
 */
export function useKeyboardOffset(): number {
  const [offset, setOffset] = useState(0)

  const update = useCallback(() => {
    if (!window.visualViewport) return
    const kbHeight = Math.max(
      0,
      window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop,
    )
    setOffset(kbHeight > 50 ? kbHeight : 0)
  }, [])

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    vv.addEventListener('resize', update, { passive: true })
    vv.addEventListener('scroll', update, { passive: true })
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [update])

  return offset
}
