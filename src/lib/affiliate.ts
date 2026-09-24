/** Public app origin for share/join links (no trailing slash). Falls back to window.location.origin. */
import { getSessionUser, getToken, isApiConfigured, tapstackApi } from '../api/client'

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
const PLAYER_AFFILIATE_WELCOME_KEY = 'tapstack_player_affiliate_welcome'
const PLAYER_SEEN_AFFILIATES_KEY = 'tapstack_player_seen_affiliate_ids'
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

export type PlayerAffiliateWelcome = {
  vendorName: string
  vendorId?: number
  alreadyJoined?: boolean
}

export function setPlayerAffiliateWelcome(next: PlayerAffiliateWelcome): void {
  const name = next.vendorName.trim()
  if (!name) return
  try {
    sessionStorage.setItem(
      PLAYER_AFFILIATE_WELCOME_KEY,
      JSON.stringify({
        vendorName: name,
        vendorId: next.vendorId || 0,
        alreadyJoined: Boolean(next.alreadyJoined),
      }),
    )
  } catch {
    /* ignore */
  }
}

export function consumePlayerAffiliateWelcome(): PlayerAffiliateWelcome | null {
  try {
    const raw = sessionStorage.getItem(PLAYER_AFFILIATE_WELCOME_KEY)
    if (!raw) return null
    sessionStorage.removeItem(PLAYER_AFFILIATE_WELCOME_KEY)
    const parsed = JSON.parse(raw) as PlayerAffiliateWelcome
    const name = String(parsed?.vendorName || '').trim()
    if (!name) return null
    return {
      vendorName: name,
      vendorId: Number(parsed.vendorId) || 0,
      alreadyJoined: Boolean(parsed.alreadyJoined),
    }
  } catch {
    return null
  }
}

function playerWelcomeStateKey(): string {
  return PLAYER_SEEN_AFFILIATES_KEY
}

type PlayerWelcomeState = {
  initialized: number[]
  shown: string[]
}

function welcomePair(playerId: number, vendorId: number): string {
  return `${playerId}:${vendorId}`
}

function readWelcomeState(): PlayerWelcomeState {
  try {
    const raw = localStorage.getItem(playerWelcomeStateKey())
    if (!raw) return { initialized: [], shown: [] }
    const parsed = JSON.parse(raw) as Partial<PlayerWelcomeState>
    return {
      initialized: Array.isArray(parsed.initialized)
        ? parsed.initialized.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
        : [],
      shown: Array.isArray(parsed.shown) ? parsed.shown.map((item) => String(item)) : [],
    }
  } catch {
    return { initialized: [], shown: [] }
  }
}

function writeWelcomeState(state: PlayerWelcomeState): void {
  try {
    localStorage.setItem(playerWelcomeStateKey(), JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

function currentPlayerId(fallback?: number): number {
  const id = Number(fallback ?? getSessionUser()?.id)
  return Number.isFinite(id) && id > 0 ? id : 0
}

/** One-shot welcome when a player is newly added to a vendor affiliate program. */
export function detectNewPlayerAffiliates(
  affiliates: Array<{ vendorId?: number; vendorName?: string; enabled?: boolean }>,
  playerId?: number,
): PlayerAffiliateWelcome | null {
  const pid = currentPlayerId(playerId)
  if (!pid) return null

  const enabled = affiliates.filter((row) => row.enabled !== false && Number(row.vendorId) > 0)
  const state = readWelcomeState()

  if (!state.initialized.includes(pid)) {
    for (const row of enabled) {
      const pair = welcomePair(pid, Number(row.vendorId))
      if (!state.shown.includes(pair)) state.shown.push(pair)
    }
    state.initialized.push(pid)
    writeWelcomeState(state)
    return null
  }

  const first = enabled.find((row) => !state.shown.includes(welcomePair(pid, Number(row.vendorId))))
  if (!first) return null
  const name = String(first.vendorName || '').trim()
  if (!name) return null

  const pair = welcomePair(pid, Number(first.vendorId))
  if (!state.shown.includes(pair)) state.shown.push(pair)
  writeWelcomeState(state)

  return {
    vendorName: name,
    vendorId: Number(first.vendorId) || 0,
    alreadyJoined: false,
  }
}

export function rememberPlayerAffiliateIds(
  affiliates: Array<{ vendorId?: number; enabled?: boolean }>,
  playerId?: number,
): void {
  const pid = currentPlayerId(playerId)
  if (!pid) return
  const state = readWelcomeState()
  if (!state.initialized.includes(pid)) state.initialized.push(pid)
  for (const row of affiliates) {
    if (row.enabled === false || Number(row.vendorId) <= 0) continue
    const pair = welcomePair(pid, Number(row.vendorId))
    if (!state.shown.includes(pair)) state.shown.push(pair)
  }
  writeWelcomeState(state)
}

export function forgetSeenPlayerAffiliate(vendorId: number, playerId?: number): void {
  const pid = currentPlayerId(playerId)
  const vid = Number(vendorId)
  if (!pid || !vid) return
  const state = readWelcomeState()
  const pair = welcomePair(pid, vid)
  state.shown = state.shown.filter((item) => item !== pair)
  writeWelcomeState(state)
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
