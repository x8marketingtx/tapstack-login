import { useEffect, useState, type FormEvent } from 'react'
import { ApiError, getToken, isApiConfigured, tapstackApi } from '../api/client'
import { isVerifyApiError } from '../lib/verify'
import { decodeIcon } from '../data/vendors'
import { openWertTopUp } from '../api/wert'
import './GameLoadModal.css'

const PRESETS = [10, 25, 50, 100]
const CARD_MIN = 5

function parseMoney(value: string): number {
  const n = Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function money(value: number): string {
  return `$${value.toFixed(2)}`
}

function collectCardRemainder(amount: number): Promise<number | undefined> {
  return new Promise((resolve, reject) => {
    let settled = false
    let closeTimer: number | undefined
    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      if (closeTimer) window.clearTimeout(closeTimer)
      fn()
    }
    openWertTopUp({
      amount,
      ownerType: 'player',
      onSuccess: (wallet) => finish(() => resolve(wallet?.balance)),
      onClose: () => {
        if (settled) return
        closeTimer = window.setTimeout(() => {
          finish(() => reject(new Error('Card payment cancelled.')))
        }, 400)
      },
      onError: (message) => finish(() => reject(new Error(message))),
    }).catch((err) => {
      finish(() =>
        reject(err instanceof Error ? err : new Error('Could not start card payment.')),
      )
    })
  })
}

export type GameLoadTarget = {
  gameKey: string
  name: string
  mode?: 'auto' | 'manual'
  icon?: string
  iconBg?: string
  gameBalance?: string
  payableBalance?: string
  redeemableBalance?: string
}

export type GameTransferIntent = 'load' | 'redeem' | 'move'

type GameLoadModalProps = {
  open: boolean
  intent?: GameTransferIntent
  vendorId: number | string
  vendorName: string
  game: GameLoadTarget | null
  games?: GameLoadTarget[]
  cashBalance: string
  onClose: () => void
  onSuccess?: (next: { cashBalance: string; gameBalance?: string }) => void
  onVerifyRequired?: () => void
}

type SuccessState = {
  amount: number
  auto: boolean
  cashBalance: string
  gameBalance: string
}

