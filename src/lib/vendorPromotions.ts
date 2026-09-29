import type { VendorPromotion } from '../api/client'

function readCount(raw: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = raw[key]
    if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value))
    if (typeof value === 'string' && value.trim()) {
      const n = Number(value)
      if (Number.isFinite(n)) return Math.max(0, Math.floor(n))
    }
  }
  return 0
}

/** Normalize vendor promo analytics fields from API (camelCase or snake_case). */
export function normalizeVendorPromotion(promo: VendorPromotion): VendorPromotion {
  const raw = promo as VendorPromotion & Record<string, unknown>
  const isGiveaway = promo.type === 'giveaway'
  return {
    ...promo,
    viewed: readCount(raw, 'viewed', 'viewCount', 'views', 'viewed_count'),
    activated: isGiveaway
      ? readCount(raw, 'entered', 'activated', 'activatedCount', 'activations', 'entered_count')
      : readCount(raw, 'activated', 'activatedCount', 'activations', 'activated_count'),
  }
}
