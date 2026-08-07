import { useState, type ReactNode } from 'react'
import { TapStackLogo } from './TapStackLogo'
import './AdminSettingsPage.css'

type SettingsSubTab = 'account' | 'comms' | 'chargebacks'

const SETTINGS_SUB_TABS: { id: SettingsSubTab; label: string; icon: ReactNode }[] = [
  {
    id: 'account',
    label: 'Account',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M8 11V8a4 4 0 0 1 8 0v3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'comms',
    label: 'Comms',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4.5 9.5c2.2-3.1 6.8-3.1 9 0"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M7 12.5c1.2-1.7 3.8-1.7 5 0"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="12" cy="16" r="1.2" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'chargebacks',
    label: 'Chargebacks',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6 12H18M6 12l4-4M6 12l4 4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
]

type AdminRole = 'super-admin' | 'support' | 'read-only'

const PLATFORM_ADMINS: {
  id: string
  initials: string
  name: string
  email: string
  role: AdminRole
  lastActive: string
}[] = [
  {
    id: 'morgan-chen',
    initials: 'MC',
    name: 'Morgan Chen',
    email: 'morgan@tapstack.io',
    role: 'super-admin',
    lastActive: 'Now',
  },
  {
    id: 'jordan-rivera',
    initials: 'JR',
    name: 'Jordan Rivera',
    email: 'jordan@tapstack.io',
    role: 'support',
    lastActive: '2h ago',
  },
  {
    id: 'sam-okafor',
    initials: 'SO',
    name: 'Sam Okafor',
    email: 'sam@tapstack.io',
    role: 'support',
    lastActive: 'Yesterday',
  },
  {
    id: 'taylor-nguyen',
    initials: 'TN',
    name: 'Taylor Nguyen',
    email: 'taylor@tapstack.io',
    role: 'read-only',
    lastActive: '3d ago',
  },
]

const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  'super-admin': 'Super Admin',
  support: 'Support',
  'read-only': 'Read Only',
}

