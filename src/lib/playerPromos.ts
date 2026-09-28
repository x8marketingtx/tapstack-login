import type { PlayerPromo } from '../api/client'

export function isPromoExpired(promo: PlayerPromo): boolean {
  if (promo.status === 'expired') return true
  if (promo.endsAt) {
    const endMs = new Date(promo.endsAt).getTime()
    if (!Number.isNaN(endMs) && endMs < Date.now()) return true
  }
  const ends = (promo.ends || '').toLowerCase()
  if (/\b(expired|ended)\b/.test(ends)) return true
  return false
}

export function isPromoUsed(promo: PlayerPromo): boolean {
  return promo.claimStatus === 'claimed'
}

/** Expired promos or rewards already claimed / fully used. */
export function isPromoHistoryEntry(promo: PlayerPromo): boolean {
  return isPromoExpired(promo) || isPromoUsed(promo)
}

export function isPromoLiveEntry(promo: PlayerPromo): boolean {
  return !isPromoHistoryEntry(promo)
}

export function promoHistoryStatusLabel(promo: PlayerPromo): string {
  if (isPromoUsed(promo)) return 'Used'
  if (isPromoExpired(promo)) return 'Expired'
  return 'Ended'
}
