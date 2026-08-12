import type { ApiVendor } from '../api/client'

export type VendorGame = {
  name: string
  icon: string
  iconBg: string
  active: boolean
  mode: 'auto' | 'manual'
  balance: string
}

export type Vendor = {
  id?: number | string
  initials: string
  name: string
  handle: string
  color: string
  text: string
  code?: string
  games: VendorGame[]
}

const PALETTE: Array<{ color: string; text: string }> = [
  { color: '#dbeafe', text: '#2563eb' },
  { color: '#dcfce7', text: '#16a34a' },
  { color: '#ffedd5', text: '#ea580c' },
  { color: '#ede9fe', text: '#7c3aed' },
  { color: '#d1fae5', text: '#059669' },
  { color: '#fce7f3', text: '#db2777' },
  { color: '#cffafe', text: '#0891b2' },
  { color: '#fef9c3', text: '#ca8a04' },
]

function hashName(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return hash
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

export function handleFromName(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .join('')
    .slice(0, 24) || 'Vendor'
}

export function defaultGames(vendorName: string): VendorGame[] {
  return [
    { name: `${vendorName} Classic`, icon: '🎰', iconBg: '#fef3c7', active: true, mode: 'auto', balance: '$0.00' },
    { name: `${vendorName} Pro`, icon: '🎯', iconBg: '#dbeafe', active: true, mode: 'manual', balance: '$0.00' },
    { name: `${vendorName} Deluxe`, icon: '💎', iconBg: '#ede9fe', active: true, mode: 'auto', balance: '$0.00' },
  ]
}

export function createVendorFromName(name: string, id?: number | string): Vendor {
  const trimmed = name.trim()
  const palette = PALETTE[hashName(trimmed.toLowerCase()) % PALETTE.length]
  return {
    id: id ?? `local-${trimmed.toLowerCase().replace(/\s+/g, '-')}`,
    initials: initialsFromName(trimmed),
    name: trimmed,
    handle: handleFromName(trimmed),
    color: palette.color,
    text: palette.text,
    games: defaultGames(trimmed),
  }
}

const GAME_ICONS: Record<string, string> = {
  'golden dragon': '🐉',
  'river sweeps': '🌊',
  'fire kirin': '🐟',
  'panda master': '🐼',
  'ultra monster': '👾',
  classic: '🎰',
  pro: '🎯',
  deluxe: '💎',
}

function looksLikeBrokenEscape(value: string): boolean {
  return /\\u[0-9a-fA-F]{4}/i.test(value) || /(?:^|[^a-z])u[0-9a-fA-F]{4}/i.test(value)
}

export function decodeIcon(value: string | undefined | null, gameName?: string): string {
  const fallbackFromName = (() => {
    const key = (gameName || '').trim().toLowerCase()
    if (!key) return '🎮'
    if (GAME_ICONS[key]) return GAME_ICONS[key]
    for (const [name, icon] of Object.entries(GAME_ICONS)) {
      if (key.includes(name)) return icon
    }
    return '🎮'
  })()

  if (!value) return fallbackFromName
  const trimmed = String(value).trim()
  if (!trimmed) return fallbackFromName

  // Already a real emoji / short symbol
  if (!looksLikeBrokenEscape(trimmed) && !/^[\\u0-9a-fA-F]+$/i.test(trimmed)) {
    // Reject leftover surrogate garbage like "udc09" fragments
    if (/^ud[c-f][0-9a-f]/i.test(trimmed) || trimmed.length <= 4 && /^[a-z0-9]+$/i.test(trimmed)) {
      return fallbackFromName
    }
    return trimmed
  }

  // Normalize every uXXXX / \uXXXX chunk into proper JSON unicode escapes.
  const normalized = trimmed
    .replace(/\\u([0-9a-fA-F]{4})/gi, (_, hex: string) => `\\u${hex}`)
    .replace(/(?<!\\)u([0-9a-fA-F]{4})/gi, (_, hex: string) => `\\u${hex}`)

  try {
    const decoded = JSON.parse(`"${normalized.replace(/"/g, '\\"')}"`) as string
    if (decoded && !looksLikeBrokenEscape(decoded) && !/^ud[c-f]/i.test(decoded)) {
      return decoded
    }
  } catch {
    // fall through
  }

  // Manual code-point decode for sequences like ud83dudc09
  const hexes = [...trimmed.matchAll(/u([0-9a-fA-F]{4})/gi)].map((match) => match[1])
  if (hexes.length > 0) {
    try {
      const chars = hexes.map((hex) => String.fromCharCode(parseInt(hex, 16))).join('')
      if (chars && !/^ud[c-f]/i.test(chars)) return chars
    } catch {
      // fall through
    }
  }

  return fallbackFromName
}

export function vendorFromApi(vendor: ApiVendor): Vendor {
  return {
    id: vendor.id,
    initials: vendor.initials || initialsFromName(vendor.name),
    name: vendor.name,
    handle: vendor.handle || handleFromName(vendor.name),
    color: vendor.color || '#dbeafe',
    text: vendor.text || '#2563eb',
    code: vendor.code,
    games: (vendor.games?.length ? vendor.games : defaultGames(vendor.name)).map((game) => ({
      ...game,
      icon: decodeIcon(game.icon, game.name),
      iconBg: game.iconBg || '#eef2ff',
      balance: '$0.00',
    })),
  }
}

const STORAGE_KEY = 'tapstack.player.vendors'

function storageKeyForUser(userId?: number | string | null): string {
  if (userId === undefined || userId === null || userId === '') return STORAGE_KEY
  return `${STORAGE_KEY}.${userId}`
}

function readVendorList(key: string): Vendor[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Vendor[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((vendor) => ({
      ...vendor,
      games: (vendor.games ?? []).map((game) => ({
        ...game,
        icon: decodeIcon(game.icon, game.name),
        balance: '$0.00',
      })),
    }))
  } catch {
    return []
  }
}

export function loadLocalVendors(userId?: number | string | null): Vendor[] {
  const keyed = readVendorList(storageKeyForUser(userId))
  if (keyed.length > 0) return keyed

  // Migrate legacy unscoped list once we know the player id.
  const legacy = readVendorList(STORAGE_KEY)
  if (legacy.length > 0 && userId !== undefined && userId !== null && userId !== '') {
    saveLocalVendors(legacy, userId)
  }
  return legacy
}

export function saveLocalVendors(vendors: Vendor[], userId?: number | string | null): void {
  try {
    localStorage.setItem(storageKeyForUser(userId), JSON.stringify(vendors))
    // Keep legacy key in sync for older builds.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vendors))
  } catch {
    // ignore quota / private mode
  }
}

/** Old plugin builds dump the full catalog when the player has no links. */
export function looksLikeVendorCatalogDump(vendors: Vendor[]): boolean {
  if (vendors.length < 4) return false
  const knownCodes = new Set(['lucky', 'ocean', 'pinball', 'neon', 'cash'])
  const knownNames = new Set([
    'lucky strike arcade',
    'ocean sluggerz',
    'pinball palace',
    'neon galaxy arcade',
    'cash carnival',
  ])
  const matched = vendors.filter(
    (vendor) =>
      knownCodes.has((vendor.code || '').toLowerCase()) ||
      knownNames.has(vendor.name.toLowerCase()),
  )
  return matched.length >= 4
}
