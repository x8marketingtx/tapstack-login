import { useState } from 'react'
import { VENDORS, type Vendor } from '../data/vendors'
import BottomNav, { type DashboardTab } from './BottomNav'
import DashboardHeader from './DashboardHeader'
import AccountPage from './AccountPage'
import EarnPage from './EarnPage'
import GiveawayPage from './GiveawayPage'
import PromosPage from './PromosPage'
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

function GamesHome({
  vendorCode,
  onVendorCodeChange,
  onVendorSelect,
}: {
  vendorCode: string
  onVendorCodeChange: (value: string) => void
  onVendorSelect: (vendor: Vendor) => void
}) {
  return (
    <>
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
              onChange={(event) => onVendorCodeChange(event.target.value)}
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
              onClick={() => onVendorSelect(vendor)}
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
    </>
  )
}

export default function CustomerDashboard() {
  const [vendorCode, setVendorCode] = useState('')
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [activeTab, setActiveTab] = useState<DashboardTab>('games')

  function handleTabChange(tab: DashboardTab) {
    setSelectedVendor(null)
    setActiveTab(tab)
  }

  if (selectedVendor) {
    return (
      <VendorPage
        vendor={selectedVendor}
        activeTab={activeTab}
        onBack={() => setSelectedVendor(null)}
        onTabChange={handleTabChange}
      />
    )
  }

  return (
    <div className="dashboard">
      <DashboardHeader />

      {activeTab === 'games' && (
        <GamesHome
          vendorCode={vendorCode}
          onVendorCodeChange={setVendorCode}
          onVendorSelect={setSelectedVendor}
        />
      )}

      {activeTab === 'earn' && <EarnPage />}

      {activeTab === 'giveaway' && <GiveawayPage />}

      {activeTab === 'promos' && <PromosPage />}

      {activeTab === 'account' && <AccountPage />}

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  )
}
