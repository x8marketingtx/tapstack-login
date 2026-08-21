import type { TicketTier } from '../api/client'

export const TIER_LABELS: Record<TicketTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  diamond: 'Diamond',
  platinum: 'Platinum',
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
