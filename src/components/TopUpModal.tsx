import { useEffect, useRef, useState } from 'react'
import { ApiError, tapstackApi } from '../api/client'
import { shouldOpenVerifyFromApiError } from '../lib/verify'
import { fetchPaymentsConfig, type CardProcessor } from '../api/payments'
import {
  chargePaysioPayment,
  mountPaysioCardForm,
  mountPaysioWallets,
  tokenizeAndChargeCard,
  type PaysioWalletPayment,
} from '../api/paysio'
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
  const [postalCode, setPostalCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [method, setMethod] = useState<'card' | 'metamask'>('card')
  const [walletAccount, setWalletAccount] = useState('')
  const [depositAddress, setDepositAddress] = useState('')
  const [cryptoNetwork, setCryptoNetwork] = useState('polygon')
  const [cryptoToken, setCryptoToken] = useState('USDC')
  const [processor, setProcessor] = useState<CardProcessor>('wert')
  const [publishableKey, setPublishableKey] = useState('')
  const [step, setStep] = useState<'amount' | 'pay'>('amount')
  const [cardReady, setCardReady] = useState(false)
  const [cardComplete, setCardComplete] = useState(false)

  const walletsRef = useRef<HTMLDivElement | null>(null)
  const walletApiRef = useRef<{ updateAmount: (n: number) => void; unmount: () => void } | null>(null)
  const amountRef = useRef(0)
  const postalRef = useRef('')
  const onCloseRef = useRef(onClose)
  const onSuccessRef = useRef(onSuccess)
  const onVerifyRef = useRef(onVerifyRequired)
  const ownerTypeRef = useRef(ownerType)
  onCloseRef.current = onClose
  onSuccessRef.current = onSuccess
  onVerifyRef.current = onVerifyRequired
  ownerTypeRef.current = ownerType
  postalRef.current = postalCode

  useEffect(() => {
    if (!open) return
    setAmount('0')
    setPostalCode('')
    setError('')
    setStatus('')
    setLoading(false)
    setStep('amount')
    setCardReady(false)
    setCardComplete(false)
    setPublishableKey('')
    void fetchPaymentsConfig()
      .then((config) => {
        setProcessor(config.processor)
        setPublishableKey(config.paysio.publishableKey || '')
      })
      .catch(() => setProcessor('wert'))
  }, [open])

  const numericAmount = Number(amount)
  amountRef.current = Number.isFinite(numericAmount) ? numericAmount : 0

  useEffect(() => {
    if (!open || processor !== 'paysio' || !publishableKey || method !== 'card' || step !== 'pay') return
    let cancelled = false
    let unmountCard: (() => void) | null = null
    let wallets: { updateAmount: (n: number) => void; unmount: () => void } | null = null

    const finish = (
      wallet?: { balance: number; points: number; currency: string },
    ) => {
      setStatus('Payment successful. Balance updated.')
      setLoading(false)
      onSuccessRef.current?.(wallet)
      window.setTimeout(() => {
        onCloseRef.current()
        setStatus('')
      }, 900)
    }

    const fail = (message: string, err?: unknown) => {
      if (shouldOpenVerifyFromApiError(err)) onVerifyRef.current?.()
      setError(message)
      setLoading(false)
      setStatus('')
    }

    void (async () => {
      try {
        const card = await mountPaysioCardForm(
          publishableKey,
          {
            cardNumber: '#paysio-card-number',
            cardExpiry: '#paysio-card-expiry',
            cardCvc: '#paysio-card-cvc',
          },
          ({ complete, error: fieldError }) => {
            if (cancelled) return
            setCardComplete(complete)
            setCardReady(true)
            if (fieldError) setError(fieldError)
          },
        )
        if (cancelled) {
          card.unmount()
          return
        }
        unmountCard = card.unmount
        setCardReady(true)

        if (walletsRef.current) {
          wallets = await mountPaysioWallets(
            publishableKey,
            walletsRef.current,
            Math.max(amountRef.current, 1),
            async (data: PaysioWalletPayment) => {
              const payAmount = amountRef.current
              if (!Number.isFinite(payAmount) || payAmount < 1) {
                fail('Enter an amount of at least $1 first.')
                return false
              }
              setError('')
              setStatus('Processing Apple Pay / Google Pay…')
              setLoading(true)
              try {
                const result = await chargePaysioPayment({
                  amount: payAmount,
                  ownerType: ownerTypeRef.current,
                  paysioWallet: data.paysioWallet,
                  wallet: data.wallet,
                  threeDs: data.threeDS,
                  postalCode: postalRef.current.trim() || undefined,
                })
                finish(result.wallet)
                return true
              } catch (err) {
                fail(
                  err instanceof ApiError
                    ? err.message
                    : err instanceof Error
                      ? err.message
                      : 'Wallet payment failed.',
                  err,
                )
                return false
              }
            },
          )
          if (cancelled) {
            wallets.unmount()
            wallets = null
            return
          }
          walletApiRef.current = wallets
          if (amountRef.current >= 1) wallets.updateAmount(amountRef.current)
        }
      } catch (err) {
        if (!cancelled) {
          fail(err instanceof Error ? err.message : 'Could not load card fields.')
        }
      }
    })()

    return () => {
      cancelled = true
      unmountCard?.()
      wallets?.unmount()
      walletApiRef.current = null
    }
  }, [open, processor, publishableKey, method, step])

  useEffect(() => {
    if (!open || processor !== 'paysio') return
    if (Number.isFinite(numericAmount) && numericAmount >= 1) {
      walletApiRef.current?.updateAmount(numericAmount)
    }
  }, [open, processor, numericAmount])

  if (!open) return null

  const canSubmitWert = Number.isFinite(numericAmount) && numericAmount >= 1 && !loading
  const canContinuePaysio = Number.isFinite(numericAmount) && numericAmount >= 1 && !loading
  const canSubmitPaysio = canContinuePaysio && cardComplete && cardReady

  function addPreset(value: number) {
    setAmount((current) => {
      const base = Number(current)
      const next = (Number.isFinite(base) ? base : 0) + value
      return String(next)
    })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (processor === 'paysio') {
      if (step !== 'pay') {
        if (!canContinuePaysio) return
        setError('')
        setStatus('')
        setStep('pay')
        return
      }
      if (!canSubmitPaysio || !publishableKey) return
      setError('')
      setStatus('Verifying card…')
      setLoading(true)
      try {
        const result = await tokenizeAndChargeCard({
          publishableKey,
          amount: numericAmount,
          ownerType,
          postalCode: postalCode.trim() || undefined,
          threeDsTarget: '#paysio-threeds',
        })
        setStatus('Payment successful. Balance updated.')
        setLoading(false)
        onSuccess?.(result.wallet)
        window.setTimeout(() => {
          onClose()
          setStatus('')
        }, 900)
      } catch (err) {
        if (shouldOpenVerifyFromApiError(err)) onVerifyRequired?.()
        setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Could not charge card.')
        setLoading(false)
        setStatus('')
      }
      return
    }

    if (!canSubmitWert) return
    setError('')
    setStatus('Opening secure checkout…')
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
      if (shouldOpenVerifyFromApiError(err)) onVerifyRequired?.()
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
      if (shouldOpenVerifyFromApiError(err)) onVerifyRequired?.()
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Could not connect MetaMask.')
      setStatus('')
    } finally {
      setLoading(false)
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
        <span className="topup-handle" aria-hidden="true" />
        <div className="topup-header">
          {processor === 'paysio' && step === 'pay' ? (
            <button
              type="button"
              className="topup-back"
              aria-label="Back"
              onClick={() => {
                setStep('amount')
                setError('')
                setStatus('')
                setCardComplete(false)
                setCardReady(false)
              }}
            >
              ‹
            </button>
          ) : (
            <span className="topup-header-spacer" />
          )}
          <h2 id="topup-title">{step === 'pay' ? 'Payment' : title}</h2>
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
            {step === 'amount' ? (
              <p className="topup-copy">Added to your Portfolio Balance</p>
            ) : (
              <p className="topup-copy">Apple Pay, Google Pay, or card</p>
            )}

            {step === 'amount' ? <TopUpPresetGrid onAdd={addPreset} /> : null}

            <form className="topup-form" onSubmit={handleSubmit}>
              {step === 'amount' ? (
                <div className="topup-hero-amount">
                  <span aria-hidden="true">$</span>
                  <input
                    id="topup-amount"
                    type="number"
                    min={1}
                    step="1"
                    value={amount === '0' ? '' : amount}
                    placeholder="0"
                    onChange={(event) => setAmount(event.target.value || '0')}
                  />
                </div>
              ) : (
                <div className="topup-pay-chip">
                  Paying ${Number.isFinite(numericAmount) ? numericAmount.toFixed(0) : '—'}
                </div>
              )}

              {processor === 'paysio' && step === 'pay' ? (
                <>
                  <div ref={walletsRef} id="paysio-wallets" className="topup-wallets" />
                  <p className="topup-or">or card</p>
                  <div className="topup-card-panel">
                    <label className="topup-label" htmlFor="paysio-card-number">
                      Card number
                    </label>
                    <div id="paysio-card-number" className="topup-card-field" />
                    <div className="topup-card-row">
                      <div>
                        <label className="topup-label" htmlFor="paysio-card-expiry">
                          Expiry
                        </label>
                        <div id="paysio-card-expiry" className="topup-card-field" />
                      </div>
                      <div>
                        <label className="topup-label" htmlFor="paysio-card-cvc">
                          Security code
                        </label>
                        <div id="paysio-card-cvc" className="topup-card-field" />
                      </div>
                    </div>
                    <label className="topup-label" htmlFor="topup-zip">
                      Billing ZIP
                    </label>
                    <input
                      id="topup-zip"
                      className="topup-zip"
                      type="text"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      placeholder="Optional"
                      value={postalCode}
                      onChange={(event) => setPostalCode(event.target.value)}
                    />
                  </div>
                  <div id="paysio-threeds" className="topup-threeds" />
                  {!cardReady ? <p className="topup-status">Loading card fields…</p> : null}
                </>
              ) : null}

              {status ? <p className="topup-status">{status}</p> : null}
              {error ? <p className="topup-error">{error}</p> : null}

              <button
                type="submit"
                className="topup-submit"
                disabled={
                  processor === 'paysio'
                    ? step === 'pay'
                      ? !canSubmitPaysio
                      : !canContinuePaysio
                    : !canSubmitWert
                }
              >
                {loading
                  ? processor === 'paysio'
                    ? 'Charging card…'
                    : 'Processing payment…'
                  : `Pay $${Number.isFinite(numericAmount) ? numericAmount.toFixed(0) : '—'}`}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
