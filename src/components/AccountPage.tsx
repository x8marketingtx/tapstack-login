import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, getSessionUser, isApiConfigured, tapstackApi, type WalletTxn } from '../api/client'
import { isVerifyApiError, needsVerification, verificationFromUser } from '../lib/verify'
import {
  isLoadTransaction,
  loadTxnMetaLine,
  txnVendorId,
  txnVendorName,
} from '../lib/walletTxn'
import type { PlayerProfile } from './ProfilePage'
import type { Vendor } from '../data/vendors'
import PlayerAffiliateSection from './PlayerAffiliateSection'
import ActivityPager from './ActivityPager'
import LoadReceiptModal from './LoadReceiptModal'
import { MONEY_REFRESH_MS, pageItems, useIntervalRefresh } from '../lib/refresh'
import {
  formatPointsToCash,
  isValidRedeemPoints,
  MIN_REDEEM_POINTS,
  normalizeCustomerWalletFromApi,
  parseTapstackCash,
  pointsPerDollarLabel,
  pointsToCash,
  QUICK_REDEEM_POINTS,
  REDEEM_POINTS_STEP,
  walletAfterPointsRedeem,
} from '../lib/pointsRedeem'
import './AccountPage.css'

type TimeFilter = '7d' | '30d' | '6m'

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
  loadReceipt?: WalletTxn
}

function mapLedgerToRows(txns: WalletTxn[], vendors: Vendor[]): TxRow[] {
  return txns.map((txn) => {
    const meta = txn.meta || {}
    const isLoad = isLoadTransaction(txn)
    const icon = typeof meta.icon === 'string' ? meta.icon : isLoad ? '🎮' : txn.amount >= 0 ? '💰' : '🎮'
    const iconBg =
      typeof meta.iconBg === 'string' ? meta.iconBg : isLoad ? '#dbeafe' : txn.amount >= 0 ? '#dcfce7' : '#dbeafe'
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
    const vendorName = txnVendorName(txn, vendors)
    const title = isLoad
      ? ['Load', vendorName].filter(Boolean).join(' · ')
      : txn.title || txn.type
    const metaLine = isLoad ? loadTxnMetaLine(txn, vendors) : txn.createdAt || txn.type
    return {
      id: txn.id,
      icon,
      iconBg,
      title,
      meta: metaLine,
      amounts,
      loadReceipt: isLoad ? txn : undefined,
    }
  })
}

function txnTime(txn: WalletTxn): number {
  const ts = Date.parse(txn.createdAt || '')
  return Number.isFinite(ts) ? ts : 0
}

