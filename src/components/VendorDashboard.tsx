import { useState } from 'react'
import { TapStackLogo } from './TapStackLogo'
import VendorBottomNav, { type VendorTab } from './VendorBottomNav'
import VendorOrdersPage from './VendorOrdersPage'
import VendorAnalyticsPage from './VendorAnalyticsPage'
import VendorPromosPage from './VendorPromosPage'
import VendorSettingsPage from './VendorSettingsPage'
import TopUpModal from './TopUpModal'
import './VendorDashboard.css'

function VendorHeader() {
  return (
    <header className="vendor-dash-header">
      <div className="vendor-dash-header-row">
        <div className="vendor-dash-brand">
          <TapStackLogo height={40} />
        </div>

        <div className="vendor-dash-header-actions">
          <button type="button" className="vendor-icon-button vendor-icon-button--chat" aria-label="Messages">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
            <span className="vendor-badge">2</span>
          </button>

          <button type="button" className="vendor-avatar-button" aria-label="Profile">
            LC
          </button>
        </div>
      </div>
    </header>
  )
}

function VendorHome({
  walletBalance,
  onTopUp,
}: {
  walletBalance: string
  onTopUp: () => void
}) {
  return (
    <div className="vendor-home">
      <section className="vendor-store-row">
        <div className="vendor-store-info">
          <div className="vendor-store-avatar">LS</div>
          <span className="vendor-store-name">Lucky Strike Arcade</span>
        </div>
        <button type="button" className="vendor-icon-button" aria-label="Notifications">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          <span className="vendor-badge">4</span>
        </button>
      </section>

      <div className="vendor-alert-card vendor-alert-card--message">
        <div className="vendor-alert-icon vendor-alert-icon--blue">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
              stroke="#2563eb"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="vendor-alert-content">
          <p className="vendor-alert-title">2 new messages from Pacific Gaming Distribution</p>
          <p className="vendor-alert-subtitle">December settlement schedule update</p>
        </div>
        <button type="button" className="vendor-alert-action">
          View
        </button>
      </div>

      <div className="vendor-alert-card vendor-alert-card--invoice">
        <div className="vendor-alert-icon vendor-alert-icon--red">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              stroke="#db2777"
              strokeWidth="1.8"
            />
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="#db2777" strokeWidth="1.8" />
          </svg>
        </div>
        <div className="vendor-alert-content">
          <p className="vendor-alert-title">2 invoices awaiting payment</p>
          <p className="vendor-alert-subtitle">Tap to review and pay from your wallet</p>
        </div>
        <button type="button" className="vendor-alert-action vendor-alert-action--red">
          View
        </button>
      </div>

      <section className="vendor-wallet-card">
        <div className="vendor-wallet-top">
          <div>
            <p className="vendor-wallet-label">WALLET BALANCE</p>
            <p className="vendor-wallet-amount">{walletBalance}</p>
            <p className="vendor-wallet-meta">USDC · Available</p>
          </div>
          <svg className="vendor-wallet-graphic" viewBox="0 0 80 80" fill="none" aria-hidden="true">
            <rect x="12" y="24" width="56" height="40" rx="8" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
            <path d="M12 34 H68" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
            <circle cx="56" cy="49" r="6" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
          </svg>
        </div>

        <div className="vendor-wallet-actions">
          <button type="button" className="vendor-wallet-btn vendor-wallet-btn--outline" onClick={onTopUp}>
            + Top Up
          </button>
          <button type="button" className="vendor-wallet-btn vendor-wallet-btn--outline">
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
          <button type="button" className="vendor-wallet-btn vendor-wallet-btn--primary">
            Withdraw
          </button>
        </div>
      </section>

      <section className="vendor-volume-card">
        <div className="vendor-volume-header">
          <div className="vendor-volume-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="9" cy="12" r="6" stroke="#b45309" strokeWidth="1.8" />
              <circle cx="15" cy="12" r="6" stroke="#b45309" strokeWidth="1.8" />
            </svg>
          </div>
          <div className="vendor-volume-info">
            <div className="vendor-volume-row">
              <span className="vendor-volume-label">Monthly Volume</span>
              <span className="vendor-volume-value">$42.3k / $60k</span>
            </div>
            <div className="vendor-volume-bar">
              <div className="vendor-volume-fill" style={{ width: '70.5%' }} />
            </div>
            <p className="vendor-volume-footnote">
              <span className="vendor-volume-highlight">$17.7k more</span> unlocks{' '}
              <span className="vendor-volume-cashback">1% cashback</span>
            </p>
          </div>
        </div>
      </section>

      <section className="vendor-stats-grid">
        <article className="vendor-stat-card">
          <div className="vendor-stat-top">
            <p className="vendor-stat-label">Today&apos;s Deposits</p>
            <svg className="vendor-stat-spark vendor-stat-spark--green" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 16 L10 10 L14 14 L20 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M16 6 H20 V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <p className="vendor-stat-value">$3,218</p>
          <p className="vendor-stat-subtext">+18% vs yesterday</p>
        </article>

        <article className="vendor-stat-card">
          <div className="vendor-stat-top">
            <p className="vendor-stat-label">Today&apos;s Redeems</p>
            <svg className="vendor-stat-spark vendor-stat-spark--orange" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 8 L10 14 L14 10 L20 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M16 18 H20 V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <p className="vendor-stat-value">$2,140</p>
          <p className="vendor-stat-subtext">+6% vs yesterday</p>
        </article>

        <article className="vendor-stat-card">
          <div className="vendor-stat-top">
            <p className="vendor-stat-label">Today&apos;s Net</p>
            <svg className="vendor-stat-spark vendor-stat-spark--purple" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 14 L10 8 L14 12 L20 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M16 4 H20 V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <p className="vendor-stat-value vendor-stat-value--green">$1,078</p>
          <p className="vendor-stat-subtext">Deposits – redeems</p>
        </article>

        <article className="vendor-stat-card">
          <div className="vendor-stat-top">
            <p className="vendor-stat-label">Customers</p>
            <svg className="vendor-stat-people" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="9" cy="8" r="3" stroke="#2563eb" strokeWidth="1.8" />
              <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="#2563eb" strokeWidth="1.8" />
              <circle cx="17" cy="9" r="2.5" stroke="#2563eb" strokeWidth="1.8" />
              <path d="M14 20c.4-2.2 2-4 4-4" stroke="#2563eb" strokeWidth="1.8" />
            </svg>
          </div>
          <p className="vendor-stat-value">247</p>
          <p className="vendor-stat-subtext">12 new this week</p>
        </article>
      </section>

      <section className="vendor-transactions">
        <div className="vendor-transactions-header">
          <h2 className="vendor-transactions-title">Recent Transactions</h2>
          <button type="button" className="vendor-transactions-view-all">
            View all
          </button>
        </div>

        <ul className="vendor-transactions-list">
          <li className="vendor-transaction-item">
            <div className="vendor-transaction-details">
              <p className="vendor-transaction-name">Customer Deposit</p>
              <p className="vendor-transaction-meta">Jordan M. · 2m ago</p>
            </div>
            <span className="vendor-transaction-amount vendor-transaction-amount--green">+$120.00</span>
          </li>

          <li className="vendor-transaction-item">
            <div className="vendor-transaction-details">
              <p className="vendor-transaction-name">Platform Fee</p>
              <p className="vendor-transaction-meta">System · 2m ago</p>
            </div>
            <span className="vendor-transaction-amount vendor-transaction-amount--pink">-$6.00</span>
          </li>

          <li className="vendor-transaction-item">
            <div className="vendor-transaction-details">
              <p className="vendor-transaction-name">Customer Deposit</p>
              <p className="vendor-transaction-meta">Riley K. · 14m ago</p>
            </div>
            <span className="vendor-transaction-amount vendor-transaction-amount--green">+$85.00</span>
          </li>

          <li className="vendor-transaction-item">
            <div className="vendor-transaction-details">
              <p className="vendor-transaction-name">Customer Redeem</p>
              <p className="vendor-transaction-meta">Jordan M. · 18m ago</p>
            </div>
            <span className="vendor-transaction-amount vendor-transaction-amount--orange">-$72.00</span>
          </li>

          <li className="vendor-transaction-item">
            <div className="vendor-transaction-details">
              <p className="vendor-transaction-name">Customer Deposit</p>
              <p className="vendor-transaction-meta">Alex P. · 31m ago</p>
            </div>
            <span className="vendor-transaction-amount vendor-transaction-amount--green">+$200.00</span>
          </li>
        </ul>
      </section>
    </div>
  )
}

export default function VendorDashboard() {
  const [activeTab, setActiveTab] = useState<VendorTab>('home')
  const [topUpOpen, setTopUpOpen] = useState(false)
  const [walletBalance, setWalletBalance] = useState('$12,440.00')

  return (
    <div className="vendor-dashboard">
      <VendorHeader />

      <main className="vendor-main">
        {activeTab === 'home' && (
          <VendorHome walletBalance={walletBalance} onTopUp={() => setTopUpOpen(true)} />
        )}
        {activeTab === 'orders' && <VendorOrdersPage />}
        {activeTab === 'analytics' && <VendorAnalyticsPage />}
        {activeTab === 'promos' && <VendorPromosPage />}
        {activeTab === 'settings' && <VendorSettingsPage />}
      </main>

      <VendorBottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      <TopUpModal
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        ownerType="vendor"
        title="Top up USDC wallet"
        onSuccess={(wallet) => {
          if (wallet) setWalletBalance(`$${wallet.balance.toFixed(2)}`)
        }}
      />
    </div>
  )
}
