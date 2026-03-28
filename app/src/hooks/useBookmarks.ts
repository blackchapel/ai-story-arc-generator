import { useState, useCallback } from 'react'

/**
 * Manages bookmark state for article IDs.
 * Persists to localStorage.
 */
export function useBookmarks() {
  const [bookmarked, setBookmarked] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('arc-bookmarks')
      return raw ? new Set<string>(JSON.parse(raw) as string[]) : new Set<string>()
    } catch {
      return new Set<string>()
    }
  })

  const toggle = useCallback((id: string) => {
    setBookmarked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      try {
        localStorage.setItem('arc-bookmarks', JSON.stringify([...next]))
      } catch {
        /* storage unavailable — silently fail */
      }
      return next
    })
  }, [])

  const isBookmarked = useCallback((id: string) => bookmarked.has(id), [bookmarked])

  return { isBookmarked, toggle }
}
