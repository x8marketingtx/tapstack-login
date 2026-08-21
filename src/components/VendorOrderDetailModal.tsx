import { useEffect, useState } from 'react'
import {
  ApiError,
  isApiConfigured,
  tapstackApi,
  type VendorCustomer,
  type VendorGameAccount,
  type VendorOrderItem,
} from '../api/client'
import { decodeIcon } from '../data/vendors'
import './VendorOrderDetailModal.css'

type VendorOrderDetailModalProps = {
  orderId: string | null
  onClose: () => void
  onUpdated?: () => void
}

function formatWhen(iso?: string | null, fallback = '—'): string {
  if (!iso) return fallback
  const ts = Date.parse(iso)
  if (!Number.isFinite(ts)) return fallback
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function typeLabel(type: string): string {
  if (type === 'auto-load') return 'Auto load'
  if (type === 'manual-load') return 'Manual load'
  if (type === 'redeem') return 'Redeem'
  return type || 'Order'
}

export default function VendorOrderDetailModal({
  orderId,
  onClose,
  onUpdated,
}: VendorOrderDetailModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [order, setOrder] = useState<VendorOrderItem | null>(null)
  const [customer, setCustomer] = useState<VendorCustomer | null>(null)
  const [accounts, setAccounts] = useState<VendorGameAccount[]>([])
  const [revealPasswords, setRevealPasswords] = useState<Record<string, boolean>>({})
  const [copyNote, setCopyNote] = useState('')
  const [actionBusy, setActionBusy] = useState<'complete' | 'reject' | null>(null)
  const [actionNote, setActionNote] = useState('')

  useEffect(() => {
    if (!orderId || !isApiConfigured()) return
    let cancelled = false
    setLoading(true)
    setError('')
    setRevealPasswords({})
    ;(async () => {
      try {
        const res = await tapstackApi.vendorOrderDetail(orderId)
        if (cancelled) return
        setOrder(res.order)
        setCustomer(res.customer)
        setAccounts(res.accounts || [])
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Could not load order details.',
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [orderId])

  if (!orderId) return null

  const orderGameKey = String(order?.gameKey || '').toLowerCase()
  const orderGameTitle = order?.game || 'This game'
  const orderAccount =
    accounts.find((account) => {
      const key = String(account.gameKey || '').toLowerCase()
      if (orderGameKey && key === orderGameKey) return true
      if (!orderGameKey && orderGameTitle) {
        return String(account.title || '').toLowerCase() === orderGameTitle.toLowerCase()
      }
      return false
    }) || null
  const status = String(order?.status || '').toLowerCase()
  const isManualActionable =
    Boolean(order) &&
    (order?.type === 'manual-load' || order?.type === 'redeem') &&
    (status === 'pending' || status === 'failed')

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopyNote(`${label} copied`)
      window.setTimeout(() => setCopyNote(''), 1400)
    } catch {
      setCopyNote('Could not copy')
      window.setTimeout(() => setCopyNote(''), 1400)
    }
  }

  async function completeOrder() {
    if (!orderId || actionBusy) return
    setActionBusy('complete')
    setActionNote('')
    try {
      const res = await tapstackApi.vendorOrderApprove(orderId)
      setOrder((current) => (current ? { ...current, status: res.status || 'approved' } : current))
      setActionNote('Order marked complete')
      onUpdated?.()
      window.setTimeout(() => onClose(), 700)
    } catch (err) {
      setActionNote(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not complete order.',
      )
    } finally {
      setActionBusy(null)
    }
  }

  async function rejectOrder() {
    if (!orderId || actionBusy) return
    setActionBusy('reject')
    setActionNote('')
    try {
      const res = await tapstackApi.vendorOrderReject(orderId)
      setOrder((current) => (current ? { ...current, status: res.status || 'rejected' } : current))
      setActionNote('Order rejected')
      onUpdated?.()
      window.setTimeout(() => onClose(), 700)
    } catch (err) {
      setActionNote(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not reject order.',
      )
    } finally {
      setActionBusy(null)
    }
  }

  return (
    <div className="vod-overlay" role="presentation" onClick={onClose}>
      <div
        className="vod-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vod-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="vod-header">
          <div>
            <p className="vod-eyebrow">Order #{orderId}</p>
            <h2 id="vod-title">{customer?.name || order?.name || 'Customer'}</h2>
            <p className="vod-sub">
              {[customer?.username, order ? typeLabel(order.type) : '', order?.status]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <button type="button" className="vod-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {loading ? <p className="vod-empty">Loading order details…</p> : null}
        {error ? <p className="vod-error">{error}</p> : null}

        {!loading && !error && order ? (
          <>
            <section className="vod-section">
              <h3>This order</h3>
              <div className="vod-order-card">
                <div className="vod-order-icon" style={{ background: order.iconBg || '#ede9fe' }}>
                  {decodeIcon(order.icon || '🎮', order.game)}
                </div>
                <div className="vod-order-main">
                  <strong>{order.game || 'Game'}</strong>
                  <span>
                    {typeLabel(order.type)} · {order.method || '—'} · {order.status}
                  </span>
                  <span>{formatWhen(order.createdAt, `${order.date} ${order.time}`)}</span>
                </div>
                <strong className={`vod-amount ${order.positive ? 'is-in' : 'is-out'}`}>
                  {order.amount}
                </strong>
              </div>
              {order.error ? <p className="vod-error">{order.error}</p> : null}
            </section>

            <section className="vod-section">
              <div className="vod-section-head">
                <h3>
                  {order.type === 'redeem' ? 'Redeem details' : 'Load details'}
                </h3>
                {orderAccount?.hasPassword || orderAccount?.password ? (
                  <button
                    type="button"
                    className="vod-ghost-btn"
                    onClick={() =>
                      setRevealPasswords((current) => ({
                        ...current,
                        [orderAccount.gameKey]: !current[orderAccount.gameKey],
                      }))
                    }
                  >
                    {revealPasswords[orderAccount.gameKey] ? 'Hide password' : 'Show password'}
                  </button>
                ) : null}
              </div>

              <div className="vod-account-card vod-load-details">
                <div className="vod-cred-row">
                  <div>
                    <span className="vod-label">Mobile ID / username</span>
                    <strong>
                      {order.mobileId || orderAccount?.mobileId || 'Not provided'}
                    </strong>
                  </div>
                  {order.mobileId || orderAccount?.mobileId ? (
                    <button
                      type="button"
                      className="vod-ghost-btn"
                      onClick={() =>
                        copyText('Mobile ID', order.mobileId || orderAccount?.mobileId || '')
                      }
                    >
                      Copy
                    </button>
                  ) : null}
                </div>

                {orderAccount && (orderAccount.hasPassword || orderAccount.password) ? (
                  <div className="vod-cred-row">
                    <div>
                      <span className="vod-label">Saved password</span>
                      <strong>
                        {revealPasswords[orderAccount.gameKey]
                          ? orderAccount.password || '—'
                          : '••••••••'}
                      </strong>
                    </div>
                    <button
                      type="button"
                      className="vod-ghost-btn"
                      disabled={!orderAccount.password}
                      onClick={() => copyText('Password', orderAccount.password)}
                    >
                      Copy
                    </button>
                  </div>
                ) : null}

                {orderAccount?.pinId &&
                orderAccount.pinId !== (order.mobileId || orderAccount.mobileId) ? (
                  <div className="vod-cred-row">
                    <div>
                      <span className="vod-label">PIN / account ID</span>
                      <strong>{orderAccount.pinId}</strong>
                    </div>
                    <button
                      type="button"
                      className="vod-ghost-btn"
                      onClick={() => copyText('PIN', orderAccount.pinId)}
                    >
                      Copy
                    </button>
                  </div>
                ) : null}

                {order.note ? (
                  <div className="vod-note-box">
                    <span className="vod-label">Player note</span>
                    <p>{order.note}</p>
                  </div>
                ) : null}

                {isManualActionable ? (
                  <div className="vod-actions">
                    <button
                      type="button"
                      className="vod-complete-btn"
                      disabled={Boolean(actionBusy)}
                      onClick={() => void completeOrder()}
                    >
                      {actionBusy === 'complete'
                        ? 'Completing…'
                        : order.type === 'redeem'
                          ? 'Complete redeem'
                          : 'Complete order'}
                    </button>
                    <button
                      type="button"
                      className="vod-reject-btn"
                      disabled={Boolean(actionBusy)}
                      onClick={() => void rejectOrder()}
                    >
                      {actionBusy === 'reject' ? 'Rejecting…' : 'Reject'}
                    </button>
                  </div>
                ) : null}
                {actionNote ? (
                  <p
                    className={`vod-action-note ${
                      /could not|failed|error/i.test(actionNote) ? 'is-error' : 'is-ok'
                    }`}
                  >
                    {actionNote}
                  </p>
                ) : null}
              </div>

              {copyNote ? <p className="vod-copy-note">{copyNote}</p> : null}
            </section>
          </>
        ) : null}
      </div>
    </div>
  )
}
