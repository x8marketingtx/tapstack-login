import { useEffect, useState } from 'react'
import { ApiError, getSessionRole, getToken, isApiConfigured, setSession, tapstackApi, type SessionRole, type TapstackUser } from '../api/client'
import './ProfilePage.css'

export type PlayerProfile = {
  displayName: string
  username: string
  email: string
  phone: string
  initials: string
  level: number
  levelProgressPct: number
}

export const DEMO_PLAYER_PROFILE: PlayerProfile = {
  displayName: 'Marcus Rivera',
  username: '@marcus_r',
  email: 'player@tapstack.demo',
  phone: '+1 555 555 0100',
  initials: 'MR',
  level: 7,
  levelProgressPct: 62,
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

type ProfilePageProps = {
  profile: PlayerProfile
  onBack: () => void
  onLogout: () => void
  onProfileChange: (profile: PlayerProfile) => void
  showLevel?: boolean
  /** Only hydrate/save session data for this role (avoids player data on vendor portal). */
  expectedRole?: SessionRole
}

export default function ProfilePage({
  profile,
  onBack,
  onLogout,
  onProfileChange,
  showLevel = true,
  expectedRole,
}: ProfilePageProps) {
  const [loggingOut, setLoggingOut] = useState(false)
  const [loading, setLoading] = useState(isApiConfigured())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(profile.displayName)
  const [email, setEmail] = useState(
    isPlaceholderEmail(profile.email) ? '' : profile.email,
  )
  const [localProfile, setLocalProfile] = useState(profile)

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

        const userRole = res.user.role as SessionRole
        if (expectedRole && userRole && userRole !== expectedRole) {
          // Token belongs to a different portal — keep the profile we were given.
          return
        }

        const next = profileFromUser(res.user, res.level, res.levelProgressPct)
        setLocalProfile(next)
        onProfileChange(next)
        const token = getToken()
        const role = expectedRole || userRole || getSessionRole() || 'player'
        if (token) {
          setSession({ token, role, user: res.user })
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
  }, [expectedRole, onProfileChange])

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
          phone: localProfile.phone,
        })
        const next = profileFromUser(
          res.user,
          localProfile.level,
          localProfile.levelProgressPct,
        )
        setLocalProfile(next)
        onProfileChange(next)
        const token = getToken()
        const role = expectedRole || (res.user.role as SessionRole) || getSessionRole() || 'player'
        if (token) {
          setSession({ token, role, user: res.user })
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
          {showLevel ? (
            <div className="profile-level-badge">
              <span className="profile-level-label">Lv {shown.level}</span>
              <div className="profile-level-bar">
                <div
                  className="profile-level-fill"
                  style={{ width: `${Math.min(100, Math.max(0, shown.levelProgressPct))}%` }}
                />
              </div>
            </div>
          ) : null}
          <div className="profile-hero-avatar" aria-hidden="true">
            {shown.initials}
          </div>
        </div>

        <h2 className="profile-hero-name">{shown.displayName}</h2>
        <p className="profile-hero-username">{shown.username}</p>
      </section>

      {editing ? (
        <form className="profile-edit-card" onSubmit={handleSave}>
          <h3 className="profile-details-title">Update account details</h3>
          <p className="profile-edit-hint">
            Your WordPress account still has placeholder signup data. Save your real name and email
            here so the app matches the backend.
          </p>

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
            Email address
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

          <button type="submit" className="profile-save-btn" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      ) : (
        <section className="profile-details">
          <div className="profile-details-head">
            <h3 className="profile-details-title">Account details</h3>
            <button type="button" className="profile-edit-link" onClick={() => setEditing(true)}>
              Edit
            </button>
          </div>

          <div className="profile-field">
            <span className="profile-field-label">Full name</span>
            <span className="profile-field-value">{shown.displayName}</span>
          </div>
          <div className="profile-field">
            <span className="profile-field-label">Username</span>
            <span className="profile-field-value">{shown.username}</span>
          </div>
          <div className="profile-field">
            <span className="profile-field-label">Email</span>
            <span className="profile-field-value">
              {isPlaceholderEmail(shown.email) ? '—' : shown.email}
            </span>
          </div>
          <div className="profile-field">
            <span className="profile-field-label">Phone</span>
            <span className="profile-field-value">{shown.phone}</span>
          </div>
        </section>
      )}

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