function AdminRoleIcon({ role }: { role: AdminRole }) {
  if (role === 'super-admin') {
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3l7 3v5c0 4.4-2.9 8.4-7 9.8-4.1-1.4-7-5.4-7-9.8V6l7-3z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (role === 'support') {
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 11v3a8 8 0 0 0 16 0v-3M8 11V8a4 4 0 0 1 8 0v3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path d="M12 18v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function AdminUserCard({
  initials,
  name,
  email,
  role,
  lastActive,
}: {
  initials: string
  name: string
  email: string
  role: AdminRole
  lastActive: string
}) {
  return (
    <article className="admin-settings-user-card">
      <span className="admin-settings-user-avatar" aria-hidden="true">
        {initials}
      </span>

      <div className="admin-settings-user-main">
        <h3 className="admin-settings-user-name">{name}</h3>
        <p className="admin-settings-user-email">{email}</p>
      </div>

      <div className="admin-settings-user-role-col">
        <span className={`admin-settings-user-role admin-settings-user-role--${role}`}>
          <AdminRoleIcon role={role} />
          {ADMIN_ROLE_LABELS[role]}
        </span>
        <span className="admin-settings-user-active">{lastActive}</span>
      </div>

      <button type="button" className="admin-settings-user-menu-btn" aria-label={`${name} options`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="6" cy="12" r="1.4" fill="currentColor" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" />
          <circle cx="18" cy="12" r="1.4" fill="currentColor" />
        </svg>
      </button>
    </article>
  )
}

function AdminHeader() {
  return (
    <header className="admin-dash-header">
      <div className="admin-dash-header-row">
        <TapStackLogo height={40} />
        <button type="button" className="admin-dash-avatar" aria-label="Admin profile">
          AV
        </button>
      </div>
    </header>
  )
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
    <div className="admin-settings-toggle-row">
      <div>
        <p className="admin-settings-toggle-label">{label}</p>
        <p className="admin-settings-toggle-desc">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`admin-settings-toggle ${checked ? 'admin-settings-toggle--on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="admin-settings-toggle-knob" />
      </button>
    </div>
  )
}

function AdminSettingsAccountTab() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [smsAlerts, setSmsAlerts] = useState(false)

  return (
    <div className="admin-settings-account">
      <div className="admin-settings-intro">
        <h1 className="admin-settings-title">Account Settings</h1>
        <p className="admin-settings-subtitle">Manage your admin login &amp; security</p>
      </div>

      <section className="admin-settings-card">
        <div className="admin-settings-card-head">
          <span className="admin-settings-card-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M8 11V8a4 4 0 0 1 8 0v3"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <h2 className="admin-settings-card-title">Change Password</h2>
        </div>

        <label className="admin-settings-field">
          <input
            type="password"
            className="admin-settings-input"
            placeholder="Current password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </label>
        <label className="admin-settings-field">
          <input
            type="password"
            className="admin-settings-input"
            placeholder="New password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </label>
        <label className="admin-settings-field">
          <input
            type="password"
            className="admin-settings-input"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </label>

        <button type="button" className="admin-settings-primary-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M5 5h14v14H5z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M8 5V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1M9 12l2 2 4-4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Update Password
        </button>
      </section>

      <section className="admin-settings-card">
        <div className="admin-settings-card-head">
          <span className="admin-settings-card-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 4a5 5 0 0 1 5 5v2.5l1.2 2.4A2 2 0 0 1 16.5 16H7.5a2 2 0 0 1-1.7-2.1L7 11.5V9a5 5 0 0 1 5-5z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <h2 className="admin-settings-card-title">Notifications</h2>
        </div>

        <SettingsToggle
          label="Email Alerts"
          description="Signup & vendor activity"
          checked={emailAlerts}
          onChange={setEmailAlerts}
        />
        <SettingsToggle
          label="SMS Alerts"
          description="Critical issues only"
          checked={smsAlerts}
          onChange={setSmsAlerts}
        />
      </section>

      <section className="admin-settings-users-section">
        <div className="admin-settings-users">
          <div>
            <h2 className="admin-settings-users-title">Users &amp; Roles</h2>
            <p className="admin-settings-users-subtitle">4 platform admins</p>
          </div>
          <button type="button" className="admin-settings-invite-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6"
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
            Invite
          </button>
        </div>

        <div className="admin-settings-user-list">
          {PLATFORM_ADMINS.map((admin) => (
            <AdminUserCard
              key={admin.id}
              initials={admin.initials}
              name={admin.name}
              email={admin.email}
              role={admin.role}
              lastActive={admin.lastActive}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

type CommsSubTab = 'email' | 'promos' | 'popups' | 'media'
type CommsAudience = 'customers' | 'vendors' | 'distributors' | 'everyone'

const COMMS_SUB_TABS: { id: CommsSubTab; label: string; icon: ReactNode }[] = [
  {
    id: 'email',
    label: 'Email',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'promos',
    label: 'Promos',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M9 14l6-6M9.5 8.5h.01M14.5 13.5h.01"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M7 3h10l4 7-10 11L1 10l6-7z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'popups',
    label: 'Popups',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 4a5 5 0 0 1 5 5v2.5l1.2 2.4A2 2 0 0 1 16.5 16H7.5a2 2 0 0 1-1.7-2.1L7 11.5V9a5 5 0 0 1 5-5z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'media',
    label: 'Media',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="9" cy="10" r="1.5" fill="currentColor" />
        <path
          d="M3 16l5-5 4 4 3-3 6 6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
]

const COMMS_AUDIENCE_OPTIONS: { id: CommsAudience; label: string; count: number }[] = [
  { id: 'customers', label: 'All Customers', count: 2841 },
  { id: 'vendors', label: 'All Vendors', count: 48 },
  { id: 'distributors', label: 'All Distributors', count: 7 },
  { id: 'everyone', label: 'Everyone', count: 2896 },
]

const COMMS_SAVED_TEMPLATES = [
  {
    id: 'maintenance-notice',
    title: 'Platform Maintenance Notice',
    lastUsed: 'Last used Dec 25',
  },
  {
    id: 'feature-announcement',
    title: 'New Feature Announcement',
    lastUsed: 'Last used Nov 12',
  },
]

function AdminSettingsCommsEmailTab() {
  const [audience, setAudience] = useState<CommsAudience>('customers')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  return (
    <div className="admin-settings-comms-email">
      <div className="admin-settings-comms-intro">
        <h1 className="admin-settings-comms-title">Platform Email Blast</h1>
        <p className="admin-settings-comms-subtitle">No rate limit for admin.</p>
      </div>

      <section className="admin-settings-comms-section">
        <h2 className="admin-settings-comms-label">Audience</h2>
        <div className="admin-settings-comms-audience-grid">
          {COMMS_AUDIENCE_OPTIONS.map((option) => {
            const active = audience === option.id
            return (
              <button
                key={option.id}
                type="button"
                className={`admin-settings-comms-audience-btn ${active ? 'admin-settings-comms-audience-btn--active' : ''}`}
                onClick={() => setAudience(option.id)}
              >
                <span className="admin-settings-comms-audience-label">{option.label}</span>
                <span className="admin-settings-comms-audience-count">
                  {option.count.toLocaleString()}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="admin-settings-comms-section">
        <label className="admin-settings-comms-field">
          <span className="admin-settings-comms-label">Subject</span>
          <input
            type="text"
            className="admin-settings-comms-input"
            placeholder="Platform announcement..."
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
        </label>
      </section>

      <section className="admin-settings-comms-section">
        <div className="admin-settings-comms-message-head">
          <span className="admin-settings-comms-label">Message</span>
          <button type="button" className="admin-settings-comms-template-link">
            Load template
          </button>
        </div>
        <textarea
          className="admin-settings-comms-textarea"
          placeholder="Write your message..."
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={5}
        />
      </section>

      <section className="admin-settings-comms-section">
        <h2 className="admin-settings-comms-label">Attachments</h2>
        <button type="button" className="admin-settings-comms-upload-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M8 12l8-8a3 3 0 0 1 4.2 4.2l-9 9a4 4 0 0 1-5.7-5.7l9.5-9.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Add Photo or Video
        </button>
      </section>

      <div className="admin-settings-comms-actions">
        <button type="button" className="admin-settings-comms-secondary-btn">
          Save as Template
        </button>
        <button type="button" className="admin-settings-comms-primary-btn">
          Send Blast
        </button>
      </div>

      <section className="admin-settings-comms-templates">
        <h2 className="admin-settings-comms-templates-label">SAVED TEMPLATES</h2>
        <div className="admin-settings-comms-templates-list">
          {COMMS_SAVED_TEMPLATES.map((template) => (
            <article key={template.id} className="admin-settings-comms-template-card">
              <div className="admin-settings-comms-template-info">
                <h3 className="admin-settings-comms-template-title">{template.title}</h3>
                <p className="admin-settings-comms-template-meta">{template.lastUsed}</p>
              </div>
              <button type="button" className="admin-settings-comms-template-use-btn">
                Use
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function AdminSettingsCommsPromosTab() {
  const [promoCode, setPromoCode] = useState('')
  const [bonusType, setBonusType] = useState('percent-bonus')
  const [bonusValue, setBonusValue] = useState('')

  const promotions = [
    {
      id: 'new-year-platform-bonus',
      title: 'New Year Platform Bonus',
      typeLabel: 'Bonus Credit',
      endsLabel: 'Ends Jan 2',
      audience: 'All customers',
      status: 'active' as const,
    },
    {
      id: 'refer-a-friend',
      title: 'Refer-a-Friend $10 Credit',
      typeLabel: 'Referral',
      endsLabel: 'Ends Feb 1',
      audience: 'All customers',
      status: 'active' as const,
    },
    {
      id: 'black-friday-freeplay',
      title: 'Black Friday Freeplay',
      typeLabel: 'Freeplay',
      endsLabel: 'Ends Nov 30',
      audience: 'All customers',
      status: 'expired' as const,
    },
  ]

  return (
    <div className="admin-settings-comms-promos">
      <div className="admin-settings-comms-promos-header">
        <div>
          <h1 className="admin-settings-comms-promos-title">Sitewide Promotions</h1>
          <p className="admin-settings-comms-promos-subtitle">Applied across all vendors</p>
        </div>
        <button type="button" className="admin-settings-comms-promos-new-btn">
          + New
        </button>
      </div>

      <div className="admin-settings-comms-promos-list">
        {promotions.map((promo) => (
          <article key={promo.id} className="admin-settings-comms-promo-card">
            <div className="admin-settings-comms-promo-top">
              <h2 className="admin-settings-comms-promo-title">{promo.title}</h2>
              <span
                className={`admin-settings-comms-promo-status admin-settings-comms-promo-status--${promo.status}`}
              >
                {promo.status === 'active' ? 'Active' : 'Expired'}
              </span>
            </div>
            <p className="admin-settings-comms-promo-meta">
              {promo.typeLabel} · {promo.endsLabel}
            </p>
            <div className="admin-settings-comms-promo-footer">
              <span className="admin-settings-comms-promo-audience">{promo.audience}</span>
              <button type="button" className="admin-settings-comms-promo-edit-btn">
                Edit
              </button>
            </div>
          </article>
        ))}
      </div>

      <section className="admin-settings-comms-promo-create">
        <h2 className="admin-settings-comms-promo-create-title">Create Platform-Wide Promo Code</h2>

        <label className="admin-settings-comms-promo-create-field">
          <input
            type="text"
            className="admin-settings-comms-promo-create-input"
            placeholder="Code (e.g. PLATFORM20)"
            value={promoCode}
            onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
          />
        </label>

        <div className="admin-settings-comms-promo-create-row">
          <div className="admin-settings-comms-promo-create-select-wrap">
            <select
              className="admin-settings-comms-promo-create-select"
              value={bonusType}
              onChange={(event) => setBonusType(event.target.value)}
              aria-label="Bonus type"
            >
              <option value="percent-bonus">% Bonus Credits</option>
              <option value="dollar-credit">$ Credit</option>
              <option value="freeplay">Freeplay</option>
            </select>
            <svg
              className="admin-settings-comms-promo-create-select-icon"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4 10l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <input
            type="text"
            className="admin-settings-comms-promo-create-input"
            placeholder="Value"
            value={bonusValue}
            onChange={(event) => setBonusValue(event.target.value)}
            aria-label="Promo value"
          />
        </div>

        <div className="admin-settings-comms-promo-create-attachments">
          <span className="admin-settings-comms-label">Attachments</span>
          <button type="button" className="admin-settings-comms-upload-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M8 12l8-8a3 3 0 0 1 4.2 4.2l-9 9a4 4 0 0 1-5.7-5.7l9.5-9.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Add Photo or Video
          </button>
        </div>

        <button type="button" className="admin-settings-comms-promo-create-btn">
          Create Code
        </button>
      </section>
    </div>
  )
}

function AdminSettingsCommsPopupsTab() {
  const [popupTitle, setPopupTitle] = useState('')
  const [popupBody, setPopupBody] = useState('')
  const [popupTarget, setPopupTarget] = useState('all-users')
  const [popupDate, setPopupDate] = useState('')
  const [popupCta, setPopupCta] = useState('')

  const popups = [
    {
      id: 'happy-new-year',
      title: 'Happy New Year! 🎆',
      meta: 'All · Jan 1–3',
      status: 'active' as const,
      toggleLabel: 'Deactivate',
      toggleTone: 'danger' as const,
    },
    {
      id: 'welcome',
      title: 'Welcome to TapStack',
      meta: 'New vendors · Always',
      status: 'active' as const,
      toggleLabel: 'Deactivate',
      toggleTone: 'danger' as const,
    },
    {
      id: 'holiday-maintenance',
      title: 'Holiday Maintenance Notice',
      meta: 'All · Dec 25',
      status: 'inactive' as const,
      toggleLabel: 'Activate',
      toggleTone: 'success' as const,
    },
  ]

  return (
    <div className="admin-settings-comms-popups">
      <div className="admin-settings-comms-popups-header">
        <div>
          <h1 className="admin-settings-comms-popups-title">Sign-in Popups</h1>
          <p className="admin-settings-comms-popups-subtitle">Shown to users at login</p>
        </div>
        <button type="button" className="admin-settings-comms-popups-new-btn">
          + New
        </button>
      </div>

      <div className="admin-settings-comms-popups-list">
        {popups.map((popup) => (
          <article key={popup.id} className="admin-settings-comms-popup-card">
            <div className="admin-settings-comms-popup-top">
              <div className="admin-settings-comms-popup-info">
                <h2 className="admin-settings-comms-popup-title">{popup.title}</h2>
                <p className="admin-settings-comms-popup-meta">{popup.meta}</p>
              </div>
              <span
                className={`admin-settings-comms-popup-status admin-settings-comms-popup-status--${popup.status}`}
              >
                {popup.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="admin-settings-comms-popup-actions">
              <button type="button" className="admin-settings-comms-popup-edit-btn">
                Edit
              </button>
              <button
                type="button"
                className={`admin-settings-comms-popup-toggle-btn admin-settings-comms-popup-toggle-btn--${popup.toggleTone}`}
              >
                {popup.toggleLabel}
              </button>
            </div>
          </article>
        ))}
      </div>

      <section className="admin-settings-comms-popup-create">
        <h2 className="admin-settings-comms-popup-create-label">NEW POPUP</h2>

        <label className="admin-settings-comms-popup-create-field">
          <input
            type="text"
            className="admin-settings-comms-popup-create-input"
            placeholder="Title"
            value={popupTitle}
            onChange={(event) => setPopupTitle(event.target.value)}
          />
        </label>

        <textarea
          className="admin-settings-comms-popup-create-textarea"
          placeholder="Body text..."
          value={popupBody}
          onChange={(event) => setPopupBody(event.target.value)}
          rows={4}
        />

        <div className="admin-settings-comms-popup-create-row">
          <div className="admin-settings-comms-popup-create-select-wrap">
            <select
              className="admin-settings-comms-popup-create-select"
              value={popupTarget}
              onChange={(event) => setPopupTarget(event.target.value)}
              aria-label="Popup audience"
            >
              <option value="all-users">All users</option>
              <option value="new-vendors">New vendors</option>
              <option value="all-customers">All customers</option>
              <option value="all-vendors">All vendors</option>
            </select>
            <svg
              className="admin-settings-comms-popup-create-select-icon"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4 10l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <input
            type="text"
            className="admin-settings-comms-popup-create-input"
            placeholder="08 / 06 / 2026"
            value={popupDate}
            onChange={(event) => setPopupDate(event.target.value)}
            aria-label="Popup date"
          />
        </div>

        <label className="admin-settings-comms-popup-create-field">
          <input
            type="text"
            className="admin-settings-comms-popup-create-input"
            placeholder="CTA Button Label (optional)"
            value={popupCta}
            onChange={(event) => setPopupCta(event.target.value)}
          />
        </label>

        <div className="admin-settings-comms-popup-create-attachments">
          <span className="admin-settings-comms-label">Attachments</span>
          <button type="button" className="admin-settings-comms-upload-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M8 12l8-8a3 3 0 0 1 4.2 4.2l-9 9a4 4 0 0 1-5.7-5.7l9.5-9.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Add Photo or Video
          </button>
        </div>

        <button type="button" className="admin-settings-comms-popup-create-btn">
          Create Popup
        </button>
      </section>
    </div>
  )
}

type MediaFilter = 'all' | 'active' | 'restricted' | 'deleted'

const MEDIA_FILTERS: { id: MediaFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'restricted', label: 'Restricted' },
  { id: 'deleted', label: 'Deleted' },
]

const MEDIA_ITEMS = [
  {
    id: 'summer-bonus-banner',
    title: 'Summer Bonus Banner',
    vendor: 'Lucky Strike Arcade',
    date: 'Jan 5',
    status: 'active' as const,
    previewKind: 'image' as const,
    previewTone: 'purple' as const,
    actions: 'restrict-delete' as const,
  },
  {
    id: 'vip-weekend-promo',
    title: 'VIP Weekend Promo',
    vendor: 'Pixel Palace',
    date: 'Jan 3',
    status: 'active' as const,
    previewKind: 'image' as const,
    previewTone: 'blue' as const,
    actions: 'restrict-delete' as const,
  },
  {
    id: 'new-year-free-credits',
    title: 'New Year Free Credits',
    vendor: 'Pixel Palace Arcade',
    date: 'Jan 2',
    status: 'restricted' as const,
    previewKind: 'restricted-badge' as const,
    previewTone: 'maroon' as const,
    actions: 'restore-delete' as const,
  },
  {
    id: 'double-points-event',
    title: 'Double Points Event',
    vendor: 'Galaxy Tokens',
    date: 'Dec 28',
    status: 'active' as const,
    previewKind: 'image' as const,
    previewTone: 'green' as const,
    actions: 'restrict-delete' as const,
  },
  {
    id: 'holiday-mega-bonus',
    title: 'Holiday Mega Bonus',
    vendor: 'Sun Coast Gaming',
    date: 'Dec 24',
    status: 'deleted' as const,
    previewKind: 'deleted-badge' as const,
    previewTone: 'muted' as const,
    actions: 'restore-only' as const,
  },
]

const MEDIA_STATUS_LABELS = {
  active: 'Active',
  restricted: 'Restricted',
  deleted: 'Deleted',
} as const

function MediaPreview({
  previewKind,
  previewTone,
}: {
  previewKind: (typeof MEDIA_ITEMS)[number]['previewKind']
  previewTone: (typeof MEDIA_ITEMS)[number]['previewTone']
}) {
  if (previewKind === 'restricted-badge') {
    return (
      <div className="admin-settings-comms-media-preview admin-settings-comms-media-preview--maroon">
        <span className="admin-settings-comms-media-preview-badge admin-settings-comms-media-preview-badge--restricted">
          🚫 Restricted
        </span>
      </div>
    )
  }

  if (previewKind === 'deleted-badge') {
    return (
      <div className="admin-settings-comms-media-preview admin-settings-comms-media-preview--muted">
        <span className="admin-settings-comms-media-preview-badge admin-settings-comms-media-preview-badge--deleted">
          🗑️ Deleted
        </span>
      </div>
    )
  }

  return (
    <div
      className={`admin-settings-comms-media-preview admin-settings-comms-media-preview--${previewTone}`}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="9" cy="10" r="1.5" fill="currentColor" />
        <path
          d="M4 16l4-4 3 3 2-2 7 7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

function MediaCardActions({ actions }: { actions: (typeof MEDIA_ITEMS)[number]['actions'] }) {
  if (actions === 'restore-only') {
    return (
      <div className="admin-settings-comms-media-card-actions admin-settings-comms-media-card-actions--single">
        <button type="button" className="admin-settings-comms-media-restore-btn admin-settings-comms-media-restore-btn--muted">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 12a8 8 0 0 1 13.3-5.9M20 12a8 8 0 0 1-13.3 5.9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M4 4v5h5M20 20v-5h-5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Restore
        </button>
      </div>
    )
  }

  if (actions === 'restore-delete') {
    return (
      <div className="admin-settings-comms-media-card-actions">
        <button type="button" className="admin-settings-comms-media-restore-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 12a8 8 0 0 1 13.3-5.9M20 12a8 8 0 0 1-13.3 5.9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M4 4v5h5M20 20v-5h-5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Restore
        </button>
        <button type="button" className="admin-settings-comms-media-delete-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 7h16M9 7V5h6v2M7 7l1 12h8l1-12"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Delete
        </button>
      </div>
    )
  }

  return (
    <div className="admin-settings-comms-media-card-actions">
      <button type="button" className="admin-settings-comms-media-restrict-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M5 5l14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        Restrict
      </button>
      <button type="button" className="admin-settings-comms-media-delete-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 7h16M9 7V5h6v2M7 7l1 12h8l1-12"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Delete
      </button>
    </div>
  )
}

function AdminSettingsCommsMediaTab() {
  const [filter, setFilter] = useState<MediaFilter>('all')

  const filteredItems =
    filter === 'all' ? MEDIA_ITEMS : MEDIA_ITEMS.filter((item) => item.status === filter)

  return (
    <div className="admin-settings-comms-media">
      <div className="admin-settings-comms-media-intro">
        <h1 className="admin-settings-comms-media-title">Vendor Marketing Media</h1>
        <p className="admin-settings-comms-media-subtitle">
          Review and control vendor-posted promotional material
        </p>
      </div>

      <div className="admin-settings-comms-media-filter-row">
        <span className="admin-settings-comms-media-filter-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 7h16M6 12h12M9 17h6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <div className="admin-settings-comms-media-filters" role="tablist" aria-label="Media filters">
          {MEDIA_FILTERS.map((item) => {
            const active = filter === item.id
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`admin-settings-comms-media-filter ${active ? 'admin-settings-comms-media-filter--active' : ''}`}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="admin-settings-comms-media-stats">
        <article className="admin-settings-comms-media-stat">
          <p className="admin-settings-comms-media-stat-value admin-settings-comms-media-stat-value--green">
            3
          </p>
          <p className="admin-settings-comms-media-stat-label">Active</p>
        </article>
        <article className="admin-settings-comms-media-stat">
          <p className="admin-settings-comms-media-stat-value admin-settings-comms-media-stat-value--orange">
            2
          </p>
          <p className="admin-settings-comms-media-stat-label">Restricted</p>
        </article>
        <article className="admin-settings-comms-media-stat">
          <p className="admin-settings-comms-media-stat-value admin-settings-comms-media-stat-value--red">
            1
          </p>
          <p className="admin-settings-comms-media-stat-label">Deleted</p>
        </article>
      </div>

      <div className="admin-settings-comms-media-list">
        {filteredItems.map((item) => (
          <article
            key={item.id}
            className={`admin-settings-comms-media-card ${item.status === 'deleted' ? 'admin-settings-comms-media-card--deleted' : ''}`}
          >
            <MediaPreview previewKind={item.previewKind} previewTone={item.previewTone} />

            <div className="admin-settings-comms-media-body">
              <div className="admin-settings-comms-media-card-top">
                <div className="admin-settings-comms-media-card-info">
                  <h2 className="admin-settings-comms-media-card-title">{item.title}</h2>
                  <p className="admin-settings-comms-media-card-meta">
                    {item.vendor} · {item.date}
                  </p>
                </div>
                <span
                  className={`admin-settings-comms-media-card-status admin-settings-comms-media-card-status--${item.status}`}
                >
                  {MEDIA_STATUS_LABELS[item.status]}
                </span>
              </div>

              <MediaCardActions actions={item.actions} />
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function AdminSettingsCommsTab() {
  const [commsTab, setCommsTab] = useState<CommsSubTab>('email')

  return (
    <div className="admin-settings-comms">
      <nav className="admin-settings-comms-subtabs" aria-label="Comms sections">
        {COMMS_SUB_TABS.map((tab) => {
          const active = commsTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              className={`admin-settings-comms-subtab ${active ? 'admin-settings-comms-subtab--active' : ''}`}
              onClick={() => setCommsTab(tab.id)}
            >
              <span className="admin-settings-comms-subtab-icon">{tab.icon}</span>
              <span className="admin-settings-comms-subtab-label">{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {commsTab === 'email' ? (
        <AdminSettingsCommsEmailTab />
      ) : commsTab === 'promos' ? (
        <AdminSettingsCommsPromosTab />
      ) : commsTab === 'popups' ? (
        <AdminSettingsCommsPopupsTab />
      ) : commsTab === 'media' ? (
        <AdminSettingsCommsMediaTab />
      ) : (
        <div className="admin-settings-placeholder">
          <p>{COMMS_SUB_TABS.find((tab) => tab.id === commsTab)?.label} coming soon.</p>
        </div>
      )}
    </div>
  )
}

function AdminSettingsChargebacksTab() {
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('05 / 01 / 2026')
  const [toDate, setToDate] = useState('07 / 02 / 2026')

  return (
    <div className="admin-settings-chargebacks">
      <div className="admin-settings-chargebacks-intro">
        <h1 className="admin-settings-chargebacks-title">Chargebacks</h1>
        <p className="admin-settings-chargebacks-subtitle">
          Search chargeback history from your payment provider
        </p>
      </div>

      <section className="admin-settings-chargebacks-card">
        <label className="admin-settings-chargebacks-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            placeholder="Search name, email, or phone..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search chargebacks"
          />
        </label>

        <div className="admin-settings-chargebacks-date-row">
          <label className="admin-settings-chargebacks-date-field">
            <span className="admin-settings-chargebacks-date-label">From</span>
            <input
              type="text"
              className="admin-settings-chargebacks-date-input"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </label>

          <span className="admin-settings-chargebacks-date-arrow" aria-hidden="true">
            →
          </span>

          <label className="admin-settings-chargebacks-date-field">
            <span className="admin-settings-chargebacks-date-label">To</span>
            <input
              type="text"
              className="admin-settings-chargebacks-date-input"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </label>
        </div>

        <button type="button" className="admin-settings-chargebacks-report-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M8 4h8l2 4v12H6V4l2-4z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path d="M9 9h6M9 13h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="16" cy="8" r="3" fill="currentColor" />
            <path
              d="M16 7v2"
              stroke="#fff"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
          Chargeback Report
        </button>
      </section>
    </div>
  )
}

export default function AdminSettingsPage() {
  const [subTab, setSubTab] = useState<SettingsSubTab>('account')

  return (
    <div className="admin-settings-page">
      <AdminHeader />

      <nav className="admin-settings-subtabs" aria-label="Settings sections">
        {SETTINGS_SUB_TABS.map((tab) => {
          const active = subTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              className={`admin-settings-subtab ${active ? 'admin-settings-subtab--active' : ''}`}
              onClick={() => setSubTab(tab.id)}
            >
              <span className="admin-settings-subtab-icon">{tab.icon}</span>
              <span className="admin-settings-subtab-label">{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {subTab === 'account' ? (
        <AdminSettingsAccountTab />
      ) : subTab === 'comms' ? (
        <AdminSettingsCommsTab />
      ) : (
        <AdminSettingsChargebacksTab />
      )}
    </div>
  )
}
