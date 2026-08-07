import { useState } from 'react'
import './VendorSettingsPage.css'

type SettingsTab = 'profile' | 'games' | 'staff'

const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'games', label: 'Games' },
  { id: 'staff', label: 'Staff' },
]

function SettingsToggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description: string
}) {
  return (
    <div className="vendor-settings-toggle-row">
      <div>
        <p className="vendor-settings-toggle-label">{label}</p>
        <p className="vendor-settings-toggle-desc">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`vendor-settings-toggle ${checked ? 'vendor-settings-toggle--on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="vendor-settings-toggle-knob" />
      </button>
    </div>
  )
}

function ProfileTab() {
  const [businessName, setBusinessName] = useState('Lucky Strike Arcade')
  const [email, setEmail] = useState('owner@luckystrike.io')
  const [phone, setPhone] = useState('+1 (555) 812-4200')
  const [address, setAddress] = useState('1240 Arcade Blvd, Las Vegas NV')
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [smsAlerts, setSmsAlerts] = useState(false)
  const [withdrawalAlerts, setWithdrawalAlerts] = useState(true)
  const [accentColor, setAccentColor] = useState('purple')
  const [venueTagline, setVenueTagline] = useState('The luckiest games in town')
  const playerLink = 'luckystrike.tapstack.app'

  const accentColors = [
    { id: 'purple', value: '#7c3aed' },
    { id: 'blue', value: '#2563eb' },
    { id: 'green', value: '#059669' },
    { id: 'red', value: '#ef4444' },
    { id: 'orange', value: '#f97316' },
    { id: 'pink', value: '#ec4899' },
  ]

  function handleCopyLink() {
    void navigator.clipboard.writeText(`https://${playerLink}`)
  }

  return (
    <div className="vendor-settings-content">
      <div className="vendor-settings-profile-header">
        <div className="vendor-settings-avatar" aria-hidden="true">
          LS
        </div>
        <div>
          <h2 className="vendor-settings-business-name">Lucky Strike Arcade</h2>
          <button type="button" className="vendor-settings-change-photo">
            Change photo
          </button>
        </div>
      </div>

      <section className="vendor-settings-info-card">
        <div className="vendor-settings-info-block">
          <p className="vendor-settings-info-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M8 11V8a4 4 0 0 1 8 0v3"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            VENDOR USERNAME
          </p>
          <div className="vendor-settings-readonly-field">
            <span className="vendor-settings-readonly-value">@LUCKYSTRIKE</span>
            <span className="vendor-settings-readonly-badge">Read-only</span>
          </div>
          <p className="vendor-settings-info-help">
            Your unique vendor code. Players send manual wallet top-ups to this username. Only
            TapStack can change it.
          </p>
        </div>

        <div className="vendor-settings-info-block">
          <p className="vendor-settings-info-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M10 13a5 5 0 0 1 7.07 0l1.41 1.41a5 5 0 0 1-7.07 7.07l-1.77-1.77M14 11a5 5 0 0 1-7.07 0L5.52 9.59a5 5 0 0 1 7.07-7.07L14.36 4.3"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            YOUR PLAYER LINK
          </p>
          <div className="vendor-settings-link-field">
            <span className="vendor-settings-link-value">{playerLink}</span>
            <button type="button" className="vendor-settings-copy-btn" onClick={handleCopyLink}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              </svg>
              Copy
            </button>
          </div>
          <p className="vendor-settings-info-help">
            Share this link with players · it opens your branded storefront.
          </p>
        </div>
      </section>

      <label className="vendor-settings-field">
        <span className="vendor-settings-field-label">Business Name</span>
        <input
          type="text"
          className="vendor-settings-input"
          value={businessName}
          onChange={(event) => setBusinessName(event.target.value)}
        />
      </label>

      <label className="vendor-settings-field">
        <span className="vendor-settings-field-label">Email Address</span>
        <input
          type="email"
          className="vendor-settings-input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <label className="vendor-settings-field">
        <span className="vendor-settings-field-label">Phone</span>
        <input
          type="tel"
          className="vendor-settings-input"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </label>

      <label className="vendor-settings-field">
        <span className="vendor-settings-field-label">Address</span>
        <input
          type="text"
          className="vendor-settings-input"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
        />
      </label>

      <section className="vendor-settings-panel">
        <h3 className="vendor-settings-panel-title">NOTIFICATIONS</h3>
        <SettingsToggle
          label="Email alerts"
          description="Withdrawal confirmations, reports"
          checked={emailAlerts}
          onChange={setEmailAlerts}
        />
        <SettingsToggle
          label="SMS alerts"
          description="Critical events only"
          checked={smsAlerts}
          onChange={setSmsAlerts}
        />
        <SettingsToggle
          label="Withdrawal approvals"
          description="Notify when approved/rejected"
          checked={withdrawalAlerts}
          onChange={setWithdrawalAlerts}
        />
      </section>

      <section className="vendor-settings-panel">
        <div className="vendor-settings-branding-header">
          <span className="vendor-settings-branding-icon" aria-hidden="true">
            🎨
          </span>
          <div>
            <h3 className="vendor-settings-panel-title">STOREFRONT BRANDING</h3>
            <p className="vendor-settings-branding-subtitle">
              Customize how your venue looks to players
            </p>
          </div>
        </div>

        <div className="vendor-settings-branding-block">
          <span className="vendor-settings-field-label">Banner Image</span>
          <label className="vendor-settings-banner-upload">
            <input type="file" accept="image/*" className="vendor-settings-banner-input" />
            <span className="vendor-settings-banner-name">lucky-strike-banner.jpg</span>
            <span className="vendor-settings-banner-change">Change</span>
          </label>
        </div>

        <div className="vendor-settings-branding-block">
          <span className="vendor-settings-field-label">Accent Color</span>
          <div className="vendor-settings-color-row" role="radiogroup" aria-label="Accent color">
            {accentColors.map((color) => {
              const active = accentColor === color.id
              return (
                <button
                  key={color.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`vendor-settings-color-swatch ${active ? 'vendor-settings-color-swatch--active' : ''}`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setAccentColor(color.id)}
                />
              )
            })}
          </div>
        </div>

        <label className="vendor-settings-branding-block">
          <span className="vendor-settings-field-label">Venue Tagline</span>
          <input
            type="text"
            className="vendor-settings-input"
            value={venueTagline}
            onChange={(event) => setVenueTagline(event.target.value)}
          />
        </label>
      </section>

      <div className="vendor-settings-actions">
        <button type="button" className="vendor-settings-password-btn">
          Change Password
        </button>
        <button type="button" className="vendor-settings-save-btn">
          Save Changes
        </button>
      </div>
    </div>
  )
}

