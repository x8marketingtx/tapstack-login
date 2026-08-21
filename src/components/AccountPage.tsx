import { useEffect, useState } from 'react'
import { ApiError, isApiConfigured, tapstackApi, type WalletTxn } from '../api/client'
import type { PlayerProfile } from './ProfilePage'
import './AccountPage.css'

const QUICK_POINTS = [500, 1000, 2000]

type TimeFilter = '7d' | '30d' | 'custom'

type TxAmount = {
  text: string
  variant: 'cash-positive' | 'cash-negative' | 'points-positive' | 'points-negative'
}

type TxRow = {
  id: string | number
  icon: string
  iconBg: string
  title: string
  meta: string
  amounts: TxAmount[]
}

function mapLedgerToRows(txns: WalletTxn[]): TxRow[] {
  return txns.map((txn) => {
    const meta = txn.meta || {}
    const icon = typeof meta.icon === 'string' ? meta.icon : txn.amount >= 0 ? '💰' : '🎮'
    const iconBg =
      typeof meta.iconBg === 'string' ? meta.iconBg : txn.amount >= 0 ? '#dcfce7' : '#dbeafe'
    const amounts: TxAmount[] = []
    if (txn.amount !== 0) {
      amounts.push({
        text: `${txn.amount >= 0 ? '+' : '-'}$${Math.abs(txn.amount).toFixed(2)}`,
        variant: txn.amount >= 0 ? 'cash-positive' : 'cash-negative',
      })
    }
    if (txn.points !== 0) {
      amounts.push({
        text: `${txn.points >= 0 ? '+' : ''}${txn.points} pts`,
        variant: txn.points >= 0 ? 'points-positive' : 'points-negative',
      })
    }
    if (amounts.length === 0) {
      amounts.push({ text: '$0.00', variant: 'cash-positive' })
    }
    return {
      id: txn.id,
      icon,
      iconBg,
      title: txn.title || txn.type,
      meta: txn.createdAt || txn.type,
      amounts,
    }
  })
}

