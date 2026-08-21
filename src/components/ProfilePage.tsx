import { useEffect, useState } from 'react'
import {
  ApiError,
  applyAuthSession,
  getToken,
  isApiConfigured,
  isMeForCurrentSession,
  normalizeSessionRole,
  tapstackApi,
  type SessionRole,
  type TapstackUser,
  type TicketTier,
} from '../api/client'
import { normalizeTicketTier, tierBadgeClass, tierLabel } from '../data/tiers'
import './ProfilePage.css'

export type PlayerProfile = {
  displayName: string
  username: string
  email: string
  phone: string
  initials: string
  level: number
  levelProgressPct: number
  tier: TicketTier
}

export const DEMO_PLAYER_PROFILE: PlayerProfile = {
  displayName: 'Marcus Rivera',
  username: '@marcus_r',
  email: 'player@tapstack.demo',
  phone: '+1 555 555 0100',
  initials: 'MR',
  level: 7,
  levelProgressPct: 62,
  tier: 'bronze',
}

export function isPlaceholderEmail(email: string): boolean {
  const value = email.toLowerCase()
  return (
    value.endsWith('@players.tapstack.local') ||
    value.endsWith('@phone.tapstack.local') ||
    (value.includes('player_') && value.endsWith('.local'))
  )
}

