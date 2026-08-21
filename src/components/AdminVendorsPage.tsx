import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ApiError,
  isApiConfigured,
  tapstackApi,
  type AdminDistributor,
  type AdminPeriodStats,
  type AdminVendor,
  type AdminVendorDetail,
  type AdminVendorSummary,
} from '../api/client'
import { AdminHeader } from './AdminHeader'
import './AdminVendorsPage.css'

type VendorStatus = 'active' | 'pending' | 'suspended' | 'deactivated'
type DetailRange = 'today' | '7d' | '30d' | 'month' | 'all'

type VendorItem = {
  id: string
  initials: string
  avatarBg: string
  name: string
  distributor: string
  players: number
  status: VendorStatus
  monthlyRevenue: string
  monthlyRevenueAmount: number
  inAvg: string
  redeemAvg: string
}

const EMPTY_SUMMARY: AdminVendorSummary = {
  total: 0,
  active: 0,
  pending: 0,
  suspended: 0,
  deactivated: 0,
}

const EMPTY_STATS: AdminPeriodStats = {
  sales: '$0.00',
  salesAmount: 0,
  redeems: '$0.00',
  redeemsAmount: 0,
  net: '$0.00',
  netAmount: 0,
  salesTx: 0,
  redeemTx: 0,
  txCount: 0,
  inAvg: '$0.00',
  redeemAvg: '$0.00',
}

const STATUS_LABELS: Record<VendorStatus, string> = {
  active: 'Active',
  pending: 'Pending',
  suspended: 'Suspended',
  deactivated: 'Deactivated',
}

const STATUS_ACTIONS: { id: VendorStatus; label: string; hint: string }[] = [
  { id: 'active', label: 'Activate', hint: 'Vendor can log in and operate normally' },
  { id: 'pending', label: 'Pending', hint: 'Hold for review / onboarding' },
  { id: 'suspended', label: 'Suspend', hint: 'Temporarily block vendor access' },
  { id: 'deactivated', label: 'Deactivate', hint: 'Permanently disable this account' },
]

const DETAIL_RANGES: { id: DetailRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: 'month', label: 'Month' },
  { id: 'all', label: 'All' },
]

function normalizeVendorStatus(status: string): VendorStatus {
  if (status === 'inactive' || status === 'disabled') return 'deactivated'
  if (status === 'pending' || status === 'suspended' || status === 'deactivated') return status
  return 'active'
}