export default function AccountPage({
  cashBalance = '$0.00',
  pointsBalance = 0,
  profile,
  loading = false,
  transactions,
  onTopUp,
  onOpenProfile,
  onWalletUpdate,
}: {
  cashBalance?: string
  pointsBalance?: number
  profile: PlayerProfile
  loading?: boolean
  transactions?: WalletTxn[]
  onTopUp?: () => void
  onOpenProfile?: () => void
  onWalletUpdate?: (wallet: { balance?: number; formatted?: string; points: number }) => void
}) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('7d')
  const [ledgerRows, setLedgerRows] = useState<TxRow[]>(() =>
    transactions ? mapLedgerToRows(transactions) : [],
  )
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [pointsToRedeem, setPointsToRedeem] = useState('')
  const [selectedQuickPoints, setSelectedQuickPoints] = useState<number | null>(null)
  const [redeeming, setRedeeming] = useState(false)
  const [redeemMsg, setRedeemMsg] = useState('')
  const [redeemError, setRedeemError] = useState('')

  useEffect(() => {
    if (transactions) {
      setLedgerRows(mapLedgerToRows(transactions))
      return
    }
    if (!isApiConfigured()) return

    let cancelled = false
    setLedgerLoading(true)
    tapstackApi
      .customerWallet()
      .then((res) => {
        if (!cancelled) setLedgerRows(mapLedgerToRows(res.recentTx || []))
      })
      .catch(() => {
        if (!cancelled) setLedgerRows([])
      })
      .finally(() => {
        if (!cancelled) setLedgerLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [transactions])

  function handleQuickPoints(value: number) {
    setSelectedQuickPoints(value)
    setPointsToRedeem(String(value))
  }

  function handlePointsChange(value: string) {
    setPointsToRedeem(value)
    setSelectedQuickPoints(null)
  }

  async function handleRedeem(event: React.FormEvent) {
    event.preventDefault()
    const pts = Math.floor(Number(pointsToRedeem))
    if (!Number.isFinite(pts) || pts < 100 || pts % 100 !== 0) {
      setRedeemError('Redeem in increments of 100 points (min 100).')
      return
    }
    if (pts > pointsBalance) {
      setRedeemError('Not enough points.')
      return
    }

    setRedeemError('')
    setRedeemMsg('')
    setRedeeming(true)

    try {
      if (isApiConfigured()) {
        const res = await tapstackApi.customerRedeemPoints(pts)
        onWalletUpdate?.(res.wallet)
        setRedeemMsg(`Redeemed ${pts.toLocaleString()} pts → $${(pts / 100).toFixed(2)}`)
        setPointsToRedeem('')
        setSelectedQuickPoints(null)
        const walletRes = await tapstackApi.customerWallet()
        setLedgerRows(mapLedgerToRows(walletRes.recentTx || []))
        if (walletRes.wallet) {
          onWalletUpdate?.({
            balance: walletRes.wallet.balance,
            formatted: walletRes.wallet.formatted,
            points: walletRes.wallet.points,
          })
        }
      } else {
        const cashNum = Number(String(cashBalance).replace(/[^0-9.]/g, '') || 0)
        onWalletUpdate?.({
          points: Math.max(0, pointsBalance - pts),
          balance: cashNum + pts / 100,
          formatted: `$${(cashNum + pts / 100).toFixed(2)}`,
        })
        setRedeemMsg(`Demo redeemed ${pts.toLocaleString()} pts`)
        setPointsToRedeem('')
        setSelectedQuickPoints(null)
      }
    } catch (err) {
      setRedeemError(err instanceof ApiError ? err.message : 'Redeem failed')
    } finally {
      setRedeeming(false)
    }
  }

  const cashPreview =
    pointsToRedeem && Number(pointsToRedeem) >= 100
      ? `≈ $${(Math.floor(Number(pointsToRedeem) / 100)).toFixed(2)}`
      : null

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
          <p className="profile-hint">{profile.displayName}</p>
        </div>
      </section>

      <section className="account-balance-card">
        <div className="account-balance-top">
          <div>
            <p className="account-balance-label">Tapstack Balance</p>
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
              + Top Up
            </button>
          ) : null}
          <button type="button" className="account-withdraw-btn" disabled={loading}>
            Withdraw
          </button>
        </div>
      </section>

      <section className="points-card">
        <div className="points-top">
          <div>
            <p className="points-label">POINTS WALLET</p>
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

        <form className="points-redeem-form" onSubmit={(e) => void handleRedeem(e)}>
          <span className="send-field-label">POINTS TO REDEEM</span>
          <div className="points-quick-row">
            {QUICK_POINTS.map((value) => (
              <button
                key={value}
                type="button"
                className={`points-quick-btn ${selectedQuickPoints === value ? 'active' : ''}`}
                onClick={() => handleQuickPoints(value)}
                disabled={loading || redeeming || value > pointsBalance}
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
              min={100}
              step={100}
              value={pointsToRedeem}
              onChange={(event) => handlePointsChange(event.target.value)}
              disabled={loading || redeeming}
            />
            <button type="submit" className="points-redeem-btn" disabled={loading || redeeming}>
              {redeeming ? '…' : cashPreview ? `Redeem ${cashPreview}` : 'Redeem →'}
            </button>
          </div>
          {redeemError ? <p className="points-redeem-error">{redeemError}</p> : null}
          {redeemMsg ? <p className="points-redeem-ok">{redeemMsg}</p> : null}
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
          {ledgerLoading ? (
            <li className="tx-item">
              <div className="tx-details">
                <p className="tx-title">Loading ledger…</p>
              </div>
            </li>
          ) : ledgerRows.length === 0 ? (
            <li className="tx-item">
              <div className="tx-details">
                <p className="tx-title">No transactions yet</p>
                <p className="tx-meta">Top-ups, loads, and points activity appear here</p>
              </div>
            </li>
          ) : (
            ledgerRows.map((tx) => (
              <li key={tx.id} className="tx-item">
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
            ))
          )}
        </ul>
      </section>
    </div>
  )
}
