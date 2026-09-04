/** Public app origin for share/join links (no trailing slash). Falls back to window.location.origin. */
import { getToken, isApiConfigured, tapstackApi } from '../api/client'

export function appOrigin(): string {
  const fromEnv = (import.meta.env.VITE_APP_URL as string | undefined)?.trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '')
  }
  return 'https://tapstack.app'
}

export function joinLinkForSlug(slug: string): { url: string; display: string } {
  const clean = slug.trim().replace(/^\/+|\/+$/g, '')
  const origin = appOrigin()
  const host = origin.replace(/^https?:\/\//i, '')
  return {
    url: `${origin}/join/${encodeURIComponent(clean)}`,
    display: `${host}/join/${clean}`,
  }
}

export function slugFromJoinUrl(url: string): string {
  try {
    const path = url.includes('://') ? new URL(url).pathname : url
    const match = path.match(/\/join\/([^/]+)/i)
    return match?.[1] ? decodeURIComponent(match[1]) : ''
  } catch {
    return ''
  }
}

const AFFILIATE_KEY = 'tapstack_affiliate_slug'
const PENDING_VENDOR_JOIN_KEY = 'tapstack_pending_vendor_join'
/** @deprecated Cleared for legacy player-join behavior. */
const PENDING_PLAYER_JOIN_KEY = 'tapstack_pending_player_join'

export function setAffiliateSlug(slug: string): void {
  const clean = slug.trim().toLowerCase()
  if (!clean) return
  try {
    sessionStorage.setItem(AFFILIATE_KEY, clean)
    localStorage.setItem(AFFILIATE_KEY, clean)
  } catch {
    // ignore storage failures
  }
}

export function getAffiliateSlug(): string {
  try {
    return (sessionStorage.getItem(AFFILIATE_KEY) || localStorage.getItem(AFFILIATE_KEY) || '').trim()
  } catch {
    return ''
  }
}

export function clearAffiliateSlug(): void {
  try {
    sessionStorage.removeItem(AFFILIATE_KEY)
    localStorage.removeItem(AFFILIATE_KEY)
  } catch {
    // ignore
  }
}

/** After login as a vendor, attach this store to the distributor network. */
export function setPendingVendorJoin(slug: string): void {
  const clean = slug.trim().toLowerCase()
  if (!clean) return
  try {
    sessionStorage.setItem(PENDING_VENDOR_JOIN_KEY, clean)
    localStorage.setItem(PENDING_VENDOR_JOIN_KEY, clean)
    // Clear any legacy player-join pending state.
    sessionStorage.removeItem(PENDING_PLAYER_JOIN_KEY)
    localStorage.removeItem(PENDING_PLAYER_JOIN_KEY)
  } catch {
    // ignore
  }
  setAffiliateSlug(clean)
}

export function getPendingVendorJoin(): string {
  try {
    return (
      sessionStorage.getItem(PENDING_VENDOR_JOIN_KEY) ||
      localStorage.getItem(PENDING_VENDOR_JOIN_KEY) ||
      ''
    ).trim()
  } catch {
    return ''
  }
}

export function clearPendingVendorJoin(): void {
  try {
    sessionStorage.removeItem(PENDING_VENDOR_JOIN_KEY)
    localStorage.removeItem(PENDING_VENDOR_JOIN_KEY)
  } catch {
    // ignore
  }
}

export async function consumePendingVendorJoin(): Promise<boolean> {
  const slug = getPendingVendorJoin()
  if (!slug) return false
  clearPendingVendorJoin()
  try {
    if (!isApiConfigured()) return false
    const token = getToken()
    if (!token || token.startsWith('demo:')) return false
    await tapstackApi.vendorJoinDistributor(slug)
    return true
  } catch {
    return false
  }
}

/** @deprecated Player join links are a no-op; kept so old imports compile during transition. */
export function setPendingPlayerJoin(slug: string): void {
  setPendingVendorJoin(slug)
}

export function clearPendingPlayerJoin(): void {
  try {
    sessionStorage.removeItem(PENDING_PLAYER_JOIN_KEY)
    localStorage.removeItem(PENDING_PLAYER_JOIN_KEY)
  } catch {
    // ignore
  }
  clearPendingVendorJoin()
}

export async function consumePendingPlayerJoin(): Promise<boolean> {
  clearPendingPlayerJoin()
  return false
}
