import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, isApiConfigured, tapstackApi, type VendorOrderItem } from '../api/client'
import { decodeIcon } from '../data/vendors'
import VendorOrderDetailModal from './VendorOrderDetailModal'
import './VendorOrdersPage.css'

type OrdersTab = 'loads' | 'redeems' | 'history'
type HistoryRange = 'today' | '7d' | '30d' | 'custom'
type HistoryFilter = 'all' | 'loads' | 'redeems'

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

function inHistoryRange(item: VendorOrderItem, range: HistoryRange): boolean {
  if (range === 'custom') return true
  const ts = parseOrderDate(item)
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
  onApprove,
  onOpenOrder,
}: {
  manualLoads: VendorOrderItem[]
  autoLoads: VendorOrderItem[]
  busyId: string | null
  onApprove: (id: string) => void
  onOpenOrder: (id: string) => void
}) {
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
              <li key={load.id} className="vendor-order-card">
                <button
                  type="button"
                  className="vendor-order-check"
                  aria-label={`Approve ${load.name} load`}
                  disabled={busyId === load.id}
                  onClick={(event) => {
                    event.stopPropagation()
                    onApprove(load.id)
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
                      {[load.game, load.mobileId, load.method, load.time]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {load.note ? <p className="vendor-order-note">{load.note}</p> : null}
                  </div>

                  <div className="vendor-order-right">
                    <span className="vendor-order-amount">
                      {formatSignedAmount(load.amount, true)}
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
            <span className="vendor-orders-section-subtitle">· no action needed</span>
          </div>
        </div>

        {autoLoads.length === 0 ? (
          <p className="vendor-orders-empty">No automated loads yet.</p>
        ) : (
          <ul className="vendor-orders-list">
            {autoLoads.map((load) => (
              <li key={load.id}>
                <button
                  type="button"
                  className="vendor-order-card vendor-order-card--auto vendor-order-card--clickable"
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
                  </div>

                  <div className="vendor-order-right">
                    <span className="vendor-order-amount">
                      {formatSignedAmount(load.amount, true)}
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
  onApprove,
  onReject,
  onOpenOrder,
}: {
  redeems: VendorOrderItem[]
  pendingTotal: string
  busyId: string | null
  onApprove: (id: string) => void
  onReject: (id: string) => void
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
                  onClick={() => onReject(redeem.id)}
                >
                  Reject
                </button>
                <button
                  type="button"
                  className="vendor-redeem-btn vendor-redeem-btn--approve"
                  disabled={busyId === redeem.id}
                  onClick={() => onApprove(redeem.id)}
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
  const [range, setRange] = useState<HistoryRange>('30d')
  const [filter, setFilter] = useState<HistoryFilter>('all')

  const filtered = useMemo(() => {
    return history.filter((entry) => {
      if (!inHistoryRange(entry, range)) return false
      if (filter === 'loads') return entry.type.includes('load')
      if (filter === 'redeems') return entry.type === 'redeem'
      return true
    })
  }, [history, range, filter])

  return (
    <div className="vendor-orders-content">
      <h2 className="vendor-history-title">Order History</h2>

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
          {range === 'today' ? 'Today' : range === '7d' ? 'Last 7 days' : range === '30d' ? 'Last 30 days' : 'Custom'}
        </span>
        <div className="vendor-history-filter-pills" role="tablist" aria-label="Time range">
          {HISTORY_RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={range === item.id}
              className={`vendor-history-filter-btn ${range === item.id ? 'vendor-history-filter-btn--active' : ''}`}
              onClick={() => setRange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="vendor-orders-empty">No history for this range.</p>
      ) : (
        <ul className="vendor-history-list">
          {filtered.map((entry) => (
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
                    {[entry.date, entry.time].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="vendor-order-right">
                  <span
                    className={`vendor-history-amount ${
                      entry.positive ? 'vendor-history-amount--positive' : 'vendor-history-amount--negative'
                    }`}
                  >
                    {formatSignedAmount(entry.amount, entry.positive)}
                  </span>
                  <OrderStatusBadge item={entry} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function VendorOrdersPage() {
  const [activeOrdersTab, setActiveOrdersTab] = useState<OrdersTab>('loads')
  const [orders, setOrders] = useState<OrdersState>(EMPTY_ORDERS)
  const [loading, setLoading] = useState(isApiConfigured())
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!isApiConfigured()) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
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
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not load orders.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function handleApprove(id: string) {
    setBusyId(id)
    setError('')
    try {
      await tapstackApi.vendorOrderApprove(id)
      await refresh()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not approve order.',
      )
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject(id: string) {
    setBusyId(id)
    setError('')
    try {
      await tapstackApi.vendorOrderReject(id)
      await refresh()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not reject order.',
      )
    } finally {
      setBusyId(null)
    }
  }

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

      {error ? <p className="vendor-orders-error">{error}</p> : null}
      {loading ? <p className="vendor-orders-empty">Loading orders…</p> : null}

      {!loading && activeOrdersTab === 'loads' ? (
        <LoadsTab
          manualLoads={orders.manualLoads}
          autoLoads={orders.autoLoads}
          busyId={busyId}
          onApprove={handleApprove}
          onOpenOrder={setDetailOrderId}
        />
      ) : null}
      {!loading && activeOrdersTab === 'redeems' ? (
        <RedeemsTab
          redeems={orders.redeems}
          pendingTotal={orders.pendingTotal}
          busyId={busyId}
          onApprove={handleApprove}
          onReject={handleReject}
          onOpenOrder={setDetailOrderId}
        />
      ) : null}
      {!loading && activeOrdersTab === 'history' ? (
        <HistoryTab history={orders.history} onOpenOrder={setDetailOrderId} />
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
