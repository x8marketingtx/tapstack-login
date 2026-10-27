import { useEffect, useState } from 'react'
import { ApiError, getToken, isApiConfigured, tapstackApi } from '../api/client'
import { shouldOpenVerifyFromApiError } from '../lib/verify'
import { parseTapstackCash } from '../lib/pointsRedeem'
import TopUpPresetGrid from './TopUpPresetGrid'
import './TopUpModal.css'

type WithdrawModalProps = {
  open: boolean
  cashBalance: string
  onClose: () => void
  onVerifyRequired?: () => void
  onSuccess?: (wallet?: { balance: number; points: number; formatted?: string }) => void
}

export default function WithdrawModal({
  open,
  cashBalance,
  onClose,
  onVerifyRequired,
  onSuccess,
}: WithdrawModalProps) {
  const [amount, setAmount] = useState('0')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [explorerUrl, setExplorerUrl] = useState('')

  useEffect(() => {
    if (!open) return
    setAmount('0')
    setError('')
    setStatus('')
    setExplorerUrl('')
    setLoading(false)
  }, [open])

  if (!open) return null

  const available = parseTapstackCash(cashBalance)
  const numericAmount = Number(amount)
  const canSubmit =
    Number.isFinite(numericAmount) && numericAmount >= 1 && numericAmount <= available + 0.00001 && !loading

  function addPreset(value: number) {
    setAmount((current) => {
      const base = Number(current)
      const next = (Number.isFinite(base) ? base : 0) + value
      return String(Math.min(next, available))
    })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return

    setError('')
    setStatus('Burning portfolio NFTs…')
    setLoading(true)

    try {
      const token = getToken()
      const demo = !isApiConfigured() || Boolean(token?.startsWith('demo:'))
      if (demo) {
        const next = Math.max(0, available - numericAmount)
        setStatus('Burn confirmed. Withdraw posted.')
        onSuccess?.({ balance: next, points: 0, formatted: `$${next.toFixed(2)}` })
        setTimeout(() => {
          onClose()
          setStatus('')
          setLoading(false)
        }, 800)
        return
      }
      const result = await tapstackApi.customerWalletWithdraw(numericAmount)
      const burnLink = result.burned?.find((token) => token.burnExplorerUrl)?.burnExplorerUrl || ''
      setExplorerUrl(burnLink)
      setStatus(burnLink ? 'Burn confirmed on Base. Withdraw posted.' : 'Burn confirmed. Withdraw posted.')
      onSuccess?.(result.wallet)
      setTimeout(() => {
        onClose()
        setStatus('')
        setLoading(false)
      }, 800)
    } catch (err) {
      if (shouldOpenVerifyFromApiError(err)) {
        onVerifyRequired?.()
      }
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Could not withdraw.')
      setStatus('')
      setLoading(false)
    }
  }

  return (
    <div className="topup-overlay" role="presentation" onClick={onClose}>
      <div
        className="topup-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="withdraw-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="topup-header">
          <h2 id="withdraw-title">Withdraw</h2>
          <button type="button" className="topup-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <p className="topup-copy">
          Matching NFTs leave your portfolio for the burner. Cash is released only after that burn is confirmed.
          Available {cashBalance}.
        </p>

        <TopUpPresetGrid onAdd={addPreset} />

        <form className="topup-form" onSubmit={(event) => void handleSubmit(event)}>
          <label className="topup-label" htmlFor="withdraw-amount">
            Amount (USD)
          </label>
          <div className="topup-amount-wrap">
            <span aria-hidden="true">$</span>
            <input
              id="withdraw-amount"
              type="number"
              min={1}
              step="1"
              max={available}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>

          {status ? <p className="topup-status">{status}</p> : null}
          {explorerUrl ? (
            <p className="topup-status">
              <a href={explorerUrl} target="_blank" rel="noreferrer">
                View burn on Basescan
              </a>
            </p>
          ) : null}
          {error ? <p className="topup-error">{error}</p> : null}

          <button type="submit" className="topup-submit" disabled={!canSubmit}>
            {loading
              ? 'Confirming burn…'
              : `Withdraw $${Number.isFinite(numericAmount) ? numericAmount.toFixed(0) : '—'}`}
          </button>
        </form>
      </div>
    </div>
  )
}