function parseMoney(value: string | number | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const n = Number(String(value ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function mapApiVendor(vendor: AdminVendor): VendorItem {
  return {
    id: vendor.id,
    initials: vendor.initials,
    avatarBg: vendor.avatarBg || '#8b5cf6',
    name: vendor.name,
    distributor: vendor.distributor,
    players: vendor.players,
    status: normalizeVendorStatus(vendor.status),
    monthlyRevenue: vendor.monthlyRevenue,
    monthlyRevenueAmount: parseMoney(vendor.monthlyRevenueAmount ?? vendor.monthlyRevenue),
    inAvg: vendor.inAvg,
    redeemAvg: vendor.redeemAvg,
  }
}

function sortVendorsByPayment(vendors: VendorItem[]): VendorItem[] {
  return [...vendors].sort((a, b) => {
    const cmp = b.monthlyRevenueAmount - a.monthlyRevenueAmount
    if (cmp !== 0) return cmp
    return a.name.localeCompare(b.name)
  })
}

function orderTypeLabel(type: string): string {
  if (type === 'auto-load') return 'Auto load'
  if (type === 'manual-load' || type === 'load') return 'Load / sale'
  if (type === 'redeem') return 'Redeem'
  return type || 'Order'
}

function VendorCard({ vendor, onOpen }: { vendor: VendorItem; onOpen: () => void }) {
  const playerLabel = vendor.players === 1 ? 'player' : 'players'

  return (
    <button type="button" className="admin-vendor-card admin-vendor-card--button" onClick={onOpen}>
      <div className="admin-vendor-card-top">
        <span className="admin-vendor-avatar" style={{ backgroundColor: vendor.avatarBg }}>
          {vendor.initials}
        </span>
        <div className="admin-vendor-card-head">
          <h3 className="admin-vendor-name">{vendor.name}</h3>
          <p className="admin-vendor-meta">
            {vendor.distributor} · {vendor.players} {playerLabel}
          </p>
        </div>
        <div className="admin-vendor-card-side">
          <div className="admin-vendor-card-actions">
            <span className={`admin-vendor-status admin-vendor-status--${vendor.status}`}>
              {STATUS_LABELS[vendor.status]}
            </span>
            <span className="admin-vendor-chevron" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
          <p className="admin-vendor-revenue">{vendor.monthlyRevenue}</p>
        </div>
      </div>

      <div className="admin-vendor-averages">
        <span>
          In avg <strong className="admin-vendor-amount admin-vendor-amount--in">{vendor.inAvg}/mo</strong>
        </span>
        <span>
          Redeem avg{' '}
          <strong className="admin-vendor-amount admin-vendor-amount--redeem">{vendor.redeemAvg}/mo</strong>
        </span>
      </div>
    </button>
  )
}

function VendorsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading vendors">
      <div className="admin-vendors-summary">
        {[1, 2, 3, 4].map((n) => (
          <article key={n} className="admin-vendors-summary-card">
            <div className="admin-skel admin-skel--stat admin-skel--center" />
            <div className="admin-skel admin-skel--caption admin-skel--center" />
          </article>
        ))}
      </div>
      <div className="admin-vendors-list">
        {[1, 2, 3, 4].map((n) => (
          <article key={n} className="admin-vendor-card">
            <div className="admin-vendor-card-top">
              <div className="admin-skel admin-skel--icon" />
              <div className="admin-vendor-card-head">
                <div className="admin-skel admin-skel--title" />
                <div className="admin-skel admin-skel--sub" />
              </div>
              <div className="admin-vendor-card-side">
                <div className="admin-skel admin-skel--pill" />
                <div className="admin-skel admin-skel--value" />
              </div>
            </div>
            <div className="admin-skel admin-skel--line" />
          </article>
        ))}
      </div>
    </div>
  )
}

type CreateVendorForm = {
  name: string
  contactName: string
  email: string
  phone: string
  address: string
  status: 'active' | 'pending'
  password: string
  distributorId: string
}

const EMPTY_CREATE_FORM: CreateVendorForm = {
  name: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
  status: 'active',
  password: '',
  distributorId: '',
}

function CreateVendorModal({
  open,
  distributors,
  onClose,
  onCreated,
}: {
  open: boolean
  distributors: AdminDistributor[]
  onClose: () => void
  onCreated: (vendorId: string) => void
}) {
  const [form, setForm] = useState<CreateVendorForm>(EMPTY_CREATE_FORM)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [createdLogin, setCreatedLogin] = useState<{ email: string; password: string; code?: string } | null>(
    null,
  )

  useEffect(() => {
    if (!open) return
    setForm(EMPTY_CREATE_FORM)
    setError('')
    setBusy(false)
    setCreatedLogin(null)
  }, [open])

  if (!open) return null

  function update<K extends keyof CreateVendorForm>(key: K, value: CreateVendorForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    if (!form.name.trim()) {
      setError('Vendor name is required.')
      return
    }
    if (!form.email.trim()) {
      setError('Email is required.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const res = await tapstackApi.adminCreateVendor({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        contactName: form.contactName.trim() || undefined,
        status: form.status,
        password: form.password.trim() || undefined,
        distributorId: form.distributorId || null,
      })
      setCreatedLogin({
        email: res.login.email,
        password: res.login.temporaryPassword,
        code: res.vendor.code,
      })
      onCreated(res.vendor.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create vendor.')
    } finally {
      setBusy(false)
    }
  }

  const host =
    typeof document !== 'undefined'
      ? document.querySelector('.admin-dashboard') ??
        document.querySelector('.screen--admin') ??
        document.querySelector('.screen') ??
        document.body
      : null

  if (!host) return null

  return createPortal(
    <div className="admin-vendor-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="admin-vendor-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-create-vendor-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-vendor-modal-header">
          <h2 id="admin-create-vendor-title">Create vendor</h2>
          <button type="button" className="admin-vendor-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {createdLogin ? (
          <div className="admin-vendor-modal-success">
            <p className="admin-vendor-modal-success-title">Vendor created</p>
            <p className="admin-vendor-modal-success-copy">
              Save these login details — the password is only shown once.
            </p>
            <div className="admin-vendor-modal-success-box">
              <p>
                <span>Email</span> {createdLogin.email}
              </p>
              <p>
                <span>Password</span> {createdLogin.password}
              </p>
              {createdLogin.code ? (
                <p>
                  <span>Invite code</span> {createdLogin.code}
                </p>
              ) : null}
            </div>
            <button type="button" className="admin-vendor-modal-submit" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form className="admin-vendor-modal-form" onSubmit={(event) => void handleSubmit(event)}>
            <p className="admin-vendor-modal-copy">
              Creates a vendor account with login access and an invite code.
            </p>

            {error ? <p className="admin-api-error">{error}</p> : null}

            <label className="admin-vendor-modal-field">
              <span>Vendor name *</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => update('name', event.target.value)}
                placeholder="Lucky Strike Arcade"
                required
              />
            </label>

            <label className="admin-vendor-modal-field">
              <span>Contact name</span>
              <input
                type="text"
                value={form.contactName}
                onChange={(event) => update('contactName', event.target.value)}
                placeholder="Owner or manager"
              />
            </label>

            <label className="admin-vendor-modal-field">
              <span>Email *</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => update('email', event.target.value)}
                placeholder="vendor@example.com"
                required
              />
            </label>

            <label className="admin-vendor-modal-field">
              <span>Phone</span>
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => update('phone', event.target.value)}
                placeholder="(555) 123-4567"
              />
            </label>

            <label className="admin-vendor-modal-field">
              <span>Address</span>
              <input
                type="text"
                value={form.address}
                onChange={(event) => update('address', event.target.value)}
                placeholder="123 Arcade Ave"
              />
            </label>

            <label className="admin-vendor-modal-field">
              <span>Agent / distributor</span>
              <select
                value={form.distributorId}
                onChange={(event) => update('distributorId', event.target.value)}
              >
                <option value="">Direct</option>
                {distributors.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-vendor-modal-field">
              <span>Status</span>
              <select
                value={form.status}
                onChange={(event) => update('status', event.target.value as 'active' | 'pending')}
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
              </select>
            </label>

            <label className="admin-vendor-modal-field">
              <span>Login password</span>
              <input
                type="text"
                value={form.password}
                onChange={(event) => update('password', event.target.value)}
                placeholder="Leave blank to auto-generate"
                autoComplete="new-password"
              />
            </label>

            <button type="submit" className="admin-vendor-modal-submit" disabled={busy}>
              {busy ? 'Creating…' : 'Create vendor'}
            </button>
          </form>
        )}
      </div>
    </div>,
    host,
  )
}

