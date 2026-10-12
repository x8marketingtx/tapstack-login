import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ApiError,
  isApiConfigured,
  tapstackApi,
  type AdminDistributor,
  type AdminDistributorDetail,
  type AdminDistributorTransaction,
  type AdminPeriodStats,
  type AdminVendor,
} from '../api/client'
import { AdminHeader } from './AdminHeader'
import ActivityPager from './ActivityPager'
import { pageItems } from '../lib/refresh'
import './AdminDistributorsPage.css'

type DistributorStatus = 'active' | 'suspended'
type DetailRange = 'today' | '7d' | '30d' | 'month' | 'all'

type DistributorItem = {
  id: string
  initials: string
  name: string
  vendors: number
  earned: string
  status: DistributorStatus
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

const STATUS_LABELS: Record<DistributorStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
}

const DETAIL_RANGES: { id: DetailRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: 'month', label: 'Month' },
  { id: 'all', label: 'All' },
]

function normalizeStatus(status: string): DistributorStatus {
  return status === 'suspended' ? 'suspended' : 'active'
}

function mapApiDistributor(item: AdminDistributor): DistributorItem {
  return {
    id: item.id,
    initials: item.initials,
    name: item.name,
    vendors: item.vendors,
    earned: item.earned,
    status: normalizeStatus(item.status),
  }
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'D'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

type CreateDistributorForm = {
  name: string
  email: string
  contactName: string
  phone: string
  password: string
  status: DistributorStatus
}

const EMPTY_CREATE_DISTRIBUTOR: CreateDistributorForm = {
  name: '',
  email: '',
  contactName: '',
  phone: '',
  password: '',
  status: 'active',
}

function CreateDistributorModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (item: DistributorItem, login?: { email: string; password: string }) => void
}) {
  const [form, setForm] = useState<CreateDistributorForm>(EMPTY_CREATE_DISTRIBUTOR)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [createdLogin, setCreatedLogin] = useState<{ email: string; password: string } | null>(null)

  useEffect(() => {
    if (!open) return
    setForm(EMPTY_CREATE_DISTRIBUTOR)
    setError('')
    setBusy(false)
    setCreatedLogin(null)
  }, [open])

  if (!open) return null

  function update<K extends keyof CreateDistributorForm>(key: K, value: CreateDistributorForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    if (!form.name.trim()) {
      setError('Distributor name is required.')
      return
    }
    if (!form.email.trim()) {
      setError('Email is required.')
      return
    }

    setBusy(true)
    setError('')
    try {
      if (!isApiConfigured()) {
        const login = {
          email: form.email.trim(),
          password: form.password.trim() || 'TapstackDemo1!',
        }
        const item: DistributorItem = {
          id: String(Date.now()),
          initials: initialsFromName(form.name),
          name: form.name.trim(),
          vendors: 0,
          earned: '$0.00',
          status: form.status,
        }
        setCreatedLogin(login)
        onCreated(item, login)
        return
      }

      const res = await tapstackApi.adminCreateDistributor({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        contactName: form.contactName.trim() || undefined,
        status: form.status,
        password: form.password.trim() || undefined,
      })
      const item = mapApiDistributor(res.distributor)
      setCreatedLogin({
        email: res.login.email,
        password: res.login.temporaryPassword,
      })
      onCreated(item)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create distributor.')
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
        aria-labelledby="admin-create-distributor-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-vendor-modal-header">
          <h2 id="admin-create-distributor-title">Create distributor</h2>
          <button type="button" className="admin-vendor-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {createdLogin ? (
          <div className="admin-vendor-modal-success">
            <p className="admin-vendor-modal-success-title">Distributor created</p>
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
            </div>
            <button type="button" className="admin-vendor-modal-submit" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form className="admin-vendor-modal-form" onSubmit={(event) => void handleSubmit(event)}>
            <p className="admin-vendor-modal-copy">
              Creates a distributor account with portal login and an affiliate join link.
            </p>
            {error ? <p className="admin-api-error">{error}</p> : null}
            <label className="admin-vendor-modal-field">
              <span>Distributor name</span>
              <input
                value={form.name}
                required
                autoComplete="organization"
                onChange={(event) => update('name', event.target.value)}
              />
            </label>
            <label className="admin-vendor-modal-field">
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                required
                autoComplete="email"
                onChange={(event) => update('email', event.target.value)}
              />
            </label>
            <label className="admin-vendor-modal-field">
              <span>Contact name (optional)</span>
              <input
                value={form.contactName}
                autoComplete="name"
                onChange={(event) => update('contactName', event.target.value)}
              />
            </label>
            <label className="admin-vendor-modal-field">
              <span>Phone (optional)</span>
              <input
                type="tel"
                value={form.phone}
                autoComplete="tel"
                onChange={(event) => update('phone', event.target.value)}
              />
            </label>
            <label className="admin-vendor-modal-field">
              <span>Initial password (optional)</span>
              <input
                type="password"
                value={form.password}
                autoComplete="new-password"
                placeholder="Leave blank to auto-generate"
                onChange={(event) => update('password', event.target.value)}
              />
            </label>
            <label className="admin-vendor-modal-field">
              <span>Status</span>
              <select value={form.status} onChange={(event) => update('status', event.target.value as DistributorStatus)}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </label>
            <button type="submit" className="admin-vendor-modal-submit" disabled={busy}>
              {busy ? 'Creating…' : 'Create distributor'}
            </button>
          </form>
        )}
      </div>
    </div>,
    host,
  )
}

