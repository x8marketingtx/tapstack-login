import { useEffect, useRef, useState } from 'react'
import tapstackIcon from '../assets/tapstack-icon.png'
import { ApiError, isApiConfigured, setDemoSession, setSession, tapstackApi } from '../api/client'
import { TapStackLogo } from './TapStackLogo'
import './LoginPage.css'

type UserType = 'players' | 'vendor' | 'admin'

const ROLE_OPTIONS: { value: UserType; label: string }[] = [
  { value: 'players', label: 'Players' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'admin', label: 'Admin' },
]

function RoleDropdown({
  userType,
  onChange,
  variant,
}: {
  userType: UserType
  onChange: (type: UserType) => void
  variant: 'players' | 'portal'
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selectedLabel = ROLE_OPTIONS.find((option) => option.value === userType)?.label ?? 'Players'

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  return (
    <div
      ref={rootRef}
      className={`role-dropdown role-dropdown--${variant} ${open ? 'role-dropdown--open' : ''}`}
    >
      <div className="role-dropdown-shell">
        <button
          type="button"
          className="role-dropdown-trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span>{selectedLabel}</span>
          <svg className="role-dropdown-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 6 L8 10 L12 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {open && (
        <ul className="role-dropdown-menu" role="listbox" aria-label="Account type">
          {ROLE_OPTIONS.map((option) => (
            <li key={option.value} role="none">
              <button
                type="button"
                role="option"
                aria-selected={userType === option.value}
                className={`role-dropdown-option ${userType === option.value ? 'active' : ''}`}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AdminShieldIcon() {
  return (
    <svg
      className="admin-shield"
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M14 2 L24 6.5 V13.5 C24 19.5 19.5 24.5 14 26 C8.5 24.5 4 19.5 4 13.5 V6.5 L14 2Z"
        fill="#fff"
        stroke="#e5e7eb"
        strokeWidth="0.5"
      />
      <path d="M14 5 L21 8.2 V13.2 C21 17.6 17.8 21.4 14 22.6 C10.2 21.4 7 17.6 7 13.2 V8.2 L14 5Z" fill="#b91c1c" />
      <path d="M10 12 H18 V14 H10 Z M10 16 H18 V18 H10 Z" fill="#fff" opacity="0.9" />
    </svg>
  )
}

function StatusBar() {
  return (
    <div className="status-bar" aria-hidden="true">
      <span className="status-time">9:41</span>
      <div className="status-icons">
        <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
          <rect x="0" y="8" width="3" height="4" rx="0.5" fill="currentColor" />
          <rect x="4.5" y="5.5" width="3" height="6.5" rx="0.5" fill="currentColor" />
          <rect x="9" y="3" width="3" height="9" rx="0.5" fill="currentColor" />
          <rect x="13.5" y="0" width="3" height="12" rx="0.5" fill="currentColor" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path
            d="M8 2.5 C10.5 2.5 12.7 3.6 14.2 5.3 L15.6 3.9 C13.7 1.8 11 0.5 8 0.5 C5 0.5 2.3 1.8 0.4 3.9 L1.8 5.3 C3.3 3.6 5.5 2.5 8 2.5Z"
            fill="currentColor"
          />
          <path
            d="M8 6.5 C9.4 6.5 10.7 7 11.7 7.9 L13.1 6.5 C11.7 5.2 9.9 4.5 8 4.5 C6.1 4.5 4.3 5.2 2.9 6.5 L4.3 7.9 C5.3 7 6.6 6.5 8 6.5Z"
            fill="currentColor"
          />
          <circle cx="8" cy="10.5" r="1.5" fill="currentColor" />
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
          <rect x="0.5" y="0.5" width="21" height="11" rx="2.5" stroke="currentColor" strokeOpacity="0.35" />
          <rect x="2" y="2" width="16" height="8" rx="1.5" fill="currentColor" />
          <rect x="22.5" y="4" width="2" height="4" rx="1" fill="currentColor" fillOpacity="0.4" />
        </svg>
      </div>
    </div>
  )
}

function PlayersLogin({
  userType,
  onUserTypeChange,
  onSubmitPhone,
  onSignUp,
}: {
  userType: UserType
  onUserTypeChange: (type: UserType) => void
  onSubmitPhone: (phone: string) => void
  onSignUp: () => void
}) {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const canSubmit = phone.trim().length > 0 && !loading

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!phone.trim()) return
    setError('')

    if (isApiConfigured()) {
      try {
        setLoading(true)
        try {
          const lookup = await tapstackApi.playerExists(phone.trim())
          if (!lookup.exists) {
            setError('No account found for this phone number. Please sign up first.')
            return
          }
        } catch (lookupErr) {
          // Older plugin builds may not have /auth/player/exists yet.
          if (
            lookupErr instanceof ApiError &&
            (lookupErr.code === 'tapstack_account_missing' ||
              lookupErr.message.toLowerCase().includes('no account found'))
          ) {
            setError(lookupErr.message)
            return
          }
        }
        await tapstackApi.requestOtp(phone.trim(), 'login')
        onSubmitPhone(phone.trim())
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not send code.')
      } finally {
        setLoading(false)
      }
      return
    }

    onSubmitPhone(phone.trim())
  }

  return (
    <>
      <span className="webview-badge">webview</span>

      <div className="brand">
        <div className="login-brand-stack">
          <img src={tapstackIcon} alt="" className="tapstack-icon" aria-hidden="true" />
          <TapStackLogo height={56} />
        </div>
        <p className="subtitle">Log in to your wallet</p>
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <RoleDropdown userType={userType} onChange={onUserTypeChange} variant="players" />

        <div className="phone-field">
          <div className="country-code">
            <span className="flag" aria-hidden="true">
              🇺🇸
            </span>
            <span className="dial-code">+1</span>
          </div>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="Phone number"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            aria-label="Phone number"
          />
        </div>

        {error ? <p className="otp-error" style={{ marginTop: 8 }}>{error}</p> : null}

        <button type="submit" className="login-button" disabled={!canSubmit}>
          {loading ? 'Sending…' : 'Log In'}
        </button>
      </form>

      <p className="footer">
        New to TapStack?{' '}
        <button type="button" className="footer-link" onClick={onSignUp}>
          Sign up
        </button>
      </p>
    </>
  )
}

const PORTAL_COPY: Record<
  'vendor' | 'admin',
  { label: string; heading: string; subheading: string; accent: 'vendor' | 'admin'; demoEmail: string }
> = {
  vendor: {
    label: 'VENDOR PORTAL',
    heading: 'Welcome back',
    subheading: 'Sign in to your vendor console',
    accent: 'vendor',
    demoEmail: 'vendor@tapstack.demo',
  },
  admin: {
    label: 'ADMIN PORTAL',
    heading: 'Welcome back',
    subheading: 'Sign in to your admin console',
    accent: 'admin',
    demoEmail: 'admin@tapstack.demo',
  },
}

function PortalLogin({
  portalType,
  userType,
  onUserTypeChange,
  onSubmit,
  onApply,
}: {
  portalType: 'vendor' | 'admin'
  userType: UserType
  onUserTypeChange: (type: UserType) => void
  onSubmit: () => void
  onApply: () => void
}) {
  const copy = PORTAL_COPY[portalType]
  const [email, setEmail] = useState(isApiConfigured() ? copy.demoEmail : 'you@arcade.com')
  const [password, setPassword] = useState(isApiConfigured() ? 'password' : '')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const canSubmit = email.trim().length > 0 && password.trim().length > 0 && !loading

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!email.trim() || !password.trim()) return
    setError('')

    if (isApiConfigured()) {
      try {
        setLoading(true)
        const res = await tapstackApi.portalLogin(email.trim(), password, portalType)
        if (res.user.role !== portalType) {
          throw new ApiError(
            portalType === 'admin' ? 'This account is not an admin.' : 'This account is not a vendor.',
            403,
            'tapstack_role_mismatch',
          )
        }
        setSession({
          token: res.token,
          role: portalType,
          user: res.user,
        })
        onSubmit()
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Login failed.')
      } finally {
        setLoading(false)
      }
      return
    }

    setDemoSession(portalType)
    onSubmit()
  }

  return (
    <div className={`admin-screen admin-screen--${copy.accent}`}>
      <div className="admin-header">
        <StatusBar />

        <div className="admin-brand">
          <AdminShieldIcon />
          <span className="admin-portal-label">{copy.label}</span>
        </div>

        <h1 className="admin-heading">{copy.heading}</h1>
        <p className="admin-subheading">{copy.subheading}</p>
      </div>

      <div className="admin-body">
        <form className="admin-form" onSubmit={handleSubmit}>
          <RoleDropdown userType={userType} onChange={onUserTypeChange} variant="portal" />

          <label className="field-label" htmlFor={`${portalType}-email`}>
            Email
          </label>
          <input
            id={`${portalType}-email`}
            type="email"
            className="text-field"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <label className="field-label" htmlFor={`${portalType}-password`}>
            Password
          </label>
          <div className="password-field">
            <input
              id={`${portalType}-password`}
              type={showPassword ? 'text' : 'password'}
              className="text-field password-input"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              className="show-password"
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <div className="forgot-row">
            <a href="#forgot" className="forgot-link">
              Forgot password?
            </a>
          </div>

          {error ? <p className="otp-error">{error}</p> : null}

          <button type="submit" className="admin-login-button" disabled={!canSubmit}>
            {loading ? 'Signing in…' : 'Log In'}
          </button>
        </form>

        <button type="button" className="apply-link" onClick={onApply}>
          Apply for an Account
        </button>
      </div>
    </div>
  )
}

type LoginPageProps = {
  userType: UserType
  onUserTypeChange: (type: UserType) => void
  onPlayersPhoneSubmit: (phone: string) => void
  onVendorLogin: () => void
  onAdminLogin: () => void
  onSignUp: () => void
  onApply: () => void
}

export default function LoginPage({
  userType,
  onUserTypeChange,
  onPlayersPhoneSubmit,
  onVendorLogin,
  onAdminLogin,
  onSignUp,
  onApply,
}: LoginPageProps) {
  if (userType === 'vendor') {
    return (
      <PortalLogin
        portalType="vendor"
        userType={userType}
        onUserTypeChange={onUserTypeChange}
        onSubmit={onVendorLogin}
        onApply={onApply}
      />
    )
  }

  if (userType === 'admin') {
    return (
      <PortalLogin
        portalType="admin"
        userType={userType}
        onUserTypeChange={onUserTypeChange}
        onSubmit={onAdminLogin}
        onApply={onApply}
      />
    )
  }

  return (
    <PlayersLogin
      userType={userType}
      onUserTypeChange={onUserTypeChange}
      onSubmitPhone={onPlayersPhoneSubmit}
      onSignUp={onSignUp}
    />
  )
}

export type { UserType }