export default function GameLoadModal({
  open,
  intent = 'load',
  vendorId,
  vendorName,
  game,
  games = [],
  cashBalance,
  onClose,
  onSuccess,
  onVerifyRequired,
}: GameLoadModalProps) {
  const isRedeem = intent === 'redeem'
  const isMove = intent === 'move'
  const [amount, setAmount] = useState('25')
  const [mobileId, setMobileId] = useState('')
  const [note, setNote] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [destGameKey, setDestGameKey] = useState('')
  const [walletFormatted, setWalletFormatted] = useState(cashBalance)
  const [gameBalance, setGameBalance] = useState(game?.redeemableBalance || game?.gameBalance || '—')
  const [payableBalance, setPayableBalance] = useState(game?.payableBalance || game?.gameBalance || '—')
  const [loadingWallet, setLoadingWallet] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [success, setSuccess] = useState<SuccessState | null>(null)

  useEffect(() => {
    if (!open || !game) return
    setAmount('25')
    setMobileId('')
    setNote('')
    setDestGameKey('')
    setError('')
    setStatus('')
    setSuccess(null)
    setWalletFormatted(cashBalance)
    setGameBalance(game.redeemableBalance || game.gameBalance || '—')
    setPayableBalance(game.payableBalance || game.gameBalance || '—')

    if (!isApiConfigured()) return

    let cancelled = false
    setLoadingWallet(true)
    ;(async () => {
      try {
        const [walletRes, balRes] = await Promise.all([
          tapstackApi.customerWallet().catch(() => null),
          game.mode === 'auto'
            ? tapstackApi.vendorGameBalance(vendorId, game.gameKey).catch(() => null)
            : Promise.resolve(null),
        ])
        if (cancelled) return
        if (walletRes?.wallet?.formatted) setWalletFormatted(walletRes.wallet.formatted)
        else if (typeof walletRes?.wallet?.balance === 'number') {
          setWalletFormatted(`$${walletRes.wallet.balance.toFixed(2)}`)
        }
        if (balRes?.formatted) {
          setGameBalance(balRes.redeemableFormatted || balRes.formatted)
          setPayableBalance(balRes.payableFormatted || balRes.formatted)
          const maxGame = parseMoney(balRes.redeemableFormatted || balRes.formatted)
          if (Number.isFinite(maxGame) && maxGame >= 0) {
            setAmount((current) => {
              const n = Number(current)
              if (!Number.isFinite(n) || n <= maxGame) return current
              const fit = [...PRESETS].reverse().find((p) => p <= maxGame)
              return String(fit ?? Math.max(1, Math.floor(maxGame)))
            })
          }
        }
      } finally {
        if (!cancelled) setLoadingWallet(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, game, cashBalance, vendorId, intent])

  if (!open || !game) return null

  const target: GameLoadTarget = game
  const isManual = target.mode !== 'auto'
  const numericAmount = Number(amount)
  const availableWallet = parseMoney(walletFormatted)
  const hasKnownGameBalance = Boolean(gameBalance && gameBalance !== '—' && !loadingWallet)
  const availableGame = parseMoney(gameBalance)
  const destGames = games.filter((item) => item.gameKey !== target.gameKey)
  const destGame = destGames.find((item) => item.gameKey === destGameKey) || destGames[0] || null
  const walletUsed =
    !isRedeem && !isMove && Number.isFinite(numericAmount) ? Math.min(Math.max(0, availableWallet), numericAmount) : 0
  const cardNeeded =
    !isRedeem && !isMove && Number.isFinite(numericAmount) ? Math.max(0, Math.round((numericAmount - walletUsed) * 100) / 100) : 0
  const cardCharge = cardNeeded > 0 ? Math.max(cardNeeded, CARD_MIN) : 0
  const exceedsGame =
    (isRedeem || isMove) &&
    hasKnownGameBalance &&
    Number.isFinite(numericAmount) &&
    Number.isFinite(availableGame) &&
    numericAmount > availableGame
  const canSubmit =
    Number.isFinite(numericAmount) &&
    numericAmount >= 1 &&
    !exceedsGame &&
    (!isMove || Boolean(destGame)) &&
    (!isManual || isMove || mobileId.trim().length > 0) &&
    !submitting &&
    isApiConfigured()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const activeGame: GameLoadTarget = target
    if (!canSubmit || exceedsGame) return
    if ((isRedeem || isMove) && hasKnownGameBalance && numericAmount > availableGame) {
      setError('Amount exceeds your game balance.')
      return
    }
    if (isMove && !destGame) {
      setError('Choose a destination game.')
      return
    }

    setError('')
    setSubmitting(true)

    try {
      if (!isRedeem && !isMove && cardCharge > 0 && !getToken()?.startsWith('demo:')) {
        setStatus(
          cardNeeded < CARD_MIN
            ? `Card minimum is ${money(CARD_MIN)}. Charging ${money(cardCharge)}…`
            : `Using wallet first, then charging ${money(cardCharge)} to your card…`,
        )
        const nextBalance = await collectCardRemainder(cardCharge)
        if (typeof nextBalance === 'number' && Number.isFinite(nextBalance)) {
          setWalletFormatted(`$${nextBalance.toFixed(2)}`)
        } else {
          try {
            const walletRes = await tapstackApi.customerWallet()
            if (walletRes.wallet?.formatted) setWalletFormatted(walletRes.wallet.formatted)
          } catch {
            /* load will still attempt */
          }
        }
      }

      setStatus(
        isMove
          ? 'Moving credits between games…'
          : isRedeem
          ? isManual
            ? 'Submitting redeem request…'
            : 'Redeeming credits from game…'
          : isManual
            ? 'Submitting load request…'
            : 'Loading credits to game…',
      )
      const payload = {
        gameKey: activeGame.gameKey,
        amount: numericAmount,
        ...(isManual && !isMove
          ? {
              mobileId: mobileId.trim(),
              note: note.trim() || undefined,
            }
          : {}),
        ...(!isRedeem && !isMove && couponCode.trim()
          ? { couponCode: couponCode.trim().toUpperCase() }
          : {}),
      }
      const res = isMove
        ? await tapstackApi.createVendorTransfer(vendorId, {
            fromGameKey: activeGame.gameKey,
            toGameKey: destGame!.gameKey,
            amount: numericAmount,
          })
        : isRedeem
          ? await tapstackApi.createVendorRedeem(vendorId, payload)
          : await tapstackApi.createVendorLoad(vendorId, payload)

      let nextCash = walletFormatted
      let nextGame = gameBalance
      if (res.wallet?.formatted) {
        nextCash = res.wallet.formatted
        setWalletFormatted(nextCash)
      } else {
        try {
          const walletRes = await tapstackApi.customerWallet()
          nextCash =
            walletRes.wallet.formatted ||
            (typeof walletRes.wallet.balance === 'number'
              ? `$${walletRes.wallet.balance.toFixed(2)}`
              : walletFormatted)
          setWalletFormatted(nextCash)
        } catch {
          if (!isRedeem) {
            nextCash = `$${Math.max(0, availableWallet - numericAmount).toFixed(2)}`
            setWalletFormatted(nextCash)
          }
        }
      }

      if (!isManual) {
        try {
          const balRes = await tapstackApi.vendorGameBalance(vendorId, activeGame.gameKey)
          if (balRes.formatted) {
            nextGame = balRes.redeemableFormatted || balRes.formatted
            setGameBalance(nextGame)
            setPayableBalance(balRes.payableFormatted || balRes.formatted)
          }
        } catch {
          /* keep previous */
        }
      }

      const auto = Boolean(res.auto)
      setStatus('')
      setSuccess({
        amount: numericAmount,
        auto,
        cashBalance: nextCash,
        gameBalance: nextGame,
      })
      onSuccess?.({ cashBalance: nextCash, gameBalance: nextGame })
    } catch (err) {
      setStatus('')
      if (isVerifyApiError(err)) {
        onVerifyRequired?.()
      }
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : isRedeem
              ? 'Could not redeem credits.'
              : isMove
                ? 'Could not move credits.'
                : 'Could not load credits.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="game-load-overlay" role="presentation" onClick={success ? undefined : onClose}>
      <div
        className="game-load-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-load-title"
        onClick={(event) => event.stopPropagation()}
      >
        {success ? (
          <div className="game-load-success">
            <div className="game-load-success-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#dcfce7" />
                <path
                  d="M8 12.5l2.5 2.5L16 9.5"
                  stroke="#15803d"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 id="game-load-title" className="game-load-success-title">
              {isMove
                ? success.auto
                  ? 'Successfully moved'
                  : 'Move submitted'
                : isRedeem
                ? success.auto
                  ? 'Successfully redeemed'
                  : 'Redeem submitted'
                : success.auto
                  ? 'Successfully topped up'
                  : 'Load submitted'}
            </h2>
            <p className="game-load-success-copy">
              {isMove
                ? success.auto
                  ? `$${success.amount.toFixed(0)} moved from ${game.name} to ${destGame?.name || 'another game'}. No transfer fee.`
                  : `$${success.amount.toFixed(0)} move request sent. The vendor will process it shortly. No transfer fee.`
                : isRedeem
                ? success.auto
                  ? `$${success.amount.toFixed(0)} moved from ${game.name} to your TapStack wallet.`
                  : `$${success.amount.toFixed(0)} redeem request sent for ${game.name}. The vendor will process it shortly.`
                : success.auto
                  ? `$${success.amount.toFixed(0)} loaded to ${game.name}.`
                  : `$${success.amount.toFixed(0)} load request sent for ${game.name}. The vendor will process it shortly.`}
            </p>
            <div className="game-load-success-balances">
              <div>
                <span>Your wallet</span>
                <strong>{success.cashBalance}</strong>
              </div>
              {!isManual ? (
                <div>
                  <span>Game balance</span>
                  <strong>{success.gameBalance}</strong>
                </div>
              ) : null}
            </div>
            <button type="button" className="game-load-submit" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="game-load-header">
              <div className="game-load-heading">
                <div
                  className="game-load-icon"
                  style={{ background: game.iconBg || '#ede9fe' }}
                  aria-hidden="true"
                >
                  {decodeIcon(game.icon || '🎰', game.name)}
                </div>
                <div>
                  <h2 id="game-load-title">
                    {isMove ? 'Move' : isRedeem ? 'Redeem' : 'Load'} {game.name}
                  </h2>
                  <p className="game-load-sub">{vendorName}</p>
                </div>
              </div>
              <button type="button" className="game-load-close" onClick={onClose} aria-label="Close">
                ×
              </button>
            </div>

            <div className="game-load-balances">
              {!isMove ? (
                <div className="game-load-balance-card">
                  <span className="game-load-balance-label">Your wallet</span>
                  <strong className="game-load-balance-value">
                    {loadingWallet ? '…' : walletFormatted}
                  </strong>
                </div>
              ) : null}
              <div className="game-load-balance-card">
                <span className="game-load-balance-label">Payable</span>
                <strong className="game-load-balance-value">
                  {loadingWallet ? '…' : payableBalance}
                </strong>
              </div>
              <div className="game-load-balance-card">
                <span className="game-load-balance-label">Redeemable</span>
                <strong className="game-load-balance-value">
                  {loadingWallet ? '…' : gameBalance}
                </strong>
              </div>
            </div>

            <p className="game-load-copy">
              {isMove
                ? 'Move credits from this game to another game at the same vendor. No transfer fee.'
                : isRedeem
                ? isManual
                  ? 'Request a redeem from this game. Include your Mobile ID so the vendor can pull the right account.'
                  : 'Pull credits from your connected game account into your TapStack wallet.'
                : isManual
                  ? 'Wallet is used first. If it isn’t enough, the rest is charged to your card. Include your game Mobile ID so the vendor can credit the right account.'
                  : 'Wallet is used first. If it isn’t enough, the rest is charged to your card, then credits move into the connected game account.'}
            </p>

            {isMove ? (
              <>
                <label className="game-load-label" htmlFor="game-move-dest">
                  Destination game
                </label>
                <select
                  id="game-move-dest"
                  className="game-load-text-input"
                  value={destGame?.gameKey || ''}
                  onChange={(event) => setDestGameKey(event.target.value)}
                >
                  {destGames.length === 0 ? (
                    <option value="">No other games</option>
                  ) : (
                    destGames.map((item) => (
                      <option key={item.gameKey} value={item.gameKey}>
                        {item.name}
                      </option>
                    ))
                  )}
                </select>
              </>
            ) : null}

            <div className="game-load-presets">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`game-load-preset ${Number(amount) === preset ? 'is-active' : ''}`}
                  onClick={() => setAmount(String(preset))}
                >
                  ${preset}
                </button>
              ))}
            </div>

            <form className="game-load-form" onSubmit={handleSubmit}>
              <label className="game-load-label" htmlFor="game-load-amount">
                Amount (USD)
              </label>
              <div className="game-load-amount-wrap">
                <span aria-hidden="true">$</span>
                <input
                  id="game-load-amount"
                  type="number"
                  min={1}
                  step="1"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>

              {isManual && !isMove ? (
                <>
                  <label className="game-load-label" htmlFor="game-load-mobile">
                    Mobile ID / username
                  </label>
                  <input
                    id="game-load-mobile"
                    className="game-load-text-input"
                    type="text"
                    autoComplete="username"
                    placeholder="Enter game Mobile ID or username"
                    value={mobileId}
                    onChange={(event) => setMobileId(event.target.value)}
                    required
                  />

                  <label className="game-load-label" htmlFor="game-load-note">
                    Note <span className="game-load-optional">(optional)</span>
                  </label>
                  <textarea
                    id="game-load-note"
                    className="game-load-textarea"
                    rows={3}
                    placeholder="Anything the vendor should know"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </>
              ) : null}

              {!isRedeem && !isMove ? (
                <>
                  <label className="game-load-label" htmlFor="game-load-coupon">
                    Promo code <span className="game-load-optional">(optional)</span>
                  </label>
                  <input
                    id="game-load-coupon"
                    className="game-load-input"
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                    placeholder="Game-exclusive or store code"
                    autoCapitalize="characters"
                  />
                </>
              ) : null}

              {cardCharge > 0 ? (
                <div className="game-load-split">
                  <p className="game-load-split-title">Payment</p>
                  <div className="game-load-split-row">
                    <span>Wallet</span>
                    <strong>{money(walletUsed)}</strong>
                  </div>
                  <div className="game-load-split-row">
                    <span>Card</span>
                    <strong>{money(cardCharge)}</strong>
                  </div>
                  {cardCharge > cardNeeded ? (
                    <p className="game-load-split-note">
                      Card minimum is {money(CARD_MIN)}. Extra stays in your wallet.
                    </p>
                  ) : (
                    <p className="game-load-split-note">Wallet is charged first. Card covers the rest.</p>
                  )}
                </div>
              ) : null}
              {exceedsGame ? (
                <p className="game-load-error">Amount exceeds your game balance.</p>
              ) : null}
              {isManual && !isMove && !mobileId.trim() ? (
                <p className="game-load-error">Mobile ID / username is required.</p>
              ) : null}
              {status ? <p className="game-load-status">{status}</p> : null}
              {error ? <p className="game-load-error">{error}</p> : null}

              <button
                type="submit"
                className={`game-load-submit ${isRedeem || isMove ? 'game-load-submit--redeem' : ''}`}
                disabled={!canSubmit}
              >
                {submitting
                  ? isMove
                    ? 'Moving…'
                    : isRedeem
                      ? 'Redeeming…'
                      : cardCharge > 0
                        ? 'Paying…'
                        : 'Loading…'
                  : isMove
                    ? `Move $${Number.isFinite(numericAmount) ? numericAmount.toFixed(0) : '—'}`
                    : isRedeem
                      ? `Redeem $${Number.isFinite(numericAmount) ? numericAmount.toFixed(0) : '—'}`
                      : cardCharge > 0
                        ? `Pay & load $${Number.isFinite(numericAmount) ? numericAmount.toFixed(0) : '—'}`
                        : `Load $${Number.isFinite(numericAmount) ? numericAmount.toFixed(0) : '—'}`}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