function DistributorCard({
  distributor,
  onOpen,
}: {
  distributor: DistributorItem
  onOpen: () => void
}) {
  const vendorLabel = distributor.vendors === 1 ? 'vendor' : 'vendors'

  return (
    <button
      type="button"
      className="admin-distributor-card admin-distributor-card--button"
      onClick={onOpen}
    >
      <span className="admin-distributor-avatar">{distributor.initials}</span>
      <div className="admin-distributor-info">
        <h3 className="admin-distributor-name">{distributor.name}</h3>
        <p className="admin-distributor-meta">
          {distributor.vendors} {vendorLabel} · {distributor.earned} earned
        </p>
      </div>
      <div className="admin-distributor-actions">
        <span className={`admin-distributor-status admin-distributor-status--${distributor.status}`}>
          {STATUS_LABELS[distributor.status]}
        </span>
        <span className="admin-distributor-chevron" aria-hidden="true">
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
    </button>
  )
}

function DistributorsSkeleton() {
  return (
    <div className="admin-distributors-list" aria-busy="true" aria-label="Loading distributors">
      {[1, 2, 3].map((n) => (
        <article key={n} className="admin-distributor-card">
          <div className="admin-skel admin-skel--icon" />
          <div className="admin-distributor-info">
            <div className="admin-skel admin-skel--title" />
            <div className="admin-skel admin-skel--sub" />
          </div>
          <div className="admin-skel admin-skel--pill" />
        </article>
      ))}
    </div>
  )
}

