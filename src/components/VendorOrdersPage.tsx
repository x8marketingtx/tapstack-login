import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, isApiConfigured, tapstackApi, type VendorOrderItem } from '../api/client'
import { decodeIcon } from '../data/vendors'
import { couponExtra, formatUsd, gameLoadTotal } from '../lib/orderPromo'
import VendorOrderDetailModal from './VendorOrderDetailModal'
import ActivityPager from './ActivityPager'
import { MONEY_REFRESH_MS, pageItems, useIntervalRefresh } from '../lib/refresh'
import { formatCustomDateRangeLabel, timestampInCustomRange, type CustomDateRange } from '../lib/reportRange'
import { useCustomReportRange } from '../hooks/useCustomReportRange'
import CustomDateRangeModal from './CustomDateRangeModal'
import './VendorOrdersPage.css'

type OrdersTab = 'loads' | 'redeems' | 'history'
type HistoryRange = 'today' | '7d' | '30d' | 'custom'
type HistoryFilter = 'all' | 'loads' | 'redeems'
type OrderStatusFilter = 'all' | 'completed' | 'pending' | 'failed' | 'attention'

const ORDER_STATUS_FILTERS: { id: OrderStatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'completed', label: 'Completed' },
  { id: 'pending', label: 'Pending' },
  { id: 'failed', label: 'Failed' },
  { id: 'attention', label: 'Attention Needed' },
]

type OrdersState = {
  manualLoads: VendorOrderItem[]
  autoLoads: VendorOrderItem[]
  redeems: VendorOrderItem[]
  history: VendorOrderItem[]
  pendingTotal: string
}

const EMPTY_ORDERS: OrdersState = {
  manualLoads: [],
  autoLoads: [],
  redeems: [],
  history: [],
  pendingTotal: '$0.00',
}

const HISTORY_RANGES: { id: HistoryRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: 'custom', label: 'Custom' },
]

function PromoNote({ item }: { item: Pick<VendorOrderItem, 'couponCode' | 'couponCredit'> }) {
  if (!item.couponCode) return null
  const extra = couponExtra(item)
  return (
    <p className="vendor-order-promo">
      Promo {item.couponCode}
      {extra > 0 ? ` · +${formatUsd(extra)} extra` : ''}
    </p>
  )
}

