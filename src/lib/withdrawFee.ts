export type WithdrawFeeSchedule = {
  pct: number
  flatFee: number
  flatMax: number
}

export const DEFAULT_WITHDRAW_FEES: WithdrawFeeSchedule = {
  pct: 4,
  flatFee: 2,
  flatMax: 50,
}

export type WithdrawFeeQuote = {
  amount: number
  percentFee: number
  flatFee: number
  fee: number
  payout: number
  pct: number
  flatMax: number
}

function money(value: number): number {
  return Math.round(Math.max(0, value) * 100) / 100
}

export function quoteWithdrawFee(
  amount: number,
  schedule: WithdrawFeeSchedule = DEFAULT_WITHDRAW_FEES,
): WithdrawFeeQuote {
  const base = money(amount)
  const pct = Number.isFinite(schedule.pct) ? Math.max(0, schedule.pct) : 0
  const percentFee = base > 0 ? money((base * pct) / 100) : 0
  const flatFee =
    base > 0 && base <= schedule.flatMax + 0.00001 ? money(schedule.flatFee) : 0
  const fee = money(Math.min(base, percentFee + flatFee))
  return {
    amount: base,
    percentFee,
    flatFee,
    fee,
    payout: money(base - fee),
    pct,
    flatMax: schedule.flatMax,
  }
}
