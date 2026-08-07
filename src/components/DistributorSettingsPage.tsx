import { useState } from 'react'
import { TapStackLogo } from './TapStackLogo'
import './DistributorDashboard.css'

type SettingsSubTab = 'profile' | 'alerts' | 'security'

const SETTINGS_SUBTABS: { id: SettingsSubTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'security', label: 'Security' },
]

const AFFILIATE_LINK = 'tapstack.app/join/pacific-gami...'

function DistributorSettingsHeader() {
  return (
    <header className="distributor-dash-header">
      <div className="distributor-dash-header-row">
        <TapStackLogo height={40} />
        <button type="button" className="distributor-dash-avatar" aria-label="Distributor profile">
          PG
        </button>
      </div>
    </header>
  )
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={active ? 'distributor-settings-subtab-icon distributor-settings-subtab-icon--active' : 'distributor-settings-subtab-icon'}
    >
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function AlertsIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={active ? 'distributor-settings-subtab-icon distributor-settings-subtab-icon--active' : 'distributor-settings-subtab-icon'}
    >
      <path
        d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function SecurityIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={active ? 'distributor-settings-subtab-icon distributor-settings-subtab-icon--active' : 'distributor-settings-subtab-icon'}
    >
      <path
        d="M12 3l7 3v6c0 4.418-3.134 8.134-7 9-3.866-.866-7-4.582-7-9V6l7-3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SettingsSubtabIcon({ tab, active }: { tab: SettingsSubTab; active: boolean }) {
  if (tab === 'profile') return <ProfileIcon active={active} />
  if (tab === 'alerts') return <AlertsIcon active={active} />
  return <SecurityIcon active={active} />
}

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
    <div className="distributor-settings-toggle-row">
      <div>
        <p className="distributor-settings-toggle-label">{label}</p>
        <p className="distributor-settings-toggle-desc">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`distributor-settings-toggle ${checked ? 'distributor-settings-toggle--on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="distributor-settings-toggle-knob" />
      </button>
    </div>
  )
}

function AlertsTab() {
  const [newVendorJoined, setNewVendorJoined] = useState(true)
  const [vendorDeposit, setVendorDeposit] = useState(true)
  const [vendorSuspended, setVendorSuspended] = useState(false)
  const [commissionPaid, setCommissionPaid] = useState(true)
  const [invoiceDue, setInvoiceDue] = useState(true)
  const [weeklySummary, setWeeklySummary] = useState(true)
  const [marketingUpdates, setMarketingUpdates] = useState(false)
  const [systemAlerts, setSystemAlerts] = useState(true)

  return (
    <div className="distributor-settings-content">
      <section className="distributor-settings-card">
        <p className="distributor-settings-card-label">Vendor Activity</p>

        <div className="distributor-settings-alert-rows">
          <SettingsToggle
            checked={newVendorJoined}
            onChange={setNewVendorJoined}
            label="New Vendor Joined"
            description="When a vendor links to your network."
          />
          <SettingsToggle
            checked={vendorDeposit}
            onChange={setVendorDeposit}
            label="Vendor Deposit"
            description="Each time a vendor's customer loads."
          />
          <SettingsToggle
            checked={vendorSuspended}
            onChange={setVendorSuspended}
            label="Vendor Suspended"
            description="When admin suspends one of your vendors."
          />
        </div>
      </section>

      <section className="distributor-settings-card">
        <p className="distributor-settings-card-label">Financials</p>

        <div className="distributor-settings-alert-rows">
          <SettingsToggle
            checked={commissionPaid}
            onChange={setCommissionPaid}
            label="Commission Paid"
            description="When a settlement hits your wallet."
          />
          <SettingsToggle
            checked={invoiceDue}
            onChange={setInvoiceDue}
            label="Invoice Due"
            description="Reminders before invoice deadlines."
          />
        </div>
      </section>

      <section className="distributor-settings-card">
        <p className="distributor-settings-card-label">Reports &amp; System</p>

        <div className="distributor-settings-alert-rows">
          <SettingsToggle
            checked={weeklySummary}
            onChange={setWeeklySummary}
            label="Weekly Summary"
            description="Earnings & volume digest every Monday."
          />
          <SettingsToggle
            checked={marketingUpdates}
            onChange={setMarketingUpdates}
            label="Marketing Updates"
            description="Platform promotions and new features."
          />
          <SettingsToggle
            checked={systemAlerts}
            onChange={setSystemAlerts}
            label="System Alerts"
            description="Downtime, maintenance notices."
          />
        </div>
      </section>
    </div>
  )
}

function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState('password123')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)

  return (
    <div className="distributor-settings-content">
      <section className="distributor-settings-card">
        <p className="distributor-settings-card-label">Change Password</p>

        <label className="distributor-settings-field">
          <span className="distributor-settings-field-label">Current Password</span>
          <div className="distributor-settings-password-field">
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              className="distributor-settings-input"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="distributor-settings-password-toggle"
              aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
              onClick={() => setShowCurrentPassword((value) => !value)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                {showCurrentPassword ? (
                  <path
                    d="M3 3l18 18M10.58 10.58A2 2 0 0 0 12 15a2 2 0 0 0 1.42-.58M9.88 5.09A10.94 10.94 0 0 1 12 5c5 0 9.27 3.11 11 7.5a11.8 11.8 0 0 1-1.67 2.73M6.1 6.1A11.8 11.8 0 0 0 3 12.5C4.73 16.89 9 20 14 20a10.8 10.8 0 0 0 4.12-.8"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <>
                    <path
                      d="M2 12.5C3.73 8.11 8 5 13 5s9.27 3.11 11 7.5c-1.73 4.39-6 7.5-11 7.5S3.73 16.89 2 12.5z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="12.5" r="3" stroke="currentColor" strokeWidth="1.8" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </label>

        <label className="distributor-settings-field">
          <span className="distributor-settings-field-label">New Password</span>
          <input
            type="password"
            className="distributor-settings-input"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
          />
        </label>

        <label className="distributor-settings-field">
          <span className="distributor-settings-field-label">Confirm New Password</span>
          <input
            type="password"
            className="distributor-settings-input"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
          />
        </label>

        <button type="button" className="distributor-settings-save-btn">
          Update Password
        </button>
      </section>

      <section className="distributor-settings-card">
        <p className="distributor-settings-card-label">Two-Factor Authentication</p>

        <div className="distributor-settings-2fa-row">
          <div>
            <p className="distributor-settings-2fa-title">Authenticator App</p>
            <p className="distributor-settings-2fa-desc">Google / Authy TOTP</p>
          </div>
          <span className="distributor-settings-enabled-badge">Enabled</span>
        </div>

        <button type="button" className="distributor-settings-outline-btn">
          Manage 2FA
        </button>
      </section>

      <section className="distributor-settings-card distributor-settings-card--sessions">
        <p className="distributor-settings-card-label">Active Sessions</p>

        <div className="distributor-settings-session-list">
          <article className="distributor-settings-session-item">
            <div>
              <p className="distributor-settings-session-title">MacBook Pro</p>
              <p className="distributor-settings-session-meta">Las Vegas, NV · Now</p>
            </div>
          </article>

          <article className="distributor-settings-session-item">
            <div>
              <p className="distributor-settings-session-title">iPhone 15</p>
              <p className="distributor-settings-session-meta">Las Vegas, NV · 2h ago</p>
            </div>
            <button type="button" className="distributor-settings-revoke-btn">
              Revoke
            </button>
          </article>
        </div>
      </section>

      <button type="button" className="distributor-settings-logout-all-btn">
        Log Out All Devices
      </button>
    </div>
  )
}

function ProfileTab() {
  const [businessName, setBusinessName] = useState('Pacific Gaming Distribution')
  const [contactPerson, setContactPerson] = useState('James Nguyen')
  const [email, setEmail] = useState('james@pacificgaming.io')
  const [phone, setPhone] = useState('+1 (702) 555-0198')
  const [serviceRegion, setServiceRegion] = useState('Southwest US')

  function handleCopyLink() {
    void navigator.clipboard.writeText('https://tapstack.app/join/pacific-gaming')
  }

  return (
    <div className="distributor-settings-content">
      <section className="distributor-settings-card">
        <p className="distributor-settings-card-label">Affiliate Link</p>

        <div className="distributor-settings-link-field">
          <span className="distributor-settings-link-value">{AFFILIATE_LINK}</span>
          <button type="button" className="distributor-settings-copy-btn" onClick={handleCopyLink}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M5 15V5a2 2 0 0 1 2-2h10"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            Copy
          </button>
        </div>

        <p className="distributor-settings-card-help">
          Share this link in your marketing — vendors who sign up through it are automatically added to
          your network.
        </p>
      </section>

      <section className="distributor-settings-card">
        <p className="distributor-settings-card-label">Business Info</p>

        <label className="distributor-settings-field">
          <span className="distributor-settings-field-label">Business Name</span>
          <input
            type="text"
            className="distributor-settings-input"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
          />
        </label>

        <label className="distributor-settings-field">
          <span className="distributor-settings-field-label">Contact Person</span>
          <input
            type="text"
            className="distributor-settings-input"
            value={contactPerson}
            onChange={(event) => setContactPerson(event.target.value)}
          />
        </label>

        <label className="distributor-settings-field">
          <span className="distributor-settings-field-label">Email Address</span>
          <input
            type="email"
            className="distributor-settings-input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className="distributor-settings-field">
          <span className="distributor-settings-field-label">Phone Number</span>
          <input
            type="tel"
            className="distributor-settings-input"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>

        <label className="distributor-settings-field">
          <span className="distributor-settings-field-label">Service Region</span>
          <input
            type="text"
            className="distributor-settings-input"
            value={serviceRegion}
            onChange={(event) => setServiceRegion(event.target.value)}
          />
        </label>

        <button type="button" className="distributor-settings-save-btn">
          Save Changes
        </button>
      </section>

      <button type="button" className="distributor-settings-network-card">
        <div className="distributor-settings-network-head">
          <span className="distributor-settings-network-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M4 19c0-2.761 2.239-5 5-5h2c1.657 0 3.156.805 4.082 2.043M14 14c2.761 0 5 2.239 5 5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <h3 className="distributor-settings-network-title">Vendor Network</h3>
          <span className="distributor-settings-network-chevron" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>

        <div className="distributor-settings-network-stats">
          <div className="distributor-settings-network-stat">
            <p className="distributor-settings-network-stat-value">4</p>
            <p className="distributor-settings-network-stat-label">Total</p>
          </div>
          <div className="distributor-settings-network-stat">
            <p className="distributor-settings-network-stat-value distributor-settings-network-stat-value--blue">
              3
            </p>
            <p className="distributor-settings-network-stat-label">Active</p>
          </div>
          <div className="distributor-settings-network-stat">
            <p className="distributor-settings-network-stat-value distributor-settings-network-stat-value--orange">
              1
            </p>
            <p className="distributor-settings-network-stat-label">Pending</p>
          </div>
        </div>
      </button>
    </div>
  )
}

export default function DistributorSettingsPage() {
  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTab>('profile')

  return (
    <div className="distributor-settings-page">
      <DistributorSettingsHeader />

      <section className="distributor-settings-intro">
        <span className="distributor-settings-intro-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M4 9h16M4 15h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="8" cy="9" r="2" fill="currentColor" />
            <circle cx="16" cy="15" r="2" fill="currentColor" />
          </svg>
        </span>
        <div>
          <h1 className="distributor-settings-title">Settings</h1>
          <p className="distributor-settings-subtitle">Pacific Gaming Distribution</p>
        </div>
      </section>

      <nav className="distributor-settings-subtabs" aria-label="Settings sections">
        {SETTINGS_SUBTABS.map((tab) => {
          const active = activeSubTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`distributor-settings-subtab ${active ? 'distributor-settings-subtab--active' : ''}`}
              onClick={() => setActiveSubTab(tab.id)}
            >
              <SettingsSubtabIcon tab={tab.id} active={active} />
              <span className="distributor-settings-subtab-label">{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {activeSubTab === 'profile' ? (
        <ProfileTab />
      ) : activeSubTab === 'alerts' ? (
        <AlertsTab />
      ) : (
        <SecurityTab />
      )}
    </div>
  )
}
