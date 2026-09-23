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
const PENDING_VENDOR_JOIN_NAME_KEY = 'tapstack_pending_vendor_join_name'
const VENDOR_AFFILIATE_WELCOME_KEY = 'tapstack_vendor_affiliate_welcome'
const PLAYER_AFFILIATE_REF_KEY = 'tapstack_player_affiliate_ref'
/** @deprecated Cleared for legacy player-join behavior. */
const PENDING_PLAYER_JOIN_KEY = 'tapstack_pending_player_join'

export type VendorAffiliateWelcome = {
  distributorName: string
  distributorId?: number
  alreadyJoined?: boolean
}

export function setVendorAffiliateWelcome(next: VendorAffiliateWelcome): void {
  const name = next.distributorName.trim()
  if (!name) return
  try {
    sessionStorage.setItem(
      VENDOR_AFFILIATE_WELCOME_KEY,
      JSON.stringify({
        distributorName: name,
        distributorId: next.distributorId || 0,
        alreadyJoined: Boolean(next.alreadyJoined),
      }),
    )
  } catch {
    /* ignore */
  }
}

export function consumeVendorAffiliateWelcome(): VendorAffiliateWelcome | null {
  try {
    const raw = sessionStorage.getItem(VENDOR_AFFILIATE_WELCOME_KEY)
    if (!raw) return null
    sessionStorage.removeItem(VENDOR_AFFILIATE_WELCOME_KEY)
    const parsed = JSON.parse(raw) as VendorAffiliateWelcome
    const name = String(parsed?.distributorName || '').trim()
    if (!name) return null
    return {
      distributorName: name,
      distributorId: Number(parsed.distributorId) || 0,
      alreadyJoined: Boolean(parsed.alreadyJoined),
    }
  } catch {
    return null
  }
}

function forgetStaleLocalJoin(): void {
  try {
    localStorage.removeItem(AFFILIATE_KEY)
    localStorage.removeItem(PENDING_VENDOR_JOIN_KEY)
    localStorage.removeItem(PENDING_VENDOR_JOIN_NAME_KEY)
  } catch {
    /* ignore */
  }
}

export function setAffiliateSlug(slug: string): void {
  const clean = slug.trim().toLowerCase()
  if (!clean) return
  try {
    forgetStaleLocalJoin()
    sessionStorage.setItem(AFFILIATE_KEY, clean)
  } catch {
    // ignore storage failures
  }
}

export function getAffiliateSlug(): string {
  forgetStaleLocalJoin()
  try {
    return (sessionStorage.getItem(AFFILIATE_KEY) || '').trim()
  } catch {
    return ''
  }
}

export function clearAffiliateSlug(): void {
  try {
    sessionStorage.removeItem(AFFILIATE_KEY)
    forgetStaleLocalJoin()
  } catch {
    // ignore
  }
}

export function setPlayerAffiliateRef(code: string): void {
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!clean) return
  try {
    sessionStorage.setItem(PLAYER_AFFILIATE_REF_KEY, clean)
    localStorage.setItem(PLAYER_AFFILIATE_REF_KEY, clean)
  } catch {
    /* ignore */
  }
}

export function getPlayerAffiliateRef(): string {
  try {
    return (sessionStorage.getItem(PLAYER_AFFILIATE_REF_KEY) || localStorage.getItem(PLAYER_AFFILIATE_REF_KEY) || '')
      .trim()
      .toUpperCase()
  } catch {
    return ''
  }
}

export function clearPlayerAffiliateRef(): void {
  try {
    sessionStorage.removeItem(PLAYER_AFFILIATE_REF_KEY)
    localStorage.removeItem(PLAYER_AFFILIATE_REF_KEY)
  } catch {
    /* ignore */
  }
}

/** After login as a vendor, attach this store to the distributor network. */
export function setPendingVendorJoin(slug: string, distributorName = ''): void {
  const clean = slug.trim().toLowerCase()
  if (!clean) return
  try {
    forgetStaleLocalJoin()
    sessionStorage.setItem(PENDING_VENDOR_JOIN_KEY, clean)
    const name = distributorName.trim()
    if (name) {
      sessionStorage.setItem(PENDING_VENDOR_JOIN_NAME_KEY, name)
    } else {
      sessionStorage.removeItem(PENDING_VENDOR_JOIN_NAME_KEY)
    }
    sessionStorage.removeItem(PENDING_PLAYER_JOIN_KEY)
    localStorage.removeItem(PENDING_PLAYER_JOIN_KEY)
  } catch {
    // ignore
  }
  setAffiliateSlug(clean)
}

export function getPendingVendorJoin(): string {
  forgetStaleLocalJoin()
  try {
    return (sessionStorage.getItem(PENDING_VENDOR_JOIN_KEY) || '').trim()
  } catch {
    return ''
  }
}

export function getPendingVendorJoinName(): string {
  forgetStaleLocalJoin()
  try {
    return (sessionStorage.getItem(PENDING_VENDOR_JOIN_NAME_KEY) || '').trim()
  } catch {
    return ''
  }
}

export function clearPendingVendorJoin(): void {
  try {
    sessionStorage.removeItem(PENDING_VENDOR_JOIN_KEY)
    localStorage.removeItem(PENDING_VENDOR_JOIN_KEY)
    sessionStorage.removeItem(PENDING_VENDOR_JOIN_NAME_KEY)
    localStorage.removeItem(PENDING_VENDOR_JOIN_NAME_KEY)
  } catch {
    // ignore
  }
}

export async function consumePendingVendorJoin(): Promise<boolean> {
  const slug = getPendingVendorJoin()
  if (!slug) return false
  const fallbackName = getPendingVendorJoinName()
  try {
    if (!isApiConfigured()) return false
    const token = getToken()
    if (!token || token.startsWith('demo:')) {
      clearPendingVendorJoin()
      return false
    }
    const res = await tapstackApi.vendorJoinDistributor(slug)
    clearPendingVendorJoin()
    const name = (res.distributorName || fallbackName).trim()
    if (name) {
      setVendorAffiliateWelcome({
        distributorName: name,
        distributorId: res.distributorId,
        alreadyJoined: Boolean(res.alreadyJoined),
      })
    }
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
