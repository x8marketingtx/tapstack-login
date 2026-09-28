import { useEffect, useRef } from 'react'

export const MONEY_REFRESH_MS = 5000
export const ACTIVITY_PAGE_SIZE = 25

export function useIntervalRefresh(callback: () => void, ms = MONEY_REFRESH_MS, enabled = true) {
  const saved = useRef(callback)
  saved.current = callback

  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => saved.current(), ms)
    return () => window.clearInterval(id)
  }, [enabled, ms])
}

export function pageItems<T>(items: T[], page: number, size = ACTIVITY_PAGE_SIZE): T[] {
  const start = Math.max(0, (page - 1) * size)
  return items.slice(start, start + size)
}

export function pageCount(total: number, size = ACTIVITY_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / size))
}
