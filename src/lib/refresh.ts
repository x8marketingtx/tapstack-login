import { useEffect, useRef } from 'react'

export const MONEY_REFRESH_MS = 5000
export const ACTIVITY_PAGE_SIZE = 25
/** Cap per-tick game-balance fetches so a long catalog cannot stampede the API. */
export const MONEY_REFRESH_GAME_LIMIT = 6

export function useIntervalRefresh(callback: () => unknown, ms = MONEY_REFRESH_MS, enabled = true) {
  const saved = useRef(callback)
  saved.current = callback
  const inFlight = useRef(false)

  useEffect(() => {
    if (!enabled) return

    const run = () => {
      if (typeof document !== 'undefined' && document.hidden) return
      if (inFlight.current) return
      inFlight.current = true
      Promise.resolve(saved.current()).finally(() => {
        inFlight.current = false
      })
    }

    const id = window.setInterval(run, ms)
    const onVisibility = () => {
      if (!document.hidden) run()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, ms])
}

export function pageItems<T>(items: T[], page: number, size = ACTIVITY_PAGE_SIZE): T[] {
  const start = Math.max(0, (page - 1) * size)
  return items.slice(start, start + size)
}

export function pageCount(total: number, size = ACTIVITY_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / size))
}
