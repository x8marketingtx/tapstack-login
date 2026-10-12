import { useEffect, useRef } from 'react'

/** Sign out after this much time without user activity on a dashboard. */
export const IDLE_LOGOUT_MS = 5 * 60 * 1000

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'wheel'] as const

export function useIdleLogout(onLogout: () => void, enabled: boolean) {
  const onLogoutRef = useRef(onLogout)
  onLogoutRef.current = onLogout

  useEffect(() => {
    if (!enabled) return

    let timeoutId = 0
    let lastActivityAt = Date.now()

    function logoutNow() {
      onLogoutRef.current()
    }

    function scheduleLogout() {
      window.clearTimeout(timeoutId)
      const elapsed = Date.now() - lastActivityAt
      const remaining = Math.max(0, IDLE_LOGOUT_MS - elapsed)
      timeoutId = window.setTimeout(logoutNow, remaining)
    }

    function markActive() {
      lastActivityAt = Date.now()
      scheduleLogout()
    }

    function onVisibilityChange() {
      if (document.hidden) return
      if (Date.now() - lastActivityAt >= IDLE_LOGOUT_MS) {
        logoutNow()
        return
      }
      scheduleLogout()
    }

    markActive()
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, markActive, { passive: true })
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.clearTimeout(timeoutId)
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, markActive)
      }
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [enabled])
}