function sixMonthsAgo(): string {
  return new Date(Date.now() - 182 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')
}

function mergeTxns(incoming: WalletTxn[], existing: WalletTxn[]): WalletTxn[] {
  const map = new Map<number, WalletTxn>()
  for (const txn of [...incoming, ...existing]) map.set(txn.id, txn)
  return [...map.values()].sort((a, b) => txnTime(b) - txnTime(a) || b.id - a.id)
}

export default function AccountPage({
  cashBalance = '$0.00',
  pointsBalance = 0,
  profile,
  loading = false,
  transactions,
  vendors = [],
  onOpenProfile,
  onWalletUpdate,
  onVerifyRequired,
  scrollToSectionId,
  onScrollToSectionDone,
}: {
  cashBalance?: string
  pointsBalance?: number
  profile: PlayerProfile
  loading?: boolean
  transactions?: WalletTxn[]
  vendors?: Vendor[]
  onOpenProfile?: () => void
  onWalletUpdate?: (wallet: { balance?: number; formatted?: string; points: number }) => void
  onVerifyRequired?: () => void
  scrollToSectionId?: string | null
  onScrollToSectionDone?: () => void
}) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('7d')
  const [roomFilter, setRoomFilter] = useState('all')
  const [fetchedTxns, setFetchedTxns] = useState<WalletTxn[]>(() => transactions ?? [])
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [ledgerPage, setLedgerPage] = useState(1)
  const [olderSummary, setOlderSummary] = useState<{
    count: number
    inflow: number
    outflow: number
    net: number
  } | null>(null)
  const [pointsToRedeem, setPointsToRedeem] = useState('')
  const [selectedQuickPoints, setSelectedQuickPoints] = useState<number | null>(null)
  const [redeeming, setRedeeming] = useState(false)
  const [redeemMsg, setRedeemMsg] = useState('')
  const [redeemError, setRedeemError] = useState('')
  const [receiptTxn, setReceiptTxn] = useState<WalletTxn | null>(null)

  const rawTxns = fetchedTxns
  const linkedVendors = vendors.filter((vendor) => vendor.id != null && vendor.name)

  const filteredTxns = useMemo(() => {
    const now = Date.now()
    const cutoff =
      timeFilter === '7d'
        ? now - 7 * 24 * 60 * 60 * 1000
        : timeFilter === '30d'
          ? now - 30 * 24 * 60 * 60 * 1000
          : 0
    return rawTxns.filter((txn) => {
      if (cutoff > 0) {
        const ts = txnTime(txn)
        if (ts > 0 && ts < cutoff) return false
      }
      if (roomFilter !== 'all' && txnVendorId(txn) !== roomFilter) return false
      return true
    })
  }, [rawTxns, timeFilter, roomFilter])

  const ledgerRows = useMemo(
    () => mapLedgerToRows(pageItems(filteredTxns, ledgerPage), linkedVendors),
    [filteredTxns, ledgerPage, linkedVendors],
  )

  const loadLedger = useCallback(async (silent = false) => {
    if (!isApiConfigured()) return
    if (!silent) setLedgerLoading(true)
    try {
      const since = sixMonthsAgo()
      const all: WalletTxn[] = []
      let beforeId: number | undefined
      let summary: { count: number; inflow: number; outflow: number; net: number } | null = null
      for (let i = 0; i < 20; i += 1) {
        const res = await tapstackApi.customerWalletTransactions({ beforeId, since, limit: 100 })
        all.push(...(res.transactions || []))
        if (res.olderSummary) summary = res.olderSummary
        if (!res.nextBeforeId) break
        beforeId = res.nextBeforeId
      }
      setFetchedTxns(all)
      setOlderSummary(summary)
    } catch {
      if (!silent) setFetchedTxns([])
    } finally {
      if (!silent) setLedgerLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadLedger()
  }, [loadLedger])

  useEffect(() => {
    if (transactions?.length) {
      setFetchedTxns((prev) => mergeTxns(transactions, prev))
    }
  }, [transactions])

  useEffect(() => {
    setLedgerPage(1)
  }, [timeFilter, roomFilter])

  useEffect(() => {
    if (!scrollToSectionId || loading) return
    const targetId = scrollToSectionId
    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      onScrollToSectionDone?.()
    }, 80)
    return () => window.clearTimeout(timer)
  }, [scrollToSectionId, loading, onScrollToSectionDone])

  useIntervalRefresh(() => {
    if (!isApiConfigured()) return
    void tapstackApi
      .customerWallet()
      .then((res) => {
        setFetchedTxns((prev) => {
          const merged = Array.isArray(res.recentTx) ? mergeTxns(res.recentTx, prev) : prev
          if (onWalletUpdate && res.wallet) {
            const normalized = normalizeCustomerWalletFromApi(res.wallet, merged)
            if (normalized) onWalletUpdate(normalized)
          }
          return merged
        })
      })
      .catch(() => undefined)
  }, MONEY_REFRESH_MS, isApiConfigured())

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
    if (!isValidRedeemPoints(pts)) {
      setRedeemError(
        `Redeem in increments of ${REDEEM_POINTS_STEP.toLocaleString()} points (min ${MIN_REDEEM_POINTS.toLocaleString()}).`,
      )
      return
    }
    if (pts > pointsBalance) {
      setRedeemError('Not enough points.')
      return
    }
    if (needsVerification(verificationFromUser(getSessionUser()))) {
      onVerifyRequired?.()
      setRedeemError('Verify your identity to redeem points.')
      return
    }

    setRedeemError('')
    setRedeemMsg('')
    setRedeeming(true)

    try {
      if (isApiConfigured()) {
        const cashBefore = parseTapstackCash(cashBalance)
        const res = await tapstackApi.customerRedeemPoints(pts)
        onWalletUpdate?.(walletAfterPointsRedeem(pts, cashBefore, pointsBalance, res.wallet))
        setRedeemMsg(`Redeemed ${pts.toLocaleString()} pts → ${formatPointsToCash(pts)}`)
        setPointsToRedeem('')
        setSelectedQuickPoints(null)
        const walletRes = await tapstackApi.customerWallet()
        setFetchedTxns((prev) => {
          const merged = mergeTxns(walletRes.recentTx || [], prev)
          if (walletRes.wallet) {
            const normalized = normalizeCustomerWalletFromApi(walletRes.wallet, merged)
            if (normalized) onWalletUpdate?.(normalized)
          }
          return merged
        })
      } else {
        const cashNum = parseTapstackCash(cashBalance)
        onWalletUpdate?.({
          points: Math.max(0, pointsBalance - pts),
          balance: cashNum + pointsToCash(pts),
          formatted: `$${(cashNum + pointsToCash(pts)).toFixed(2)}`,
        })
        setRedeemMsg(`Demo redeemed ${pts.toLocaleString()} pts`)
        setPointsToRedeem('')
        setSelectedQuickPoints(null)
      }
    } catch (err) {
      if (isVerifyApiError(err)) {
        onVerifyRequired?.()
        setRedeemError(err instanceof ApiError ? err.message : 'Verify your identity to redeem points.')
      } else {
        setRedeemError(err instanceof ApiError ? err.message : 'Redeem failed')
      }
    } finally {
      setRedeeming(false)
    }
  }

  const cashPreview =
    pointsToRedeem && Number(pointsToRedeem) >= MIN_REDEEM_POINTS
      ? `≈ ${formatPointsToCash(Math.floor(Number(pointsToRedeem)))}`
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
          <button type="button" className="account-withdraw-btn" disabled={loading}>
            Withdraw
          </button>
        </div>
      </section>

      <section id="points-wallet" className="points-card">
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
            Rate: <strong>{pointsPerDollarLabel()}</strong>
          </span>
          <span className="points-rate-min">Min {MIN_REDEEM_POINTS.toLocaleString()} pts</span>
        </div>

        <form className="points-redeem-form" onSubmit={(e) => void handleRedeem(e)}>
          <span className="send-field-label">POINTS TO REDEEM</span>
          <div className="points-quick-row">
            {QUICK_REDEEM_POINTS.map((value) => (
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
              min={MIN_REDEEM_POINTS}
              step={REDEEM_POINTS_STEP}
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

      <PlayerAffiliateSection hideWhenEmpty showPayouts />

      <section className="tx-history-section">
        <div className="tx-history-header">
          <h2 className="tx-history-title">Transaction History</h2>
          <button type="button" className="tx-search-btn" aria-label="Search transactions">
            🔍
          </button>
        </div>

        <div className="tx-filters" role="tablist" aria-label="Time range">
          {(['7d', '30d', '6m'] as TimeFilter[]).map((filter) => (
            <button
              key={filter}
              type="button"
              role="tab"
              aria-selected={timeFilter === filter}
              className={`tx-filter-btn ${timeFilter === filter ? 'active' : ''}`}
              onClick={() => setTimeFilter(filter)}
            >
              {filter === '7d' ? '7D' : filter === '30d' ? '30D' : '6M'}
            </button>
          ))}
        </div>

        <div className="tx-room-select-wrap">
          <select
            className="tx-room-select"
            value={roomFilter}
            aria-label="Filter by gameroom"
            onChange={(event) => setRoomFilter(event.target.value)}
          >
            <option value="all">All Gamerooms</option>
            {linkedVendors.map((vendor) => (
              <option key={String(vendor.id)} value={String(vendor.id)}>
                {vendor.name}
              </option>
            ))}
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
            ledgerRows.map((tx) => {
              const rowBody = (
                <>
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
                </>
              )
              if (tx.loadReceipt) {
                return (
                  <li key={tx.id} className="tx-item tx-item--clickable">
                    <button
                      type="button"
                      className="tx-item-btn"
                      onClick={() => setReceiptTxn(tx.loadReceipt!)}
                      aria-label={`View load receipt for ${tx.title}`}
                    >
                      {rowBody}
                    </button>
                  </li>
                )
              }
              return (
                <li key={tx.id} className="tx-item">
                  {rowBody}
                </li>
              )
            })
          )}
        </ul>
        <LoadReceiptModal
          txn={receiptTxn}
          vendors={linkedVendors}
          onClose={() => setReceiptTxn(null)}
        />
        <ActivityPager page={ledgerPage} total={filteredTxns.length} onPage={setLedgerPage} />
        {olderSummary && olderSummary.count > 0 ? (
          <div className="tx-older-summary">
            <p className="tx-title">Older than 6 months</p>
            <p className="tx-meta">
              {olderSummary.count} transactions · in ${olderSummary.inflow.toFixed(2)} · out $
              {Math.abs(olderSummary.outflow).toFixed(2)} · net ${olderSummary.net.toFixed(2)}
            </p>
          </div>
        ) : null}
      </section>
    </div>
  )
}
