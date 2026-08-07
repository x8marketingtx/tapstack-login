import { TapStackLogo } from './TapStackLogo'
import './AdminDistributorsPage.css'

type DistributorStatus = 'active' | 'suspended'

type DistributorItem = {
  id: string
  initials: string
  name: string
  vendors: number
  earned: string
  status: DistributorStatus
}

const DISTRIBUTORS: DistributorItem[] = [
  {
    id: 'pacific-gaming',
    initials: 'PG',
    name: 'Pacific Gaming Partners',
    vendors: 7,
    earned: '$18,420',
    status: 'active',
  },
  {
    id: 'midwest-entertainment',
    initials: 'ME',
    name: 'Midwest Entertainment Group',
    vendors: 5,
    earned: '$11,840',
    status: 'active',
  },
  {
    id: 'sunstate',
    initials: 'SE',
    name: 'SunState Entertainment',
    vendors: 2,
    earned: '$2,100',
    status: 'suspended',
  },
]

const STATUS_LABELS: Record<DistributorStatus, string> = {
  active: 'Active',
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

function DistributorCard({ distributor }: { distributor: DistributorItem }) {
  const vendorLabel = distributor.vendors === 1 ? 'vendor' : 'vendors'

  return (
    <article className="admin-distributor-card">
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
        <button type="button" className="admin-distributor-chevron" aria-label={`Open ${distributor.name}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </article>
  )
}

export default function AdminDistributorsPage() {
  const activeCount = DISTRIBUTORS.filter((distributor) => distributor.status === 'active').length

  return (
    <div className="admin-distributors-page">
      <AdminHeader />

      <div className="admin-distributors-toolbar">
        <div>
          <h1 className="admin-distributors-title">Distributors</h1>
          <p className="admin-distributors-meta">
            {DISTRIBUTORS.length} accounts · {activeCount} active
          </p>
        </div>
        <button type="button" className="admin-distributors-create-btn">
          + Create
        </button>
      </div>

      <div className="admin-distributors-list">
        {DISTRIBUTORS.map((distributor) => (
          <DistributorCard key={distributor.id} distributor={distributor} />
        ))}
      </div>
    </div>
  )
}
