import { useEffect, useRef, useState } from 'react'
import { ApiError, tapstackApi } from '../api/client'
import { shouldOpenVerifyFromApiError } from '../lib/verify'
import {
  createEmbeddedPaysioSession,
  fetchPaymentsConfig,
  type CardProcessor,
} from '../api/payments'
import { mountPaysioCheckout, type PaysioSessionResponse } from '../api/paysio'
import { openWertTopUp, type TopUpOwnerType } from '../api/wert'
import TopUpPresetGrid from './TopUpPresetGrid'
import './TopUpModal.css'

type TopUpModalProps = {
  open: boolean
  onClose: () => void
  ownerType?: TopUpOwnerType
  title?: string
  presets?: number[]
  onSuccess?: (wallet?: { balance: number; points: number; currency: string }) => void
  onVerifyRequired?: () => void
}

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

function getEthereum(): EthereumProvider | null {
  const eth = (window as Window & { ethereum?: EthereumProvider }).ethereum
  return eth || null
}

export default function TopUpModal({
  open,
  onClose,
  ownerType = 'player',
  title = 'Top up wallet',
  onSuccess,
  onVerifyRequired,
}: TopUpModalProps) {
  const [amount, setAmount] = useState('0')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [method, setMethod] = useState<'card' | 'metamask'>('card')
  const [walletAccount, setWalletAccount] = useState('')
  const [depositAddress, setDepositAddress] = useState('')
  const [cryptoNetwork, setCryptoNetwork] = useState('polygon')
  const [cryptoToken, setCryptoToken] = useState('USDC')
  const [processor, setProcessor] = useState<CardProcessor>('wert')
  const [paysioSession, setPaysioSession] = useState<PaysioSessionResponse | null>(null)
  const [checkoutEl, setCheckoutEl] = useState<HTMLDivElement | null>(null)
  const unmountRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!open) return
    setAmount('0')
    setError('')
    setStatus('')
    setLoading(false)
    setPaysioSession(null)
    void fetchPaymentsConfig()
      .then((config) => setProcessor(config.processor))
      .catch(() => setProcessor('wert'))
  }, [open])

  useEffect(() => {
    if (!open || !paysioSession || !checkoutEl) return
    let cancelled = false
    void mountPaysioCheckout(checkoutEl, paysioSession, {
      onComplete: (wallet) => {
        if (cancelled) return
        setStatus('Payment successful. Balance updated.')
        setLoading(false)
        onSuccess?.(wallet)
        setTimeout(() => {
          onClose()
          setStatus('')
          setPaysioSession(null)
        }, 900)
      },
      onError: (message) => {
        if (cancelled) return
        setError(message)
        setLoading(false)
        setStatus('')
      },
    }).then((unmount) => {
      if (cancelled) {
        unmount()
        return
      }
      unmountRef.current = unmount
    }).catch((err) => {
      if (cancelled) return
      setError(err instanceof Error ? err.message : 'Could not open Paysio checkout.')
      setLoading(false)
      setPaysioSession(null)
    })
    return () => {
      cancelled = true
      unmountRef.current?.()
      unmountRef.current = null
    }
  }, [open, paysioSession, checkoutEl, onClose, onSuccess])

  if (!open) return null

  const numericAmount = Number(amount)
  const canSubmit = Number.isFinite(numericAmount) && numericAmount >= 1 && !loading

  function addPreset(value: number) {
    setAmount((current) => {
      const base = Number(current)
      const next = (Number.isFinite(base) ? base : 0) + value
      return String(next)
    })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return

    setError('')
    setStatus('Opening secure checkout…')
    setLoading(true)

    try {
      if (processor === 'paysio') {
        const session = await createEmbeddedPaysioSession(numericAmount, ownerType)
        setPaysioSession(session)
        setStatus('Enter your card below.')
        setLoading(false)
        return
      }
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
      if (shouldOpenVerifyFromApiError(err)) {
        onVerifyRequired?.()
      }
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Could not start payment.')
      setLoading(false)
      setStatus('')
    }
  }

  async function handleMetaMask() {
    setError('')
    setStatus('Connecting MetaMask…')
    setLoading(true)
    try {
      const eth = getEthereum()
      if (!eth) {
        throw new Error('MetaMask is not installed in this browser.')
      }
      const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[]
      const account = accounts?.[0] || ''
      setWalletAccount(account)
      const rail = await tapstackApi.cryptoDeposit()
      setDepositAddress(rail.address || '')
      setCryptoNetwork(rail.network || 'polygon')
      setCryptoToken(rail.token || 'USDC')
      setStatus(rail.message || 'Connected. Send USDC to the deposit address.')
    } catch (err) {
      if (shouldOpenVerifyFromApiError(err)) {
        onVerifyRequired?.()
      }
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Could not connect MetaMask.')
      setStatus('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="topup-overlay" role="presentation" onClick={paysioSession ? undefined : onClose}>
      <div
        className={`topup-modal${paysioSession ? ' topup-modal--paysio' : ''}`}
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

        {ownerType === 'vendor' ? (
          <div className="topup-methods" role="tablist" aria-label="Top up method">
            <button
              type="button"
              className={`topup-method ${method === 'card' ? 'is-active' : ''}`}
              onClick={() => setMethod('card')}
            >
              Card
            </button>
            <button
              type="button"
              className={`topup-method ${method === 'metamask' ? 'is-active' : ''}`}
              onClick={() => setMethod('metamask')}
            >
              Crypto
            </button>
          </div>
        ) : null}

        {method === 'metamask' && ownerType === 'vendor' ? (
          <div className="topup-crypto">
            <p className="topup-copy">
              Connect MetaMask and send {cryptoToken} on {cryptoNetwork}. This uses the crypto gateway rail.
            </p>
            {walletAccount ? <p className="topup-status">Connected {walletAccount.slice(0, 6)}…{walletAccount.slice(-4)}</p> : null}
            {depositAddress ? (
              <p className="topup-copy">
                Deposit address: <strong>{depositAddress}</strong>
              </p>
            ) : null}
            {status ? <p className="topup-status">{status}</p> : null}
            {error ? <p className="topup-error">{error}</p> : null}
            <button type="button" className="topup-submit" disabled={loading} onClick={() => void handleMetaMask()}>
              {loading ? 'Connecting…' : walletAccount ? 'Refresh deposit address' : 'Connect wallet'}
            </button>
          </div>
        ) : (
          <>
            <p className="topup-copy">
              Pay with card, Apple Pay, or Google Pay. You must be logged in (OTP or portal) so the request can
              send your Bearer token.
            </p>

            {paysioSession ? (
              <div className="paysio-checkout-wrap">
                {status ? <p className="topup-status">{status}</p> : null}
                {error ? <p className="topup-error">{error}</p> : null}
                <div ref={setCheckoutEl} id="paysio-checkout" className="paysio-checkout" />
              </div>
            ) : (
              <>
            <TopUpPresetGrid onAdd={addPreset} />

            <form className="topup-form" onSubmit={handleSubmit}>
              <label className="topup-label" htmlFor="topup-amount">
                Amount (USD)
              </label>
              <div className="topup-amount-wrap">
                <span aria-hidden="true">$</span>
                <input
                  id="topup-amount"
                  type="number"
                  min={1}
                  step="1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>

              {status ? <p className="topup-status">{status}</p> : null}
              {error ? <p className="topup-error">{error}</p> : null}

              <button type="submit" className="topup-submit" disabled={!canSubmit}>
                {loading ? 'Processing payment…' : `Pay $${Number.isFinite(numericAmount) ? numericAmount.toFixed(0) : '—'}`}
              </button>
            </form>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
