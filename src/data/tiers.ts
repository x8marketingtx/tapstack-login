import type { TicketTier } from '../api/client'

export const TIER_LABELS: Record<TicketTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  diamond: 'Diamond',
  platinum: 'Platinum',
}

export const TIER_ORDER: TicketTier[] = ['bronze', 'silver', 'gold', 'diamond', 'platinum']

/** Lifetime card/crypto deposits (USD) to unlock each earn-rate tier. */
export const TIER_UNLOCK: Record<TicketTier, number> = {
  bronze: 0,
  silver: 50,
  gold: 150,
  diamond: 400,
  platinum: 1000,
}

export function normalizeTicketTier(value: unknown): TicketTier {
  const raw = String(value || '').trim().toLowerCase()
  if (raw === 'silver' || raw === 'gold' || raw === 'diamond' || raw === 'platinum') return raw
  return 'bronze'
}

export function tierLabel(tier?: TicketTier | string | null): string {
  return TIER_LABELS[normalizeTicketTier(tier)]
}

/** CSS modifier for tier badge coloring */
export function tierBadgeClass(tier?: TicketTier | string | null): string {
  return `tier-badge--${normalizeTicketTier(tier)}`
}

export function tierFromSpend(spend: number): TicketTier {
  let earned: TicketTier = 'bronze'
  for (const tier of TIER_ORDER) {
    if (spend + 0.00001 >= TIER_UNLOCK[tier]) earned = tier
  }
  return earned
}

export function higherTicketTier(a: TicketTier, b: TicketTier): TicketTier {
  return TIER_ORDER.indexOf(a) >= TIER_ORDER.indexOf(b) ? a : b
}

export function nextTierProgress(tier: TicketTier, lifetimeSpend: number) {
  const current = normalizeTicketTier(tier)
  const idx = TIER_ORDER.indexOf(current)
  const next = TIER_ORDER[idx + 1] ?? null
  const floor = TIER_UNLOCK[current]
  if (!next) {
    return {
      nextTier: null as TicketTier | null,
      nextTierLabel: null as string | null,
      nextTierUnlock: floor,
      spendTowardNextTier: lifetimeSpend,
      spendNeededForNextTier: 0,
      tierProgressPct: 100,
    }
  }
  const ceil = TIER_UNLOCK[next]
  const span = Math.max(0.01, ceil - floor)
  const toward = Math.max(0, Math.min(span, lifetimeSpend - floor))
  return {
    nextTier: next,
    nextTierLabel: TIER_LABELS[next],
    nextTierUnlock: ceil,
    spendTowardNextTier: toward,
    spendNeededForNextTier: Math.max(0, ceil - lifetimeSpend),
    tierProgressPct: Math.min(100, Math.max(0, Math.round((toward / span) * 100))),
  }
}