function orderTypeLabel(type: string): string {
  if (type === 'auto-load') return 'Auto load'
  if (type === 'manual-load' || type === 'load') return 'Load / sale'
  if (type === 'redeem') return 'Redeem'
  return type || 'Order'
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function DistributorDetailView({
  distributorId,
  onBack,
  onNetworkChanged,
}: {
  distributorId: string
  onBack: () => void
  onNetworkChanged?: () => void
}) {
  const [range, setRange] = useState<DetailRange>('month')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [detail, setDetail] = useState<AdminDistributorDetail | null>(null)
  const [allVendors, setAllVendors] = useState<AdminVendor[]>([])
  const [vendorPick, setVendorPick] = useState('')
  const [addBusy, setAddBusy] = useState(false)
  const [removeBusyId, setRemoveBusyId] = useState('')
  const [copied, setCopied] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [transactions, setTransactions] = useState<AdminDistributorTransaction[]>([])
  const [txLoading, setTxLoading] = useState(false)
  const [txPage, setTxPage] = useState(1)

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
      .adminDistributorDetail(distributorId)
      .then((res) => {
        if (!cancelled) {
          setDetail(res)
          if (res.transactions?.length) setTransactions(res.transactions)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setDetail(null)
          setError(err instanceof ApiError ? err.message : 'Could not load agent details.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [distributorId, reloadKey])

  useEffect(() => {
    if (!isApiConfigured()) {
      setAllVendors([])
      return
    }
    let cancelled = false
    tapstackApi
      .adminVendors()
      .then((res) => {
        if (!cancelled) setAllVendors(res.vendors || [])
      })
      .catch(() => {
        if (!cancelled) setAllVendors([])
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  useEffect(() => {
    setTxPage(1)
  }, [range, distributorId])

  useEffect(() => {
    if (!isApiConfigured() || !distributorId) {
      setTransactions([])
      return
    }
    let cancelled = false
    setTxLoading(true)
    tapstackApi
      .adminDistributorTransactions(distributorId, range)
      .then((res) => {
        if (!cancelled) setTransactions(res.transactions || [])
      })
      .catch(() => {
        if (!cancelled) {
          setTransactions((current) => (current.length ? current : []))
        }
      })
      .finally(() => {
        if (!cancelled) setTxLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [distributorId, range, reloadKey])

  const agent = detail?.distributor
  const stats = detail?.stats?.[range] ?? EMPTY_STATS
  const status = normalizeStatus(agent?.status || 'active')
  const linkedIds = new Set((detail?.vendors || []).map((vendor) => vendor.id))
  const candidates = allVendors.filter((vendor) => !linkedIds.has(vendor.id))
  const affiliateLink = agent?.affiliateLink || ''
  const affiliateDisplay = agent?.affiliateLinkDisplay || affiliateLink

  function markChanged() {
    setReloadKey((key) => key + 1)
    onNetworkChanged?.()
  }

  async function addVendor() {
    if (!vendorPick || addBusy) return
    setAddBusy(true)
    setError('')
    setSuccess('')
    try {
      const res = await tapstackApi.adminVendorAssignDistributor(vendorPick, distributorId)
      setVendorPick('')
      setSuccess(`${res.distributor || agent?.name || 'Distributor'} is now this vendor's affiliate.`)
      markChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not link vendor.')
    } finally {
      setAddBusy(false)
    }
  }

  async function removeVendor(vendorId: string, name: string) {
    if (removeBusyId) return
    setRemoveBusyId(vendorId)
    setError('')
    setSuccess('')
    try {
      await tapstackApi.adminVendorAssignDistributor(vendorId, null)
      setSuccess(`${name} moved back under TapStack.`)
      markChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not unlink vendor.')
    } finally {
      setRemoveBusyId('')
    }
  }

  async function copyAffiliate() {
    const ok = await copyText(affiliateLink)
    if (!ok) {
      setError('Could not copy affiliate link.')
      return
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="admin-distributor-detail">
      <button type="button" className="admin-distributor-detail-back" onClick={onBack}>
        ← Back
      </button>

      {error ? <p className="admin-api-error">{error}</p> : null}
      {success ? <p className="admin-api-success">{success}</p> : null}

      {loading || !agent ? (
        <div aria-busy="true" aria-label="Loading agent details">
          <div className="admin-skel admin-skel--block-lg" />
          <div className="admin-skel admin-skel--block" style={{ marginTop: 12 }} />
          <div className="admin-skel admin-skel--block" style={{ marginTop: 12 }} />
        </div>
      ) : (
        <>
          <section className="admin-distributor-detail-hero">
            <span className="admin-distributor-avatar admin-distributor-avatar--lg">{agent.initials}</span>
            <div className="admin-distributor-detail-hero-main">
              <div className="admin-distributor-detail-hero-top">
                <h1 className="admin-distributor-detail-title">{agent.name}</h1>
                <span className={`admin-distributor-status admin-distributor-status--${status}`}>
                  {STATUS_LABELS[status]}
                </span>
              </div>
              <p className="admin-distributor-detail-meta">
                {agent.vendors} {agent.vendors === 1 ? 'vendor' : 'vendors'} · {agent.email || 'No email'}
              </p>
            </div>
          </section>

          <div className="admin-distributor-detail-info-grid">
            <article className="admin-distributor-detail-info-card">
              <p className="admin-distributor-detail-info-label">Wallet</p>
              <p className="admin-distributor-detail-info-value">
                {detail.wallet?.balance || '$0.00'}{' '}
                <span>{detail.wallet?.currency || 'USDC'}</span>
              </p>
            </article>
            <article className="admin-distributor-detail-info-card">
              <p className="admin-distributor-detail-info-label">Earned</p>
              <p className="admin-distributor-detail-info-value">{agent.earned}</p>
            </article>
          </div>

          <section className="admin-distributor-detail-affiliate" aria-label="Affiliate link">
            <h2 className="admin-distributor-detail-vendors-title">Affiliate join link</h2>
            <p className="admin-distributor-detail-affiliate-copy">
              New vendors who sign up through this link join this distributor. Existing vendors can
              only be moved here from this page or Vendor Management.
            </p>
            <div className="admin-distributor-detail-affiliate-row">
              <input readOnly value={affiliateDisplay} aria-label="Affiliate join link" />
              <button
                type="button"
                className="admin-distributor-detail-affiliate-copy-btn"
                disabled={!affiliateLink}
                onClick={() => void copyAffiliate()}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </section>

          <div className="admin-distributor-detail-ranges" role="tablist" aria-label="Stats range">
            {DETAIL_RANGES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={range === item.id}
                className={`admin-distributor-detail-range ${
                  range === item.id ? 'admin-distributor-detail-range--active' : ''
                }`}
                onClick={() => setRange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="admin-distributor-detail-stats">
            <article className="admin-distributor-detail-stat">
              <p className="admin-distributor-detail-stat-value admin-distributor-detail-stat-value--green">
                {stats.sales}
              </p>
              <p className="admin-distributor-detail-stat-label">Sales</p>
              <p className="admin-distributor-detail-stat-meta">{stats.salesTx} txns</p>
            </article>
            <article className="admin-distributor-detail-stat">
              <p className="admin-distributor-detail-stat-value admin-distributor-detail-stat-value--red">
                {stats.redeems}
              </p>
              <p className="admin-distributor-detail-stat-label">Redeems</p>
              <p className="admin-distributor-detail-stat-meta">{stats.redeemTx} txns</p>
            </article>
            <article className="admin-distributor-detail-stat">
              <p className="admin-distributor-detail-stat-value">{stats.net}</p>
              <p className="admin-distributor-detail-stat-label">Net</p>
              <p className="admin-distributor-detail-stat-meta">{stats.txCount} total</p>
            </article>
          </div>

          <section className="admin-distributor-detail-vendors">
            <h2 className="admin-distributor-detail-vendors-title">Vendors</h2>
            <div className="admin-distributor-detail-add">
              <select
                value={vendorPick}
                disabled={addBusy || candidates.length === 0}
                onChange={(event) => setVendorPick(event.target.value)}
                aria-label="Add vendor"
              >
                <option value="">
                  {candidates.length === 0 ? 'All vendors already linked' : 'Select a vendor'}
                </option>
                {candidates.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                    {vendor.distributor && vendor.distributor !== 'Direct'
                      ? ` · currently ${vendor.distributor}`
                      : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="admin-distributor-detail-add-btn"
                disabled={addBusy || !vendorPick}
                onClick={() => void addVendor()}
              >
                {addBusy ? 'Adding…' : 'Add'}
              </button>
            </div>
            {(detail.vendors || []).length === 0 ? (
              <p className="admin-empty-hint">No vendors linked to this agent.</p>
            ) : (
              <div className="admin-distributor-detail-vendors-list">
                {detail.vendors.map((vendor) => (
                  <article key={vendor.id} className="admin-distributor-detail-vendor">
                    <span
                      className="admin-distributor-avatar"
                      style={{ backgroundColor: vendor.avatarBg || '#f3f4f6' }}
                    >
                      {vendor.initials}
                    </span>
                    <div className="admin-distributor-detail-vendor-main">
                      <p className="admin-distributor-detail-vendor-name">{vendor.name}</p>
                      <p className="admin-distributor-detail-vendor-meta">
                        Sales {vendor.sales} · Redeem {vendor.redeems} · Net {vendor.net}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="admin-distributor-detail-remove"
                      disabled={removeBusyId === vendor.id}
                      onClick={() => void removeVendor(vendor.id, vendor.name)}
                    >
                      {removeBusyId === vendor.id ? '…' : 'Remove'}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="admin-distributor-detail-transactions">
            <h2 className="admin-distributor-detail-vendors-title">Transactions</h2>
            <p className="admin-distributor-detail-transactions-meta">
              Loads and redeems across this distributor&apos;s vendor network ·{' '}
              {DETAIL_RANGES.find((item) => item.id === range)?.label ?? range}
            </p>
            {txLoading ? (
              <p className="admin-empty-hint">Loading transactions…</p>
            ) : transactions.length === 0 ? (
              <p className="admin-empty-hint">No transactions in this period.</p>
            ) : (
              <>
                <div className="admin-distributor-detail-transactions-list">
                  {pageItems(transactions, txPage).map((tx) => (
                    <article key={tx.id} className="admin-distributor-detail-transaction">
                      <div>
                        <p className="admin-distributor-detail-transaction-title">
                          {orderTypeLabel(tx.type)} · {tx.game || 'Game'}
                        </p>
                        <p className="admin-distributor-detail-transaction-meta">
                          {tx.vendorName ? `${tx.vendorName} · ` : ''}
                          {tx.name || 'Player'} · {tx.date} · {tx.time} · {tx.status}
                        </p>
                      </div>
                      <p
                        className={`admin-distributor-detail-transaction-amount${
                          tx.type === 'redeem' ? ' admin-distributor-detail-transaction-amount--out' : ''
                        }`}
                      >
                        {tx.amount}
                      </p>
                    </article>
                  ))}
                </div>
                <ActivityPager page={txPage} total={transactions.length} onPage={setTxPage} />
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default function AdminDistributorsPage() {
  const [distributors, setDistributors] = useState<DistributorItem[]>([])
  const [loading, setLoading] = useState(isApiConfigured())
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    if (!isApiConfigured()) {
      setDistributors([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')

    tapstackApi
      .adminDistributors()
      .then((res) => {
        if (cancelled) return
        setDistributors((res.distributors || []).map(mapApiDistributor))
      })
      .catch((err) => {
        if (cancelled) return
        setDistributors([])
        setError(err instanceof ApiError ? err.message : 'Could not load distributors.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const activeCount = distributors.filter((distributor) => distributor.status === 'active').length

  if (selectedId) {
    return (
      <div className="admin-distributors-page">
        <AdminHeader />
        <DistributorDetailView
          distributorId={selectedId}
          onBack={() => setSelectedId(null)}
          onNetworkChanged={() => setReloadKey((key) => key + 1)}
        />
      </div>
    )
  }

  return (
    <div className="admin-distributors-page">
      <AdminHeader />

      <div className="admin-distributors-toolbar">
        <div>
          <h1 className="admin-distributors-title">Distributors</h1>
          <p className="admin-distributors-meta">
            {loading ? (
              <span className="admin-skel admin-skel--line-sm" style={{ display: 'inline-block', width: 140 }} />
            ) : (
              <>
                {distributors.length} accounts · {activeCount} active
              </>
            )}
          </p>
        </div>
        <button type="button" className="admin-distributors-create-btn" onClick={() => setCreateOpen(true)}>
          + Create
        </button>
      </div>

      <CreateDistributorModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(item) => {
          setDistributors((list) => {
            if (list.some((entry) => entry.id === item.id)) return list
            return [item, ...list]
          })
          if (isApiConfigured()) setReloadKey((key) => key + 1)
        }}
      />

      {error ? <p className="admin-api-error">{error}</p> : null}

      {loading ? (
        <DistributorsSkeleton />
      ) : (
        <div className="admin-distributors-list">
          {distributors.length === 0 ? (
            <p className="admin-empty-hint">No distributors yet.</p>
          ) : (
            distributors.map((distributor) => (
              <DistributorCard
                key={distributor.id}
                distributor={distributor}
                onOpen={() => setSelectedId(distributor.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