function waitingLabel(item: Pick<VendorOrderItem, 'createdAt' | 'date' | 'time'>): string {
  const raw = item.createdAt || `${item.date || ''} ${item.time || ''}`.trim()
  const ts = raw ? Date.parse(raw) : NaN
  if (!Number.isFinite(ts)) return ''
  const secs = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (secs < 60) return `Waiting ${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `Waiting ${mins} min`
  const hours = Math.floor(mins / 60)
  const rest = mins % 60
  if (hours < 24) return rest ? `Waiting ${hours}h ${rest}m` : `Waiting ${hours}h`
  const days = Math.floor(hours / 24)
  return `Waiting ${days}d`
}

function playerGameAccountId(load: Pick<VendorOrderItem, 'mobileId' | 'playerId'>): string {
  return String(load.mobileId || load.playerId || '').trim()
}

function CopyGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function CheckGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 12.5 10 16.5 18 8.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function formatSignedAmount(amount: string, positive: boolean): string {
  const cleaned = String(amount || '').trim()
  if (!cleaned) return positive ? '+$0.00' : '-$0.00'
  if (cleaned.startsWith('+') || cleaned.startsWith('-')) return cleaned
  return `${positive ? '+' : '-'}${cleaned.startsWith('$') ? cleaned : `$${cleaned}`}`
}

function orderStatusDisplay(item: Pick<VendorOrderItem, 'status' | 'type' | 'error'>): {
  label: string
  tone: 'pending' | 'completed' | 'attention' | 'rejected'
} {
  const status = String(item.status || '').toLowerCase()
  const type = String(item.type || '').toLowerCase()

  if (status === 'approved') {
    return { label: 'Completed', tone: 'completed' }
  }
  if (status === 'rejected') {
    return { label: 'Rejected', tone: 'rejected' }
  }
  if (status === 'failed' || item.error) {
    return { label: 'Attention needed', tone: 'attention' }
  }
  if (status === 'pending') {
    if (type === 'manual-load' || type === 'redeem') {
      return { label: 'Attention needed', tone: 'attention' }
    }
    return { label: 'Pending', tone: 'pending' }
  }
  if (status) {
    return { label: status.charAt(0).toUpperCase() + status.slice(1), tone: 'pending' }
  }
  return { label: 'Pending', tone: 'pending' }
}

function OrderStatusBadge({ item }: { item: Pick<VendorOrderItem, 'status' | 'type' | 'error'> }) {
  const { label, tone } = orderStatusDisplay(item)
  return <span className={`vendor-order-status vendor-order-status--${tone}`}>{label}</span>
}

function orderStatusFilterCategory(
  item: Pick<VendorOrderItem, 'status' | 'type' | 'error'>,
): Exclude<OrderStatusFilter, 'all'> {
  const { tone } = orderStatusDisplay(item)
  if (tone === 'completed') return 'completed'
  if (tone === 'rejected') return 'failed'
  if (tone === 'attention') return 'attention'
  return 'pending'
}

function matchesOrderStatusFilter(item: VendorOrderItem, filter: OrderStatusFilter): boolean {
  if (filter === 'all') return true
  return orderStatusFilterCategory(item) === filter
}

function parseOrderDate(item: VendorOrderItem): number {
  if (item.createdAt) {
    const iso = Date.parse(item.createdAt)
    if (Number.isFinite(iso)) return iso
  }
  const raw = `${item.date || ''} ${item.time || ''}`.trim()
  const ts = Date.parse(raw)
  if (Number.isFinite(ts)) return ts
  return Date.now()
}

function inHistoryRange(item: VendorOrderItem, range: HistoryRange, custom?: CustomDateRange | null): boolean {
  const ts = parseOrderDate(item)
  if (range === 'custom') {
    return custom ? timestampInCustomRange(ts, custom) : true
  }
  const now = Date.now()
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  if (range === 'today') return ts >= startOfToday.getTime()
  if (range === '7d') return ts >= now - 7 * 24 * 60 * 60 * 1000
  if (range === '30d') return ts >= now - 30 * 24 * 60 * 60 * 1000
  return true
}

function LoadsTab({
  manualLoads,
  autoLoads,
  busyId,
  onOpenOrder,
  onComplete,
}: {
  manualLoads: VendorOrderItem[]
  autoLoads: VendorOrderItem[]
  busyId: string | null
  onOpenOrder: (id: string) => void
  onComplete: (id: string) => void
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [, setWaitTick] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setWaitTick((tick) => tick + 1), 1000)
    return () => window.clearInterval(timer)
  }, [])

  async function copyMobileId(orderId: string, mobileId: string) {
    try {
      await navigator.clipboard.writeText(mobileId)
      setCopiedId(orderId)
      window.setTimeout(() => {
        setCopiedId((current) => (current === orderId ? null : current))
      }, 1600)
    } catch {
      // ignore clipboard failures
    }
  }

  return (
    <div className="vendor-orders-content">
      <div className="vendor-orders-notice">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <p>Unchecked manual loads &amp; completed redeems auto-move to History at 12:00 AM CST.</p>
      </div>

      <section className="vendor-orders-section">
        <div className="vendor-orders-section-header">
          <div className="vendor-orders-section-title">
            <span className="vendor-orders-section-icon vendor-orders-section-icon--purple" aria-hidden="true">
              💵
            </span>
            <span className="vendor-orders-section-name">Manual Loads</span>
            <span className="vendor-orders-priority-badge">PRIORITY</span>
          </div>
          <span className="vendor-orders-section-count">
            {manualLoads.length} to do
          </span>
        </div>

        {manualLoads.length === 0 ? (
          <p className="vendor-orders-empty">No pending manual loads.</p>
        ) : (
          <ul className="vendor-orders-list">
            {manualLoads.map((load) => (
              <li key={load.id} className="vendor-order-card vendor-order-card--manual">
                <label
                  className={`vendor-order-complete${busyId === load.id ? ' is-busy' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={false}
                    disabled={busyId === load.id}
                    aria-label={`Mark ${load.game || load.name} load completed`}
                    onChange={(event) => {
                      if (event.target.checked) onComplete(load.id)
                    }}
                  />
                  <span>Completed</span>
                </label>

                <button
                  type="button"
                  className="vendor-order-open vendor-order-open--manual"
                  onClick={() => onOpenOrder(load.id)}
                >
                  <div className="vendor-order-game-icon" style={{ background: load.iconBg || '#ede9fe' }}>
                    {decodeIcon(load.icon || '🎮', load.game)}
                  </div>

                  <div className="vendor-order-details">
                    <p className="vendor-order-name">{load.game || 'Game'}</p>
                    <div className="vendor-order-player-row">
                      <span className="vendor-order-player">{load.name || 'Player'}</span>
                      {playerGameAccountId(load) ? (
                        <span className="vendor-order-player-id-group">
                          <span className="vendor-order-player-id" title="Game mobile / account ID">
                            {playerGameAccountId(load)}
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            className={`vendor-order-copy-icon${
                              copiedId === load.id ? ' vendor-order-copy-icon--copied' : ''
                            }`}
                            aria-label={copiedId === load.id ? 'Game ID copied' : 'Copy game ID'}
                            onClick={(event) => {
                              event.stopPropagation()
                              void copyMobileId(load.id, playerGameAccountId(load))
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                event.stopPropagation()
                                void copyMobileId(load.id, playerGameAccountId(load))
                              }
                            }}
                          >
                            {copiedId === load.id ? <CheckGlyph /> : <CopyGlyph />}
                          </span>
                        </span>
                      ) : null}
                    </div>
                    {waitingLabel(load) ? (
                      <p className="vendor-order-wait" aria-live="polite">
                        {waitingLabel(load)}
                      </p>
                    ) : null}
                    {load.note ? <p className="vendor-order-note">{load.note}</p> : null}
                    <PromoNote item={load} />
                    {(load.payoutTags || load.playerTags || []).length > 0 ? (
                      <p className="vendor-order-tags">
                        {(load.payoutTags || load.playerTags || []).join(' · ')}
                      </p>
                    ) : null}
                  </div>

                  <div className="vendor-order-right">
                    <span className="vendor-order-amount">
                      {formatSignedAmount(
                        couponExtra(load) > 0 ? formatUsd(gameLoadTotal(load)) : load.amount,
                        true,
                      )}
                    </span>
                    <OrderStatusBadge item={load} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="vendor-orders-section">
        <div className="vendor-orders-section-header vendor-orders-section-header--subtle">
          <div className="vendor-orders-section-title">
            <span className="vendor-orders-section-icon" aria-hidden="true">
              ⚡
            </span>
            <span className="vendor-orders-section-name vendor-orders-section-name--muted">
              Automated Loads
            </span>
            <span className="vendor-orders-section-subtitle">
              {autoLoads.length === 0 ? '· no action needed' : '· tap to complete'}
            </span>
          </div>
          {autoLoads.length > 0 ? (
            <span className="vendor-orders-section-count">{autoLoads.length} to do</span>
          ) : null}
        </div>

        {autoLoads.length === 0 ? (
          <p className="vendor-orders-empty">No automated loads yet.</p>
        ) : (
          <ul className="vendor-orders-list">
            {autoLoads.map((load) => (
              <li key={load.id} className="vendor-order-card">
                <button
                  type="button"
                  className="vendor-order-check"
                  aria-label={`Complete ${load.name} auto load`}
                  disabled={busyId === load.id}
                  onClick={(event) => {
                    event.stopPropagation()
                    onOpenOrder(load.id)
                  }}
                >
                  {busyId === load.id ? '…' : null}
                </button>

                <button
                  type="button"
                  className="vendor-order-open"
                  onClick={() => onOpenOrder(load.id)}
                >
                  <div className="vendor-order-game-icon" style={{ background: load.iconBg || '#ede9fe' }}>
                    {decodeIcon(load.icon || '🎮', load.game)}
                  </div>

                  <div className="vendor-order-details">
                    <p className="vendor-order-name">{load.name || 'Player'}</p>
                    <p className="vendor-order-meta">
                      {[load.game, load.method || 'Auto', load.time].filter(Boolean).join(' · ')}
                    </p>
                    <PromoNote item={load} />
                  </div>

                  <div className="vendor-order-right">
                    <span className="vendor-order-amount">
                      {formatSignedAmount(
                        couponExtra(load) > 0 ? formatUsd(gameLoadTotal(load)) : load.amount,
                        true,
                      )}
                    </span>
                    <OrderStatusBadge item={load} />
                    <span className="vendor-order-auto-badge">Auto</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function RedeemsTab({
  redeems,
  pendingTotal,
  busyId,
  onOpenOrder,
}: {
  redeems: VendorOrderItem[]
  pendingTotal: string
  busyId: string | null
  onOpenOrder: (id: string) => void
}) {
  return (
    <div className="vendor-orders-content">
      <div className="vendor-redeems-summary">
        <div>
          <h2 className="vendor-redeems-title">Pending Redeems</h2>
          <p className="vendor-redeems-subtitle">
            {redeems.length} awaiting review
          </p>
        </div>
        <div className="vendor-redeems-total">
          <span className="vendor-redeems-total-label">Total pending</span>
          <span className="vendor-redeems-total-amount">{pendingTotal}</span>
        </div>
      </div>

      {redeems.length === 0 ? (
        <p className="vendor-orders-empty">No pending redeems.</p>
      ) : (
        <ul className="vendor-redeems-list">
          {redeems.map((redeem) => (
            <li key={redeem.id} className="vendor-redeem-card">
              <button
                type="button"
                className="vendor-order-open vendor-redeem-open"
                onClick={() => onOpenOrder(redeem.id)}
              >
                <div className="vendor-order-game-icon" style={{ background: redeem.iconBg || '#ede9fe' }}>
                  {decodeIcon(redeem.icon || '🎮', redeem.game)}
                </div>

                <div className="vendor-order-details">
                  <p className="vendor-order-name">{redeem.name || 'Player'}</p>
                  <p className="vendor-order-meta">
                    {[redeem.game, redeem.time].filter(Boolean).join(' · ')}
                  </p>
                  {(redeem.payoutTags || redeem.playerTags || []).length > 0 ? (
                    <p className="vendor-order-tags">
                      {(redeem.payoutTags || redeem.playerTags || []).map((tag) => tag.toUpperCase()).join(' · ')}
                    </p>
                  ) : null}
                </div>

                <div className="vendor-order-right">
                  <span className="vendor-redeem-amount">{redeem.amount}</span>
                  <OrderStatusBadge item={redeem} />
                </div>
              </button>

              <div className="vendor-redeem-actions">
                <button
                  type="button"
                  className="vendor-redeem-btn vendor-redeem-btn--reject"
                  disabled={busyId === redeem.id}
                  onClick={() => onOpenOrder(redeem.id)}
                >
                  Reject
                </button>
                <button
                  type="button"
                  className="vendor-redeem-btn vendor-redeem-btn--approve"
                  disabled={busyId === redeem.id}
                  onClick={() => onOpenOrder(redeem.id)}
                >
                  {busyId === redeem.id ? '…' : 'Approve'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function HistoryTab({
  history,
  onOpenOrder,
}: {
  history: VendorOrderItem[]
  onOpenOrder: (id: string) => void
}) {
  const rangeFilter = useCustomReportRange<HistoryRange>('30d')
  const { preset: range, apiCustom, pickPreset, modalProps, isCustom, customRange } = rangeFilter
  const [filter, setFilter] = useState<HistoryFilter>('all')
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return history.filter((entry) => {
      if (!inHistoryRange(entry, range, apiCustom)) return false
      if (filter === 'loads') {
        if (!entry.type.includes('load')) return false
      }
      if (filter === 'redeems') {
        if (entry.type !== 'redeem' && entry.type !== 'affiliate-payout') return false
      }
      if (!needle) return true
      const hay = [entry.name, entry.label, entry.id, entry.game, entry.date, entry.time, entry.mobileId]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(needle)
    })
  }, [history, range, apiCustom, filter, query])

  const paged = pageItems(filtered, page)

  return (
    <div className="vendor-orders-content">
      <h2 className="vendor-history-title">Order History</h2>

      <input
        type="search"
        className="vendor-history-search"
        placeholder="Search name, handle, order ID, game, date"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setPage(1)
        }}
      />

      <div className="vendor-history-select-wrap">
        <select
          className="vendor-history-select"
          value={filter}
          aria-label="Filter activity"
          onChange={(event) => setFilter(event.target.value as HistoryFilter)}
        >
          <option value="all">All Activity</option>
          <option value="loads">Loads</option>
          <option value="redeems">Redeems</option>
        </select>
        <svg className="vendor-history-select-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 6 L8 10 L12 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="vendor-history-filters">
        <span className="vendor-history-filters-label">
          {range === 'today'
            ? 'Today'
            : range === '7d'
              ? 'Last 7 days'
              : range === '30d'
                ? 'Last 30 days'
                : isCustom
                  ? formatCustomDateRangeLabel(customRange.from, customRange.to)
                  : 'Custom'}
        </span>
        <div className="vendor-history-filter-pills" role="tablist" aria-label="Time range">
          {HISTORY_RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={range === item.id}
              className={`vendor-history-filter-btn ${range === item.id ? 'vendor-history-filter-btn--active' : ''}`}
              onClick={() => pickPreset(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <CustomDateRangeModal {...modalProps} />

      {filtered.length === 0 ? (
        <p className="vendor-orders-empty">No history for this range.</p>
      ) : (
        <ul className="vendor-history-list">
          {paged.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                className="vendor-history-item vendor-history-item--clickable"
                onClick={() => onOpenOrder(entry.id)}
              >
                <div className="vendor-history-icon" style={{ background: entry.iconBg || '#ede9fe' }}>
                  {decodeIcon(entry.icon || '🎮', entry.game)}
                </div>
                <div className="vendor-order-details">
                  <p className="vendor-history-item-title">
                    {entry.label || entry.type} · {entry.name || 'Player'}
                  </p>
                  <p className="vendor-order-meta">
                    {[`#${entry.id}`, entry.game, entry.date, entry.time].filter(Boolean).join(' · ')}
                  </p>
                  <PromoNote item={entry} />
                </div>
                <div className="vendor-order-right">
                  <span
                    className={`vendor-history-amount ${
                      entry.positive ? 'vendor-history-amount--positive' : 'vendor-history-amount--negative'
                    }`}
                  >
                    {formatSignedAmount(
                      couponExtra(entry) > 0 ? formatUsd(gameLoadTotal(entry)) : entry.amount,
                      entry.positive,
                    )}
                  </span>
                  <OrderStatusBadge item={entry} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      <ActivityPager page={page} total={filtered.length} onPage={setPage} />
    </div>
  )
}

export default function VendorOrdersPage() {
  const [activeOrdersTab, setActiveOrdersTab] = useState<OrdersTab>('loads')
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('all')
  const [orders, setOrders] = useState<OrdersState>(EMPTY_ORDERS)
  const [loading, setLoading] = useState(isApiConfigured())
  const [error, setError] = useState('')
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = useCallback(async (silent = false) => {
    if (!isApiConfigured()) {
      setLoading(false)
      return
    }
    if (!silent) {
      setLoading(true)
      setError('')
    }
    try {
      const res = await tapstackApi.vendorOrders()
      setOrders({
        manualLoads: res.manualLoads || [],
        autoLoads: (res.autoLoads || []).filter((item) => {
          const status = String(item.status || '').toLowerCase()
          return status !== 'approved' && status !== 'rejected'
        }),
        redeems: res.redeems || [],
        history: res.history || [],
        pendingTotal: res.pendingTotal || '$0.00',
      })
    } catch (err) {
      if (!silent) {
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Could not load orders.',
        )
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useIntervalRefresh(() => void refresh(true), MONEY_REFRESH_MS, isApiConfigured())

  const filteredManualLoads = useMemo(
    () => orders.manualLoads.filter((item) => matchesOrderStatusFilter(item, statusFilter)),
    [orders.manualLoads, statusFilter],
  )
  const filteredAutoLoads = useMemo(
    () => orders.autoLoads.filter((item) => matchesOrderStatusFilter(item, statusFilter)),
    [orders.autoLoads, statusFilter],
  )
  const filteredRedeems = useMemo(
    () => orders.redeems.filter((item) => matchesOrderStatusFilter(item, statusFilter)),
    [orders.redeems, statusFilter],
  )
  const filteredHistory = useMemo(
    () => orders.history.filter((item) => matchesOrderStatusFilter(item, statusFilter)),
    [orders.history, statusFilter],
  )

  const tabs: { id: OrdersTab; label: string; count?: number }[] = [
    { id: 'loads', label: 'Loads', count: orders.manualLoads.length },
    { id: 'redeems', label: 'Redeems', count: orders.redeems.length },
    { id: 'history', label: 'History' },
  ]

  return (
    <div className="vendor-orders-page">
      <div className="vendor-orders-tabs" role="tablist" aria-label="Order types">
        {tabs.map((tab) => {
          const active = activeOrdersTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`vendor-orders-tab ${active ? 'vendor-orders-tab--active' : ''}`}
              onClick={() => setActiveOrdersTab(tab.id)}
            >
              {tab.label}
              {tab.count !== undefined ? (
                <span className="vendor-orders-tab-badge">{tab.count}</span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="vendor-orders-status-filters" role="group" aria-label="Filter by status">
        {ORDER_STATUS_FILTERS.map((item) => {
          const active = statusFilter === item.id
          return (
            <button
              key={item.id}
              type="button"
              className={`vendor-orders-status-filter-btn ${active ? 'vendor-orders-status-filter-btn--active' : ''}`}
              aria-pressed={active}
              onClick={() => setStatusFilter(item.id)}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {error ? <p className="vendor-orders-error">{error}</p> : null}
      {loading ? <p className="vendor-orders-empty">Loading orders…</p> : null}

      {!loading && activeOrdersTab === 'loads' ? (
        <LoadsTab
          manualLoads={filteredManualLoads}
          autoLoads={filteredAutoLoads}
          busyId={busyId}
          onOpenOrder={setDetailOrderId}
          onComplete={async (id) => {
            if (busyId) return
            setBusyId(id)
            setError('')
            try {
              await tapstackApi.vendorOrderApprove(id, { staffNote: '' })
              await refresh(true)
            } catch (err) {
              setError(err instanceof ApiError ? err.message : 'Could not complete order.')
            } finally {
              setBusyId(null)
            }
          }}
        />
      ) : null}
      {!loading && activeOrdersTab === 'redeems' ? (
        <RedeemsTab
          redeems={filteredRedeems}
          pendingTotal={orders.pendingTotal}
          busyId={null}
          onOpenOrder={setDetailOrderId}
        />
      ) : null}
      {!loading && activeOrdersTab === 'history' ? (
        <HistoryTab history={filteredHistory} onOpenOrder={setDetailOrderId} />
      ) : null}

      <VendorOrderDetailModal
        orderId={detailOrderId}
        onClose={() => setDetailOrderId(null)}
        onUpdated={() => {
          void refresh()
        }}
      />
    </div>
  )
}
