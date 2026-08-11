import { useState } from 'react'
import type { PlayerProfile } from './ProfilePage'
import './AccountPage.css'

const QUICK_AMOUNTS = [10, 25, 50]
const QUICK_POINTS = [500, 1000, 2000]

type TimeFilter = '7d' | '30d' | 'custom'

type TxAmount = {
  text: string
  variant: 'cash-positive' | 'cash-negative' | 'points-positive' | 'points-negative'
}

const TRANSACTIONS: {
  icon: string
  iconBg: string
  title: string
  meta: string
  amounts: TxAmount[]
}[] = [
  {
    icon: '💰',
    iconBg: '#dcfce7',
    title: 'Top Up — Card ending 4242',
    meta: 'Jun 5 · Platform',
    amounts: [{ text: '+$100.00', variant: 'cash-positive' }],
  },
  {
    icon: '🎮',
    iconBg: '#dbeafe',
    title: 'Ocean Sluggerz — Golden Dragon',
    meta: 'Jun 5 · Ocean Sluggerz',
    amounts: [
      { text: '-$25.00', variant: 'cash-negative' },
      { text: '+250 pts', variant: 'points-positive' },
    ],
  },
  {
    icon: '⭐',
    iconBg: '#fef9c3',
    title: 'Spin Wheel reward',
    meta: 'Jun 4 · Platform',
    amounts: [{ text: '+150 pts', variant: 'points-positive' }],
  },
  {
    icon: '🔄',
    iconBg: '#ede9fe',
    title: 'Points redeemed for cash',
    meta: 'Jun 4 · Platform',
    amounts: [
      { text: '+$10.00', variant: 'cash-positive' },
      { text: '-1,000 pts', variant: 'points-negative' },
    ],
  },
  {
    icon: '🎮',
    iconBg: '#dbeafe',
    title: 'Victory Valley — Fire Kirin',
    meta: 'Jun 3 · Victory Valley',
    amounts: [
      { text: '-$12.50', variant: 'cash-negative' },
      { text: '+125 pts', variant: 'points-positive' },
    ],
  },
]

