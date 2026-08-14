import { useState, type ReactNode } from 'react'
import { ApiError, tapstackApi } from '../api/client'
import { TapStackLogo } from './TapStackLogo'
import './ApplyPage.css'

type ApplyFieldProps = {
  id: string
  label: string
  optional?: boolean
  icon: ReactNode
  placeholder: string
  value: string
  onChange: (value: string) => void
  type?: string
}

function ApplyField({
  id,
  label,
  optional = false,
  icon,
  placeholder,
  value,
  onChange,
  type = 'text',
}: ApplyFieldProps) {
  return (
    <label className="apply-field" htmlFor={id}>
      <span className="apply-field-label">
        {label}
        {optional ? ' (optional)' : ''}
      </span>
      <span className="apply-field-input-wrap">
        <span className="apply-field-icon" aria-hidden="true">
          {icon}
        </span>
        <input
          id={id}
          type={type}
          className="apply-field-input"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
  )
}

function FacebookIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 8h2.5V5H14c-2.5 0-4 1.5-4 4.5V12H8v3h2v7h4v-7h3l.5-3H14v-2c0-.6.4-1 1-1z"
        fill="currentColor"
      />
    </svg>
  )
}

const VOLUME_RANGES = [
  { value: 'under-10k', label: 'Under $10,000 / mo' },
  { value: '10k-25k', label: '$10,000 – $25,000 / mo' },
  { value: '25k-50k', label: '$25,000 – $50,000 / mo' },
  { value: '50k-plus', label: '$50,000+ / mo' },
]

function LinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 14a3.5 3.5 0 0 0 4.95 0l2.12-2.12a3.5 3.5 0 0 0-4.95-4.95L11 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M14 10a3.5 3.5 0 0 0-4.95 0L6.93 12.12a3.5 3.5 0 0 0 4.95 4.95L13 16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 12h16M12 4a12 12 0 0 1 0 16M12 4a12 12 0 0 0 0 16" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 16V6M8 10l4-4 4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 20h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function DocumentUploadTile({
  id,
  title,
  meta,
  accept,
  fileName,
  onSelect,
}: {
  id: string
  title: string
  meta: string
  accept: string
  fileName: string
  onSelect: (fileName: string) => void
}) {
  return (
    <label className="apply-upload-tile" htmlFor={id}>
      <input
        id={id}
        type="file"
        className="apply-upload-input"
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0]
          onSelect(file?.name ?? '')
        }}
      />
      <span className="apply-upload-icon" aria-hidden="true">
        <UploadIcon />
      </span>
      <span className="apply-upload-title">{title}</span>
      <span className="apply-upload-meta">{fileName || meta}</span>
    </label>
  )
}

type ApplyPageProps = {
  onBack?: () => void
}

