import { useState } from 'react'
import { TapStackLogo } from './TapStackLogo'
import DistributorBottomNav, { type DistributorTab } from './DistributorBottomNav'
import DistributorVendorsPage from './DistributorVendorsPage'
import DistributorAnalyticsPage from './DistributorAnalyticsPage'
import DistributorInvoicesPage from './DistributorInvoicesPage'
import DistributorSettingsPage from './DistributorSettingsPage'
import './DistributorDashboard.css'

type EarningsRange = 'today' | '7d' | '30d' | 'custom'

const EARNINGS_RANGES: { id: EarningsRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: 'custom', label: 'Custom' },
]

const VENDOR_EARNINGS = [
  { id: 'lucky-strike', name: 'Lucky Strike Arcade', amount: '$460.50', fill: 100 },
  { id: 'pixel-palace', name: 'Pixel Palace Arcade', amount: '$320.00', fill: 70 },
  { id: 'nova-game-zone', name: 'Nova Game Zone', amount: '$227.50', fill: 49 },
  { id: 'galaxy-tokens', name: 'Galaxy Tokens', amount: '$80.00', fill: 17, badge: 'Restricted' as const },
]

const RECENT_ACTIVITY = [
  {
    id: 'inv-001',
    text: 'Lucky Strike Arcade paid invoice INV-001 · $450',
    time: 'Just now',
    unread: true,
  },
  {
    id: 'commission-pixel',
    text: 'Commission credited from Pixel Palace · $320',
    time: '1h ago',
    unread: true,
  },
  {
    id: 'nova-volume',
    text: 'Nova Game Zone volume up 12% this week',
    time: '3h ago',
    unread: true,
  },
  {
    id: 'withdrawal',
    text: 'Withdrawal of $3,200 to bank',
    time: 'Yesterday',
    unread: false,
  },
  {
    id: 'galaxy-restricted',
    text: 'Galaxy Tokens flagged restricted',
    time: '2d ago',
    unread: false,
  },
]

function DistributorHeader() {
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

function DistributorHome() {
  const [range, setRange] = useState<EarningsRange>('today')

  return (
    <div className="distributor-home">
      <section className="distributor-home-intro">
        <div className="distributor-home-title-row">
          <h1 className="distributor-home-title">Pacific Gaming</h1>
          <span className="distributor-home-badge">Distributor</span>
        </div>
        <p className="distributor-home-meta">
          <span className="distributor-home-meta-dot" aria-hidden="true" />
          4 vendors · 3 active
        </p>
      </section>

      <section className="distributor-wallet-card">
        <div className="distributor-wallet-top">
          <div>
            <p className="distributor-wallet-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="16" cy="14" r="1.5" fill="currentColor" />
              </svg>
              Wallet Balance
            </p>
            <p className="distributor-wallet-amount">$8,640.00</p>
            <p className="distributor-wallet-meta">USDC · from your vendors</p>
          </div>
          <span className="distributor-wallet-pending">Pending $3,200</span>
        </div>

        <div className="distributor-wallet-stats">
          <article className="distributor-wallet-stat">
            <p className="distributor-wallet-stat-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="17" cy="17" r="2" stroke="currentColor" strokeWidth="1.6" />
                <path d="M8.5 8.5l7 7" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              Commissions
            </p>
            <p className="distributor-wallet-stat-value">$7,180</p>
          </article>
          <article className="distributor-wallet-stat">
            <p className="distributor-wallet-stat-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path d="M14 2v6h6M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              Invoices Paid
            </p>
            <p className="distributor-wallet-stat-value">$1,460</p>
          </article>
        </div>

        <div className="distributor-wallet-actions">
          <button type="button" className="distributor-wallet-btn distributor-wallet-btn--outline">
            + Top Up
          </button>
          <button type="button" className="distributor-wallet-btn distributor-wallet-btn--outline">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Send
          </button>
          <button type="button" className="distributor-wallet-btn distributor-wallet-btn--primary">
            Withdraw
          </button>
        </div>
      </section>

      <section className="distributor-earnings-section">
        <div className="distributor-earnings-toolbar">
          <h2 className="distributor-earnings-heading">Earnings Reporting</h2>
          <div className="distributor-earnings-ranges" role="tablist" aria-label="Earnings time range">
            {EARNINGS_RANGES.map((item) => {
              const active = range === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`distributor-earnings-range ${active ? 'distributor-earnings-range--active' : ''}`}
                  onClick={() => setRange(item.id)}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>

        <article className="distributor-earnings-summary">
          <p className="distributor-earnings-summary-label">Earnings this period</p>
          <p className="distributor-earnings-summary-value">$142</p>
          <p className="distributor-earnings-summary-meta">Today · 38 transactions</p>
          <div className="distributor-earnings-summary-divider" />
          <p className="distributor-earnings-summary-foot">
            <span aria-hidden="true">🏪</span>
            4 vendors
          </p>
        </article>
      </section>

      <section className="distributor-vendor-earnings">
        <h2 className="distributor-vendor-earnings-title">
          <svg
            className="distributor-section-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="17" cy="17" r="2" stroke="currentColor" strokeWidth="1.6" />
            <path d="M8.5 8.5l7 7" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          Earnings by Vendor — This Month
        </h2>

        <div className="distributor-vendor-earnings-list">
          {VENDOR_EARNINGS.map((vendor) => (
            <article key={vendor.id} className="distributor-vendor-earnings-item">
              <div className="distributor-vendor-earnings-head">
                <span className="distributor-vendor-earnings-name-row">
                  <span className="distributor-vendor-earnings-name">{vendor.name}</span>
                  {vendor.badge ? (
                    <span className="distributor-vendor-earnings-badge">{vendor.badge}</span>
                  ) : null}
                </span>
                <span className="distributor-vendor-earnings-amount">{vendor.amount}</span>
              </div>
              <div className="distributor-vendor-earnings-track">
                <span
                  className="distributor-vendor-earnings-fill"
                  style={{ width: `${vendor.fill}%` }}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="distributor-activity-section">
        <h2 className="distributor-activity-heading">
          <svg
            className="distributor-section-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 17l4-6 4 3 5-8 5 11"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Recent Activity
        </h2>

        <div className="distributor-activity-list">
          {RECENT_ACTIVITY.map((item) => (
            <article key={item.id} className="distributor-activity-item">
              {item.unread ? (
                <span className="distributor-activity-dot" aria-hidden="true" />
              ) : (
                <span className="distributor-activity-dot-spacer" aria-hidden="true" />
              )}
              <div className="distributor-activity-body">
                <p className="distributor-activity-text">{item.text}</p>
                <p className="distributor-activity-time">{item.time}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

export default function DistributorDashboard() {
  const [activeTab, setActiveTab] = useState<DistributorTab>('home')

  return (
    <div className="distributor-dashboard">
      <div className="distributor-dashboard-scroll">
        {activeTab === 'home' ? (
          <>
            <DistributorHeader />
            <DistributorHome />
          </>
        ) : activeTab === 'vendors' ? (
          <DistributorVendorsPage />
        ) : activeTab === 'analytics' ? (
          <DistributorAnalyticsPage />
        ) : activeTab === 'invoices' ? (
          <DistributorInvoicesPage />
        ) : (
          <DistributorSettingsPage />
        )}
      </div>
      <DistributorBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