export function profileFromUser(
  user: TapstackUser,
  level = 1,
  levelProgressPct = 0,
): PlayerProfile {
  const rawName =
    user.displayName ||
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    'Player'
  const displayName = rawName
  const username = user.username?.startsWith('@')
    ? user.username
    : `@${(user.username || displayName.split(' ')[0] || 'player').replace(/^@/, '')}`
  return {
    displayName,
    username,
    email: user.email || '—',
    phone: formatPhone(user.phone || ''),
    initials: initialsFromName(displayName),
    level: user.level || level || 1,
    levelProgressPct,
    tier: normalizeTicketTier(user.tier),
  }
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'P'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `+1 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }
  return phone || '—'
}

/** National 10-digit US number — strips leading +1 / 1. */
function nationalPhoneDigits(value: string): string {
  let digits = value.replace(/\D/g, '')
  if (digits.length >= 11 && digits.startsWith('1')) {
    digits = digits.slice(1)
  }
  return digits.slice(0, 10)
}

function phonesMatch(a: string, b: string): boolean {
  return nationalPhoneDigits(a) === nationalPhoneDigits(b) && nationalPhoneDigits(a).length === 10
}

type ProfilePageProps = {
  profile: PlayerProfile
  onBack: () => void
  onLogout: () => void
  onProfileChange: (profile: PlayerProfile) => void
  showLevel?: boolean
  /** Only hydrate/save session data for this role (avoids player data on vendor portal). */
  expectedRole?: SessionRole
  onRoleMismatch?: (role: SessionRole) => void
  /** Match portal header avatar styling (e.g. vendor purple). */
  avatarTone?: 'player' | 'vendor' | 'admin'
}

export default function ProfilePage({
  profile,
  onBack,
  onLogout,
  onProfileChange,
  showLevel = true,
  expectedRole,
  onRoleMismatch,
  avatarTone = 'player',
}: ProfilePageProps) {
  const [loggingOut, setLoggingOut] = useState(false)
  const [loading, setLoading] = useState(isApiConfigured())
  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [error, setError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(profile.displayName)
  const [email, setEmail] = useState(
    isPlaceholderEmail(profile.email) ? '' : profile.email,
  )
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localProfile, setLocalProfile] = useState(profile)
  const [phoneStep, setPhoneStep] = useState<'idle' | 'enter' | 'otp'>('idle')
  const [newPhone, setNewPhone] = useState('')
  const [phoneOtp, setPhoneOtp] = useState('')
  const [phoneBusy, setPhoneBusy] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const [phoneSuccess, setPhoneSuccess] = useState('')
  const [phoneDemoCode, setPhoneDemoCode] = useState('')

  useEffect(() => {
    setLocalProfile(profile)
    setFullName(profile.displayName)
    setEmail(isPlaceholderEmail(profile.email) ? '' : profile.email)
    if (isPlaceholderEmail(profile.email) || profile.displayName.startsWith('Player ')) {
      setEditing(true)
    }
  }, [profile])

  useEffect(() => {
    if (!isApiConfigured()) {
      setLoading(false)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const res = await tapstackApi.me()
        if (cancelled) return

        const userRole = normalizeSessionRole(res.user.role)
        if (!isMeForCurrentSession(res.user)) {
          return
        }
        if (expectedRole && userRole && userRole !== expectedRole) {
          const token = getToken()
          if (token) applyAuthSession(token, res.user)
          if (onRoleMismatch) onRoleMismatch(userRole)
          else onLogout()
          return
        }

        const next = profileFromUser(res.user, res.level, res.levelProgressPct)
        setLocalProfile(next)
        onProfileChange(next)
        const token = getToken()
        if (token) {
          applyAuthSession(token, res.user)
        }
        setFullName(next.displayName)
        setEmail(isPlaceholderEmail(next.email) ? '' : next.email)
        if (isPlaceholderEmail(next.email) || next.displayName.startsWith('Player ')) {
          setEditing(true)
        }
      } catch {
        // Keep whatever we already have.
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [expectedRole, onProfileChange, onLogout, onRoleMismatch])

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    if (!fullName.trim() || !email.trim().includes('@')) {
      setError('Enter your full name and a real email address.')
      return
    }

    setError('')
    setSaving(true)

    try {
      if (isApiConfigured()) {
        const res = await tapstackApi.updateProfile({
          fullName: fullName.trim(),
          email: email.trim(),
        })
        const next = profileFromUser(
          res.user,
          localProfile.level,
          localProfile.levelProgressPct,
        )
        setLocalProfile(next)
        onProfileChange(next)
        const token = getToken()
        if (token) {
          applyAuthSession(token, res.user)
        }
        setEditing(false)
      } else {
        const next: PlayerProfile = {
          ...localProfile,
          displayName: fullName.trim(),
          email: email.trim(),
          initials: initialsFromName(fullName.trim()),
          username: `@${fullName.trim().toLowerCase().replace(/\s+/g, '_')}`,
        }
        setLocalProfile(next)
        onProfileChange(next)
        setEditing(false)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  function resetPhoneChange() {
    setPhoneStep('idle')
    setNewPhone('')
    setPhoneOtp('')
    setPhoneError('')
    setPhoneDemoCode('')
    setPhoneBusy(false)
  }

  async function handleSendPhoneOtp(event: React.FormEvent) {
    event.preventDefault()
    setPhoneError('')
    setPhoneSuccess('')
    const digits = nationalPhoneDigits(newPhone)
    if (digits.length !== 10) {
      setPhoneError('Enter a valid 10-digit US phone number.')
      return
    }
    if (phonesMatch(digits, localProfile.phone)) {
      setPhoneError('That is already your current phone number.')
      return
    }

    setPhoneBusy(true)
    try {
      if (isApiConfigured()) {
        const lookup = await tapstackApi.playerExists(digits)
        if (lookup.exists && !phonesMatch(lookup.phone, localProfile.phone)) {
          setPhoneError('That phone number is already used by another account.')
          return
        }
        const otp = await tapstackApi.requestOtp(digits, 'change_phone')
        setPhoneDemoCode(otp.demoCode || '')
        setPhoneStep('otp')
        setPhoneOtp('')
      } else {
        setPhoneDemoCode('12345')
        setPhoneStep('otp')
        setPhoneOtp('')
      }
    } catch (err) {
      setPhoneError(err instanceof ApiError ? err.message : 'Could not send verification code.')
    } finally {
      setPhoneBusy(false)
    }
  }

  async function handleConfirmPhoneOtp(event: React.FormEvent) {
    event.preventDefault()
    setPhoneError('')
    const digits = nationalPhoneDigits(newPhone)
    if (phoneOtp.trim().length !== 5) {
      setPhoneError('Enter the 5-digit verification code.')
      return
    }

    setPhoneBusy(true)
    try {
      if (isApiConfigured()) {
        const res = await tapstackApi.changePhone(digits, phoneOtp.trim())
        const next = profileFromUser(res.user, localProfile.level, localProfile.levelProgressPct)
        setLocalProfile(next)
        onProfileChange(next)
        const token = getToken()
        if (token) applyAuthSession(token, res.user)
        setPhoneSuccess('Phone number updated.')
        resetPhoneChange()
      } else {
        const next: PlayerProfile = {
          ...localProfile,
          phone: formatPhone(digits),
        }
        setLocalProfile(next)
        onProfileChange(next)
        setPhoneSuccess('Phone number updated (demo).')
        resetPhoneChange()
      }
    } catch (err) {
      setPhoneError(err instanceof ApiError ? err.message : 'Could not verify phone number.')
    } finally {
      setPhoneBusy(false)
    }
  }

  async function handlePasswordSave(event: React.FormEvent) {
    event.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }

    setSavingPassword(true)
    try {
      if (isApiConfigured()) {
        const res = await tapstackApi.changePassword(currentPassword, newPassword)
        applyAuthSession(res.token, res.user)
        setPasswordSuccess('Password updated.')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setPasswordSuccess('Password updated (demo).')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : 'Could not update password.')
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      if (isApiConfigured()) {
        await tapstackApi.logout()
      }
    } catch {
      // Still leave the demo session even if the API call fails.
    } finally {
      setLoggingOut(false)
      onLogout()
    }
  }

  const shown = localProfile

  return (
    <div className="profile-page">
      <header className="profile-page-header">
        <button type="button" className="profile-page-back" onClick={onBack} aria-label="Go back">
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
        <h1 className="profile-page-title">Profile</h1>
        <span className="profile-page-spacer" aria-hidden="true" />
      </header>

      {loading ? <p className="profile-loading">Loading profile…</p> : null}

      <section className="profile-hero">
        <div className="profile-hero-top">
          <div
            className={`profile-hero-avatar${avatarTone !== 'player' ? ` profile-hero-avatar--${avatarTone}` : ''}`}
            aria-hidden="true"
          >
            {shown.initials}
          </div>
          {showLevel ? (
            <div className={`profile-level-badge ${tierBadgeClass(shown.tier)}`}>
              <span className="profile-level-label">{tierLabel(shown.tier)}</span>
              <div className="profile-level-bar">
                <div
                  className="profile-level-fill"
                  style={{ width: `${Math.min(100, Math.max(0, shown.levelProgressPct))}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>

        <h2 className="profile-hero-name">{shown.displayName}</h2>
        <p className="profile-hero-username">{shown.username}</p>
      </section>

      {editing ? (
        <form className="profile-card" onSubmit={handleSave}>
          <div className="profile-card-head">
            <div>
              <h3 className="profile-card-title">Account details</h3>
              <p className="profile-card-sub">Update your name and email</p>
            </div>
          </div>

          <label className="profile-edit-label" htmlFor="profile-full-name">
            Full name
          </label>
          <input
            id="profile-full-name"
            className="profile-edit-input"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Marcus Rivera"
            autoComplete="name"
          />

          <label className="profile-edit-label" htmlFor="profile-email">
            Email
          </label>
          <input
            id="profile-email"
            className="profile-edit-input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@email.com"
            autoComplete="email"
          />

          {error ? <p className="profile-edit-error">{error}</p> : null}

          <div className="profile-card-actions">
            <button
              type="button"
              className="profile-btn profile-btn--ghost"
              onClick={() => {
                setEditing(false)
                setError('')
              }}
            >
              Cancel
            </button>
            <button type="submit" className="profile-btn profile-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      ) : (
        <section className="profile-card">
          <div className="profile-card-head">
            <div>
              <h3 className="profile-card-title">Account</h3>
              <p className="profile-card-sub">Your login and contact info</p>
            </div>
            <button type="button" className="profile-btn profile-btn--soft" onClick={() => setEditing(true)}>
              Edit
            </button>
          </div>

          <ul className="profile-info-list">
            <li className="profile-info-row">
              <span className="profile-info-label">Username</span>
              <span className="profile-info-value">{shown.username}</span>
            </li>
            <li className="profile-info-row">
              <span className="profile-info-label">Email</span>
              <span className="profile-info-value">
                {isPlaceholderEmail(shown.email) ? '—' : shown.email}
              </span>
            </li>
          </ul>
        </section>
      )}

      {phoneStep === 'idle' ? (
        <section className="profile-secure profile-secure--phone">
          <div className="profile-secure-row">
            <div className="profile-secure-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M8 3.5h8A2.5 2.5 0 0 1 18.5 6v12a2.5 2.5 0 0 1-2.5 2.5H8A2.5 2.5 0 0 1 5.5 18V6A2.5 2.5 0 0 1 8 3.5Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path d="M10 17.5h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </div>
            <div className="profile-secure-copy">
              <p className="profile-secure-kicker">Phone for login & SMS</p>
              <p className="profile-secure-value">{shown.phone}</p>
            </div>
          </div>
          {phoneSuccess ? <p className="profile-edit-success">{phoneSuccess}</p> : null}
          <button
            type="button"
            className="profile-secure-cta"
            onClick={() => {
              setPhoneSuccess('')
              setPhoneError('')
              setNewPhone('')
              setPhoneStep('enter')
            }}
          >
            Change phone number
          </button>
        </section>
      ) : null}

      {phoneStep === 'enter' ? (
        <form className="profile-secure profile-secure--phone" onSubmit={handleSendPhoneOtp}>
          <p className="profile-secure-kicker">Change phone number</p>
          <p className="profile-secure-help">Enter digits only — +1 is added automatically</p>

          <div className="profile-phone-field">
            <div className="profile-phone-prefix" aria-hidden="true">
              <span>🇺🇸</span>
              <span>+1</span>
            </div>
            <input
              id="profile-new-phone"
              className="profile-edit-input profile-phone-input"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="555 555 0100"
              value={newPhone}
              onChange={(event) => setNewPhone(nationalPhoneDigits(event.target.value))}
            />
          </div>

          {phoneError ? <p className="profile-edit-error">{phoneError}</p> : null}

          <div className="profile-secure-actions">
            <button type="button" className="profile-secure-cta profile-secure-cta--ghost" onClick={resetPhoneChange}>
              Cancel
            </button>
            <button
              type="submit"
              className="profile-secure-cta"
              disabled={phoneBusy || nationalPhoneDigits(newPhone).length !== 10}
            >
              {phoneBusy ? 'Checking…' : 'Send code'}
            </button>
          </div>
        </form>
      ) : null}

      {phoneStep === 'otp' ? (
        <form className="profile-secure profile-secure--phone" onSubmit={handleConfirmPhoneOtp}>
          <p className="profile-secure-kicker">Verify new phone</p>
          <p className="profile-secure-help">
            Code sent to <strong>+1 {nationalPhoneDigits(newPhone)}</strong>
          </p>

          <input
            id="profile-phone-otp"
            className="profile-edit-input profile-otp-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={5}
            placeholder="•••••"
            value={phoneOtp}
            onChange={(event) => setPhoneOtp(event.target.value.replace(/\D/g, '').slice(0, 5))}
            aria-label="Verification code"
          />
          {phoneDemoCode ? <p className="profile-secure-help">Demo code: {phoneDemoCode}</p> : null}
          {phoneError ? <p className="profile-edit-error">{phoneError}</p> : null}

          <div className="profile-secure-actions">
            <button
              type="button"
              className="profile-secure-cta profile-secure-cta--ghost"
              onClick={() => {
                setPhoneStep('enter')
                setPhoneOtp('')
                setPhoneError('')
              }}
            >
              Back
            </button>
            <button
              type="submit"
              className="profile-secure-cta"
              disabled={phoneBusy || phoneOtp.trim().length !== 5}
            >
              {phoneBusy ? 'Updating…' : 'Confirm'}
            </button>
          </div>
        </form>
      ) : null}

      <form className="profile-secure profile-secure--password" onSubmit={handlePasswordSave}>
        <div className="profile-secure-row">
          <div className="profile-secure-icon profile-secure-icon--lock" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M8 11V8a4 4 0 1 1 8 0v3"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <rect x="6" y="11" width="12" height="9" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
            </svg>
          </div>
          <div className="profile-secure-copy">
            <p className="profile-secure-kicker">Password</p>
            <p className="profile-secure-help">Keep your account locked down</p>
          </div>
        </div>

        <div className="profile-secure-fields">
          <label className="profile-secure-field">
            <span>Current</span>
            <input
              id="profile-current-password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </label>
          <label className="profile-secure-field">
            <span>New</span>
            <input
              id="profile-new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
          </label>
          <label className="profile-secure-field">
            <span>Confirm</span>
            <input
              id="profile-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="Repeat new password"
            />
          </label>
        </div>

        {passwordError ? <p className="profile-edit-error">{passwordError}</p> : null}
        {passwordSuccess ? <p className="profile-edit-success">{passwordSuccess}</p> : null}

        <button
          type="submit"
          className="profile-secure-cta profile-secure-cta--dark"
          disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
        >
          {savingPassword ? 'Updating…' : 'Update password'}
        </button>
      </form>

      <button
        type="button"
        className="profile-logout-btn"
        onClick={handleLogout}
        disabled={loggingOut}
      >
        {loggingOut ? 'Signing out…' : 'Log out'}
      </button>
    </div>
  )
}
