import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ApiError, applyAuthSession, getToken, tapstackApi } from '../api/client'
import { TERMS_POLICY_SECTIONS } from '../data/termsPolicy'
import './VendorOnboardingModal.css'

const VOLUME_RANGES = [
  { value: 'under-10k', label: 'Under $10,000 / mo' },
  { value: '10k-25k', label: '$10,000 – $25,000 / mo' },
  { value: '25k-50k', label: '$25,000 – $50,000 / mo' },
  { value: '50k-plus', label: '$50,000+ / mo' },
]

export default function VendorOnboardingModal({
  missingFields,
  onComplete,
}: {
  missingFields: string[]
  onComplete: () => void
}) {
  const [scrolled, setScrolled] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [facebookPage, setFacebookPage] = useState('')
  const [facebookGroup, setFacebookGroup] = useState('')
  const [automatedSite, setAutomatedSite] = useState('')
  const [mainWebsite, setMainWebsite] = useState('')
  const [monthlyVolume, setMonthlyVolume] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const needs = useMemo(() => new Set(missingFields), [missingFields])
  const needsPresence = needs.has('onlinePresence')
  const hasPresence =
    facebookPage.trim() || facebookGroup.trim() || automatedSite.trim() || mainWebsite.trim()

  const canSubmit =
    agreed &&
    scrolled &&
    (!needs.has('fullName') || fullName.trim().length > 0) &&
    (!needs.has('phone') || phone.trim().length > 0) &&
    (!needsPresence || Boolean(hasPresence)) &&
    (!needs.has('monthlyVolume') || monthlyVolume.length > 0) &&
    !busy

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    setError('')
    try {
      const res = await tapstackApi.vendorCompleteOnboarding({
        termsAccepted: true,
        fullName: fullName.trim(),
        phone: phone.trim(),
        facebookPage: facebookPage.trim(),
        facebookGroup: facebookGroup.trim(),
        automatedSite: automatedSite.trim(),
        mainWebsite: mainWebsite.trim(),
        monthlyVolume,
      })
      const token = getToken()
      if (token && res.user) applyAuthSession(token, res.user)
      onComplete()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not finish onboarding.')
    } finally {
      setBusy(false)
    }
  }

  const host = typeof document !== 'undefined' ? document.body : null
  if (!host) return null

  return createPortal(
    <div className="vendor-onboard-overlay" role="presentation">
      <form
        className="vendor-onboard-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vendor-onboard-title"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <h2 id="vendor-onboard-title">Finish vendor setup</h2>
        <p className="vendor-onboard-copy">
          Imported vendors must agree to the Terms and Conditions and complete any missing
          registration fields before using Tapstack.
        </p>

        <div
          className="vendor-onboard-terms"
          onScroll={(event) => {
            const el = event.currentTarget
            if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setScrolled(true)
          }}
        >
          {TERMS_POLICY_SECTIONS.map((section) => (
            <section key={section.heading}>
              <h3>{section.heading}</h3>
              {section.body.map((paragraph) => (
                <p key={paragraph.slice(0, 48)}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>
        {!scrolled ? (
          <p className="vendor-onboard-hint">Scroll to the bottom of the terms to continue.</p>
        ) : null}

        <label className="vendor-onboard-agree">
          <input
            type="checkbox"
            checked={agreed}
            disabled={!scrolled}
            onChange={(event) => setAgreed(event.target.checked)}
          />
          I have read and agree to the Terms and Conditions, including vendor force-approval
          liability.
        </label>

        {needs.has('fullName') ? (
          <label className="vendor-onboard-field">
            Full name
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} required />
          </label>
        ) : null}
        {needs.has('phone') ? (
          <label className="vendor-onboard-field">
            Phone
            <input value={phone} onChange={(event) => setPhone(event.target.value)} required />
          </label>
        ) : null}
        {needsPresence ? (
          <div className="vendor-onboard-presence">
            <p>Online presence (at least one)</p>
            <input
              placeholder="Facebook page"
              value={facebookPage}
              onChange={(event) => setFacebookPage(event.target.value)}
            />
            <input
              placeholder="Facebook group"
              value={facebookGroup}
              onChange={(event) => setFacebookGroup(event.target.value)}
            />
            <input
              placeholder="Automated site"
              value={automatedSite}
              onChange={(event) => setAutomatedSite(event.target.value)}
            />
            <input
              placeholder="Main website"
              value={mainWebsite}
              onChange={(event) => setMainWebsite(event.target.value)}
            />
          </div>
        ) : null}
        {needs.has('monthlyVolume') ? (
          <label className="vendor-onboard-field">
            Estimated monthly volume
            <select value={monthlyVolume} onChange={(event) => setMonthlyVolume(event.target.value)} required>
              <option value="" disabled>
                Select a range...
              </option>
              {VOLUME_RANGES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {error ? <p className="vendor-onboard-error">{error}</p> : null}
        <button type="submit" className="vendor-onboard-submit" disabled={!canSubmit}>
          {busy ? 'Saving…' : 'Agree and continue'}
        </button>
      </form>
    </div>,
    host,
  )
}