export default function AccountPage({
  cashBalance = '$0.00',
  pointsBalance = 0,
  profile,
  loading = false,
  onTopUp,
  onOpenProfile,
}: {
  cashBalance?: string
  pointsBalance?: number
  profile: PlayerProfile
  loading?: boolean
  onTopUp?: () => void
  onOpenProfile?: () => void
}) {
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedQuickAmount, setSelectedQuickAmount] = useState<number | null>(null)
  const [pointsToRedeem, setPointsToRedeem] = useState('')
  const [selectedQuickPoints, setSelectedQuickPoints] = useState<number | null>(null)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('7d')

  function handleQuickAmount(value: number) {
    setSelectedQuickAmount(value)
    setAmount(String(value))
  }

  function handleAmountChange(value: string) {
    setAmount(value)
    setSelectedQuickAmount(null)
  }

  function handleSend(event: React.FormEvent) {
    event.preventDefault()
    if (!recipient.trim() || !amount.trim()) return
    alert(`Demo send $${amount} to ${recipient}`)
  }

  function handleQuickPoints(value: number) {
    setSelectedQuickPoints(value)
    setPointsToRedeem(String(value))
  }

  function handlePointsChange(value: string) {
    setPointsToRedeem(value)
    setSelectedQuickPoints(null)
  }

  function handleRedeem(event: React.FormEvent) {
    event.preventDefault()
    if (!pointsToRedeem.trim()) return
    alert(`Demo redeem ${pointsToRedeem} points`)
  }

  return (
    <div className="account-page">
      <section className="profile-card">
        <div className="profile-avatar">{profile.initials}</div>
        <div className="profile-info">
          <span className="profile-label">YOUR USERNAME</span>
          <div className="profile-username-row">
            <span className="profile-username">{profile.username}</span>
            {onOpenProfile ? (
              <button type="button" className="profile-edit-btn" onClick={onOpenProfile}>
                Profile
              </button>
            ) : null}
          </div>
          <p className="profile-hint">{profile.displayName} · Share to receive wallet transfers</p>
        </div>
      </section>

      <section className="account-balance-card">
        <div className="account-balance-top">
          <div>
            <p className="account-balance-label">CASH BALANCE</p>
            {loading ? (
              <div className="dash-skeleton dash-skeleton--amount" aria-hidden="true" />
            ) : (
              <p className="account-balance-amount">{cashBalance}</p>
            )}
          </div>
          <div className="account-balance-icon" aria-hidden="true">
            💵
          </div>
        </div>
        <div className="account-balance-actions">
          {onTopUp ? (
            <button type="button" className="account-topup-btn" onClick={onTopUp} disabled={loading}>
              + Top Up with Wert
            </button>
          ) : null}
          <button type="button" className="account-withdraw-btn" disabled={loading}>
            Withdraw
          </button>
        </div>
      </section>

      <section className="send-card">
        <div className="send-header">
          <div className="send-icon" aria-hidden="true">
            💸
          </div>
          <div>
            <h2 className="send-title">Send to Wallet</h2>
            <p className="send-subtitle">Pay a vendor code or player username</p>
          </div>
        </div>

        <div className="send-info-box">
          For games that aren&apos;t on auto-load, send credits straight to the vendor&apos;s wallet
          (e.g. <strong>@LUCKYSTRIKE</strong>). They&apos;ll load your game manually.
        </div>

        <form className="send-form" onSubmit={handleSend}>
          <label className="send-field-label" htmlFor="recipient">
            RECIPIENT USERNAME
          </label>
          <div className="send-input-wrap">
            <span className="send-input-prefix">@</span>
            <input
              id="recipient"
              type="text"
              className="send-input"
              placeholder="vendor code or @player"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
            />
          </div>

          <span className="send-field-label">AMOUNT</span>
          <div className="amount-quick-row">
            {QUICK_AMOUNTS.map((value) => (
              <button
                key={value}
                type="button"
                className={`amount-quick-btn ${selectedQuickAmount === value ? 'active' : ''}`}
                onClick={() => handleQuickAmount(value)}
              >
                ${value}
              </button>
            ))}
          </div>

          <div className="amount-send-row">
            <input
              type="number"
              className="amount-input"
              placeholder="Enter amount..."
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => handleAmountChange(event.target.value)}
            />
            <button type="submit" className="send-submit-btn">
              Send →
            </button>
          </div>
        </form>
      </section>

      <section className="points-card">
        <div className="points-top">
          <div>
            <p className="points-label">POINTS BALANCE</p>
            {loading ? (
              <div className="dash-skeleton dash-skeleton--amount" aria-hidden="true" />
            ) : (
              <p className="points-balance">{pointsBalance.toLocaleString()} pts</p>
            )}
          </div>
          <button type="button" className="points-star-btn" aria-label="Points rewards">
            ⭐
          </button>
        </div>

        <div className="points-rate-bar">
          <span className="points-rate-icon" aria-hidden="true">
            ⇄
          </span>
          <span>
            Rate: <strong>100 pts = $1.00</strong>
          </span>
          <span className="points-rate-min">Min 100 pts</span>
        </div>

        <form className="points-redeem-form" onSubmit={handleRedeem}>
          <span className="send-field-label">POINTS TO REDEEM</span>
          <div className="points-quick-row">
            {QUICK_POINTS.map((value) => (
              <button
                key={value}
                type="button"
                className={`points-quick-btn ${selectedQuickPoints === value ? 'active' : ''}`}
                onClick={() => handleQuickPoints(value)}
              >
                {value.toLocaleString()}
              </button>
            ))}
          </div>
          <div className="points-redeem-row">
            <input
              type="number"
              className="points-redeem-input"
              placeholder="Enter points to redeem..."
              min="0"
              value={pointsToRedeem}
              onChange={(event) => handlePointsChange(event.target.value)}
            />
            <button type="submit" className="points-redeem-btn">
              Redeem →
            </button>
          </div>
        </form>
      </section>

      <section className="tx-history-section">
        <div className="tx-history-header">
          <h2 className="tx-history-title">Transaction History</h2>
          <button type="button" className="tx-search-btn" aria-label="Search transactions">
            🔍
          </button>
        </div>

        <div className="tx-filters" role="tablist" aria-label="Time range">
          {(['7d', '30d', 'custom'] as TimeFilter[]).map((filter) => (
            <button
              key={filter}
              type="button"
              role="tab"
              aria-selected={timeFilter === filter}
              className={`tx-filter-btn ${timeFilter === filter ? 'active' : ''}`}
              onClick={() => setTimeFilter(filter)}
            >
              {filter === '7d' ? '7D' : filter === '30d' ? '30D' : 'Custom'}
            </button>
          ))}
        </div>

        <div className="tx-room-select-wrap">
          <select className="tx-room-select" defaultValue="all" aria-label="Filter by gameroom">
            <option value="all">All Gamerooms</option>
            <option value="ocean">Ocean Sluggerz</option>
            <option value="victory">Victory Valley</option>
          </select>
        </div>

        <ul className="tx-list">
          {TRANSACTIONS.map((tx) => (
            <li key={tx.title} className="tx-item">
              <div className="tx-icon" style={{ background: tx.iconBg }}>
                {tx.icon}
              </div>
              <div className="tx-details">
                <p className="tx-title">{tx.title}</p>
                <p className="tx-meta">{tx.meta}</p>
              </div>
              <div className="tx-amounts">
                {tx.amounts.map((item) => (
                  <span key={item.text} className={`tx-amount tx-amount--${item.variant}`}>
                    {item.text}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
