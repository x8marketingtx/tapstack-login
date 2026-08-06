import { useState } from 'react'
import { TapStackLogo } from './TapStackLogo'
import './LoginPage.css'

type UserType = 'players' | 'admin'

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

function RoleToggle({
  userType,
  onChange,
  variant,
}: {
  userType: UserType
  onChange: (type: UserType) => void
  variant: 'players' | 'admin'
}) {
  return (
    <div
      className={`toggle toggle--${variant}`}
      role="tablist"
      aria-label="User type"
    >
      <button
        type="button"
        role="tab"
        aria-selected={userType === 'players'}
        className={`toggle-option ${userType === 'players' ? 'active' : ''}`}
        onClick={() => onChange('players')}
      >
        Players
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={userType === 'admin'}
        className={`toggle-option ${userType === 'admin' ? 'active' : ''}`}
        onClick={() => onChange('admin')}
      >
        Admin
      </button>
    </div>
  )
}

function PlayersLogin({
  userType,
  onUserTypeChange,
  onSubmitPhone,
}: {
  userType: UserType
  onUserTypeChange: (type: UserType) => void
  onSubmitPhone: (phone: string) => void
}) {
  const [phone, setPhone] = useState('')
  const canSubmit = phone.trim().length > 0

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    onSubmitPhone(phone.trim())
  }

  return (
    <>
      <span className="webview-badge">webview</span>

      <div className="brand">
        <TapStackLogo />
        <h1 className="title">
          <span className="title-tap">Tap</span>
          <span className="title-stack">Stack</span>
        </h1>
        <p className="subtitle">Log in to your wallet</p>
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <RoleToggle userType={userType} onChange={onUserTypeChange} variant="players" />

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

        <button type="submit" className="login-button" disabled={!canSubmit}>
          Log In
        </button>
      </form>

      <p className="footer">
        New to TapStack? <a href="#signup">Sign up</a>
      </p>
    </>
  )
}

function AdminLogin({
  userType,
  onUserTypeChange,
}: {
  userType: UserType
  onUserTypeChange: (type: UserType) => void
}) {
  const [email, setEmail] = useState('you@arcade.com')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const canSubmit = email.trim().length > 0 && password.trim().length > 0

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    alert(`Demo admin login: ${email}`)
  }

  return (
    <div className="admin-screen">
      <div className="admin-header">
        <StatusBar />

        <div className="admin-brand">
          <AdminShieldIcon />
          <span className="admin-portal-label">ADMIN PORTAL</span>
        </div>

        <h1 className="admin-heading">Welcome back</h1>
        <p className="admin-subheading">Sign in to your admin console</p>
      </div>

      <div className="admin-body">
        <form className="admin-form" onSubmit={handleSubmit}>
          <RoleToggle userType={userType} onChange={onUserTypeChange} variant="admin" />

          <label className="field-label" htmlFor="admin-email">
            Email
          </label>
          <input
            id="admin-email"
            type="email"
            className="text-field"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <label className="field-label" htmlFor="admin-password">
            Password
          </label>
          <div className="password-field">
            <input
              id="admin-password"
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

          <button type="submit" className="admin-login-button" disabled={!canSubmit}>
            Log In
          </button>
        </form>

        <a href="#apply" className="apply-link">
          Apply for an Account
        </a>
      </div>
    </div>
  )
}

type LoginPageProps = {
  userType: UserType
  onUserTypeChange: (type: UserType) => void
  onPlayersPhoneSubmit: (phone: string) => void
}

export default function LoginPage({
  userType,
  onUserTypeChange,
  onPlayersPhoneSubmit,
}: LoginPageProps) {
  if (userType === 'admin') {
    return <AdminLogin userType={userType} onUserTypeChange={onUserTypeChange} />
  }

  return (
    <PlayersLogin
      userType={userType}
      onUserTypeChange={onUserTypeChange}
      onSubmitPhone={onPlayersPhoneSubmit}
    />
  )
}

export type { UserType }
