import { useState } from 'react'
import { TapStackLogo } from './TapStackLogo'
import AdminBottomNav, { type AdminTab } from './AdminBottomNav'
import AdminVendorsPage from './AdminVendorsPage'
import AdminDistributorsPage from './AdminDistributorsPage'
import AdminSignupsPage from './AdminSignupsPage'
import AdminFinancePage from './AdminFinancePage'
import AdminSettingsPage from './AdminSettingsPage'
import './AdminDashboard.css'

type OverviewRange = 'today' | '7d' | '30d' | 'custom'

const OVERVIEW_RANGES: { id: OverviewRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: 'custom', label: 'Custom' },
]

const DETAIL_ROWS = [
  {
    id: 'google-ads',
    iconClass: 'admin-detail-icon--blue',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="M10 8.5v7l6-3.5-6-3.5z" fill="currentColor" />
      </svg>
    ),
    title: 'Google Video Ads',
    subtitle: 'Profit per click / watch',
    value: '$0.042',
    meta: '$0.11 per watch',
    valueTone: 'default' as const,
  },
  {
    id: 'loyalty-points',
    iconClass: 'admin-detail-icon--gold',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 7v10M9 10h6M9 14h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    title: 'Loyalty Points Converted',
    subtitle: 'Redeemed to dollar value',
    value: '-$3,468',
    meta: '34,680 pts',
    valueTone: 'negative' as const,
  },
  {
    id: 'subscriptions',
    iconClass: 'admin-detail-icon--green',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M12 8v4l3 2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: 'Customer Subscriptions',
    subtitle: 'Monthly fee total',
    value: '$4,100',
    meta: '820 subscribers',
    valueTone: 'default' as const,
  },
]

const PLATFORM_STATS = [
  { id: 'vendors', icon: '🏪', label: 'Active Vendors', value: '48' },
  { id: 'distributors', icon: '🏢', label: 'Distributors', value: '7' },
  { id: 'customers', icon: '👥', label: 'Total Customers', value: '2,841' },
  { id: 'suspended', icon: '⛔', label: 'Suspended', value: '1', tone: 'danger' as const },
]

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

function AdminOverviewPage() {
  const [range, setRange] = useState<OverviewRange>('today')

  return (
    <div className="admin-overview">
      <AdminHeader />

      <section className="admin-overview-intro">
        <h1 className="admin-overview-title">Platform Overview</h1>
        <p className="admin-overview-status">
          <span className="admin-overview-status-dot" aria-hidden="true" />
          All systems operational
        </p>
      </section>

      <section className="admin-profit-section">
        <div className="admin-profit-toolbar">
          <h2 className="admin-profit-heading">Profit Reporting</h2>
          <div className="admin-range-pills" role="tablist" aria-label="Time range">
            {OVERVIEW_RANGES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={range === item.id}
                className={`admin-range-btn ${range === item.id ? 'admin-range-btn--active' : ''}`}
                onClick={() => setRange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <article className="admin-profit-hero" aria-label="Net platform profit">
          <div className="admin-profit-hero-top">
            <p className="admin-profit-hero-label">Net Platform Profit</p>
            <span className="admin-profit-hero-badge">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M6 15l6-6 6 6"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              +12.4%
            </span>
          </div>
          <p className="admin-profit-hero-value">$1,842</p>
          <p className="admin-profit-hero-meta">vs yesterday · 94 transactions</p>
        </article>

        <div className="admin-profit-stats">
          <article className="admin-profit-stat-card">
            <p className="admin-profit-stat-value admin-profit-stat-value--green">$14,210</p>
            <p className="admin-profit-stat-label">Deposits</p>
          </article>
          <article className="admin-profit-stat-card">
            <p className="admin-profit-stat-value admin-profit-stat-value--red">$8,940</p>
            <p className="admin-profit-stat-label">Withdrawals</p>
          </article>
          <article className="admin-profit-stat-card">
            <p className="admin-profit-stat-value">$1,842</p>
            <p className="admin-profit-stat-label">Platform Fees</p>
          </article>
        </div>
      </section>

      <section className="admin-detail-list" aria-label="Platform revenue details">
        {DETAIL_ROWS.map((row) => (
          <article key={row.id} className="admin-detail-card">
            <span className={`admin-detail-icon ${row.iconClass}`}>{row.icon}</span>
            <div className="admin-detail-info">
              <h3 className="admin-detail-title">{row.title}</h3>
              <p className="admin-detail-subtitle">{row.subtitle}</p>
            </div>
            <div className="admin-detail-values">
              <p
                className={`admin-detail-value ${
                  row.valueTone === 'negative' ? 'admin-detail-value--negative' : ''
                }`}
              >
                {row.value}
              </p>
              <p className="admin-detail-meta">{row.meta}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="admin-platform-stats" aria-label="Platform statistics">
        {PLATFORM_STATS.map((stat) => (
          <article
            key={stat.id}
            className={`admin-platform-stat-card ${stat.tone === 'danger' ? 'admin-platform-stat-card--danger' : ''}`}
          >
            <span className="admin-platform-stat-icon" aria-hidden="true">
              {stat.icon}
            </span>
            <p className="admin-platform-stat-label">{stat.label}</p>
            <p className="admin-platform-stat-value">{stat.value}</p>
          </article>
        ))}
      </section>
    </div>
  )
}

export default function AdminDashboard({ onLogout: _onLogout }: { onLogout?: () => void }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-scroll">
        {activeTab === 'overview' && <AdminOverviewPage />}
        {activeTab === 'vendors' && <AdminVendorsPage />}
        {activeTab === 'distributors' && <AdminDistributorsPage />}
        {activeTab === 'signups' && <AdminSignupsPage />}
        {activeTab === 'finance' && <AdminFinancePage />}
        {activeTab === 'settings' && <AdminSettingsPage />}
      </div>
      <AdminBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
