import { useState } from 'react'
import { ApiError } from '../api/client'
import { openWertTopUp, type TopUpOwnerType } from '../api/wert'
import './TopUpModal.css'

type TopUpModalProps = {
  open: boolean
  onClose: () => void
  ownerType?: TopUpOwnerType
  title?: string
  presets?: number[]
  onSuccess?: (wallet?: { balance: number; points: number; currency: string }) => void
}

export default function TopUpModal({
  open,
  onClose,
  ownerType = 'player',
  title = 'Top up wallet',
  presets = [25, 50, 100, 250],
  onSuccess,
}: TopUpModalProps) {
  const [amount, setAmount] = useState(String(presets[1] ?? 50))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  if (!open) return null

  const numericAmount = Number(amount)
  const canSubmit = Number.isFinite(numericAmount) && numericAmount >= 5 && !loading

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return

    setError('')
    setStatus('Opening Wert checkout…')
    setLoading(true)

    try {
      await openWertTopUp({
        amount: numericAmount,
        ownerType,
        onSuccess: (wallet) => {
          setStatus('Payment successful. Balance updated.')
          setLoading(false)
          onSuccess?.(wallet)
          setTimeout(() => {
            onClose()
            setStatus('')
          }, 900)
        },
        onClose: () => {
          setLoading(false)
          setStatus('')
        },
        onError: (message) => {
          setError(message)
          setLoading(false)
          setStatus('')
        },
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Could not start payment.')
      setLoading(false)
      setStatus('')
    }
  }

  return (
    <div className="topup-overlay" role="presentation" onClick={onClose}>
      <div
        className="topup-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="topup-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="topup-header">
          <h2 id="topup-title">{title}</h2>
          <button type="button" className="topup-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <p className="topup-copy">
          Pay with card, Apple Pay, or Google Pay via Wert. You must be logged in (OTP or portal) so the
          request can send your Bearer token.
        </p>

        <div className="topup-presets">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`topup-preset ${Number(amount) === preset ? 'topup-preset--active' : ''}`}
              onClick={() => setAmount(String(preset))}
            >
              ${preset}
            </button>
          ))}
        </div>

        <form className="topup-form" onSubmit={handleSubmit}>
          <label className="topup-label" htmlFor="topup-amount">
            Amount (USD)
          </label>
          <div className="topup-amount-wrap">
            <span aria-hidden="true">$</span>
            <input
              id="topup-amount"
              type="number"
              min={5}
              step="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>

          {status ? <p className="topup-status">{status}</p> : null}
          {error ? <p className="topup-error">{error}</p> : null}

          <button type="submit" className="topup-submit" disabled={!canSubmit}>
            {loading ? 'Waiting for Wert…' : `Pay $${Number.isFinite(numericAmount) ? numericAmount.toFixed(0) : '—'}`}
          </button>
        </form>
      </div>
    </div>
  )
}
