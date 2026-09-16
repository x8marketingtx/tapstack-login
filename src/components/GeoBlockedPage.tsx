import { useState } from 'react'
import { TapStackLogo } from './TapStackLogo'
import { LegalLinks, type LegalDoc } from './LegalPage'
import './GeoBlockedPage.css'

type GeoBlockedPageProps = {
  status?: 'checking' | 'blocked'
  reason?: string | null
  type?: string | null
  country?: string | null
  onOpenLegal?: (doc: LegalDoc, section?: string) => void
  onRetry?: () => Promise<boolean> | boolean | void
  onLogout?: () => void
}

const COUNTRY_NAMES: Record<string, string> = {
  US: 'the United States',
  CA: 'Canada',
  GB: 'the United Kingdom',
  AU: 'Australia',
  PK: 'Pakistan',
  IN: 'India',
  AE: 'the United Arab Emirates',
  SA: 'Saudi Arabia',
  DE: 'Germany',
  FR: 'France',
  MX: 'Mexico',
  BR: 'Brazil',
  NG: 'Nigeria',
  ZA: 'South Africa',
  PH: 'the Philippines',
  BD: 'Bangladesh',
}

function countryCode(country?: string | null): string {
  return (country || '').trim().toUpperCase()
}

function countryLabel(country?: string | null): string {
  const code = countryCode(country)
  if (!code) return ''
  return COUNTRY_NAMES[code] || code
}

function flagEmoji(country?: string | null): string {
  const code = countryCode(country)
  if (!/^[A-Z]{2}$/.test(code)) return ''
  return String.fromCodePoint(...[...code].map((letter) => 127397 + letter.charCodeAt(0)))
}

function copyForBlock(type?: string | null, country?: string | null): { title: string; body: string } {
  const place = countryLabel(country)

  switch (type) {
    case 'vpn':
      return {
        title: 'VPN is not allowed',
        body: 'Turn off any VPN or proxy, then check again from your real connection.',
      }
    case 'geolocation_state':
      return {
        title: 'Not available here',
        body: 'TapStack is not offered in your state. Sign-in, top-up, load, and redeem stay locked from this location.',
      }
    case 'id_address':
      return {
        title: 'ID location is not allowed',
        body: 'The address on your ID is in an area TapStack cannot serve. Contact support if this looks wrong.',
      }
    case 'billing_address':
      return {
        title: 'Billing location is not allowed',
        body: 'The billing address on this account is in an area TapStack cannot serve. Contact support if this looks wrong.',
      }
    case 'location_verification':
      return {
        title: 'Location check did not pass',
        body: 'Confirm you are in an allowed area, without a VPN, then try the location check again.',
      }
    case 'geolocation_country':
    default:
      return {
        title: place ? `Not available in ${place}` : 'Not available here',
        body: 'TapStack is only offered in approved countries.',
      }
  }
}

export default function GeoBlockedPage({
  status = 'blocked',
  reason,
  type,
  country,
  onOpenLegal,
  onRetry,
  onLogout,
}: GeoBlockedPageProps) {
  const [busy, setBusy] = useState(false)
  const checking = status === 'checking'
  const copy = checking
    ? {
        title: 'Confirming your location',
        body: 'Making sure TapStack is available where you are.',
      }
    : copyForBlock(type, country)
  const code = countryCode(country)
  const flag = flagEmoji(country)
  const canRetry = type === 'vpn' || type === 'location_verification' || type === 'geolocation_country' || type === 'geolocation_state'

  async function handleRetry() {
    if (!onRetry || busy) return
    setBusy(true)
    try {
      await onRetry()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`geo-block${checking ? ' geo-block--checking' : ''}`} aria-busy={checking || undefined}>
      <div className="geo-block-brand">
        <TapStackLogo height={44} />
      </div>

      <div className="geo-block-body">
        <div className="geo-block-panel">
        <div className="geo-block-mark" aria-hidden="true">
          {checking ? <span className="geo-block-pulse" /> : null}
          <svg viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="16" stroke="currentColor" strokeWidth="1.6" opacity="0.22" />
            <path
              d="M18 8.5c-4.1 0-7.4 3.2-7.4 7.2 0 5.3 7.4 11.8 7.4 11.8s7.4-6.5 7.4-11.8c0-4-3.3-7.2-7.4-7.2Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <circle cx="18" cy="15.6" r="2.3" stroke="currentColor" strokeWidth="1.8" />
            <path d="M13 26.5h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>

        <p className="geo-block-kicker">{checking ? 'Please wait' : 'Restricted region'}</p>
        <h1 className="geo-block-title">{copy.title}</h1>
        <p className="geo-block-copy">{copy.body}</p>
        {checking ? (
          <div className="geo-block-progress" role="status" aria-live="polite" aria-label="Confirming your location">
            <span className="geo-block-progress-bar" />
          </div>
        ) : null}
        </div>
      </div>

      {checking ? null : (
      <div className="geo-block-footer">
        {code ? (
          <div className="geo-block-chip">
            {flag ? <span className="geo-block-flag">{flag}</span> : null}
            <span className="geo-block-chip-label">Detected</span>
            <strong>{countryLabel(country) || code}</strong>
            <span className="geo-block-chip-code">{code}</span>
          </div>
        ) : null}

        {reason && type !== 'geolocation_country' && type !== 'geolocation_state' && type !== 'vpn' ? (
          <p className="geo-block-reason">{reason}</p>
        ) : null}

        {canRetry && onRetry ? (
          <button type="button" className="geo-block-retry" disabled={busy} onClick={() => void handleRetry()}>
            {busy ? 'Checking…' : type === 'vpn' ? 'I turned off my VPN' : 'Check location again'}
          </button>
        ) : null}
        {onLogout ? (
          <button type="button" className="geo-block-logout" onClick={onLogout}>
            Log out
          </button>
        ) : null}
        <a className="geo-block-support" href="mailto:support@tapstack.io">
          support@tapstack.io
        </a>
        {onOpenLegal ? <LegalLinks onOpen={onOpenLegal} /> : null}
      </div>
      )}
    </div>
  )
}
