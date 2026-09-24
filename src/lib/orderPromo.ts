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
