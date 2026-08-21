import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  isApiConfigured,
  tapstackApi,
  type AdminSignup,
} from '../api/client'
import { AdminHeader } from './AdminHeader'
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

const FILTERS: { id: ApplicationFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
]

function normalizeStatus(status: string): ApplicationStatus {
  if (status === 'approved' || status === 'rejected') return status
  return 'pending'
}

function mapApiSignup(item: AdminSignup): ApplicationItem {
  return {
    id: String(item.id),
    name: item.name,
    code: item.code,
    applicant: item.applicant,
    date: item.date,
    time: item.time,
    revenueRange: item.revenueRange,
    status: normalizeStatus(item.status),
    icon: item.icon === 'person' ? 'person' : 'vendor',
  }
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

function ApplicationCard({
  application,
  busy,
  onApprove,
  onReject,
}: {
  application: ApplicationItem
  busy: boolean
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
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
        {application.status === 'pending' && isApiConfigured() ? (
          <div className="admin-signup-decision-row">
            <button
              type="button"
              className="admin-signup-decision-btn admin-signup-decision-btn--approve"
              disabled={busy}
              onClick={() => onApprove(application.id)}
            >
              Approve
            </button>
            <button
              type="button"
              className="admin-signup-decision-btn admin-signup-decision-btn--reject"
              disabled={busy}
              onClick={() => onReject(application.id)}
            >
              Reject
            </button>
          </div>
        ) : null}
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

function SignupsSkeleton() {
  return (
    <div className="admin-signups-list" aria-busy="true" aria-label="Loading applications">
      {[1, 2, 3, 4].map((n) => (
        <article key={n} className="admin-signup-card">
          <div className="admin-skel admin-skel--icon" />
          <div className="admin-signup-info">
            <div className="admin-skel admin-skel--title" />
            <div className="admin-skel admin-skel--sub" />
            <div className="admin-skel admin-skel--line-sm" style={{ marginTop: 8 }} />
          </div>
          <div className="admin-skel admin-skel--pill" />
        </article>
      ))}
    </div>
  )
}

export default function AdminSignupsPage() {
  const [filter, setFilter] = useState<ApplicationFilter>('all')
  const [applications, setApplications] = useState<ApplicationItem[]>([])
  const [loading, setLoading] = useState(isApiConfigured())
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isApiConfigured()) {
      setApplications([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await tapstackApi.adminSignups('all')
      setApplications((res.signups || []).map(mapApiSignup))
    } catch (err) {
      setApplications([])
      setError(err instanceof ApiError ? err.message : 'Could not load applications.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const pendingCount = applications.filter((application) => application.status === 'pending').length

  const filteredApplications = useMemo(() => {
    if (filter === 'all') return applications
    return applications.filter((application) => application.status === filter)
  }, [filter, applications])

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    if (!isApiConfigured() || actionId) return
    setActionId(id)
    setError('')
    try {
      await tapstackApi.adminSignupUpdate(id, status)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update application.')
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="admin-signups-page">
      <AdminHeader />

      <section className="admin-signups-intro">
        <h1 className="admin-signups-title">Applications</h1>
        <p className="admin-signups-meta">
          {loading ? (
            <span className="admin-skel admin-skel--line-sm" style={{ display: 'inline-block', width: 120 }} />
          ) : (
            <>{pendingCount} pending review</>
          )}
        </p>
      </section>

      {error ? <p className="admin-api-error">{error}</p> : null}

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
              disabled={loading}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <SignupsSkeleton />
      ) : (
        <div className="admin-signups-list">
          {filteredApplications.length === 0 ? (
            <p className="admin-empty-hint">No applications yet.</p>
          ) : (
            filteredApplications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                busy={actionId === application.id}
                onApprove={(id) => void updateStatus(id, 'approved')}
                onReject={(id) => void updateStatus(id, 'rejected')}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
