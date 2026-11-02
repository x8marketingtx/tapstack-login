import { useEffect, useState } from 'react'
import {
  ApiError,
  getToken,
  isApiConfigured,
  tapstackApi,
  type PayoutClaim,
  type PayoutMissingField,
} from '../api/client'
import { fetchPaymentsConfig } from '../api/payments'
import { mountPaysioCardForm, tokenizePaysioCard } from '../api/paysio'
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

type Method = 'card' | 'ach'

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

const US_STATES: Array<{ code: string; name: string }> = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
]

function profileValueOk(key: string, value: string): boolean {
  const trimmed = value.trim()
  if (key === 'zip') {
    const digits = digitsOnly(trimmed)
    return digits.length === 5 || digits.length === 9
  }
  if (key === 'state') return /^[A-Z]{2}$/i.test(trimmed)
  if (key === 'phone') return digitsOnly(trimmed).length >= 10
  if (key === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
  return trimmed.length > 0
}

function missingFromError(err: unknown): PayoutMissingField[] {
  if (!(err instanceof ApiError) || !err.data) return []
  const raw = err.data.missing
  if (Array.isArray(raw)) {
    return raw.flatMap((row) => {
      if (!row || typeof row !== 'object') return []
      const key = String((row as { key?: string }).key || '')
      const label = String((row as { label?: string }).label || '')
      return key ? [{ key, label: label || key }] : []
    })
  }
  const labels = err.data.missingFields
  if (!Array.isArray(labels)) return []
  return labels.map((label) => ({
    key: String(label).replace(/\s+/g, ''),
    label: String(label),
  }))
}

export default function WithdrawModal({
  open,
  cashBalance,
  onClose,
  onVerifyRequired,
  onSuccess,
}: WithdrawModalProps) {
  const [step, setStep] = useState<'amount' | 'details'>('amount')
  const [amount, setAmount] = useState('0')
  const [method, setMethod] = useState<Method>('card')
  const [routingNumber, setRoutingNumber] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountType, setAccountType] = useState<'checking' | 'saving'>('checking')
  const [publishableKey, setPublishableKey] = useState('')
  const [cardReady, setCardReady] = useState(false)
  const [cardComplete, setCardComplete] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [explorerUrl, setExplorerUrl] = useState('')
  const [payout, setPayout] = useState<PayoutClaim | null>(null)
  const [missing, setMissing] = useState<PayoutMissingField[]>([])
  const [profilePatch, setProfilePatch] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setStep('amount')
    setAmount('0')
    setMethod('card')
    setRoutingNumber('')
    setAccountNumber('')
    setAccountType('checking')
    setCardReady(false)
    setCardComplete(false)
    setError('')
    setStatus('')
    setExplorerUrl('')
    setPayout(null)
    setMissing([])
    setProfilePatch({})
    setLoading(false)
    void fetchPaymentsConfig()
      .then((config) => setPublishableKey(config.paysio.publishableKey || ''))
      .catch(() => setPublishableKey(''))
    const token = getToken()
    if (isApiConfigured() && !token?.startsWith('demo:')) {
      void tapstackApi
        .customerWallet()
        .then((res) => {
          const next = res.payoutProfile?.missing
          if (Array.isArray(next)) setMissing(next)
        })
        .catch(() => undefined)
    }
  }, [open])

  useEffect(() => {
    if (!open || step !== 'details' || method !== 'card' || !publishableKey) return
    let cancelled = false
    let unmount: (() => void) | null = null
    setCardReady(false)
    setCardComplete(false)
    void mountPaysioCardForm(
      publishableKey,
      {
        cardNumber: '#withdraw-card-number',
        cardExpiry: '#withdraw-card-expiry',
        cardCvc: '#withdraw-card-cvc',
      },
      ({ complete, error: fieldError }) => {
        if (cancelled) return
        setCardReady(true)
        setCardComplete(complete)
        if (fieldError) setError(fieldError)
        else setError('')
      },
      { reset: true },
    )
      .then((card) => {
        if (cancelled) {
          card.unmount()
          return
        }
        unmount = card.unmount
        setCardReady(true)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load card fields.')
      })
    return () => {
      cancelled = true
      unmount?.()
    }
  }, [open, step, method, publishableKey])

  useEffect(() => {
    if (!open || !payout?.id || !payout.open) return
    let cancelled = false
    const tick = () => {
      void tapstackApi
        .customerPayout(payout.id)
        .then((res) => {
          if (cancelled || !res.payout) return
          setPayout(res.payout)
          if (res.payout.status === 'paid') {
            setStatus('Payout delivered.')
          } else if (res.payout.status === 'failed' || res.payout.status === 'expired' || res.payout.status === 'cancelled') {
            setError('This payout could not be completed. Your balance was restored.')
          }
        })
        .catch(() => undefined)
    }
    const timer = window.setInterval(tick, 4000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [open, payout?.id, payout?.open])

  if (!open) return null

  const demoSession = !isApiConfigured() || Boolean(getToken()?.startsWith('demo:'))
  const available = demoSession ? Math.max(parseTapstackCash(cashBalance), 125) : parseTapstackCash(cashBalance)
  const numericAmount = Number(amount)
  const amountOk =
    Number.isFinite(numericAmount) && numericAmount >= 1 && numericAmount <= available + 0.00001
  const destinationOk =
    method === 'card'
      ? cardComplete
      : digitsOnly(routingNumber).length === 9 && digitsOnly(accountNumber).length >= 4
  const canContinue = amountOk && !loading
  const profileReady = missing.every((field) => profileValueOk(field.key, profilePatch[field.key] || ''))
  const canSubmit =
    amountOk &&
    destinationOk &&
    profileReady &&
    !loading &&
    (method === 'ach' || Boolean(publishableKey))
  const done = Boolean(payout)

  function addPreset(value: number) {
    setAmount((current) => {
      const base = Number(current)
      const next = (Number.isFinite(base) ? base : 0) + value
      return String(Math.min(next, available))
    })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (step === 'amount') {
      if (!canContinue) return
      setError('')
      setStep('details')
      return
    }
    if (!canSubmit) return

    setError('')
    setLoading(true)

    try {
      if (demoSession) {
        const next = Math.max(0, available - numericAmount)
        setStatus('Payout sent. Portfolio NFTs burned.')
        onSuccess?.({ balance: next, points: 0, formatted: `$${next.toFixed(2)}` })
        setPayout({
          id: 0,
          status: 'pending',
          amount: numericAmount,
          amountFormatted: `$${numericAmount.toFixed(2)}`,
          method,
          claimUrl: '',
          open: false,
        })
        setLoading(false)
        return
      }

      let paymentToken: string | undefined
      let cardLastFour: string | undefined
      if (method === 'card') {
        if (!publishableKey) {
          throw new Error('Paysio card fields are not configured.')
        }
        setStatus('Securing card…')
        const tokenized = await tokenizePaysioCard(publishableKey)
        paymentToken = tokenized.token
        cardLastFour = tokenized.last4
      }

      setStatus('Sending payout…')
      const result = await tapstackApi.customerWalletWithdraw({
        amount: numericAmount,
        method,
        paymentToken,
        cardLastFour,
        routingNumber: method === 'ach' ? digitsOnly(routingNumber) : undefined,
        accountNumber: method === 'ach' ? digitsOnly(accountNumber) : undefined,
        accountType: method === 'ach' ? accountType : undefined,
        firstName: profilePatch.firstName?.trim() || undefined,
        lastName: profilePatch.lastName?.trim() || undefined,
        email: profilePatch.email?.trim() || undefined,
        phone: profilePatch.phone ? digitsOnly(profilePatch.phone) : undefined,
        street: profilePatch.street?.trim() || undefined,
        city: profilePatch.city?.trim() || undefined,
        state: profilePatch.state?.trim().toUpperCase() || undefined,
        zip: profilePatch.zip ? digitsOnly(profilePatch.zip) : undefined,
      })
      const burnLink = result.burned?.find((row) => row.burnExplorerUrl)?.burnExplorerUrl || ''
      const nextPayout: PayoutClaim = result.payout ?? {
        id: 0,
        status: 'pending',
        amount: numericAmount,
        amountFormatted: `$${numericAmount.toFixed(2)}`,
        method,
        claimUrl: '',
        open: true,
      }
      setExplorerUrl(burnLink)
      setPayout(nextPayout)
      setStatus(
        nextPayout.status === 'paid'
          ? 'Payout delivered. Portfolio NFTs burned.'
          : 'Paysio accepted the payout. Portfolio NFTs burned.',
      )
      onSuccess?.(result.wallet)
      setLoading(false)
    } catch (err) {
      const fromErr = missingFromError(err)
      if (fromErr.length) setMissing(fromErr)
      if (shouldOpenVerifyFromApiError(err)) {
        onVerifyRequired?.()
      }
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Could not withdraw.')
      setStatus('')
      setLoading(false)
    }
  }

  const title = done ? 'Payout sent' : step === 'details' ? 'Redeem details' : 'Withdraw'

  return (
    <div className="topup-overlay" role="presentation" onClick={done || loading ? undefined : onClose}>
      <div
        className="topup-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="withdraw-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="topup-header">
          {step === 'details' && !done ? (
            <button
              type="button"
              className="topup-back"
              aria-label="Back"
              onClick={() => {
                setStep('amount')
                setError('')
                setStatus('')
              }}
            >
              ‹
            </button>
          ) : (
            <span className="topup-header-spacer" />
          )}
          <h2 id="withdraw-title">{title}</h2>
          <button type="button" className="topup-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {done && payout ? (
          <>
            <p className="topup-copy">
              {`${payout.amountFormatted} is going out${payout.method === 'ach' ? ' by ACH' : ' to your card'}${payout.cardLastFour ? ` ending ${payout.cardLastFour}` : ''}.`}
            </p>
            {status ? <p className="topup-status">{status}</p> : null}
            {explorerUrl ? (
              <p className="topup-status">
                <a href={explorerUrl} target="_blank" rel="noreferrer">
                  View burn on Basescan
                </a>
              </p>
            ) : null}
            {error ? <p className="topup-error">{error}</p> : null}
            <button type="button" className="topup-submit" onClick={onClose}>
              {payout.status === 'paid' ? 'Done' : 'Close'}
            </button>
          </>
        ) : (
          <>
            <p className="topup-copy">
              {step === 'amount'
                ? `Choose card or bank on the next step. Available ${cashBalance}.`
                : `Sending $${numericAmount.toFixed(0)} to your card or bank. This is a payout, not a deposit.`}
            </p>

            {step === 'amount' ? <TopUpPresetGrid onAdd={addPreset} /> : null}

            <form className="topup-form" onSubmit={(event) => void handleSubmit(event)}>
              {step === 'amount' ? (
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
              ) : (
                <>
                  <div className="topup-pay-chip">
                    Redeem ${Number.isFinite(numericAmount) ? numericAmount.toFixed(0) : '—'}
                  </div>
                  <div className="topup-methods" role="radiogroup" aria-label="Redeem method">
                    <button
                      type="button"
                      className={`topup-method ${method === 'card' ? 'is-active' : ''}`}
                      onClick={() => {
                        setMethod('card')
                        setError('')
                      }}
                    >
                      Instant card
                    </button>
                    <button
                      type="button"
                      className={`topup-method ${method === 'ach' ? 'is-active' : ''}`}
                      onClick={() => {
                        setMethod('ach')
                        setError('')
                      }}
                    >
                      Bank ACH
                    </button>
                  </div>

                  {missing.length > 0 ? (
                    <div className="topup-missing">
                      <p>Missing from your account</p>
                      <ul>
                        {missing.map((field) => (
                          <li key={field.key}>{field.label}</li>
                        ))}
                      </ul>
                      {missing.map((field) => {
                        const inputId = `withdraw-missing-${field.key}`
                        const value = profilePatch[field.key] || ''
                        if (field.key === 'state') {
                          return (
                            <div key={field.key}>
                              <label className="topup-label" htmlFor={inputId}>
                                {field.label}
                              </label>
                              <select
                                id={inputId}
                                className="topup-zip"
                                value={value}
                                onChange={(event) =>
                                  setProfilePatch((current) => ({
                                    ...current,
                                    state: event.target.value,
                                  }))
                                }
                              >
                                <option value="">Select state</option>
                                {US_STATES.map((state) => (
                                  <option key={state.code} value={state.code}>
                                    {state.code} — {state.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )
                        }
                        return (
                          <div key={field.key}>
                            <label className="topup-label" htmlFor={inputId}>
                              {field.label}
                            </label>
                            <input
                              id={inputId}
                              className="topup-zip"
                              type={field.key === 'email' ? 'email' : 'text'}
                              inputMode={
                                field.key === 'phone' || field.key === 'zip' ? 'numeric' : undefined
                              }
                              autoComplete={
                                field.key === 'email'
                                  ? 'email'
                                  : field.key === 'phone'
                                    ? 'tel'
                                    : field.key === 'zip'
                                      ? 'postal-code'
                                      : field.key === 'street'
                                        ? 'street-address'
                                        : field.key === 'city'
                                          ? 'address-level2'
                                          : 'off'
                              }
                              value={value}
                              onChange={(event) =>
                                setProfilePatch((current) => ({
                                  ...current,
                                  [field.key]: event.target.value,
                                }))
                              }
                            />
                          </div>
                        )
                      })}
                    </div>
                  ) : null}

                  {method === 'card' ? (
                    <div className="topup-card-panel">
                      <label className="topup-label" htmlFor="withdraw-card-number">
                        Debit card
                      </label>
                      <div id="withdraw-card-number" className="topup-card-field" />
                      <div className="topup-card-row">
                        <div>
                          <label className="topup-label" htmlFor="withdraw-card-expiry">
                            Expiry
                          </label>
                          <div id="withdraw-card-expiry" className="topup-card-field" />
                        </div>
                        <div>
                          <label className="topup-label" htmlFor="withdraw-card-cvc">
                            CVC
                          </label>
                          <div id="withdraw-card-cvc" className="topup-card-field" />
                        </div>
                      </div>
                      <p className="topup-status">
                        Paysio tokenizes the card here. We then send a payout — this is not a deposit.
                      </p>
                      {!cardReady ? <p className="topup-status">Loading card fields…</p> : null}
                    </div>
                  ) : (
                    <>
                      <label className="topup-label" htmlFor="withdraw-routing">
                        Routing number
                      </label>
                      <input
                        id="withdraw-routing"
                        className="topup-zip"
                        inputMode="numeric"
                        autoComplete="off"
                        value={routingNumber}
                        onChange={(event) => setRoutingNumber(event.target.value)}
                      />
                      <label className="topup-label" htmlFor="withdraw-account">
                        Account number
                      </label>
                      <input
                        id="withdraw-account"
                        className="topup-zip"
                        inputMode="numeric"
                        autoComplete="off"
                        value={accountNumber}
                        onChange={(event) => setAccountNumber(event.target.value)}
                      />
                      <label className="topup-label" htmlFor="withdraw-account-type">
                        Account type
                      </label>
                      <select
                        id="withdraw-account-type"
                        className="topup-zip"
                        value={accountType}
                        onChange={(event) => setAccountType(event.target.value === 'saving' ? 'saving' : 'checking')}
                      >
                        <option value="checking">Checking</option>
                        <option value="saving">Savings</option>
                      </select>
                    </>
                  )}
                </>
              )}

              {status ? <p className="topup-status">{status}</p> : null}
              {error ? <p className="topup-error">{error}</p> : null}

              <button
                type="submit"
                className="topup-submit"
                disabled={step === 'amount' ? !canContinue : !canSubmit}
              >
                {loading
                  ? status || 'Sending…'
                  : step === 'amount'
                    ? 'Continue'
                    : `Send $${Number.isFinite(numericAmount) ? numericAmount.toFixed(0) : '—'}`}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
