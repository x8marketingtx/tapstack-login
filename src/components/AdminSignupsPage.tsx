import { useMemo, useState } from 'react'
import { TapStackLogo } from './TapStackLogo'
import './AdminSignupsPage.css'

type ApplicationStatus = 'pending' | 'approved' | 'rejected'
type ApplicationFilter = 'all' | ApplicationStatus
type ApplicationIcon = 'vendor' | 'person'

type ApplicationItem = {
  id: string
  name: string
  code?: string
  applicant: string
  date: string
  time: string
  revenueRange: string
  status: ApplicationStatus
  icon: ApplicationIcon
}

const APPLICATIONS: ApplicationItem[] = [
  {
    id: 'neon-tokens',
    name: 'Neon Tokens Arcade',
    code: 'PAC-001',
    applicant: 'Marcus Webb',
    date: 'Jul 2, 2026',
    time: '9:14 AM',
    revenueRange: '$25,000 – $50,000 / mo',
    status: 'pending',
    icon: 'vendor',
  },
  {
    id: 'galaxy-games',
    name: 'Galaxy Games LLC',
    applicant: 'Sarah Chen',
    date: 'Jul 1, 2026',
    time: '2:30 PM',
    revenueRange: '$10,000 – $25,000 / mo',
    status: 'pending',
    icon: 'vendor',
  },
  {
    id: 'river-city',
    name: 'River City Arcade',
    applicant: 'Tom Hart',
    date: 'Jun 30, 2026',
    time: '11:05 AM',
    revenueRange: '$50,000+ / mo',
    status: 'pending',
    icon: 'vendor',
  },
  {
    id: 'pinball-palace',
    name: 'Pinball Palace Co.',
    code: 'MID-014',
    applicant: 'Priya Sharma',
    date: 'Jun 28, 2026',
    time: '4:42 PM',
    revenueRange: '$25,000 – $50,000 / mo',
    status: 'approved',
    icon: 'vendor',
  },
  {
    id: 'southwest-arcade',
    name: 'Southwest Arcade Group',
    applicant: 'James Ortiz',
    date: 'Jun 25, 2026',
    time: '10:18 AM',
    revenueRange: '$10,000 – $25,000 / mo',
    status: 'rejected',
    icon: 'person',
  },
]

const FILTERS: { id: ApplicationFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
]

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

function ApplicationIcon({ type }: { type: ApplicationIcon }) {
  if (type === 'person') {
    return (
      <span className="admin-signup-icon admin-signup-icon--person" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M5 20v-1a7 7 0 0 1 14 0v1"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </span>
    )
  }

  return (
    <span className="admin-signup-icon admin-signup-icon--vendor" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 10l8-5 8 5v10a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1V10z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function ApplicationCard({ application }: { application: ApplicationItem }) {
  return (
    <article className="admin-signup-card">
      <ApplicationIcon type={application.icon} />
      <div className="admin-signup-info">
        <div className="admin-signup-title-row">
          <h3 className="admin-signup-name">{application.name}</h3>
          {application.code ? <span className="admin-signup-code">{application.code}</span> : null}
        </div>
        <p className="admin-signup-applicant">
          {application.applicant} · {application.date} · {application.time}
        </p>
        <p className="admin-signup-revenue">{application.revenueRange}</p>
      </div>
      <div className="admin-signup-actions">
        <span className={`admin-signup-status admin-signup-status--${application.status}`}>
          {application.status}
        </span>
        <button type="button" className="admin-signup-chevron" aria-label={`Review ${application.name}`}>
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
    </article>
  )
}

export default function AdminSignupsPage() {
  const [filter, setFilter] = useState<ApplicationFilter>('all')

  const pendingCount = APPLICATIONS.filter((application) => application.status === 'pending').length

  const filteredApplications = useMemo(() => {
    if (filter === 'all') return APPLICATIONS
    return APPLICATIONS.filter((application) => application.status === filter)
  }, [filter])

  return (
    <div className="admin-signups-page">
      <AdminHeader />

      <section className="admin-signups-intro">
        <h1 className="admin-signups-title">Applications</h1>
        <p className="admin-signups-meta">{pendingCount} pending review</p>
      </section>

      <div className="admin-signups-filters" role="tablist" aria-label="Application filters">
        {FILTERS.map((item) => {
          const active = filter === item.id
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`admin-signups-filter ${active ? 'admin-signups-filter--active' : ''}`}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <div className="admin-signups-list">
        {filteredApplications.map((application) => (
          <ApplicationCard key={application.id} application={application} />
        ))}
      </div>
    </div>
  )
}
