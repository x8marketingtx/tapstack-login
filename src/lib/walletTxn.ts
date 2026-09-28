import type { WalletTxn } from '../api/client'
import type { Vendor } from '../data/vendors'

function metaString(meta: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = meta[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return ''
}

export function txnVendorId(txn: WalletTxn): string {
  return metaString(txn.meta || {}, 'vendorId', 'vendor_id')
}

export function txnOrderId(txn: WalletTxn): string {
  return metaString(txn.meta || {}, 'orderId', 'order_id', 'loadId', 'load_id')
}

export function txnVendorName(txn: WalletTxn, vendors: Vendor[] = []): string {
  const fromMeta = metaString(txn.meta || {}, 'vendorName', 'vendor_name', 'gameroom', 'room')
  if (fromMeta) return fromMeta
  const vendorId = txnVendorId(txn)
  if (!vendorId) return ''
  const match = vendors.find((v) => v.id != null && String(v.id) === vendorId)
  return match?.name || ''
}

export function isLoadTransaction(txn: WalletTxn): boolean {
  const type = (txn.type || '').toLowerCase()
  const title = (txn.title || '').toLowerCase()
  const metaType = metaString(txn.meta || {}, 'orderType', 'type').toLowerCase()
  if (type === 'load' || type === 'manual-load' || type === 'auto-load') return true
  if (metaType === 'load' || metaType === 'manual-load' || metaType === 'auto-load') return true
  if (metaType.includes('load') && !metaType.includes('unload')) return true
  if (title === 'load' || title.startsWith('load ') || title.includes(' game load')) return true
  return false
}

export function formatTxnDateTime(value: string | undefined): string {
  if (!value) return ''
  const normalized = value.includes('T') ? value : value.replace(' ', 'T')
  const ts = Date.parse(normalized)
  if (!Number.isFinite(ts)) return value
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function loadTxnMetaLine(txn: WalletTxn, vendors: Vendor[]): string {
  const parts: string[] = []
  const orderId = txnOrderId(txn)
  const vendorName = txnVendorName(txn, vendors)
  if (orderId) parts.push(`Order #${orderId}`)
  if (vendorName) parts.push(vendorName)
  const when = formatTxnDateTime(txn.createdAt)
  if (when) parts.push(when)
  return parts.join(' · ')
}
