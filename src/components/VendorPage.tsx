import type { Vendor } from '../data/vendors'
import BottomNav, { type DashboardTab } from './BottomNav'
import DashboardHeader from './DashboardHeader'
import './CustomerDashboard.css'
import './VendorPage.css'

type VendorPageProps = {
  vendor: Vendor
  activeTab: DashboardTab
  onBack: () => void
  onTabChange: (tab: DashboardTab) => void
}

export default function VendorPage({ vendor, activeTab, onBack, onTabChange }: VendorPageProps) {
  return (
    <div className="dashboard vendor-page">
      <div className="dashboard-scroll">
        <DashboardHeader />

        <div className="vendor-top">
          <button type="button" className="vendor-back" onClick={onBack} aria-label="Back">
            ←
          </button>
          <div className="vendor-heading">
            <h1 className="vendor-title">{vendor.name}</h1>
            <p className="vendor-subtitle">Tap a game to load credits</p>
          </div>
          <div className="vendor-points">3,400 pts</div>
        </div>

        <div className="vendor-stats">
          <div className="vendor-stat-card">
            <span className="vendor-stat-label">CASH BALANCE</span>
            <span className="vendor-stat-value">$125.00</span>
          </div>
          <div className="vendor-stat-card">
            <span className="vendor-stat-label">VENUE</span>
            <span className="vendor-stat-value">{vendor.initials}</span>
          </div>
        </div>

        <section className="games-section">
          <h2 className="games-title">Available Games</h2>

          <ul className="games-list">
            {vendor.games.map((game) => (
              <li key={game.name} className="game-card">
                <button type="button" className="game-favorite" aria-label={`Favorite ${game.name}`}>
                  ☆
                </button>

                <div className="game-icon" style={{ background: game.iconBg }}>
                  {game.icon}
                </div>

                <div className="game-info">
                  <div className="game-badges">
                    <span className={`game-badge game-badge--status ${game.active ? 'active' : 'inactive'}`}>
                      • {game.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                    <span className={`game-badge game-badge--mode game-badge--${game.mode}`}>
                      {game.mode === 'auto' ? '⚡ AUTO' : '✋ MANUAL'}
                    </span>
                  </div>
                  <p className="game-name">{game.name}</p>
                </div>

                <div className="game-side">
                  <div className="game-balance-wrap">
                    <span className="game-balance-label">Balance</span>
                    <span className="game-balance">{game.balance}</span>
                  </div>
                  <div className="game-actions">
                    <button type="button" className="game-btn game-btn--load">
                      Load
                    </button>
                    <button type="button" className="game-btn game-btn--redeem">
                      Redeem
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <button type="button" className="chat-fab" aria-label="Chat">
          💬
          <span className="chat-fab-badge">1</span>
        </button>
      </div>

      <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  )
}
