import { useEffect, useState } from 'react'
import {
  ApiError,
  isApiConfigured,
  PAYOUT_TAG_OPTIONS,
  tapstackApi,
  type VendorCustomer,
  type VendorGameAccount,
  type VendorOrderItem,
} from '../api/client'
import { decodeIcon } from '../data/vendors'
import { couponExtra, formatUsd, gameLoadTotal, parseOrderMoney } from '../lib/orderPromo'
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
  if (type === 'affiliate-payout') return 'Affiliate payout'
  if (type === 'game-transfer') return 'Game move'
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
  const [staffNote, setStaffNote] = useState('')
  const [payoutTags, setPayoutTags] = useState<string[]>([])
  const [actionBusy, setActionBusy] = useState<'complete' | 'reject' | null>(null)
  const [actionNote, setActionNote] = useState('')

  useEffect(() => {
    if (!orderId || !isApiConfigured()) return
    let cancelled = false
    setLoading(true)
    setError('')
    setRevealPasswords({})
    setStaffNote('')
    setPayoutTags([])
    ;(async () => {
      try {
        const res = await tapstackApi.vendorOrderDetail(orderId)
        if (cancelled) return
        setOrder(res.order)
        setCustomer(res.customer)
        setAccounts(res.accounts || [])
        setPayoutTags(res.order?.payoutTags || res.order?.playerTags || [])
        setStaffNote(res.order?.staffNote || '')
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
  const needsGameLoad =
    Boolean(order) &&
    (order?.type === 'auto-load' || order?.type === 'manual-load') &&
    status === 'approved' &&
    !String(order?.fulfilledAt || '').trim()
  const isActionable =
    Boolean(order) &&
    (order?.type === 'manual-load' ||
      order?.type === 'auto-load' ||
      order?.type === 'redeem' ||
      order?.type === 'affiliate-payout' ||
      order?.type === 'game-transfer') &&
    (status === 'pending' || status === 'failed' || needsGameLoad)
  const noteReady = staffNote.trim().length > 0 || (needsGameLoad && Boolean(order?.staffNote))

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
    if (!orderId || actionBusy || !noteReady) return
    setActionBusy('complete')
    setActionNote('')
    try {
      const res = await tapstackApi.vendorOrderApprove(orderId, {
        staffNote: staffNote.trim(),
        payoutTags,
      })
      setOrder((current) => (current ? { ...current, status: res.status || 'approved' } : current))
      setActionNote(needsGameLoad ? 'Credits sent to the game' : 'Order marked complete')
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
    if (!orderId || actionBusy || !noteReady) return
    setActionBusy('reject')
    setActionNote('')
    try {
      const res = await tapstackApi.vendorOrderReject(orderId, {
        staffNote: staffNote.trim(),
        payoutTags,
      })
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
                  {couponExtra(order) > 0 ? formatUsd(gameLoadTotal(order)) : order.amount}
                </strong>
              </div>
              {order.couponCode ? (
                <div className="vod-promo-box">
                  <div className="vod-promo-head">
                    <span className="vod-label">Promo code</span>
                    <strong>{order.couponCode}</strong>
                  </div>
                  <div className="vod-promo-rows">
                    <div>
                      <span>Player paid</span>
                      <span>{formatUsd(parseOrderMoney(order.amount))}</span>
                    </div>
                    <div>
                      <span>Promo extra</span>
                      <span>+{formatUsd(couponExtra(order))}</span>
                    </div>
                    <div className="vod-promo-total">
                      <span>Load to game</span>
                      <span>{formatUsd(gameLoadTotal(order))}</span>
                    </div>
                  </div>
                </div>
              ) : null}
              {order.error ? <p className="vod-error">{order.error}</p> : null}
            </section>

            <section className="vod-section">
              <div className="vod-section-head">
                <h3>
                  {order.type === 'redeem'
                    ? 'Redeem details'
                    : order.type === 'affiliate-payout'
                      ? 'Affiliate payout'
                      : 'Load details'}
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

                {(order.playerTags || []).length > 0 || (order.payoutTags || []).length > 0 ? (
                  <div className="vod-tag-row">
                    {(order.payoutTags || order.playerTags || []).map((tag) => (
                      <span key={tag} className="vod-tag-chip">
                        {PAYOUT_TAG_OPTIONS.find((item) => item.id === tag)?.label || tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                {isActionable ? (
                  <>
                    {order.type === 'auto-load' || needsGameLoad ? (
                      <p className="vod-auto-hint">
                        {needsGameLoad
                          ? `This order is approved in TapStack but was not sent to the game. Load ${order.amount}${order.couponCredit ? ` + $${Number(order.couponCredit).toFixed(2)} promo` : ''} now.`
                          : status === 'failed'
                          ? 'Automation did not finish. Complete this if you loaded the game yourself, or reject it.'
                          : 'Completing this sends the credits (and any promo extra) to the player\u2019s game.'}
                      </p>
                    ) : null}
                    {order.type === 'manual-load' || order.type === 'auto-load' ? (
                      <p className="vod-auto-hint">
                        Reject &amp; refund returns the player&apos;s paid amount (and load fee) to their TapStack wallet.
                      </p>
                    ) : null}
                    <label htmlFor="vod-staff-note">
                      Staff note <span className="vod-required">required</span>
                    </label>
                    <textarea
                      id="vod-staff-note"
                      className="vod-staff-note"
                      rows={3}
                      placeholder="Add a note for this completion or rejection"
                      value={staffNote}
                      onChange={(event) => setStaffNote(event.target.value)}
                      required
                    />
                    {order.type === 'redeem' || order.type === 'game-transfer' ? (
                      <div className="vod-payout-tags">
                        <span className="vod-label">Payout tags</span>
                        <div className="vod-tag-toggle-row">
                          {PAYOUT_TAG_OPTIONS.map((tag) => {
                            const active = payoutTags.includes(tag.id)
                            return (
                              <button
                                key={tag.id}
                                type="button"
                                className={`vod-tag-toggle${active ? ' is-on' : ''}`}
                                onClick={() =>
                                  setPayoutTags((current) =>
                                    current.includes(tag.id)
                                      ? current.filter((id) => id !== tag.id)
                                      : [...current, tag.id],
                                  )
                                }
                              >
                                {tag.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ) : null}
                    <div className="vod-actions">
                    <button
                      type="button"
                      className="vod-complete-btn"
                      disabled={Boolean(actionBusy) || !noteReady}
                      onClick={() => void completeOrder()}
                    >
                      {actionBusy === 'complete'
                        ? needsGameLoad
                          ? 'Loading to game…'
                          : 'Completing…'
                        : needsGameLoad
                          ? 'Load to game'
                        : order.type === 'redeem'
                          ? 'Complete redeem'
                          : order.type === 'affiliate-payout'
                            ? 'Approve payout'
                          : order.type === 'auto-load'
                            ? 'Complete load'
                          : 'Complete order'}
                    </button>
                    {needsGameLoad ? null : (
                    <button
                      type="button"
                      className="vod-reject-btn"
                      disabled={Boolean(actionBusy) || !noteReady}
                      onClick={() => void rejectOrder()}
                    >
                      {actionBusy === 'reject' ? 'Rejecting…' : 'Reject & refund'}
                    </button>
                    )}
                  </div>
                  </>
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
