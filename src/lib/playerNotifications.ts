import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  tapstackApi,
  type PlayerNotification,
  type PlayerNotificationKind,
  type WalletTxn,
} from '../api/client'

const READ_STORAGE_PREFIX = 'tapstack_player_notif_read:'

export const DEMO_PLAYER_NOTIFICATIONS: PlayerNotification[] = [
  {
    id: 'demo-platform-welcome',
    kind: 'platform',
    title: 'Welcome to TapStack',
    body: 'Link vendors, load games, and earn tickets for the Monthly Mega Draw.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    read: true,
  },
  {
    id: 'demo-promo-happy-hour',
    kind: 'promo',
    title: 'Happy hour bonus',
    body: 'Extra chips on video ads until 8 PM in your timezone.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    read: false,
  },
]

function readStorageKey(userId?: number | string | null): string {
  return `${READ_STORAGE_PREFIX}${userId ?? 'guest'}`
}

export function loadPlayerNotificationReadIds(userId?: number | string | null): Set<string> {
  try {
    const raw = localStorage.getItem(readStorageKey(userId))
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as string[]
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

export function savePlayerNotificationReadIds(
  userId: number | string | null | undefined,
  ids: Set<string>,
): void {
  try {
    localStorage.setItem(readStorageKey(userId), JSON.stringify([...ids]))
  } catch {
    /* ignore */
  }
}

function parseNotificationKind(value: unknown): PlayerNotificationKind {
  const raw = String(value || '').toLowerCase()
  if (raw === 'game_load' || raw === 'load' || raw === 'game') return 'game_load'
  if (raw === 'wallet' || raw === 'topup' || raw === 'deposit' || raw === 'payout') return 'wallet'
  if (raw === 'vendor') return 'vendor'
  if (raw === 'ticket' || raw === 'giveaway' || raw === 'win') return 'ticket'
  if (raw === 'promo' || raw === 'bonus') return 'promo'
  return 'platform'
}

export function normalizePlayerNotification(raw: unknown): PlayerNotification | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const id = row.id != null ? String(row.id) : ''
  if (!id) return null
  const title = typeof row.title === 'string' ? row.title : 'Notification'
  const body = typeof row.body === 'string' ? row.body : undefined
  const createdAt =
    typeof row.createdAt === 'string'
      ? row.createdAt
      : typeof row.time === 'string'
        ? row.time
        : new Date().toISOString()
  return {
    id,
    kind: parseNotificationKind(row.kind ?? row.type),
    title,
    body,
    createdAt,
    read: Boolean(row.read),
  }
}

export function notificationFromWalletTxn(txn: WalletTxn): PlayerNotification {
  const type = (txn.type || '').toLowerCase()
  const titleLower = (txn.title || '').toLowerCase()
  const combined = `${type} ${titleLower}`

  let kind: PlayerNotificationKind = 'wallet'
  if (/load|game|credits loaded|transfer/.test(combined)) kind = 'game_load'
  else if (/ticket|giveaway|draw|mega|win|entry/.test(combined)) kind = 'ticket'
  else if (/promo|bonus|coupon|mission|reward/.test(combined)) kind = 'promo'
  else if (/vendor|affiliate/.test(combined)) kind = 'vendor'
  else if (/platform|announce|alert|update/.test(combined)) kind = 'platform'

  const parts: string[] = []
  if (txn.amount !== 0) {
    parts.push(`${txn.amount >= 0 ? '+' : '-'}$${Math.abs(txn.amount).toFixed(2)}`)
  }
  if (txn.points !== 0) {
    parts.push(`${txn.points >= 0 ? '+' : ''}${txn.points} pts`)
  }

  return {
    id: `txn-${txn.id}`,
    kind,
    title: txn.title || txn.type || 'Account update',
    body: parts.length ? parts.join(' · ') : undefined,
    createdAt: txn.createdAt || new Date().toISOString(),
    read: false,
  }
}

function notificationTimestamp(value: string): number {
  const ts = Date.parse(value.includes('T') ? value : value.replace(' ', 'T'))
  return Number.isFinite(ts) ? ts : 0
}

export function mergePlayerNotifications(...groups: PlayerNotification[][]): PlayerNotification[] {
  const byId = new Map<string, PlayerNotification>()
  for (const group of groups) {
    for (const item of group) {
      const existing = byId.get(item.id)
      if (!existing) {
        byId.set(item.id, item)
        continue
      }
      byId.set(item.id, {
        ...existing,
        ...item,
        read: existing.read && item.read,
      })
    }
  }
  return [...byId.values()].sort(
    (a, b) => notificationTimestamp(b.createdAt) - notificationTimestamp(a.createdAt),
  )
}

export function applyPlayerNotificationReadState(
  items: PlayerNotification[],
  readIds: Set<string>,
): PlayerNotification[] {
  if (readIds.size === 0) return items
  return items.map((item) =>
    readIds.has(item.id) || item.read ? { ...item, read: true } : item,
  )
}

export type PushPlayerNotificationInput = {
  id?: string
  kind: PlayerNotificationKind
  title: string
  body?: string
  createdAt?: string
}

export function usePlayerNotifications(opts: {
  useApi: boolean
  userId?: number | string | null
  walletTxns: WalletTxn[]
}) {
  const [apiItems, setApiItems] = useState<PlayerNotification[]>([])
  const [localItems, setLocalItems] = useState<PlayerNotification[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(() =>
    loadPlayerNotificationReadIds(opts.userId),
  )

  useEffect(() => {
    setReadIds(loadPlayerNotificationReadIds(opts.userId))
  }, [opts.userId])

  useEffect(() => {
    if (!opts.useApi) {
      setApiItems([])
      return
    }
    let cancelled = false
    void tapstackApi
      .customerNotifications()
      .then((res) => {
        if (cancelled) return
        const list = Array.isArray(res.notifications) ? res.notifications : []
        setApiItems(
          list
            .map(normalizePlayerNotification)
            .filter((row): row is PlayerNotification => row != null),
        )
      })
      .catch(() => {
        if (!cancelled) setApiItems([])
      })
    return () => {
      cancelled = true
    }
  }, [opts.useApi])

  const txnItems = useMemo(
    () => (opts.useApi ? opts.walletTxns.map(notificationFromWalletTxn) : []),
    [opts.useApi, opts.walletTxns],
  )

  const seedItems = opts.useApi ? apiItems : DEMO_PLAYER_NOTIFICATIONS

  const items = useMemo(() => {
    const merged = mergePlayerNotifications(seedItems, txnItems, localItems)
    return applyPlayerNotificationReadState(merged, readIds)
  }, [seedItems, txnItems, localItems, readIds])

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items])

  const push = useCallback((input: PushPlayerNotificationInput) => {
    const item: PlayerNotification = {
      id: input.id ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind: input.kind,
      title: input.title,
      body: input.body,
      createdAt: input.createdAt ?? new Date().toISOString(),
      read: false,
    }
    setLocalItems((current) => [item, ...current.filter((row) => row.id !== item.id)])
  }, [])

  const markRead = useCallback(
    (id: string) => {
      setReadIds((current) => {
        if (current.has(id)) return current
        const next = new Set(current)
        next.add(id)
        savePlayerNotificationReadIds(opts.userId, next)
        return next
      })
    },
    [opts.userId],
  )

  const markAllRead = useCallback(() => {
    setReadIds((current) => {
      const next = new Set(current)
      for (const item of items) next.add(item.id)
      savePlayerNotificationReadIds(opts.userId, next)
      return next
    })
  }, [items, opts.userId])

  return { items, unreadCount, push, markRead, markAllRead }
}

export function formatPlayerNotificationTime(value: string): string {
  const ts = notificationTimestamp(value)
  if (!ts) return ''
  const diffMs = Date.now() - ts
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function playerNotificationKindLabel(kind: PlayerNotificationKind): string {
  switch (kind) {
    case 'game_load':
      return 'Game load'
    case 'wallet':
      return 'Wallet'
    case 'vendor':
      return 'Vendor'
    case 'ticket':
      return 'Ticket'
    case 'promo':
      return 'Promo'
    default:
      return 'Platform'
  }
}