export function VendorDetailView({
  vendorId,
  onBack,
  onStatusChanged,
}: {
  vendorId: string
  onBack: () => void
  onStatusChanged?: (status: VendorStatus) => void
}) {
  const [range, setRange] = useState<DetailRange>('month')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [statusBusy, setStatusBusy] = useState(false)
  const [detail, setDetail] = useState<AdminVendorDetail | null>(null)

  useEffect(() => {
    if (!isApiConfigured()) {
      setLoading(false)
      setError('API is not configured.')
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    tapstackApi
      .adminVendorDetail(vendorId)
      .then((res) => {
        if (!cancelled) setDetail(res)
      })
      .catch((err) => {
        if (!cancelled) {
          setDetail(null)
          setError(err instanceof ApiError ? err.message : 'Could not load vendor details.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [vendorId])

  const vendor = detail?.vendor
  const stats = detail?.stats?.[range] ?? EMPTY_STATS
  const status = normalizeVendorStatus(vendor?.status || 'active')

  async function updateStatus(next: VendorStatus) {
    if (next === status || statusBusy) return
    setStatusBusy(true)
    setError('')
    setSuccess('')
    try {
      const res = await tapstackApi.adminVendorUpdateStatus(vendorId, next)
      const normalized = normalizeVendorStatus(res.status || next)
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              vendor: { ...prev.vendor, status: normalized },
            }
          : prev,
      )
      onStatusChanged?.(normalized)
      setSuccess(`Account set to ${STATUS_LABELS[normalized]}.`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update account status.')
    } finally {
      setStatusBusy(false)
    }
  }

  return (
    <div className="admin-vendor-detail">
      <button type="button" className="admin-vendor-detail-back" onClick={onBack}>
        ← Back
      </button>

      {error ? <p className="admin-api-error">{error}</p> : null}
      {success ? <p className="admin-api-success">{success}</p> : null}

      {loading || !vendor ? (
        <div aria-busy="true" aria-label="Loading vendor details">
          <div className="admin-skel admin-skel--block-lg" />
          <div className="admin-skel admin-skel--block" style={{ marginTop: 12 }} />
          <div className="admin-skel admin-skel--block" style={{ marginTop: 12 }} />
        </div>
      ) : (
        <>
          <section className="admin-vendor-detail-hero">
            <span
              className="admin-vendor-avatar admin-vendor-avatar--lg"
              style={{ backgroundColor: vendor.avatarBg || '#8b5cf6' }}
            >
              {vendor.initials}
            </span>
            <div className="admin-vendor-detail-hero-main">
              <div className="admin-vendor-detail-hero-top">
                <h1 className="admin-vendor-detail-title">{vendor.name}</h1>
                <span className={`admin-vendor-status admin-vendor-status--${status}`}>
                  {STATUS_LABELS[status]}
                </span>
              </div>
              <p className="admin-vendor-detail-meta">
                Agent: {vendor.distributor || 'Direct'} · {vendor.players}{' '}
                {vendor.players === 1 ? 'player' : 'players'}
              </p>
            </div>
          </section>

          <section className="admin-vendor-detail-status-card" aria-label="Account status">
            <div className="admin-vendor-detail-status-head">
              <h2 className="admin-vendor-detail-status-title">Account status</h2>
              <p className="admin-vendor-detail-status-desc">
                Activate, hold, suspend, or deactivate this vendor.
              </p>
            </div>
            <div className="admin-vendor-detail-status-actions">
              {STATUS_ACTIONS.map((action) => {
                const active = status === action.id
                return (
                  <button
                    key={action.id}
                    type="button"
                    className={`admin-vendor-detail-status-btn admin-vendor-detail-status-btn--${action.id} ${
                      active ? 'admin-vendor-detail-status-btn--current' : ''
                    }`}
                    disabled={statusBusy || active}
                    title={action.hint}
                    onClick={() => void updateStatus(action.id)}
                  >
                    {active ? STATUS_LABELS[action.id] : action.label}
                  </button>
                )
              })}
            </div>
            {statusBusy ? <p className="admin-vendor-detail-status-busy">Updating…</p> : null}
          </section>

          <div className="admin-vendor-detail-info-grid">
            <article className="admin-vendor-detail-info-card">
              <p className="admin-vendor-detail-info-label">Wallet</p>
              <p className="admin-vendor-detail-info-value">
                {detail.wallet?.balance || '$0.00'}{' '}
                <span>{detail.wallet?.currency || 'USDC'}</span>
              </p>
            </article>
            <article className="admin-vendor-detail-info-card">
              <p className="admin-vendor-detail-info-label">Invite code</p>
              <p className="admin-vendor-detail-info-value">{vendor.code || '—'}</p>
            </article>
            <article className="admin-vendor-detail-info-card">
              <p className="admin-vendor-detail-info-label">Email</p>
              <p className="admin-vendor-detail-info-value">{vendor.email || '—'}</p>
            </article>
            <article className="admin-vendor-detail-info-card">
              <p className="admin-vendor-detail-info-label">Phone</p>
              <p className="admin-vendor-detail-info-value">{vendor.phone || '—'}</p>
            </article>
          </div>

          <div className="admin-vendor-detail-ranges" role="tablist" aria-label="Stats range">
            {DETAIL_RANGES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={range === item.id}
                className={`admin-vendor-detail-range ${range === item.id ? 'admin-vendor-detail-range--active' : ''}`}
                onClick={() => setRange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="admin-vendor-detail-stats">
            <article className="admin-vendor-detail-stat">
              <p className="admin-vendor-detail-stat-value admin-vendor-detail-stat-value--green">
                {stats.sales}
              </p>
              <p className="admin-vendor-detail-stat-label">Sales</p>
              <p className="admin-vendor-detail-stat-meta">{stats.salesTx} txns</p>
            </article>
            <article className="admin-vendor-detail-stat">
              <p className="admin-vendor-detail-stat-value admin-vendor-detail-stat-value--red">
                {stats.redeems}
              </p>
              <p className="admin-vendor-detail-stat-label">Redeems</p>
              <p className="admin-vendor-detail-stat-meta">{stats.redeemTx} txns</p>
            </article>
            <article className="admin-vendor-detail-stat">
              <p className="admin-vendor-detail-stat-value">{stats.net}</p>
              <p className="admin-vendor-detail-stat-label">Net</p>
              <p className="admin-vendor-detail-stat-meta">{stats.txCount} total</p>
            </article>
          </div>

          <div className="admin-vendor-detail-avgs">
            <span>
              In avg <strong className="admin-vendor-amount admin-vendor-amount--in">{stats.inAvg}</strong>
            </span>
            <span>
              Redeem avg{' '}
              <strong className="admin-vendor-amount admin-vendor-amount--redeem">{stats.redeemAvg}</strong>
            </span>
          </div>

          {(vendor.address || vendor.username || vendor.tier) && (
            <section className="admin-vendor-detail-extra">
              {vendor.username ? <p>Username: {vendor.username}</p> : null}
              {vendor.tier ? <p>Tier: {vendor.tier}</p> : null}
              {vendor.address ? <p>Address: {vendor.address}</p> : null}
            </section>
          )}

          <section className="admin-vendor-detail-orders">
            <h2 className="admin-vendor-detail-orders-title">Recent activity</h2>
            {(detail.recentOrders || []).length === 0 ? (
              <p className="admin-empty-hint">No recent orders.</p>
            ) : (
              <div className="admin-vendor-detail-orders-list">
                {detail.recentOrders.map((order) => (
                  <article key={order.id} className="admin-vendor-detail-order">
                    <div>
                      <p className="admin-vendor-detail-order-title">
                        {orderTypeLabel(order.type)} · {order.game || 'Game'}
                      </p>
                      <p className="admin-vendor-detail-order-meta">
                        {order.name || 'Player'} · {order.date} · {order.time} · {order.status}
                      </p>
                    </div>
                    <p
                      className={`admin-vendor-detail-order-amount ${
                        order.type === 'redeem' ? 'admin-vendor-detail-order-amount--out' : ''
                      }`}
                    >
                      {order.amount}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default function AdminVendorsPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [vendors, setVendors] = useState<VendorItem[]>([])
  const [summary, setSummary] = useState<AdminVendorSummary>(EMPTY_SUMMARY)
  const [distributors, setDistributors] = useState<AdminDistributor[]>([])
  const [loading, setLoading] = useState(isApiConfigured())
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!isApiConfigured()) {
      setDistributors([])
      return
    }
    let cancelled = false
    tapstackApi
      .adminDistributors()
      .then((res) => {
        if (!cancelled) setDistributors(res.distributors || [])
      })
      .catch(() => {
        if (!cancelled) setDistributors([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isApiConfigured()) {
      setVendors([])
      setSummary(EMPTY_SUMMARY)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')

    tapstackApi
      .adminVendors(debouncedSearch)
      .then((res) => {
        if (cancelled) return
        const mapped = sortVendorsByPayment((res.vendors || []).map(mapApiVendor))
        setVendors(mapped)
        setSummary(
          res.summary ?? {
            total: mapped.length,
            active: mapped.filter((v) => v.status === 'active').length,
            pending: mapped.filter((v) => v.status === 'pending').length,
            suspended: mapped.filter((v) => v.status === 'suspended').length,
            deactivated: mapped.filter((v) => v.status === 'deactivated').length,
          },
        )
      })
      .catch((err) => {
        if (cancelled) return
        setVendors([])
        setSummary(EMPTY_SUMMARY)
        setError(err instanceof ApiError ? err.message : 'Could not load vendors.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [debouncedSearch, reloadKey])

  const list = useMemo(() => vendors, [vendors])

  if (selectedId) {
    return (
      <div className="admin-vendors-page">
        <AdminHeader />
        <VendorDetailView
          vendorId={selectedId}
          onBack={() => setSelectedId(null)}
          onStatusChanged={() => setReloadKey((key) => key + 1)}
        />
      </div>
    )
  }

  return (
    <div className="admin-vendors-page">
      <AdminHeader />

      <div className="admin-vendors-toolbar">
        <h1 className="admin-vendors-title">Vendor Management</h1>
        <button type="button" className="admin-vendors-create-btn" onClick={() => setCreateOpen(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M4 20v-1a5 5 0 0 1 5-5h0a5 5 0 0 1 5 5v1"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path d="M19 8v6M16 11h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Create
        </button>
      </div>

      <label className="admin-vendors-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          placeholder="Search vendors..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search vendors"
        />
      </label>

      {error ? <p className="admin-api-error">{error}</p> : null}

      {loading ? (
        <VendorsSkeleton />
      ) : (
        <>
          <div className="admin-vendors-summary">
            <article className="admin-vendors-summary-card">
              <p className="admin-vendors-summary-value">{summary.total}</p>
              <p className="admin-vendors-summary-label">Total</p>
            </article>
            <article className="admin-vendors-summary-card">
              <p className="admin-vendors-summary-value admin-vendors-summary-value--green">{summary.active}</p>
              <p className="admin-vendors-summary-label">Active</p>
            </article>
            <article className="admin-vendors-summary-card">
              <p className="admin-vendors-summary-value admin-vendors-summary-value--orange">{summary.pending}</p>
              <p className="admin-vendors-summary-label">Pending</p>
            </article>
            <article className="admin-vendors-summary-card">
              <p className="admin-vendors-summary-value admin-vendors-summary-value--red">{summary.suspended}</p>
              <p className="admin-vendors-summary-label">Suspended</p>
            </article>
          </div>

          <div className="admin-vendors-list">
            {list.length === 0 ? (
              <p className="admin-empty-hint">No vendors yet.</p>
            ) : (
              list.map((vendor) => (
                <VendorCard key={vendor.id} vendor={vendor} onOpen={() => setSelectedId(vendor.id)} />
              ))
            )}
          </div>
        </>
      )}

      <CreateVendorModal
        open={createOpen}
        distributors={distributors}
        onClose={() => setCreateOpen(false)}
        onCreated={() => setReloadKey((key) => key + 1)}
      />
    </div>
  )
}
