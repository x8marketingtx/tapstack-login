import { useEffect, useState } from 'react'
import {
  ApiError,
  isApiConfigured,
  tapstackApi,
  type AdminDistributor,
  type AdminDistributorDetail,
  type AdminPeriodStats,
} from '../api/client'
import { AdminHeader } from './AdminHeader'
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

function DistributorDetailView({
  distributorId,
  onBack,
}: {
  distributorId: string
  onBack: () => void
}) {
  const [range, setRange] = useState<DetailRange>('month')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState<AdminDistributorDetail | null>(null)

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
        if (!cancelled) setDetail(res)
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
  }, [distributorId])

  const agent = detail?.distributor
  const stats = detail?.stats?.[range] ?? EMPTY_STATS
  const status = normalizeStatus(agent?.status || 'active')

  return (
    <div className="admin-distributor-detail">
      <button type="button" className="admin-distributor-detail-back" onClick={onBack}>
        ← Back
      </button>

      {error ? <p className="admin-api-error">{error}</p> : null}

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
            <h2 className="admin-distributor-detail-vendors-title">Vendors this month</h2>
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

export default function AdminDistributorsPage() {
  const [distributors, setDistributors] = useState<DistributorItem[]>([])
  const [loading, setLoading] = useState(isApiConfigured())
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

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
  }, [])

  const activeCount = distributors.filter((distributor) => distributor.status === 'active').length

  if (selectedId) {
    return (
      <div className="admin-distributors-page">
        <AdminHeader />
        <DistributorDetailView distributorId={selectedId} onBack={() => setSelectedId(null)} />
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
        <button type="button" className="admin-distributors-create-btn">
          + Create
        </button>
      </div>

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
