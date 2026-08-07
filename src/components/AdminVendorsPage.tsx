import { useMemo, useState } from 'react'
import { TapStackLogo } from './TapStackLogo'
import './AdminVendorsPage.css'

type VendorStatus = 'active' | 'pending' | 'suspended'

type VendorItem = {
  id: string
  initials: string
  avatarBg: string
  name: string
  distributor: string
  players: number
  status: VendorStatus
  monthlyRevenue: string
  inAvg: string
  redeemAvg: string
}

const VENDORS: VendorItem[] = [
  {
    id: 'lucky-strike',
    initials: 'LS',
    avatarBg: '#8b5cf6',
    name: 'Lucky Strike Arcade',
    distributor: 'Pacific Gaming',
    players: 247,
    status: 'active',
    monthlyRevenue: '$3,860/mo',
    inAvg: '$12,400',
    redeemAvg: '$8,540',
  },
  {
    id: 'pinball-palace',
    initials: 'PP',
    avatarBg: '#3b82f6',
    name: 'Pinball Palace',
    distributor: 'Pacific Gaming',
    players: 892,
    status: 'active',
    monthlyRevenue: '$2,140/mo',
    inAvg: '$9,820',
    redeemAvg: '$7,680',
  },
  {
    id: 'neon-galaxy',
    initials: 'NG',
    avatarBg: '#eab308',
    name: 'Neon Galaxy Arcade',
    distributor: 'Direct',
    players: 156,
    status: 'active',
    monthlyRevenue: '$1,420/mo',
    inAvg: '$5,600',
    redeemAvg: '$4,180',
  },
  {
    id: 'golden-dragon',
    initials: 'GD',
    avatarBg: '#14b8a6',
    name: 'Golden Dragon Room',
    distributor: 'Direct',
    players: 0,
    status: 'pending',
    monthlyRevenue: '$0/mo',
    inAvg: '$0',
    redeemAvg: '$0',
  },
  {
    id: 'cash-carnival',
    initials: 'CC',
    avatarBg: '#ef4444',
    name: 'Cash Carnival',
    distributor: 'Pacific Gaming',
    players: 38,
    status: 'suspended',
    monthlyRevenue: '$640/mo',
    inAvg: '$2,100',
    redeemAvg: '$1,460',
  },
]

const STATUS_LABELS: Record<VendorStatus, string> = {
  active: 'Active',
  pending: 'Pending',
  suspended: 'Suspended',
}

function AdminHeader() {
  return (
    <header className="admin-dash-header">
      <div className="admin-dash-header-row">
        <TapStackLogo height={40} />
        <button type="button" className="admin-dash-avatar" aria-label="Admin profile">
          AV
        </button>
      </div>
    </header>
  )
}

function VendorCard({ vendor }: { vendor: VendorItem }) {
  const playerLabel = vendor.players === 1 ? 'player' : 'players'

  return (
    <article className="admin-vendor-card">
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
            <button type="button" className="admin-vendor-chevron" aria-label={`Open ${vendor.name}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M9 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
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
    </article>
  )
}

export default function AdminVendorsPage() {
  const [search, setSearch] = useState('')

  const filteredVendors = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return VENDORS
    return VENDORS.filter(
      (vendor) =>
        vendor.name.toLowerCase().includes(query) ||
        vendor.distributor.toLowerCase().includes(query) ||
        vendor.initials.toLowerCase().includes(query),
    )
  }, [search])

  const summary = useMemo(
    () => ({
      total: VENDORS.length,
      active: VENDORS.filter((vendor) => vendor.status === 'active').length,
      pending: VENDORS.filter((vendor) => vendor.status === 'pending').length,
      suspended: VENDORS.filter((vendor) => vendor.status === 'suspended').length,
    }),
    [],
  )

  return (
    <div className="admin-vendors-page">
      <AdminHeader />

      <div className="admin-vendors-toolbar">
        <h1 className="admin-vendors-title">Vendor Management</h1>
        <button type="button" className="admin-vendors-create-btn">
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
        {filteredVendors.map((vendor) => (
          <VendorCard key={vendor.id} vendor={vendor} />
        ))}
      </div>
    </div>
  )
}
