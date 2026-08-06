import type { Vendor } from '../data/vendors'
import { TapStackLogo, TapStackWordmark } from './TapStackLogo'
import './CustomerDashboard.css'
import './VendorPage.css'

type VendorPageProps = {
  vendor: Vendor
  onBack: () => void
}

export default function VendorPage({ vendor, onBack }: VendorPageProps) {
  return (
    <div className="dashboard vendor-page">
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
