import { useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  isApiConfigured,
  tapstackApi,
  type VendorOrderItem,
  type WalletTxn,
} from '../api/client'
import type { Vendor } from '../data/vendors'
import { couponExtra, formatUsd, gameLoadTotal, parseOrderMoney } from '../lib/orderPromo'
import {
  formatTxnDateTime,
  txnOrderId,
  txnVendorId,
  txnVendorName,
} from '../lib/walletTxn'
import './LoadReceiptModal.css'

type LoadReceiptModalProps = {
  txn: WalletTxn | null
  vendors?: Vendor[]
  onClose: () => void
}

function typeLabel(type: string): string {
  if (type === 'auto-load') return 'Auto load'
  if (type === 'manual-load') return 'Manual load'
  if (type === 'load') return 'Load'
  return type || 'Load'
}

function orderFromTxn(txn: WalletTxn, vendorName: string): VendorOrderItem {
  const meta = txn.meta || {}
  const orderId = txnOrderId(txn) || String(txn.id)
  const game =
    metaString(meta, 'game', 'gameTitle', 'gameName', 'game_title') || 'Game'
  const status = metaString(meta, 'status', 'orderStatus') || 'completed'
  const method = metaString(meta, 'method') || 'Tapstack'
  const amount = Math.abs(txn.amount)
  const couponCredit = Number(meta.couponCredit ?? meta.coupon_credit)
  return {
    id: orderId,
    name: vendorName || 'Gameroom',
    game,
    gameKey: metaString(meta, 'gameKey', 'game_key'),
    method,
    time: '',
    amount: `$${amount.toFixed(2)}`,
    icon: typeof meta.icon === 'string' ? meta.icon : '🎮',
    iconBg: typeof meta.iconBg === 'string' ? meta.iconBg : '#dbeafe',
    type: metaString(meta, 'orderType', 'type') || txn.type || 'load',
    status,
    date: formatTxnDateTime(txn.createdAt),
    createdAt: txn.createdAt,
    positive: false,
    label: 'Load',
    mobileId: metaString(meta, 'mobileId', 'mobile_id'),
    note: metaString(meta, 'note', 'playerNote'),
    couponCode: metaString(meta, 'couponCode', 'coupon_code'),
    couponCredit: Number.isFinite(couponCredit) && couponCredit > 0 ? couponCredit : undefined,
    statusLabel: metaString(meta, 'statusLabel'),
  }
}

function metaString(meta: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = meta[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

export default function LoadReceiptModal({ txn, vendors = [], onClose }: LoadReceiptModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [order, setOrder] = useState<VendorOrderItem | null>(null)
  const [vendorName, setVendorName] = useState('')

  const orderId = txn ? txnOrderId(txn) : ''
  const fallbackVendor = txn ? txnVendorName(txn, vendors) : ''
  const receiptKey = txn ? `${txn.id}:${orderId || 'summary'}` : ''

  useEffect(() => {
    if (!txn) {
      setOrder(null)
      setError('')
      setVendorName('')
      setLoading(false)
      return
    }

    const name = txnVendorName(txn, vendors)
    setVendorName(name)

    if (!orderId || !isApiConfigured()) {
      setOrder(orderFromTxn(txn, name))
      setLoading(false)
      setError('')
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')
    ;(async () => {
      try {
        const res = await tapstackApi.customerOrderDetail(orderId)
        if (cancelled) return
        setOrder(res.order)
        setVendorName(res.vendor?.name || txnVendorName(txn, vendors) || name)
      } catch (err) {
        if (cancelled) return
        setOrder(orderFromTxn(txn, name))
        if (!(err instanceof ApiError && err.status === 404)) {
          setError(
            err instanceof ApiError ? err.message : 'Could not load full receipt — showing summary.',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
    // Load once per opened receipt; parent wallet refresh must not re-fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- receiptKey captures txn.id + orderId
  }, [receiptKey])

  const shown = useMemo(() => {
    if (!txn) return null
    return order || orderFromTxn(txn, vendorName || fallbackVendor)
  }, [txn, order, vendorName, fallbackVendor])

  if (!txn || !shown) return null

  const displayVendor = vendorName || fallbackVendor || shown.name
  const loadTotal = couponExtra(shown) > 0 ? gameLoadTotal(shown) : parseOrderMoney(shown.amount)
  const fee = metaString(txn.meta || {}, 'fee', 'processingFee', 'loadFee')

  return (
    <div className="load-receipt-overlay" role="presentation" onClick={onClose}>
      <div
        className="load-receipt-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="load-receipt-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="load-receipt-header">
          <div>
            <p className="load-receipt-eyebrow">Load receipt · Order #{shown.id}</p>
            <h2 id="load-receipt-title">{displayVendor}</h2>
            <p className="load-receipt-sub">
              {[typeLabel(shown.type), shown.statusLabel || shown.status]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <button type="button" className="load-receipt-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {loading ? <p className="load-receipt-muted">Loading receipt…</p> : null}
        {error ? <p className="load-receipt-note">{error}</p> : null}

        <section className="load-receipt-section">
          <div className="load-receipt-card">
            <div className="load-receipt-game-icon" style={{ background: shown.iconBg || '#dbeafe' }}>
              {shown.icon || '🎮'}
            </div>
            <div className="load-receipt-card-main">
              <strong>{shown.game || 'Game'}</strong>
              <span>{formatTxnDateTime(shown.createdAt) || `${shown.date} ${shown.time}`.trim()}</span>
              <span>{shown.method || 'Tapstack'}</span>
            </div>
            <strong className="load-receipt-amount">{formatUsd(loadTotal)}</strong>
          </div>
        </section>

        <dl className="load-receipt-details">
          <div>
            <dt>Order number</dt>
            <dd>#{shown.id}</dd>
          </div>
          <div>
            <dt>Vendor</dt>
            <dd>{displayVendor}</dd>
          </div>
          <div>
            <dt>Game</dt>
            <dd>{shown.game || '—'}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{shown.statusLabel || shown.status || '—'}</dd>
          </div>
          <div>
            <dt>Amount paid</dt>
            <dd>{formatUsd(parseOrderMoney(shown.amount))}</dd>
          </div>
          {couponExtra(shown) > 0 ? (
            <>
              <div>
                <dt>Promo code</dt>
                <dd>{shown.couponCode || '—'}</dd>
              </div>
              <div>
                <dt>Promo bonus</dt>
                <dd>+{formatUsd(couponExtra(shown))}</dd>
              </div>
              <div>
                <dt>Credits to game</dt>
                <dd>{formatUsd(gameLoadTotal(shown))}</dd>
              </div>
            </>
          ) : null}
          {fee ? (
            <div>
              <dt>Processing fee</dt>
              <dd>{fee.startsWith('$') ? fee : formatUsd(parseOrderMoney(fee))}</dd>
            </div>
          ) : null}
          {shown.mobileId ? (
            <div>
              <dt>Mobile ID</dt>
              <dd>{shown.mobileId}</dd>
            </div>
          ) : null}
          {shown.note ? (
            <div>
              <dt>Note</dt>
              <dd>{shown.note}</dd>
            </div>
          ) : null}
          {txnVendorId(txn) ? (
            <div>
              <dt>Vendor ID</dt>
              <dd>{txnVendorId(txn)}</dd>
            </div>
          ) : null}
        </dl>

        <button type="button" className="load-receipt-done" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  )
}
