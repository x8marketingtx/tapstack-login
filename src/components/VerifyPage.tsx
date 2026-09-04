import { useEffect, useState } from 'react'
import {
  ApiError,
  applyAuthSession,
  getSessionUser,
  getToken,
  isApiConfigured,
  tapstackApi,
  type TapstackUser,
  type CustomerVerifyState,
} from '../api/client'
import {
  consumeVerifyReturn,
  emptyVerification,
  needsVerification,
  statusLabel,
  type VerificationState,
  type VerificationStatus,
} from '../lib/verify'
import './VerifyPage.css'

type VerifyPageProps = {
  onBack: () => void
  onVerified?: () => void
  onLogout?: () => void
  onUserUpdate?: (user: TapstackUser) => void
}

export default function VerifyPage({ onBack, onVerified, onLogout, onUserUpdate }: VerifyPageProps) {
  const [state, setState] = useState<VerificationState>(emptyVerification())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [documentType, setDocumentType] = useState('DriversLicense')

  function applyState(next: CustomerVerifyState | VerificationState) {
    const mapped = emptyVerification({
      ...next,
      required: next.required !== false,
    })
    setState(mapped)
    if (mapped.defaultDocumentType) setDocumentType(mapped.defaultDocumentType)
    const token = getToken()
    const user = token ? syncUserVerification(mapped) : null
    if (user) onUserUpdate?.(user)
  }

  async function refresh() {
    if (!isApiConfigured()) {
      setLoading(false)
      return
    }
    try {
      const next = await tapstackApi.customerVerifyStatus()
      applyState(next)
      setError('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load verification status.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  useEffect(() => {
    const pending =
      state.status === 'pending' ||
      (state.identityVerified &&
        state.locationRequired &&
        (state.locationStatus === 'pending' || state.locationStatus === 'unknown' || state.locationStatus === 'stale'))
    if (!pending || !isApiConfigured()) return

    const timer = window.setInterval(() => {
      void tapstackApi
        .customerVerifyStatus()
        .then((next) => {
          applyState(next)
          if (next.canSpend) {
            window.clearInterval(timer)
          }
        })
        .catch(() => {
          /* keep current */
        })
    }, 4000)

    return () => window.clearInterval(timer)
  }, [state.status, state.identityVerified, state.locationRequired, state.locationStatus])

  async function startIdentity(regenerate = false) {
    if (!regenerate && state.verificationLink && (state.status === 'pending' || state.status === 'unverified')) {
      window.location.assign(state.verificationLink)
      return
    }
    setBusy(true)
    setError('')
    try {
      const next = await tapstackApi.customerVerifyStart({
        documentType,
        regenerate,
      })
      applyState(next)
      if (next.verificationLink) {
        window.location.assign(next.verificationLink)
        return
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start verification.')
    } finally {
      setBusy(false)
    }
  }

  async function startLocation() {
    setBusy(true)
    setError('')
    try {
      const next = await tapstackApi.customerVerifyLocation()
      applyState(next)
      if (next.locationLink) {
        window.location.assign(next.locationLink)
        return
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start location check.')
    } finally {
      setBusy(false)
    }
  }

  function handleContinue() {
    consumeVerifyReturn()
    if (state.canSpend) onVerified?.()
    else onBack()
  }

  const tone = toneForStatus(state.status, state.canSpend)
  const locationNeeded =
    state.identityVerified &&
    state.locationRequired &&
    state.locationStatus !== 'passed'
  const identityAction =
    state.status === 'pending' && state.verificationLink
      ? 'Continue ID scan'
      : state.status === 'error' || Boolean(state.verificationLink)
        ? 'Try again'
        : 'Begin verification'

  return (
    <div className="verify-page">
      <header className="verify-header">
        <button type="button" className="verify-back" onClick={onBack} aria-label="Go back">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M11.25 3.75 L6 9 L11.25 14.25"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="verify-title">Verify identity</h1>
        <span className="verify-spacer" aria-hidden="true" />
      </header>

      {loading ? <p className="verify-loading">Checking verification…</p> : null}

      <section className={`verify-hero verify-hero--${tone}`}>
        <div className={`verify-badge verify-badge--${tone}`}>{statusLabel(state.status)}</div>
        <h2 className="verify-hero-title">
          {state.canSpend && state.required === false
            ? 'Verification not required'
            : state.canSpend
            ? 'You are verified'
            : locationNeeded
              ? 'Confirm your location'
              : state.status === 'manual_review'
                ? 'Under review'
                : state.status === 'block'
                  ? 'Account blocked'
                  : 'Verify to play with money'}
        </h2>
        <p className="verify-hero-copy">
          {state.message ||
            'Sweepstakes rules require identity, age, and location checks before top-up, load, or redeem.'}
        </p>
      </section>

      {error ? <p className="verify-error">{error}</p> : null}

      {!loading && state.pluginReady && state.required === false ? (
        <section className="verify-card">
          <h3 className="verify-card-title">Not required for this account</h3>
          <p className="verify-card-copy">
            Identity verification is turned on for other TapStack roles, but not yours. You can keep using money
            actions without a KYC scan.
          </p>
          <button type="button" className="verify-btn verify-btn--primary" onClick={onBack}>
            Back
          </button>
        </section>
      ) : null}

      {!loading && !state.pluginReady ? (
        <section className="verify-card">
          <h3 className="verify-card-title">Not enabled yet</h3>
          <p className="verify-card-copy">
            Identity verification is not connected on this server. You can keep using the app until it is turned on.
          </p>
          <button type="button" className="verify-btn verify-btn--primary" onClick={onBack}>
            Back
          </button>
        </section>
      ) : null}

      {!loading &&
      state.pluginReady &&
      state.required !== false &&
      !state.identityVerified &&
      state.status !== 'block' &&
      state.status !== 'manual_review' ? (
        <section className="verify-card">
          <h3 className="verify-card-title">Government ID</h3>
          <p className="verify-card-copy">
            You will be sent to a secure scan page. Have your ID ready
            {state.selfieRequired ? ' and be prepared to take a live selfie' : ''}. You will return here automatically.
          </p>

          {state.documentTypes.length > 1 ? (
            <div className="verify-docs" role="group" aria-label="Document type">
              {state.documentTypes.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  className={`verify-doc${documentType === doc.id ? ' is-active' : ''}`}
                  onClick={() => setDocumentType(doc.id)}
                >
                  {doc.label}
                </button>
              ))}
            </div>
          ) : state.documentTypes[0] ? (
            <p className="verify-doc-single">Use your {state.documentTypes[0].label.toLowerCase()}.</p>
          ) : null}

          <button
            type="button"
            className="verify-btn verify-btn--primary"
            disabled={busy || (!state.canRetry && !state.verificationLink)}
            onClick={() => void startIdentity(Boolean(state.verificationLink) && state.status !== 'pending')}
          >
            {busy ? 'Starting…' : identityAction}
          </button>

          {state.status === 'pending' && state.verificationLink && state.canRetry ? (
            <button
              type="button"
              className="verify-btn verify-btn--ghost"
              disabled={busy}
              onClick={() => void startIdentity(true)}
            >
              Generate a new link
            </button>
          ) : null}

          {state.rateLimitReason ? <p className="verify-hint">{state.rateLimitReason}</p> : null}
        </section>
      ) : null}

      {!loading && state.required !== false && state.status === 'manual_review' ? (
        <section className="verify-card">
          <h3 className="verify-card-title">We are reviewing your documents</h3>
          <p className="verify-card-copy">
            This usually takes 24–48 hours. You will be able to top up, load, and redeem once it is approved.
          </p>
          <button type="button" className="verify-btn verify-btn--primary" onClick={onBack}>
            Back to games
          </button>
        </section>
      ) : null}

      {!loading && state.required !== false && state.status === 'block' ? (
        <section className="verify-card">
          <h3 className="verify-card-title">This account cannot be verified</h3>
          <p className="verify-card-copy">
            {state.blockedReason === 'duplicate_license'
              ? 'An account already exists with this ID. Sign in to that account, or contact support if this is a mistake.'
              : 'Contact support@tapstack.io if you believe this is an error.'}
          </p>
          {onLogout ? (
            <button type="button" className="verify-btn verify-btn--ghost" onClick={onLogout}>
              Log out
            </button>
          ) : null}
        </section>
      ) : null}

      {!loading && locationNeeded ? (
        <section className="verify-card">
          <h3 className="verify-card-title">Location check</h3>
          <p className="verify-card-copy">
            {state.locationStatus === 'stale'
              ? 'Your network changed since the last check. Confirm you are still in an allowed location.'
              : 'A location check is required before money actions. This detects VPN use and blocked states.'}
          </p>
          <button
            type="button"
            className="verify-btn verify-btn--primary"
            disabled={busy}
            onClick={() => {
              if (state.locationLink && state.locationStatus === 'pending') {
                window.location.assign(state.locationLink)
                return
              }
              void startLocation()
            }}
          >
            {busy
              ? 'Starting…'
              : state.locationLink && state.locationStatus === 'pending'
                ? 'Continue location check'
                : 'Confirm location'}
          </button>
        </section>
      ) : null}

      {!loading && state.canSpend && state.required !== false ? (
        <section className="verify-card">
          <h3 className="verify-card-title">Ready to play</h3>
          <p className="verify-card-copy">Top-up, load, and redeem are unlocked on this account.</p>
          <button type="button" className="verify-btn verify-btn--primary" onClick={handleContinue}>
            Continue
          </button>
        </section>
      ) : null}

      {state.required !== false ? (
      <ul className="verify-steps">
        <li className={state.identityVerified ? 'is-done' : ''}>
          <span>1</span> Identity &amp; age
        </li>
        <li className={!state.locationRequired || state.locationStatus === 'passed' ? 'is-done' : ''}>
          <span>2</span> Location
        </li>
        <li className={state.canSpend ? 'is-done' : ''}>
          <span>3</span> Load &amp; redeem
        </li>
      </ul>
      ) : null}
    </div>
  )
}

function toneForStatus(status: VerificationStatus, canSpend: boolean): 'ok' | 'wait' | 'warn' | 'bad' {
  if (canSpend || status === 'verified') return 'ok'
  if (status === 'pending' || status === 'manual_review') return 'wait'
  if (status === 'block' || status === 'error') return 'bad'
  return 'warn'
}

function syncUserVerification(next: VerificationState): TapstackUser | null {
  const user = getSessionUser()
  const token = getToken()
  if (!user || !token) return null
  const updated: TapstackUser = {
    ...user,
    verification: {
      status: next.status,
      identityVerified: next.identityVerified,
      locationRequired: next.locationRequired,
      locationStatus: next.locationStatus,
      canSpend: next.canSpend,
      pluginReady: next.pluginReady,
      required: next.required !== false,
      message: next.message,
    },
  }
  applyAuthSession(token, updated)
  return updated
}

export function VerifyBanner({
  state,
  onVerify,
}: {
  state: VerificationState
  onVerify: () => void
}) {
  if (!needsVerification(state)) return null
  const tone =
    state.status === 'block' || state.status === 'error'
      ? 'bad'
      : state.status === 'pending' || state.status === 'manual_review'
        ? 'wait'
        : 'wait'
  return (
    <div className={`verify-banner verify-banner--${tone}`}>
      <div className="verify-banner-copy">
        <p className="verify-banner-kicker">{statusLabel(state.status)}</p>
        <p className="verify-banner-text">
          {state.message || 'Verify your identity to top up, load, or redeem.'}
        </p>
      </div>
      <button type="button" className="verify-banner-go" onClick={onVerify}>
        {state.status === 'pending' ? 'Continue' : 'Verify'}
      </button>
    </div>
  )
}