function GamesTab() {
  const [minRedeem, setMinRedeem] = useState('10')
  const [maxRedeem, setMaxRedeem] = useState('500')
  const [autoLoads, setAutoLoads] = useState(true)
  const [autoRedeems, setAutoRedeems] = useState(true)
  const [bonusOneEnabled, setBonusOneEnabled] = useState(true)
  const [bonusPercent, setBonusPercent] = useState('10')
  const [lucky7sBonusEnabled, setLucky7sBonusEnabled] = useState(true)
  const [goldRushBonusEnabled, setGoldRushBonusEnabled] = useState(true)
  const [neonSpinnerBonusEnabled, setNeonSpinnerBonusEnabled] = useState(true)
  const [cashCarnivalBonusEnabled, setCashCarnivalBonusEnabled] = useState(false)
  const [fishHunterBonusEnabled, setFishHunterBonusEnabled] = useState(false)

  const gameBonuses = [
    {
      id: 'lucky-7s',
      icon: '🎰',
      title: 'Lucky 7s',
      statusBadge: 'auto' as const,
      badge: '+10% bonus',
      meta: 'Slot · 38 Players',
      enabled: lucky7sBonusEnabled,
      onToggle: setLucky7sBonusEnabled,
    },
    {
      id: 'gold-rush',
      icon: '⛏️',
      title: 'Gold Rush',
      statusBadge: 'auto' as const,
      badge: '+10% bonus',
      meta: 'Slot · 24 Players',
      enabled: goldRushBonusEnabled,
      onToggle: setGoldRushBonusEnabled,
    },
    {
      id: 'neon-spinner',
      icon: '🌀',
      title: 'Neon Spinner',
      statusBadge: 'auto-ready' as const,
      badge: '+10% bonus',
      meta: 'Arcade · 19 Players',
      enabled: neonSpinnerBonusEnabled,
      onToggle: setNeonSpinnerBonusEnabled,
    },
    {
      id: 'cash-carnival',
      icon: '🎡',
      title: 'Cash Carnival',
      statusBadge: 'manual' as const,
      badge: '+10% bonus',
      meta: 'Arcade · Offline',
      enabled: cashCarnivalBonusEnabled,
      onToggle: setCashCarnivalBonusEnabled,
    },
    {
      id: 'fish-hunter',
      icon: '🐟',
      title: 'Fish Hunter',
      statusBadge: 'manual' as const,
      badge: '+10% bonus',
      meta: 'Shooter · Offline',
      enabled: fishHunterBonusEnabled,
      onToggle: setFishHunterBonusEnabled,
    },
  ]

  return (
    <div className="vendor-settings-content">
      <div className="vendor-settings-games-toolbar">
        <div>
          <h2 className="vendor-settings-games-heading">Games</h2>
          <p className="vendor-settings-games-meta">3 of 5 active</p>
        </div>
        <button type="button" className="vendor-settings-add-game-btn">
          + Add Game
        </button>
      </div>

      <section className="vendor-settings-panel">
        <div className="vendor-settings-games-card-header">
          <span className="vendor-settings-games-card-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="18" cy="6" r="3" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="18" cy="18" r="3" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8.6 10.6l6.8-3.2M8.6 13.4l6.8 3.2" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </span>
          <div>
            <h3 className="vendor-settings-games-card-title">Redeem Settings</h3>
            <p className="vendor-settings-games-card-desc">
              General redeem limits that apply across all of your games.
            </p>
          </div>
        </div>

        <div className="vendor-settings-redeem-row">
          <label className="vendor-settings-redeem-field">
            <span className="vendor-settings-field-label">Minimum Redeem</span>
            <div className="vendor-settings-money-input-wrap">
              <span className="vendor-settings-money-prefix">$</span>
              <input
                type="number"
                className="vendor-settings-money-input"
                value={minRedeem}
                onChange={(event) => setMinRedeem(event.target.value)}
                min="0"
              />
            </div>
          </label>
          <label className="vendor-settings-redeem-field">
            <span className="vendor-settings-field-label">Maximum Redeem</span>
            <div className="vendor-settings-money-input-wrap">
              <span className="vendor-settings-money-prefix">$</span>
              <input
                type="number"
                className="vendor-settings-money-input"
                value={maxRedeem}
                onChange={(event) => setMaxRedeem(event.target.value)}
                min="0"
              />
            </div>
          </label>
        </div>

        <p className="vendor-settings-panel-help">
          Players can redeem between $10 and $500 per request, across every game.
        </p>
      </section>

      <section className="vendor-settings-panel">
        <div className="vendor-settings-games-card-header">
          <span className="vendor-settings-games-card-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M13 2L4 14h7l-1 8 10-14h-7l0-6z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <h3 className="vendor-settings-games-card-title">Automate Loads &amp; Redeems</h3>
            <p className="vendor-settings-games-card-desc">
              Link your game platform APIs to load credits and pay out redeems automatically · no
              manual work needed.
            </p>
          </div>
        </div>

        <div className="vendor-settings-auto-list">
          <div className="vendor-settings-auto-item">
            <SettingsToggle
              label="Auto Loads"
              description="Credit games instantly on deposit"
              checked={autoLoads}
              onChange={setAutoLoads}
            />
          </div>
          <div className="vendor-settings-auto-item">
            <SettingsToggle
              label="Auto Redeems"
              description="Pay out approved redeems automatically"
              checked={autoRedeems}
              onChange={setAutoRedeems}
            />
          </div>
        </div>

        <p className="vendor-settings-panel-help">
          2 of 5 games are API-linked. Open a game&apos;s settings to link its platform.
        </p>
      </section>

      <section className="vendor-settings-panel vendor-settings-subscription-panel">
        <div className="vendor-settings-subscription-header">
          <div className="vendor-settings-games-card-header">
            <span className="vendor-settings-games-card-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </span>
            <h3 className="vendor-settings-games-card-title">Subscription Plan</h3>
          </div>
          <span className="vendor-settings-subscription-status">Active</span>
        </div>

        <p className="vendor-settings-games-card-desc">
          Your plan is based on how many games you run. You have 5 games.
        </p>

        <div className="vendor-settings-plan-list">
          <article className="vendor-settings-plan-tier">
            <div>
              <p className="vendor-settings-plan-name">1–4 Games</p>
              <p className="vendor-settings-plan-desc">For single-room arcades</p>
            </div>
            <span className="vendor-settings-plan-price">$499/mo</span>
          </article>

          <article className="vendor-settings-plan-tier vendor-settings-plan-tier--current">
            <div>
              <p className="vendor-settings-plan-name">5+ Games</p>
              <p className="vendor-settings-plan-desc">For growing game rooms</p>
            </div>
            <div className="vendor-settings-plan-price-wrap">
              <span className="vendor-settings-plan-price">$999/mo</span>
              <span className="vendor-settings-plan-current">Current plan</span>
            </div>
          </article>
        </div>

        <div className="vendor-settings-subscription-stats">
          <div className="vendor-settings-subscription-stat">
            <span className="vendor-settings-subscription-stat-label">Monthly Cost</span>
            <span className="vendor-settings-subscription-stat-value">$999.00</span>
          </div>
          <div className="vendor-settings-subscription-stat">
            <span className="vendor-settings-subscription-stat-label">Renews</span>
            <span className="vendor-settings-subscription-stat-value">Jan 15</span>
          </div>
        </div>

        <button type="button" className="vendor-settings-cancel-sub-btn">
          Cancel Subscription
        </button>
      </section>

      <section className="vendor-settings-deposit-bonuses">
        <div className="vendor-settings-deposit-header">
          <div className="vendor-settings-games-card-header">
            <span className="vendor-settings-games-card-icon" aria-hidden="true">
              🎁
            </span>
            <h3 className="vendor-settings-games-card-title">Deposit Bonuses</h3>
          </div>
          <button type="button" className="vendor-settings-add-bonus-btn">
            + Add Bonus
          </button>
        </div>

        <p className="vendor-settings-games-card-desc">
          Create separate bonuses for different games or deposit levels.
        </p>

        <article className="vendor-settings-panel vendor-settings-bonus-config">
          <div className="vendor-settings-bonus-config-head">
            <h4 className="vendor-settings-bonus-config-title">Bonus 1</h4>
            <button
              type="button"
              role="switch"
              aria-checked={bonusOneEnabled}
              aria-label="Enable Bonus 1"
              className={`vendor-settings-toggle ${bonusOneEnabled ? 'vendor-settings-toggle--on' : ''}`}
              onClick={() => setBonusOneEnabled((enabled) => !enabled)}
            >
              <span className="vendor-settings-toggle-knob" />
            </button>
          </div>

          <label className="vendor-settings-bonus-field">
            <span className="vendor-settings-bonus-field-label">Bonus Credit %</span>
            <div className="vendor-settings-percent-input-wrap">
              <input
                type="number"
                className="vendor-settings-percent-input"
                value={bonusPercent}
                onChange={(event) => setBonusPercent(event.target.value)}
                min="0"
                max="100"
              />
              <span className="vendor-settings-percent-suffix">%</span>
            </div>
          </label>
          <p className="vendor-settings-panel-help">
            Players get {bonusPercent || '0'}% extra credit on every deposit.
          </p>

          <div className="vendor-settings-apply-games-row">
            <span>Apply to all games</span>
            <span className="vendor-settings-apply-games-check" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
          <p className="vendor-settings-panel-help">Bonus applies to all games.</p>
        </article>

        {gameBonuses.map((game) => (
          <article key={game.id} className="vendor-settings-game-bonus-card">
            <span className="vendor-settings-game-bonus-icon" aria-hidden="true">
              {game.icon}
            </span>
            <div className="vendor-settings-game-bonus-info">
              <div className="vendor-settings-game-bonus-title-row">
                <h4 className="vendor-settings-game-bonus-title">{game.title}</h4>
                {game.statusBadge === 'auto' ? (
                  <span className="vendor-settings-game-status-badge vendor-settings-game-status-badge--auto">
                    <span aria-hidden="true">⚡</span> Auto
                  </span>
                ) : null}
                {game.statusBadge === 'auto-ready' ? (
                  <span className="vendor-settings-game-status-badge vendor-settings-game-status-badge--auto-ready">
                    Auto-ready
                  </span>
                ) : null}
                {game.statusBadge === 'manual' ? (
                  <span className="vendor-settings-game-status-badge vendor-settings-game-status-badge--manual">
                    <span aria-hidden="true">✋</span> Manual
                  </span>
                ) : null}
              </div>
              <span className="vendor-settings-game-bonus-pill">{game.badge}</span>
              <p className="vendor-settings-game-bonus-meta">{game.meta}</p>
            </div>
            <div className="vendor-settings-game-bonus-actions">
              <button
                type="button"
                role="switch"
                aria-checked={game.enabled}
                aria-label={`Enable bonus for ${game.title}`}
                className={`vendor-settings-toggle ${game.enabled ? 'vendor-settings-toggle--on' : ''}`}
                onClick={() => game.onToggle(!game.enabled)}
              >
                <span className="vendor-settings-toggle-knob" />
              </button>
              <button type="button" className="vendor-settings-game-settings-btn" aria-label={`${game.title} bonus settings`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 10h4M10 8h4M18 16h4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}

function PasswordField({
  id,
  label,
  placeholder,
  value,
  onChange,
  visible,
  onToggleVisible,
}: {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  visible: boolean
  onToggleVisible: () => void
}) {
  return (
    <label className="vendor-settings-staff-password-field" htmlFor={id}>
      <span className="vendor-settings-staff-sr-only">{label}</span>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        className="vendor-settings-staff-input"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="new-password"
      />
      <button
        type="button"
        className="vendor-settings-staff-password-toggle"
        aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        onClick={onToggleVisible}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          {visible ? (
            <>
              <path
                d="M3 3l18 18M10.58 10.58A2 2 0 0 0 12 15a2 2 0 0 0 1.42-.58M9.88 5.09A10.94 10.94 0 0 1 12 5c5 0 9.27 3.11 11 7.5a11.8 11.8 0 0 1-1.67 2.73M6.1 6.1A11.8 11.8 0 0 0 3 12.5C4.73 16.89 9 20 14 20a10.8 10.8 0 0 0 4.12-.8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          ) : (
            <>
              <path
                d="M2 12.5C3.73 8.11 8 5 13 5s9.27 3.11 11 7.5c-1.73 4.39-6 7.5-11 7.5S3.73 16.89 2 12.5z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="13" cy="12.5" r="3" stroke="currentColor" strokeWidth="1.8" />
            </>
          )}
        </svg>
      </button>
    </label>
  )
}

function StaffPermissionCard({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      className={`vendor-settings-staff-permission-card ${checked ? 'vendor-settings-staff-permission-card--checked' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="vendor-settings-staff-permission-check" aria-hidden="true">
        {checked ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      <span className="vendor-settings-staff-permission-text">
        <span className="vendor-settings-staff-permission-label">{label}</span>
        <span className="vendor-settings-staff-permission-desc">{description}</span>
      </span>
    </button>
  )
}

const STAFF_PERMISSION_GROUPS = [
  {
    id: 'general',
    label: 'GENERAL',
    permissions: [
      { id: 'dashboard', label: 'Dashboard', description: 'View home overview & stats' },
      { id: 'analytics', label: 'Analytics', description: 'View financial & game reports' },
      { id: 'games', label: 'Games', description: 'Manage game listings & settings' },
    ],
  },
  {
    id: 'marketing',
    label: 'MARKETING',
    permissions: [
      { id: 'promotions-codes', label: 'Promotions & Codes', description: 'Create and edit promo campaigns' },
      { id: 'email-blast', label: 'Email Blast', description: 'Send targeted email campaigns' },
    ],
  },
  {
    id: 'operations',
    label: 'OPERATIONS',
    permissions: [
      { id: 'customers', label: 'Customers', description: 'View player profiles & history' },
      { id: 'withdrawals', label: 'Withdrawals', description: 'Approve or reject withdrawals' },
      { id: 'wallet-top-up', label: 'Wallet / Top-Up', description: 'Manage wallet balance & top-ups' },
    ],
  },
] as const

const STAFF_ADMIN_PERMISSIONS = [
  { id: 'settings', label: 'Settings', description: 'Edit business profile & branding' },
  { id: 'staff-management', label: 'Staff Management', description: 'Invite and manage staff accounts' },
] as const

const STAFF_MEMBERS = [
  {
    id: 'marco-v',
    initials: 'MV',
    name: 'Marco V.',
    email: 'marco@luckystri...',
    role: 'manager' as const,
  },
  {
    id: 'priya-s',
    initials: 'PS',
    name: 'Priya S.',
    email: 'priya@luckystrike.io',
    role: 'support' as const,
  },
  {
    id: 'tom-h',
    initials: 'TH',
    name: 'Tom H.',
    email: 'tom@luckystri...',
    role: 'read-only' as const,
  },
]

function StaffMemberCard({
  initials,
  name,
  email,
  role,
}: {
  initials: string
  name: string
  email: string
  role: 'manager' | 'support' | 'read-only'
}) {
  const roleLabels: Record<typeof role, string> = {
    manager: 'manager',
    support: 'support',
    'read-only': 'read only',
  }

  return (
    <article className="vendor-settings-staff-member-card">
      <span className="vendor-settings-staff-member-avatar" aria-hidden="true">
        {initials}
      </span>
      <div className="vendor-settings-staff-member-info">
        <h3 className="vendor-settings-staff-member-name">{name}</h3>
        <p className="vendor-settings-staff-member-email">{email}</p>
      </div>
      <span className={`vendor-settings-staff-member-role vendor-settings-staff-member-role--${role}`}>
        {roleLabels[role]}
      </span>
      <div className="vendor-settings-staff-member-actions">
        <button type="button" className="vendor-settings-staff-member-menu-btn" aria-label={`${name} options`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button type="button" className="vendor-settings-staff-member-delete-btn" aria-label={`Remove ${name}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </article>
  )
}

function StaffTab() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [role, setRole] = useState<'manager' | 'support' | 'read-only'>('manager')
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    dashboard: true,
    analytics: true,
    games: true,
    'promotions-codes': true,
    'email-blast': true,
    customers: true,
    withdrawals: true,
    'wallet-top-up': true,
    settings: false,
    'staff-management': false,
  })

  const allPermissionIds = [
    ...STAFF_PERMISSION_GROUPS.flatMap((group) => group.permissions.map((permission) => permission.id)),
    ...STAFF_ADMIN_PERMISSIONS.map((permission) => permission.id),
  ]
  const grantedCount = allPermissionIds.filter((id) => permissions[id]).length

  function setPermission(id: string, checked: boolean) {
    setPermissions((current) => ({ ...current, [id]: checked }))
  }

  const roleOptions: { id: typeof role; label: string }[] = [
    { id: 'manager', label: 'Manager' },
    { id: 'support', label: 'Support' },
    { id: 'read-only', label: 'Read Only' },
  ]

  return (
    <div className="vendor-settings-content">
      <div className="vendor-settings-staff-header">
        <h2 className="vendor-settings-staff-heading">Staff Members</h2>
        <p className="vendor-settings-staff-meta">3 members</p>
      </div>

      <div className="vendor-settings-staff-form">
        <div className="vendor-settings-staff-form-title">
          <span className="vendor-settings-staff-form-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M4 20v-1a5 5 0 0 1 5-5h0a5 5 0 0 1 5 5v1"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M19 8v6M16 11h6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span>Create Staff Account</span>
        </div>

        <input
          type="text"
          className="vendor-settings-staff-input"
          placeholder="Full name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />

        <input
          type="email"
          className="vendor-settings-staff-input"
          placeholder="Email address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <fieldset className="vendor-settings-staff-fieldset">
          <legend className="vendor-settings-staff-legend">SET PASSWORD</legend>
          <div className="vendor-settings-staff-password-stack">
            <PasswordField
              id="staff-create-password"
              label="Create password"
              placeholder="Create password"
              value={password}
              onChange={setPassword}
              visible={showPassword}
              onToggleVisible={() => setShowPassword((value) => !value)}
            />
            <PasswordField
              id="staff-confirm-password"
              label="Confirm password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              visible={showConfirmPassword}
              onToggleVisible={() => setShowConfirmPassword((value) => !value)}
            />
          </div>
        </fieldset>

        <fieldset className="vendor-settings-staff-fieldset">
          <legend className="vendor-settings-staff-legend">ROLE PRESET</legend>
          <div className="vendor-settings-staff-role-row" role="radiogroup" aria-label="Role preset">
            {roleOptions.map((option) => {
              const active = role === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`vendor-settings-staff-role-pill ${active ? 'vendor-settings-staff-role-pill--active' : ''}`}
                  onClick={() => setRole(option.id)}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </fieldset>

        <p className="vendor-settings-staff-permissions-legend">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 3l7 4v5c0 4.25-2.75 7.75-7 9-4.25-1.25-7-4.75-7-9V7l7-4z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          ACCESS PERMISSIONS
        </p>

        <div className="vendor-settings-staff-permissions">
          {STAFF_PERMISSION_GROUPS.map((group) => (
            <div key={group.id} className="vendor-settings-staff-permission-group">
              <p className="vendor-settings-staff-permission-group-label">{group.label}</p>
              <div className="vendor-settings-staff-permission-list">
                {group.permissions.map((permission) => (
                  <StaffPermissionCard
                    key={permission.id}
                    label={permission.label}
                    description={permission.description}
                    checked={permissions[permission.id] ?? false}
                    onChange={(checked) => setPermission(permission.id, checked)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="vendor-settings-staff-permission-group">
          <p className="vendor-settings-staff-permission-group-label">ADMIN</p>
          <div className="vendor-settings-staff-permission-list">
            {STAFF_ADMIN_PERMISSIONS.map((permission) => (
              <StaffPermissionCard
                key={permission.id}
                label={permission.label}
                description={permission.description}
                checked={permissions[permission.id] ?? false}
                onChange={(checked) => setPermission(permission.id, checked)}
              />
            ))}
          </div>
        </div>

        <p className="vendor-settings-staff-permissions-summary">
          {grantedCount} of {allPermissionIds.length} permissions granted
        </p>

        <button type="button" className="vendor-settings-staff-create-btn">
          Create Staff Account
        </button>
      </div>

      <div className="vendor-settings-staff-list">
        {STAFF_MEMBERS.map((member) => (
          <StaffMemberCard
            key={member.id}
            initials={member.initials}
            name={member.name}
            email={member.email}
            role={member.role}
          />
        ))}
      </div>
    </div>
  )
}

export default function VendorSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

  return (
    <div className="vendor-settings-page">
      <div className="vendor-settings-tabs" role="tablist" aria-label="Settings sections">
        {SETTINGS_TABS.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`vendor-settings-tab ${active ? 'vendor-settings-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'profile' && <ProfileTab />}
      {activeTab === 'games' && <GamesTab />}
      {activeTab === 'staff' && <StaffTab />}
    </div>
  )
}
