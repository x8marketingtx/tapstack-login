import { useEffect, useRef, useState } from 'react'
import tapstackIcon from '../assets/tapstack-icon.png'
import { ApiError, applyAuthSession, clearSession, isApiConfigured, setDemoSession, tapstackApi } from '../api/client'
import { LegalLinks, type LegalDoc } from './LegalPage'
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

const PORTAL_COPY: Record<'vendor' | 'admin', { subtitle: string; demoEmail: string }> = {
  vendor: {
    subtitle: 'Sign in to your vendor console',
    demoEmail: 'vendor@tapstack.demo',
  },
  admin: {
    subtitle: 'Sign in to your admin console',
    demoEmail: 'admin@tapstack.demo',
  },
}

function PortalLogin({
  portalType,
  userType,
  onUserTypeChange,
  onSubmit: _onSubmit,
  onApply,
  onOpenLegal,
}: {
  portalType: 'vendor' | 'admin'
  userType: UserType
  onUserTypeChange: (type: UserType) => void
  onSubmit: () => void
  onApply: () => void
  onOpenLegal: (doc: LegalDoc) => void
}) {
  const copy = PORTAL_COPY[portalType]
  const [email, setEmail] = useState(isApiConfigured() ? copy.demoEmail : '')
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
        clearSession()
        const res = await tapstackApi.portalLogin(email.trim(), password, portalType)
        if (res.user.role !== portalType) {
          throw new ApiError(
            portalType === 'admin' ? 'This account is not an admin.' : 'This account is not a vendor.',
            403,
            'tapstack_role_mismatch',
          )
        }
        applyAuthSession(res.token, res.user)
        window.location.replace(portalType === 'admin' ? '/admin' : '/vendor')
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Login failed.')
      } finally {
        setLoading(false)
      }
      return
    }

    setDemoSession(portalType, {
      displayName: portalType === 'vendor' ? 'Lucky Strike Arcade' : undefined,
      email: portalType === 'vendor' ? 'vendor@tapstack.demo' : undefined,
      username: portalType === 'vendor' ? '@luckystrike' : undefined,
      phone: portalType === 'vendor' ? '+15558124200' : undefined,
    })
    window.location.replace(portalType === 'admin' ? '/admin' : '/vendor')
  }

  return (
    <div className="login-shell">
      <span className="webview-badge">webview</span>

      <div className="brand">
        <div className="login-brand-stack">
          <img src={tapstackIcon} alt="" className="tapstack-icon" aria-hidden="true" />
          <TapStackLogo height={56} />
        </div>
        <p className="subtitle">{copy.subtitle}</p>
      </div>

      <div className="login-panel">
        <form className="form" onSubmit={handleSubmit}>
          <RoleDropdown userType={userType} onChange={onUserTypeChange} variant="players" />

          <div className="phone-field">
            <input
              id={`${portalType}-email`}
              type="email"
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-label="Email"
            />
          </div>

          <div className="phone-field phone-field--password">
            <input
              id={`${portalType}-password`}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-label="Password"
            />
            <button
              type="button"
              className="password-toggle"
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

          <button type="submit" className="login-button" disabled={!canSubmit}>
            {loading ? 'Signing in…' : 'Log In'}
          </button>
        </form>

        <p className="footer">
          Need access?{' '}
          <button type="button" className="footer-link" onClick={onApply}>
            Apply for an account
          </button>
        </p>

        <LegalLinks onOpen={onOpenLegal} />
      </div>
    </div>
  )
}

function PlayersLogin({
  userType,
  onUserTypeChange,
  onSubmitPhone,
  onSignUp,
  onOpenLegal,
}: {
  userType: UserType
  onUserTypeChange: (type: UserType) => void
  onSubmitPhone: (phone: string) => void
  onSignUp: () => void
  onOpenLegal: (doc: LegalDoc) => void
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
        clearSession()
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
    <div className="login-shell">
      <span className="webview-badge">webview</span>

      <div className="brand">
        <div className="login-brand-stack">
          <img src={tapstackIcon} alt="" className="tapstack-icon" aria-hidden="true" />
          <TapStackLogo height={56} />
        </div>
        <p className="subtitle">Log in to your wallet</p>
      </div>

      <div className="login-panel">
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

        <p className="login-beta-notice" role="note">
          This is a beta version and Tapstack is not responsible for any issue or loss to the player.
        </p>

        <LegalLinks onOpen={onOpenLegal} />
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
  onOpenLegal: (doc: LegalDoc) => void
}

export default function LoginPage({
  userType,
  onUserTypeChange,
  onPlayersPhoneSubmit,
  onVendorLogin,
  onAdminLogin,
  onSignUp,
  onApply,
  onOpenLegal,
}: LoginPageProps) {
  if (userType === 'vendor' || userType === 'admin') {
    return (
      <PortalLogin
        key={userType}
        portalType={userType}
        userType={userType}
        onUserTypeChange={onUserTypeChange}
        onSubmit={userType === 'admin' ? onAdminLogin : onVendorLogin}
        onApply={onApply}
        onOpenLegal={onOpenLegal}
      />
    )
  }

  return (
    <PlayersLogin
      userType={userType}
      onUserTypeChange={onUserTypeChange}
      onSubmitPhone={onPlayersPhoneSubmit}
      onSignUp={onSignUp}
      onOpenLegal={onOpenLegal}
    />
  )
}

export type { UserType }
