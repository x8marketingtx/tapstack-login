import { useEffect, useState, type FormEvent } from 'react'
import { ApiError, isApiConfigured, tapstackApi } from '../api/client'
import { decodeIcon } from '../data/vendors'
import './GameLoadModal.css'

const PRESETS = [10, 25, 50, 100]

function parseMoney(value: string): number {
  const n = Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export type GameLoadTarget = {
  gameKey: string
  name: string
  mode?: 'auto' | 'manual'
  icon?: string
  iconBg?: string
  gameBalance?: string
}

export type GameTransferIntent = 'load' | 'redeem'

type GameLoadModalProps = {
  open: boolean
  intent?: GameTransferIntent
  vendorId: number | string
  vendorName: string
  game: GameLoadTarget | null
  cashBalance: string
  onClose: () => void
  onSuccess?: (next: { cashBalance: string; gameBalance?: string }) => void
}

export default function GameLoadModal({
  open,
  intent = 'load',
  vendorId,
  vendorName,
  game,
  cashBalance,
  onClose,
  onSuccess,
}: GameLoadModalProps) {
  const isRedeem = intent === 'redeem'
  const [amount, setAmount] = useState('25')
  const [mobileId, setMobileId] = useState('')
  const [note, setNote] = useState('')
  const [walletFormatted, setWalletFormatted] = useState(cashBalance)
  const [gameBalance, setGameBalance] = useState(game?.gameBalance || '—')
  const [loadingWallet, setLoadingWallet] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!open || !game) return
    setAmount('25')
    setMobileId('')
    setNote('')
    setError('')
    setStatus('')
    setWalletFormatted(cashBalance)
    setGameBalance(game.gameBalance || '—')

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
          setGameBalance(balRes.formatted)
          const maxGame = parseMoney(balRes.formatted)
          if (Number.isFinite(maxGame) && maxGame >= 0) {
            setAmount((current) => {
              const n = Number(current)
              if (!Number.isFinite(n) || n <= maxGame) return current
              // Prefer a preset that fits; otherwise use the full available balance.
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
  const exceedsWallet = !isRedeem && Number.isFinite(numericAmount) && numericAmount > availableWallet
  const exceedsGame =
    isRedeem &&
    hasKnownGameBalance &&
    Number.isFinite(numericAmount) &&
    Number.isFinite(availableGame) &&
    numericAmount > availableGame
  const canSubmit =
    Number.isFinite(numericAmount) &&
    numericAmount >= 1 &&
    !exceedsWallet &&
    !exceedsGame &&
    (!isManual || mobileId.trim().length > 0) &&
    !submitting &&
    isApiConfigured()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const activeGame: GameLoadTarget = target
    if (!canSubmit || exceedsGame || exceedsWallet) return
    if (isRedeem && hasKnownGameBalance && numericAmount > availableGame) {
      setError('Amount exceeds your game balance.')
      return
    }

    setError('')
    setStatus(
      isRedeem
        ? isManual
          ? 'Submitting redeem request…'
          : 'Redeeming credits from game…'
        : isManual
          ? 'Submitting load request…'
          : 'Loading credits to game…',
    )
    setSubmitting(true)

    try {
      const payload = {
        gameKey: activeGame.gameKey,
        amount: numericAmount,
        ...(isManual
          ? {
              mobileId: mobileId.trim(),
              note: note.trim() || undefined,
            }
          : {}),
      }
      const res = isRedeem
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
            nextGame = balRes.formatted
            setGameBalance(balRes.formatted)
          }
        } catch {
          /* keep previous */
        }
      }

      setStatus(
        isRedeem
          ? res.auto
            ? 'Credits redeemed to your TapStack wallet.'
            : 'Redeem submitted. The vendor will process it shortly.'
          : res.auto
            ? 'Credits loaded to your game account.'
            : 'Load submitted. The vendor will process it shortly.',
      )
      onSuccess?.({ cashBalance: nextCash, gameBalance: nextGame })
      window.setTimeout(() => onClose(), 900)
    } catch (err) {
      setStatus('')
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : isRedeem
              ? 'Could not redeem credits.'
              : 'Could not load credits.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="game-load-overlay" role="presentation" onClick={onClose}>
      <div
        className="game-load-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-load-title"
        onClick={(event) => event.stopPropagation()}
      >
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
                {isRedeem ? 'Redeem' : 'Load'} {game.name}
              </h2>
              <p className="game-load-sub">{vendorName}</p>
            </div>
          </div>
          <button type="button" className="game-load-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="game-load-balances">
          <div className="game-load-balance-card">
            <span className="game-load-balance-label">Your wallet</span>
            <strong className="game-load-balance-value">
              {loadingWallet ? '…' : walletFormatted}
            </strong>
          </div>
          {isManual ? (
            <div className="game-load-balance-card">
              <span className="game-load-balance-label">Mode</span>
              <strong className="game-load-balance-value game-load-balance-value--sm">Manual</strong>
            </div>
          ) : (
            <div className="game-load-balance-card">
              <span className="game-load-balance-label">Game balance</span>
              <strong className="game-load-balance-value">
                {loadingWallet ? '…' : gameBalance}
              </strong>
            </div>
          )}
        </div>

        <p className="game-load-copy">
          {isRedeem
            ? isManual
              ? 'Request a redeem from this game. Include your Mobile ID so the vendor can pull the right account.'
              : 'Pull credits from your connected game account into your TapStack wallet.'
            : isManual
              ? 'Send a load request from your TapStack wallet. Include your game Mobile ID so the vendor can credit the right account.'
              : 'Move funds from your TapStack wallet into the connected game account.'}
        </p>

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

          {isManual ? (
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

          {exceedsWallet ? (
            <p className="game-load-error">Amount exceeds your wallet balance.</p>
          ) : null}
          {exceedsGame ? (
            <p className="game-load-error">Amount exceeds your game balance.</p>
          ) : null}
          {isManual && !mobileId.trim() ? (
            <p className="game-load-error">Mobile ID / username is required.</p>
          ) : null}
          {status ? <p className="game-load-status">{status}</p> : null}
          {error ? <p className="game-load-error">{error}</p> : null}

          <button
            type="submit"
            className={`game-load-submit ${isRedeem ? 'game-load-submit--redeem' : ''}`}
            disabled={!canSubmit}
          >
            {submitting
              ? isRedeem
                ? 'Redeeming…'
                : 'Loading…'
              : `${isRedeem ? 'Redeem' : 'Load'} $${
                  Number.isFinite(numericAmount) ? numericAmount.toFixed(0) : '—'
                }`}
          </button>
        </form>
      </div>
    </div>
  )
}
