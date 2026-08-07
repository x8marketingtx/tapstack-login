import { useMemo, useState } from 'react'
import { TapStackLogo } from './TapStackLogo'
import './DistributorDashboard.css'

type VolumeRange = 'today' | '7d' | '30d' | 'custom'

const VOLUME_RANGES: { id: VolumeRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: 'custom', label: 'Custom' },
]

type DistributorVendor = {
  id: string
  name: string
  tier: 'Pro' | 'Basic'
  status: 'active' | 'restricted'
  deposits: string
  redeems: string
  tags: string[]
}

const DISTRIBUTOR_VENDORS: DistributorVendor[] = [
  {
    id: 'lucky-strike',
    name: 'Lucky Strike Arcade',
    tier: 'Pro',
    status: 'active',
    deposits: '$18,420',
    redeems: '$11,240',
    tags: ['Withdrawals', 'Marketing', 'Blasts', 'Promos'],
  },
  {
    id: 'pixel-palace',
    name: 'Pixel Palace Arcade',
    tier: 'Pro',
    status: 'active',
    deposits: '$12,800',
    redeems: '$7,950',
    tags: ['Withdrawals', 'Marketing', 'Promos'],
  },
  {
    id: 'nova-game-zone',
    name: 'Nova Game Zone',
    tier: 'Basic',
    status: 'active',
    deposits: '$9,100',
    redeems: '$5,420',
    tags: ['Withdrawals'],
  },
]

function DistributorVendorsHeader() {
  return (
    <header className="distributor-dash-header">
      <div className="distributor-dash-header-row">
        <TapStackLogo height={40} />
        <button type="button" className="distributor-dash-avatar" aria-label="Distributor profile">
          PG
        </button>
      </div>
    </header>
  )
}

function DistributorVendorCard({ vendor }: { vendor: DistributorVendor }) {
  return (
    <article className="distributor-vendors-card">
      <div className="distributor-vendors-card-top">
        <div className="distributor-vendors-card-head">
          <h3 className="distributor-vendors-card-name">{vendor.name}</h3>
          <p className="distributor-vendors-card-tier">{vendor.tier}</p>
        </div>
        <div className="distributor-vendors-card-status-row">
          <span className={`distributor-vendors-status distributor-vendors-status--${vendor.status}`}>
            {vendor.status === 'active' ? 'Active' : 'Restricted'}
          </span>
          <button type="button" className="distributor-vendors-chevron" aria-label={`Open ${vendor.name}`}>
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
      </div>

      <div className="distributor-vendors-metrics">
        <div className="distributor-vendors-metric distributor-vendors-metric--deposits">
          <p className="distributor-vendors-metric-label">Deposits</p>
          <p className="distributor-vendors-metric-value distributor-vendors-metric-value--green">
            {vendor.deposits}
          </p>
        </div>
        <div className="distributor-vendors-metric distributor-vendors-metric--redeems">
          <p className="distributor-vendors-metric-label">Redeems</p>
          <p className="distributor-vendors-metric-value distributor-vendors-metric-value--orange">
            {vendor.redeems}
          </p>
        </div>
      </div>

      <div className="distributor-vendors-tags">
        {vendor.tags.map((tag) => (
          <span key={tag} className="distributor-vendors-tag">
            {tag}
          </span>
        ))}
      </div>
    </article>
  )
}

export default function DistributorVendorsPage() {
  const [query, setQuery] = useState('')
  const [range, setRange] = useState<VolumeRange>('30d')

  const filteredVendors = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return DISTRIBUTOR_VENDORS
    return DISTRIBUTOR_VENDORS.filter((vendor) => vendor.name.toLowerCase().includes(normalized))
  }, [query])

  const rangeLabel =
    range === 'today'
      ? 'Today volume'
      : range === '7d'
        ? 'Last 7 days volume'
        : range === '30d'
          ? 'Last 30 days volume'
          : 'Custom range volume'

  return (
    <div className="distributor-vendors-page">
      <DistributorVendorsHeader />

      <section className="distributor-vendors-toolbar">
        <div>
          <h1 className="distributor-vendors-title">My Vendors</h1>
          <p className="distributor-vendors-subtitle">3 active · 4 total</p>
        </div>
        <button type="button" className="distributor-vendors-add-btn">
          + Add
        </button>
      </section>

      <label className="distributor-vendors-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search vendors..."
          aria-label="Search vendors"
        />
      </label>

      <div className="distributor-vendors-filters">
        <span className="distributor-vendors-filter-label">{rangeLabel}</span>
        <div className="distributor-vendors-ranges" role="tablist" aria-label="Volume time range">
          {VOLUME_RANGES.map((item) => {
            const active = range === item.id
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`distributor-vendors-range ${active ? 'distributor-vendors-range--active' : ''}`}
                onClick={() => setRange(item.id)}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="distributor-vendors-list">
        {filteredVendors.map((vendor) => (
          <DistributorVendorCard key={vendor.id} vendor={vendor} />
        ))}
      </div>
    </div>
  )
}
