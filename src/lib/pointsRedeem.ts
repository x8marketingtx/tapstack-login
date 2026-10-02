import type { WalletTxn } from '../api/client'

/** Player points → Tapstack cash: 1000 points = $1.00 */
export const POINTS_PER_DOLLAR = 1000

/** Legacy API rate until WordPress wallet redeem uses 1000:1 */
export const LEGACY_POINTS_PER_DOLLAR = 100

const LEGACY_TOLERANCE = 0.02

export const MIN_REDEEM_POINTS = 1000

export const REDEEM_POINTS_STEP = 1000

export const QUICK_REDEEM_POINTS = [1000, 5000, 10000] as const

export function pointsToCash(pts: number): number {
  return pts / POINTS_PER_DOLLAR
}

export function formatPointsToCash(pts: number): string {
  return `$${pointsToCash(pts).toFixed(2)}`
}

export function isValidRedeemPoints(pts: number): boolean {
  return Number.isFinite(pts) && pts >= MIN_REDEEM_POINTS && pts % REDEEM_POINTS_STEP === 0
}

export function pointsPerDollarLabel(): string {
  return `${POINTS_PER_DOLLAR.toLocaleString()} pts = $1.00`
}

export function parseTapstackCash(value: string | number | undefined | null): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''))
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export function formatTapstackCash(balance: number): string {
  return `$${balance.toFixed(2)}`
}

export function isLegacyPointsRedemptionTxn(txn: Pick<WalletTxn, 'points' | 'amount'>): boolean {
  if (txn.points >= 0 || txn.amount <= 0) return false
  const pts = Math.abs(txn.points)
  if (pts < MIN_REDEEM_POINTS) return false
  const legacyCash = pts / LEGACY_POINTS_PER_DOLLAR
  return Math.abs(txn.amount - legacyCash) < LEGACY_TOLERANCE
}

function legacyPointsRedemptionOvercredit(txn: Pick<WalletTxn, 'points' | 'amount'>): number {
  if (!isLegacyPointsRedemptionTxn(txn)) return 0
  const pts = Math.abs(txn.points)
  return pts / LEGACY_POINTS_PER_DOLLAR - pointsToCash(pts)
}

/** Subtract legacy 100:1 over-credits recorded on the server for known redemption txns. */
export function correctCashBalanceForLegacyPointRedemptions(
  balance: number,
  txns: readonly Pick<WalletTxn, 'points' | 'amount'>[],
): number {
  let overcredit = 0
  for (const txn of txns) {
    overcredit += legacyPointsRedemptionOvercredit(txn)
  }
  return Math.round((balance - overcredit) * 100) / 100
}

export function normalizeCustomerWalletFromApi(
  wallet: { balance?: number; formatted?: string; points?: number },
  txns?: readonly Pick<WalletTxn, 'points' | 'amount'>[],
): { balance: number; formatted: string; points: number } | null {
  if (typeof wallet.points !== 'number') return null
  let balance =
    typeof wallet.balance === 'number' && Number.isFinite(wallet.balance)
      ? wallet.balance
      : parseTapstackCash(wallet.formatted)
  if (txns?.length) {
    balance = correctCashBalanceForLegacyPointRedemptions(balance, txns)
  }
  return {
    balance,
    formatted: formatTapstackCash(balance),
    points: wallet.points,
  }
}

/** Apply 1000:1 redeem credit when the API still credits at 100:1. */
export function walletAfterPointsRedeem(
  pts: number,
  cashBefore: number,
  pointsBefore: number,
  apiWallet: { balance?: number; points?: number; formatted?: string },
): { balance: number; points: number; formatted: string } {
  const correctCredit = pointsToCash(pts)
  const legacyCredit = pts / LEGACY_POINTS_PER_DOLLAR
  const apiBalance =
    typeof apiWallet.balance === 'number' && Number.isFinite(apiWallet.balance) ? apiWallet.balance : null
  const points =
    typeof apiWallet.points === 'number' ? apiWallet.points : Math.max(0, pointsBefore - pts)

  let balance = cashBefore + correctCredit
  if (apiBalance != null) {
    if (Math.abs(apiBalance - (cashBefore + legacyCredit)) < LEGACY_TOLERANCE) {
      balance = cashBefore + correctCredit
    } else if (Math.abs(apiBalance - (cashBefore + correctCredit)) < LEGACY_TOLERANCE) {
      balance = apiBalance
    }
  }

  return {
    balance,
    points,
    formatted: formatTapstackCash(balance),
  }
}
