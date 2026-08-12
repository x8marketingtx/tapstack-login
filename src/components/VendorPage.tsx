import { useState } from 'react'
import type { Vendor } from '../data/vendors'
import { decodeIcon } from '../data/vendors'
import BottomNav, { type DashboardTab } from './BottomNav'
import DashboardHeader from './DashboardHeader'
import './CustomerDashboard.css'
import './VendorPage.css'

type VendorPageProps = {
  vendor: Vendor
  activeTab: DashboardTab
  cashBalance?: string
  pointsBalance?: number
  onBack: () => void
  onTabChange: (tab: DashboardTab) => void
}

export default function VendorPage({
  vendor,
  activeTab,
  cashBalance = '$0.00',
  pointsBalance = 0,
  onBack,
  onTabChange,
}: VendorPageProps) {
  const [connectGame, setConnectGame] = useState<string | null>(null)
  const [mobileId, setMobileId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [connectError, setConnectError] = useState('')
  const [connectedGames, setConnectedGames] = useState<Record<string, boolean>>({})

  function openConnect(gameName: string) {
    setConnectGame(gameName)
    setMobileId('')
    setPassword('')
    setShowPassword(false)
    setConnectError('')
  }

  function closeConnect() {
    setConnectGame(null)
    setConnectError('')
  }

  function handleConnect(event: React.FormEvent) {
    event.preventDefault()
    if (!connectGame) return

    if (!mobileId.trim() || !password.trim()) {
      setConnectError('Enter your mobile ID and password.')
      return
    }

    setConnectedGames((current) => ({ ...current, [connectGame]: true }))
    closeConnect()
  }

  return (
    <div className="dashboard vendor-page">
      <div className="dashboard-scroll vendor-page-scroll">
        <DashboardHeader />

        <div className="vendor-page-body">
          <div className="vendor-top">
            <button type="button" className="vendor-back" onClick={onBack} aria-label="Back">
              ←
            </button>
            <div className="vendor-heading">
              <div
                className="vendor-avatar"
                style={{ background: vendor.color, color: vendor.text }}
                aria-hidden="true"
              >
                {vendor.initials}
              </div>
              <div className="vendor-heading-text">
                <h1 className="vendor-title">{vendor.name}</h1>
                <p className="vendor-subtitle">Tap a game to load credits</p>
              </div>
            </div>
            <div className="vendor-points">{pointsBalance.toLocaleString()} pts</div>
          </div>

          <div className="vendor-stats">
            <div className="vendor-stat-card">
              <span className="vendor-stat-label">CASH BALANCE</span>
              <span className="vendor-stat-value">{cashBalance}</span>
            </div>
          </div>

          <section className="games-section">
            <h2 className="games-title">Available Games</h2>

            <ul className="games-list">
              {vendor.games.map((game) => {
                const connected = Boolean(connectedGames[game.name])
                return (
                  <li key={game.name} className="game-card">
                    <div className="game-card-main">
                      <button
                        type="button"
                        className="game-favorite"
                        aria-label={`Favorite ${game.name}`}
                      >
                        ☆
                      </button>

                      <div className="game-icon" style={{ background: game.iconBg }} aria-hidden="true">
                        {decodeIcon(game.icon, game.name)}
                      </div>

                      <div className="game-info">
                        <div className="game-badges">
                          <span
                            className={`game-badge game-badge--status ${game.active ? 'active' : 'inactive'}`}
                          >
                            • {game.active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                          <span className={`game-badge game-badge--mode game-badge--${game.mode}`}>
                            {game.mode === 'auto' ? 'AUTO' : 'MANUAL'}
                          </span>
                        </div>
                        <p className="game-name">{game.name}</p>
                        <button
                          type="button"
                          className={`game-connect ${connected ? 'game-connect--linked' : ''}`}
                          onClick={() => openConnect(game.name)}
                        >
                          {connected ? 'Connected' : 'Connect Account'}
                        </button>
                      </div>
                    </div>

                    <div className="game-side">
                      <div className="game-balance-wrap">
                        <span className="game-balance-label">Balance</span>
                        <span className="game-balance">$0.00</span>
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
                )
              })}
            </ul>
          </section>
        </div>

        <button type="button" className="chat-fab" aria-label="Chat">
          💬
          <span className="chat-fab-badge">1</span>
        </button>

        {connectGame ? (
          <div className="connect-overlay" role="presentation" onClick={closeConnect}>
            <div
              className="connect-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="connect-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="connect-header">
                <h2 id="connect-title">Connect Account</h2>
                <button type="button" className="connect-close" onClick={closeConnect} aria-label="Close">
                  ×
                </button>
              </div>
              <p className="connect-copy">
                Enter your mobile ID and password for <strong>{connectGame}</strong>.
              </p>

              <form className="connect-form" onSubmit={handleConnect}>
                <label className="connect-label" htmlFor="connect-mobile-id">
                  Mobile ID
                </label>
                <input
                  id="connect-mobile-id"
                  className="connect-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="username"
                  placeholder="Enter mobile ID"
                  value={mobileId}
                  onChange={(event) => {
                    setMobileId(event.target.value)
                    if (connectError) setConnectError('')
                  }}
                />

                <label className="connect-label" htmlFor="connect-password">
                  Password
                </label>
                <div className="connect-password-row">
                  <input
                    id="connect-password"
                    className="connect-input"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      if (connectError) setConnectError('')
                    }}
                  />
                  <button
                    type="button"
                    className="connect-password-toggle"
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>

                {connectError ? <p className="connect-error">{connectError}</p> : null}

                <button
                  type="submit"
                  className="connect-submit"
                  disabled={!mobileId.trim() || !password.trim()}
                >
                  Connect
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </div>

      <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  )
}
