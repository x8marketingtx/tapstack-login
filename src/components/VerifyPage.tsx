import { useCallback, useEffect, useRef, useState } from 'react'
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
  geoBlockHint,
  geoBlockTitle,
  isFullPageGeoBlock,
  isHardGeoBlock,
  isLocationVerificationEnabled,
  needsVerification,
  portalBlockType,
  statusLabel,
  VERIFY_LINK_DAILY_LIMIT,
  type VerificationState,
} from '../lib/verify'
import GeoBlockedPage from './GeoBlockedPage'
import './VerifyPage.css'

type VerifyPageProps = {
  onBack: () => void
  onVerified?: () => void
  onLogout?: () => void
  onUserUpdate?: (user: TapstackUser) => void
  lockExit?: boolean
  initial?: VerificationState
}

export default function VerifyPage({
  onBack,
  onVerified,
  onLogout,
  onUserUpdate,
  lockExit = false,
  initial,
}: VerifyPageProps) {
  const [state, setState] = useState<VerificationState>(() => initial || emptyVerification())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [autoLocating, setAutoLocating] = useState(false)
  const [error, setError] = useState('')
  const [documentType, setDocumentType] = useState('DriversLicense')
  const autoLocateStarted = useRef(false)

  function applyState(next: CustomerVerifyState | VerificationState): VerificationState {
    const mapped = emptyVerification({
      ...next,
      required: next.required !== false,
    })
    setState(mapped)
    if (mapped.defaultDocumentType) setDocumentType(mapped.defaultDocumentType)
    const token = getToken()
    const user = token ? syncUserVerification(mapped) : null
    if (user) onUserUpdate?.(user)
    return mapped
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
      Boolean(state.geoBlocked) ||
      (state.locationRequired &&
        (state.locationStatus === 'pending' ||
          state.locationStatus === 'unknown' ||
          state.locationStatus === 'stale' ||
          state.locationStatus === 'failed'))
    if (!pending || !isApiConfigured()) return

    const timer = window.setInterval(() => {
      void tapstackApi
        .customerVerifyStatus()
        .then((next) => {
          const mapped = applyState(next)
          if (mapped.canSpend) {
            window.clearInterval(timer)
          }
        })
        .catch(() => {
          /* keep current */
        })
    }, 4000)

    return () => window.clearInterval(timer)
  }, [state.status, state.geoBlocked, state.locationRequired, state.locationStatus])

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

  async function retryGeoBlock(): Promise<boolean> {
    setBusy(true)
    setError('')
    try {
      const status = await tapstackApi.customerVerifyStatus()
      applyState(status)
      if (!status.geoBlocked && status.locationStatus === 'passed') return true
      if (status.locationLink && (status.locationStatus === 'pending' || status.locationStatus === 'unknown')) {
        window.location.assign(status.locationLink)
        return false
      }
      const next = await tapstackApi.customerVerifyLocation()
      applyState(next)
      if (next.locationLink) {
        window.location.assign(next.locationLink)
        return false
      }
      return !next.geoBlocked
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start location check.')
      return false
    } finally {
      setBusy(false)
    }
  }

  const startLocation = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const next = await tapstackApi.customerVerifyLocation()
      applyState(next)
      if (next.locationLink) {
        window.location.assign(next.locationLink)
        return true
      }
      return false
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start location check.')
      return false
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    if (loading || !isApiConfigured() || autoLocateStarted.current) return
    if (!isLocationVerificationEnabled()) return
    if (state.geoBlocked) return
    if (isHardGeoBlock(state)) return
    if (!state.locationRequired || state.locationStatus === 'passed') return
    if (!(state.identityVerified || state.required === false)) return

    const locateReturn = new URLSearchParams(window.location.search).get('locate')
    if (locateReturn === 'success' || locateReturn === 'error') return

    autoLocateStarted.current = true
    setAutoLocating(true)

    if (state.locationLink && state.locationStatus === 'pending') {
      window.location.assign(state.locationLink)
      return
    }

    void startLocation().then((ok) => {
      if (!ok) {
        autoLocateStarted.current = false
        setAutoLocating(false)
      }
    })
  }, [
    loading,
    startLocation,
    state.geoBlocked,
    state.geoType,
    state.identityVerified,
    state.locationLink,
    state.locationRequired,
    state.locationStatus,
    state.required,
  ])

  function handleContinue() {
    consumeVerifyReturn()
    if (state.canSpend) onVerified?.()
    else onBack()
  }

  const geoBlocked = Boolean(state.geoBlocked)
  const fullPageGeo = isFullPageGeoBlock(state)
  const hardGeo = isHardGeoBlock(state)
  const tone = toneForStatus(state)
  const locked = lockExit || needsVerification(state)
  const locationNeeded =
    state.locationRequired &&
    state.locationStatus !== 'passed' &&
    !hardGeo &&
    (state.identityVerified || state.required === false)
  const identityDone = state.identityVerified || state.required === false
  const locationDone =
    (!state.locationRequired || state.locationStatus === 'passed') && !geoBlocked
  const spendDone = state.canSpend
  const identityCurrent = !identityDone && state.status !== 'block' && !hardGeo
  const locationCurrent = identityDone && !locationDone
  const spendCurrent = locationDone && !spendDone
  const identityAction =
    state.status === 'pending' && state.verificationLink
      ? 'Continue ID scan'
      : state.status === 'error' || Boolean(state.verificationLink)
        ? 'Try again'
        : 'Begin verification'
  const heroTitle =
    state.canSpend && state.required === false && !state.locationRequired
      ? 'Verification not required'
      : state.canSpend
        ? 'You are verified'
        : geoBlocked
          ? geoBlockTitle(state)
          : locationNeeded
            ? 'Confirm your location'
            : state.status === 'manual_review'
              ? 'Documents under review'
              : state.status === 'block'
                ? 'Account blocked'
                : state.status === 'pending'
                  ? 'Finish your ID scan'
                  : state.status === 'error'
                    ? 'Try verification again'
                    : 'Verify your identity'

  if (fullPageGeo) {
    return (
      <GeoBlockedPage
        type={portalBlockType(state)}
        reason={state.geoReason}
        onRetry={retryGeoBlock}
        onLogout={onLogout}
      />
    )
  }

  if (autoLocating && locationNeeded) {
    return <GeoBlockedPage status="checking" />
  }

  const locateReturn = new URLSearchParams(window.location.search).get('locate')
  if ((locateReturn === 'success' || locateReturn === 'error') && locationNeeded && !geoBlocked) {
    return <GeoBlockedPage status="checking" />
  }

  return (
    <div className="verify-page">
      <header className="verify-header">
        {locked ? (
          <span className="verify-spacer" aria-hidden="true" />
        ) : (
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
        )}
        <h1 className="verify-title">{geoBlocked ? 'Location' : 'Verify identity'}</h1>
        <span className="verify-spacer" aria-hidden="true" />
      </header>

      {(state.required !== false || state.locationRequired) ? (
        <ol className="verify-progress" aria-label="Verification steps">
          <li className={identityDone ? 'is-done' : identityCurrent ? 'is-current' : ''}>
            <span>{identityDone ? '✓' : '1'}</span>
            Identity
          </li>
          <li className={locationDone ? 'is-done' : locationCurrent ? 'is-current' : ''}>
            <span>{locationDone ? '✓' : '2'}</span>
            Location
          </li>
          <li className={spendDone ? 'is-done' : spendCurrent ? 'is-current' : ''}>
            <span>{spendDone ? '✓' : '3'}</span>
            Unlocked
          </li>
        </ol>
      ) : null}

      {loading ? <p className="verify-loading">Checking verification…</p> : null}

      <section className={`verify-hero verify-hero--${tone}`}>
        <div className="verify-hero-icon" aria-hidden="true">
          <HeroIcon tone={tone} />
        </div>
        <div className="verify-hero-body">
          <div className={`verify-badge verify-badge--${tone}`}>
            {statusLabel(state.status, geoBlocked)}
          </div>
          <h2 className="verify-hero-title">{heroTitle}</h2>
          <p className="verify-hero-copy">
            {state.message ||
              'Sweepstakes rules require identity, age, and location checks before top-up, load, or redeem.'}
          </p>
        </div>
      </section>

      {error ? <p className="verify-error">{error}</p> : null}

      {!loading && state.pluginReady && state.required === false && state.canSpend && !state.locationRequired ? (
        <section className="verify-card">
          <CardHead
            title="Not required for this account"
            sub="Your role can use money actions without a KYC scan."
            tone="ok"
          />
          <button type="button" className="verify-btn verify-btn--primary" onClick={onBack}>
            Back
          </button>
        </section>
      ) : null}

      {!loading && !state.pluginReady ? (
        <section className="verify-card">
          <CardHead
            title="Not enabled yet"
            sub="Identity verification is not connected on this server yet."
            tone="wait"
          />
          <p className="verify-card-copy">You can keep using the app until it is turned on.</p>
          <button type="button" className="verify-btn verify-btn--primary" onClick={onBack}>
            Back
          </button>
        </section>
      ) : null}

      {!loading &&
      state.pluginReady &&
      state.required !== false &&
      !state.identityVerified &&
      !hardGeo &&
      state.status !== 'block' &&
      state.status !== 'manual_review' ? (
        <section className="verify-card">
          <CardHead
            title="Government ID"
            sub="Secure scan · about 2 minutes"
            tone="wait"
          />
          <p className="verify-card-copy">
            You will be sent to a secure scan page. Have your ID ready
            {state.selfieRequired ? ' and be prepared to take a live selfie' : ''}. You will return here automatically.
          </p>

          <ul className="verify-checklist">
            <li>Government photo ID</li>
            {state.selfieRequired ? <li>Live selfie when prompted</li> : null}
            <li>Return here when the scan finishes</li>
          </ul>

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
            onClick={() => {
              const reuseExisting =
                Boolean(state.verificationLink) &&
                (state.status === 'pending' || !state.canRetry)
              void startIdentity(!reuseExisting && Boolean(state.verificationLink))
            }}
          >
            {busy ? 'Starting…' : identityAction}
          </button>

          {state.status === 'pending' &&
          state.verificationLink &&
          state.canRetry &&
          (state.attemptsLeft ?? 0) > 0 ? (
            <button
              type="button"
              className="verify-btn verify-btn--ghost"
              disabled={busy}
              onClick={() => void startIdentity(true)}
            >
              Generate a new link
            </button>
          ) : null}

          {!state.rateLimitReason &&
          typeof state.attemptsLeft === 'number' &&
          state.status !== 'verified' ? (
            <p className="verify-hint">
              {state.attemptsLeft > 0
                ? `${state.attemptsLeft} of ${VERIFY_LINK_DAILY_LIMIT} new scan links left today. Continuing a current scan does not use one.`
                : `No more new scan links for 24 hours. Continue your current scan, or try again later.`}
            </p>
          ) : null}

          {state.rateLimitReason ? <p className="verify-hint">{state.rateLimitReason}</p> : null}
        </section>
      ) : null}

      {!loading && state.required !== false && state.status === 'manual_review' ? (
        <section className="verify-card">
          <CardHead
            title="We are reviewing your documents"
            sub="This usually takes 24–48 hours."
            tone="wait"
          />
          <p className="verify-card-copy">
            You will be able to top up, load, and redeem once it is approved.
          </p>
          {locked ? null : (
            <button type="button" className="verify-btn verify-btn--primary" onClick={onBack}>
              Back
            </button>
          )}
        </section>
      ) : null}

      {!loading && state.required !== false && state.status === 'block' ? (
        <section className="verify-card">
          <CardHead
            title="This account cannot be verified"
            sub="Contact support if this looks wrong."
            tone="bad"
          />
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

      {!loading && geoBlocked ? (
        <section className="verify-card">
          <CardHead title={geoBlockTitle(state)} sub={geoBlockHint(state)} tone="bad" />
          <p className="verify-card-copy">
            {state.geoReason ||
              state.message ||
              'This location is not eligible for top-up, load, or redeem.'}
          </p>
          {state.geoType === 'id_address' || state.geoType === 'billing_address' ? (
            onLogout ? (
              <button type="button" className="verify-btn verify-btn--ghost" onClick={onLogout}>
                Log out
              </button>
            ) : null
          ) : (
            <button
              type="button"
              className="verify-btn verify-btn--primary"
              disabled={busy}
              onClick={() => {
                if (locationNeeded) {
                  if (state.locationLink && state.locationStatus === 'pending') {
                    window.location.assign(state.locationLink)
                    return
                  }
                  void startLocation()
                  return
                }
                setLoading(true)
                void refresh()
              }}
            >
              {busy
                ? 'Starting…'
                : state.geoType === 'vpn'
                  ? 'Check again'
                  : locationNeeded
                    ? state.locationLink && state.locationStatus === 'pending'
                      ? 'Continue location check'
                      : 'Confirm location'
                    : 'Check again'}
            </button>
          )}
        </section>
      ) : null}

      {!loading && locationNeeded && !geoBlocked ? (
        <section className="verify-card">
          <CardHead
            title="Location check"
            sub="Confirms you are in an allowed area."
            tone="wait"
          />
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

      {!loading && state.canSpend && (state.required !== false || state.locationRequired) ? (
        <section className="verify-card">
          <CardHead
            title="Ready to play"
            sub="Top-up, load, and redeem are unlocked."
            tone="ok"
          />
          <button type="button" className="verify-btn verify-btn--primary" onClick={handleContinue}>
            Continue
          </button>
        </section>
      ) : null}
    </div>
  )
}

function HeroIcon({ tone }: { tone: 'ok' | 'wait' | 'warn' | 'bad' }) {
  if (tone === 'bad') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 9v4.5M12 16.5h.01M10.3 4.7 2.8 17.2A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.8L13.7 4.7a2 2 0 0 0-3.4 0Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (tone === 'ok') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3.5 5.5 6.2v5.3c0 4 2.7 7.6 6.5 8.8 3.8-1.2 6.5-4.8 6.5-8.8V6.2L12 3.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M9.5 12.2 11.2 14l3.4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="3.5" width="14" height="17" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 8.5h6M9 12h6M9 15.5h3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function CardHead({
  title,
  sub,
  tone,
}: {
  title: string
  sub: string
  tone: 'ok' | 'wait' | 'bad'
}) {
  return (
    <div className={`verify-card-head verify-card-head--${tone}`}>
      <span className="verify-card-icon" aria-hidden="true">
        {tone === 'ok' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M20 7.5 10.2 17 4 11.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : tone === 'bad' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 8v5M12 16.5h.01M12 4 3.5 19h17L12 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="5" y="4" width="14" height="16" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
            <path d="M9 9h6M9 12.5h6M9 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )}
      </span>
      <div>
        <h3 className="verify-card-title">{title}</h3>
        <p className="verify-card-sub">{sub}</p>
      </div>
    </div>
  )
}

function toneForStatus(state: VerificationState): 'ok' | 'wait' | 'warn' | 'bad' {
  if (state.canSpend) return 'ok'
  if (state.geoBlocked || state.status === 'block' || state.status === 'error') return 'bad'
  if (state.status === 'pending' || state.status === 'manual_review') return 'wait'
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
      blockedReason: next.blockedReason ?? null,
      geoBlocked: Boolean(next.geoBlocked),
      geoReason: next.geoReason ?? null,
      geoType: next.geoType ?? null,
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
    state.geoBlocked || state.status === 'block' || state.status === 'error'
      ? 'bad'
      : state.status === 'pending' || state.status === 'manual_review' || state.locationRequired
        ? 'wait'
        : 'warn'
  const action =
    state.geoBlocked
      ? 'Details'
      : state.status === 'pending'
        ? 'Continue'
        : state.status === 'manual_review'
          ? 'View'
          : state.status === 'block' || state.status === 'error'
            ? 'Details'
            : 'Verify'
  return (
    <button type="button" className={`verify-banner verify-banner--${tone}`} onClick={onVerify}>
      <span className="verify-banner-icon" aria-hidden="true">
        {tone === 'bad' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 9v4.5M12 16.5h.01M10.3 4.7 2.8 17.2A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.8L13.7 4.7a2 2 0 0 0-3.4 0Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : tone === 'wait' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="5" y="3.5" width="14" height="17" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="M9 8.5h6M9 12h6M9 15.5h3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3.5 5.5 6.2v5.3c0 4 2.7 7.6 6.5 8.8 3.8-1.2 6.5-4.8 6.5-8.8V6.2L12 3.5Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path d="M9.5 12.2 11.2 14l3.4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="verify-banner-copy">
        <span className="verify-banner-kicker">{statusLabel(state.status, Boolean(state.geoBlocked))}</span>
        <span className="verify-banner-text">
          {state.message || 'Verify your identity to top up, load, or redeem.'}
        </span>
      </span>
      <span className="verify-banner-go">
        {action}
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M6 3.5 11 8 6 12.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  )
}
