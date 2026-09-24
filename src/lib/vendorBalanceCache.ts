import { getSessionUser } from '../api/client'

export const VENDOR_BALANCE_TTL_MS = 30 * 60 * 1000

type TotalsEntry = {
  playable: number
  redeemable: number
  fetchedAt: number
}

type GameEntry = {
  payable: number
  redeemable: number
  payableFormatted: string
  redeemableFormatted: string
  fetchedAt: number
}

type CacheFile = {
  totals: Record<string, TotalsEntry>
  games: Record<string, GameEntry>
}

function cacheUserId(): string {
  const id = getSessionUser()?.id
  return id != null && String(id) !== '' ? String(id) : 'guest'
}

function hasMoney(value: number | undefined): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function storageKey(userId = cacheUserId()): string {
  return `tapstack_vendor_balances_v2:${userId}`
}

function dropLegacyCache(userId = cacheUserId()) {
  try {
    localStorage.removeItem(`tapstack_vendor_balances_v1:${userId}`)
  } catch {
    /* ignore */
  }
}

function gameCacheKey(vendorId: number | string, gameKey: string): string {
  return `${vendorId}:${gameKey}`
}

function emptyCache(): CacheFile {
  return { totals: {}, games: {} }
}

function readFile(userId?: string): CacheFile {
  dropLegacyCache(userId)
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return emptyCache()
    const parsed = JSON.parse(raw) as CacheFile
    return {
      totals: parsed?.totals && typeof parsed.totals === 'object' ? parsed.totals : {},
      games: parsed?.games && typeof parsed.games === 'object' ? parsed.games : {},
    }
  } catch {
    return emptyCache()
  }
}

function writeFile(file: CacheFile, userId?: string) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(file))
  } catch {
    /* ignore quota / private mode */
  }
}

function isFresh(fetchedAt: number): boolean {
  return Date.now() - fetchedAt < VENDOR_BALANCE_TTL_MS
}

export function readCachedVendorTotals(
  vendorKey: string,
): { playable: number; redeemable: number } | null {
  const entry = readFile().totals[vendorKey]
  if (!entry || !isFresh(entry.fetchedAt)) return null
  if (!hasMoney(entry.playable) && !hasMoney(entry.redeemable)) return null
  return { playable: entry.playable, redeemable: entry.redeemable }
}

export function writeCachedVendorTotals(
  vendorKey: string,
  playable: number,
  redeemable: number,
) {
  if (!hasMoney(playable) && !hasMoney(redeemable)) return
  const file = readFile()
  file.totals[vendorKey] = { playable, redeemable, fetchedAt: Date.now() }
  writeFile(file)
}

export function readCachedGameBalance(
  vendorId: number | string,
  gameKey: string,
): GameEntry | null {
  const entry = readFile().games[gameCacheKey(vendorId, gameKey)]
  if (!entry || !isFresh(entry.fetchedAt)) return null
  if (!hasMoney(entry.payable) && !hasMoney(entry.redeemable)) return null
  return entry
}

export function writeCachedGameBalance(
  vendorId: number | string,
  gameKey: string,
  entry: Omit<GameEntry, 'fetchedAt'>,
) {
  if (!hasMoney(entry.payable) && !hasMoney(entry.redeemable)) return
  const file = readFile()
  file.games[gameCacheKey(vendorId, gameKey)] = { ...entry, fetchedAt: Date.now() }
  writeFile(file)
}

export function invalidateVendorBalanceCache(vendorKey?: string, vendorId?: number | string | null) {
  const file = readFile()
  if (!vendorKey && vendorId == null) {
    writeFile(emptyCache())
    return
  }
  if (vendorKey) delete file.totals[vendorKey]
  if (vendorId != null) {
    const prefix = `${vendorId}:`
    for (const key of Object.keys(file.games)) {
      if (key.startsWith(prefix)) delete file.games[key]
    }
  }
  writeFile(file)
}
