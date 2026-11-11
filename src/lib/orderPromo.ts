export function parseOrderMoney(amount: string | number | undefined): number {
  const n = Number(String(amount ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? Math.abs(n) : 0
}

export function couponExtra(item: { couponCredit?: number } | null | undefined): number {
  const n = Number(item?.couponCredit)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`
}

export function gameLoadTotal(item: { amount: string; couponCredit?: number }): number {
  return parseOrderMoney(item.amount) + couponExtra(item)
}

export function isGameMove(item: { type?: string; sameVendorTransfer?: boolean } | null | undefined): boolean {
  const type = String(item?.type || '').toLowerCase()
  return type === 'game-transfer' || Boolean(item?.sameVendorTransfer)
}

export function gameMoveRoute(item: {
  fromGameTitle?: string
  toGameTitle?: string
  fromGameKey?: string
  toGameKey?: string
  game?: string
}): string {
  const from = item.fromGameTitle || item.fromGameKey || 'Game'
  const to = item.toGameTitle || item.game || item.toGameKey || 'Game'
  if (from === to) return from
  return `${from} → ${to}`
}