export default function ApplyPage({ onBack }: ApplyPageProps) {
  const [fullName, setFullName] = useState('')
  const [gameroomName, setGameroomName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [facebookPage, setFacebookPage] = useState('')
  const [facebookGroup, setFacebookGroup] = useState('')
  const [automatedSite, setAutomatedSite] = useState('')
  const [mainWebsite, setMainWebsite] = useState('')
  const [monthlyVolume, setMonthlyVolume] = useState('')
  const [llcFileName, setLlcFileName] = useState('')
  const [screenshotFileName, setScreenshotFileName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const hasOnlinePresence =
    facebookPage.trim().length > 0 ||
    facebookGroup.trim().length > 0 ||
    automatedSite.trim().length > 0 ||
    mainWebsite.trim().length > 0

  const canSubmit =
    fullName.trim().length > 0 &&
    gameroomName.trim().length > 0 &&
    phone.trim().length > 0 &&
    email.trim().length > 0 &&
    hasOnlinePresence &&
    monthlyVolume.length > 0 &&
    !submitting

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return

    setError('')
    setSubmitting(true)
    try {
      await tapstackApi.apply({
        fullName: fullName.trim(),
        gameroomName: gameroomName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        facebookPage: facebookPage.trim(),
        facebookGroup: facebookGroup.trim(),
        automatedSite: automatedSite.trim(),
        mainWebsite: mainWebsite.trim(),
        monthlyVolume,
        referralCode: 'PAC-001',
        documents: {
          llcOrLoi: llcFileName || null,
          backendScreenshots: screenshotFileName || null,
        },
      })
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit application. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="apply-page">
      <div className="apply-page-scroll">
        <header className="apply-header">
          <button type="button" className="apply-header-logo-btn" onClick={onBack} aria-label="Back to login">
            <TapStackLogo height={40} />
          </button>
          <span className="apply-header-avatar" aria-hidden="true" />
        </header>

        <section className="apply-intro">
          <h1 className="apply-title">Apply for an Account</h1>
          <p className="apply-subtitle">Fill out the form below and our team will be in touch.</p>
        </section>

        {submitted ? (
          <div className="apply-success">
            <p className="apply-success-title">Application submitted</p>
            <p className="apply-success-text">Thanks, {fullName.trim()}. Our team will review your application soon.</p>
            <button type="button" className="apply-submit-btn" onClick={onBack}>
              Back to Login
            </button>
          </div>
        ) : (
          <form className="apply-form" onSubmit={handleSubmit}>
            <section className="apply-section">
              <p className="apply-section-label">Contact Info</p>

              <ApplyField
                id="apply-full-name"
                label="Full Name"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
                    <path
                      d="M6 20c0-3.314 2.686-6 6-6s6 2.686 6 6"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                }
                placeholder="Your full name"
                value={fullName}
                onChange={setFullName}
              />

              <ApplyField
                id="apply-gameroom-name"
                label="Gameroom Name"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 10V20h16V10M8 20v-6h8v6M6 10l6-6 6 6"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
                placeholder="e.g. Lucky Strike Arcade"
                value={gameroomName}
                onChange={setGameroomName}
              />

              <ApplyField
                id="apply-phone"
                label="Phone Number"
                type="tel"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M8.5 4.5c.5 2 1.5 4 3 5.5S14 11 16 11.5c1.5-2.5 1.5-5.5 1.5-5.5a9 9 0 0 0-9 9s3-3 5.5-1.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={setPhone}
              />

              <ApplyField
                id="apply-email"
                label="Email Address"
                type="email"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                }
                placeholder="you@example.com"
                value={email}
                onChange={setEmail}
              />
            </section>

            <section className="apply-section">
              <div className="apply-section-head">
                <p className="apply-section-label">Online Presence</p>
                <span className="apply-section-note">at least one required</span>
              </div>

              <ApplyField
                id="apply-facebook-page"
                label="Facebook Page"
                optional
                icon={<FacebookIcon />}
                placeholder="facebook.com/yourpage"
                value={facebookPage}
                onChange={setFacebookPage}
              />

              <ApplyField
                id="apply-facebook-group"
                label="Facebook Group"
                optional
                icon={<FacebookIcon />}
                placeholder="facebook.com/groups/..."
                value={facebookGroup}
                onChange={setFacebookGroup}
              />

              <ApplyField
                id="apply-automated-site"
                label="Automated Site"
                optional
                icon={<GlobeIcon />}
                placeholder="https://your-autosite.com"
                value={automatedSite}
                onChange={setAutomatedSite}
              />

              <ApplyField
                id="apply-main-website"
                label="Main Website"
                optional
                icon={<LinkIcon />}
                placeholder="https://yoursite.com"
                value={mainWebsite}
                onChange={setMainWebsite}
              />
            </section>

            <section className="apply-section">
              <p className="apply-section-label">Estimated Monthly Volume</p>

              <label className="apply-field" htmlFor="apply-monthly-volume">
                <span className="apply-select-wrap">
                  <select
                    id="apply-monthly-volume"
                    className={`apply-select ${monthlyVolume ? '' : 'apply-select--placeholder'}`}
                    value={monthlyVolume}
                    onChange={(event) => setMonthlyVolume(event.target.value)}
                  >
                    <option value="" disabled hidden>
                      Select a range...
                    </option>
                    {VOLUME_RANGES.filter((option) => option.value !== '').map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="apply-select-chevron" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M6 9l6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </span>
              </label>
            </section>

            <section className="apply-section">
              <p className="apply-section-label">Documents (optional)</p>

              <div className="apply-upload-grid">
                <DocumentUploadTile
                  id="apply-llc-upload"
                  title="LLC or LOI"
                  meta="PDF or image, up to 10 MB"
                  accept=".pdf,image/*"
                  fileName={llcFileName}
                  onSelect={setLlcFileName}
                />
                <DocumentUploadTile
                  id="apply-screenshots-upload"
                  title="Backend Screenshots"
                  meta="PNG/JPG, up to 10 MB"
                  accept="image/png,image/jpeg,image/jpg"
                  fileName={screenshotFileName}
                  onSelect={setScreenshotFileName}
                />
              </div>
            </section>

            <p className="apply-referral-code">Referral code: PAC-001</p>

            {error ? <p className="apply-error">{error}</p> : null}

            <button type="submit" className="apply-submit-btn" disabled={!canSubmit}>
              {submitting ? 'Submitting…' : 'Submit Application'}
            </button>
          </form>
        )}
      </div>

      <nav className="apply-bottom-nav" aria-label="Apply navigation">
        <button type="button" className="apply-bottom-nav-item apply-bottom-nav-item--active">
          <span className="apply-bottom-nav-icon-wrap apply-bottom-nav-icon-wrap--active">
            <span className="apply-bottom-nav-icon" aria-hidden="true">
              📝
            </span>
          </span>
          <span className="apply-bottom-nav-dot" aria-hidden="true" />
          <span className="apply-bottom-nav-label">Apply</span>
        </button>
        <div className="apply-home-indicator" aria-hidden="true" />
      </nav>
    </div>
  )
}
