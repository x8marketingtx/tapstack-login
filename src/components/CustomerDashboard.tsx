import { useState } from 'react'
import { VENDORS, type Vendor } from '../data/vendors'
import { TapStackLogo, TapStackWordmark } from './TapStackLogo'
import VendorPage from './VendorPage'
import './CustomerDashboard.css'

type ActivityAmount = {
  text: string
  variant: 'cash-positive' | 'cash-negative' | 'points-positive' | 'points-negative'
}

const ACTIVITIES: {
  icon: string
  iconBg: string
  title: string
  date: string
  amounts: ActivityAmount[]
}[] = [
  {
    icon: '💰',
    iconBg: '#dcfce7',
    title: 'Top Up — Card ending 4242',
    date: 'Jun 5',
    amounts: [{ text: '+$100.00', variant: 'cash-positive' }],
  },
  {
    icon: '🎮',
    iconBg: '#dbeafe',
    title: 'Ocean Sluggerz — Golden Dragon',
    date: 'Jun 5',
    amounts: [
      { text: '-$25.00', variant: 'cash-negative' },
      { text: '+250 pts', variant: 'points-positive' },
    ],
  },
  {
    icon: '⭐',
    iconBg: '#fef9c3',
    title: 'Spin Wheel reward',
    date: 'Jun 4',
    amounts: [{ text: '+150 pts', variant: 'points-positive' }],
  },
  {
    icon: '🔄',
    iconBg: '#ede9fe',
    title: 'Points redeemed for cash',
    date: 'Jun 4',
    amounts: [
      { text: '+$10.00', variant: 'cash-positive' },
      { text: '-1,000 pts', variant: 'points-negative' },
    ],
  },
  {
    icon: '🎮',
    iconBg: '#dbeafe',
    title: 'Victory Valley — Fire Kirin',
    date: 'Jun 3',
    amounts: [
      { text: '-$12.50', variant: 'cash-negative' },
      { text: '+125 pts', variant: 'points-positive' },
    ],
  },
  {
    icon: '🏦',
    iconBg: '#ffedd5',
    title: 'Withdraw — Bank',
    date: 'Jun 1',
    amounts: [{ text: '-$50.00', variant: 'cash-negative' }],
  },
]

export default function CustomerDashboard() {
  const [vendorCode, setVendorCode] = useState('')
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)

  if (selectedVendor) {
    return <VendorPage vendor={selectedVendor} onBack={() => setSelectedVendor(null)} />
  }

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-brand">
          <TapStackLogo size={28} />
          <TapStackWordmark />
        </div>

        <div className="dash-header-meta">
          <div className="level-badge">
            <span className="level-label">Lv 7</span>
            <div className="level-bar">
              <div className="level-fill" style={{ width: '62%' }} />
            </div>
          </div>
          <button type="button" className="user-avatar" aria-label="Profile">
            JS
          </button>
        </div>
      </header>

      <section className="balance-card">
        <div className="balance-top">
          <div>
            <p className="balance-label">CASH BALANCE</p>
            <p className="balance-amount">$125.00</p>
          </div>
          <div className="points-badge">
            <span className="points-label">POINTS</span>
            <span className="points-value">3,400 pts</span>
          </div>
        </div>

        <div className="balance-actions">
          <button type="button" className="balance-btn balance-btn--send">
            Send
          </button>
          <button type="button" className="balance-btn balance-btn--withdraw">
            Withdraw
          </button>
        </div>
      </section>

      <section className="add-vendor">
        <div className="add-vendor-icon">+</div>
        <div className="add-vendor-content">
          <p className="add-vendor-title">Add Vendor</p>
          <div className="add-vendor-row">
            <input
              type="text"
              className="add-vendor-input"
              placeholder="Enter vendor code..."
              value={vendorCode}
              onChange={(event) => setVendorCode(event.target.value)}
            />
            <button type="button" className="add-vendor-go">
              Go
            </button>
          </div>
        </div>
      </section>

      <section className="vendors-section">
        <h2 className="vendors-title">Your Vendors</h2>
        <p className="vendors-subtitle">Tap to view games &amp; manage your Game IDs</p>

        <div className="vendors-grid">
          {VENDORS.map((vendor) => (
            <button
              key={vendor.initials}
              type="button"
              className="vendor-card"
              onClick={() => setSelectedVendor(vendor)}
            >
              <div
                className="vendor-icon"
                style={{ background: vendor.color, color: vendor.text }}
              >
                {vendor.initials}
              </div>
              <div className="vendor-info">
                <span className="vendor-name">{vendor.name}</span>
                <span className="vendor-handle">
                  <span className="vendor-game-icon" aria-hidden="true">
                    🎮
                  </span>
                  {vendor.handle}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="activity-section">
        <div className="activity-header">
          <h2 className="activity-title">Recent Activity</h2>
          <button type="button" className="activity-see-all">
            See all
          </button>
        </div>

        <ul className="activity-list">
          {ACTIVITIES.map((item) => (
            <li key={`${item.title}-${item.date}`} className="activity-item">
              <div className="activity-icon" style={{ background: item.iconBg }}>
                {item.icon}
              </div>
              <div className="activity-details">
                <p className="activity-name">{item.title}</p>
                <p className="activity-date">{item.date}</p>
              </div>
              <div className="activity-amounts">
                {item.amounts.map((amount) => (
                  <span key={amount.text} className={`activity-amount activity-amount--${amount.variant}`}>
                    {amount.text}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <nav className="bottom-nav" aria-label="Main navigation">
        <button type="button" className="nav-item nav-item--active">
          <span className="nav-icon">🎮</span>
          <span>Games</span>
        </button>
        <button type="button" className="nav-item">
          <span className="nav-icon">⚡</span>
          <span>Earn</span>
        </button>
        <button type="button" className="nav-item">
          <span className="nav-icon">🎟️</span>
          <span>Giveaway</span>
        </button>
        <button type="button" className="nav-item">
          <span className="nav-icon">🎁</span>
          <span>Promos</span>
        </button>
        <button type="button" className="nav-item">
          <span className="nav-icon">🏦</span>
          <span>Account</span>
        </button>
      </nav>
    </div>
  )
}
