import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  ApiError,
  getSessionUser,
  isApiConfigured,
  isMeForCurrentSession,
  normalizeSessionRole,
  tapstackApi,
  type AdminOverview,
} from '../api/client'
import AdminBottomNav, { type AdminTab } from './AdminBottomNav'
import { AdminHeader, AdminShellProvider } from './AdminHeader'
import AdminVendorsPage from './AdminVendorsPage'
import AdminDistributorsPage from './AdminDistributorsPage'
import AdminSignupsPage from './AdminSignupsPage'
import AdminFinancePage from './AdminFinancePage'
import AdminSettingsPage from './AdminSettingsPage'
import ProfilePage, {
  initialsFromName,
  profileFromUser,
  type PlayerProfile,
} from './ProfilePage'
import { applyDocumentTitle, navigate, parseLocation } from '../lib/routing'
import './AdminDashboard.css'
import './ProfilePage.css'

type OverviewRange = 'today' | '7d' | '30d' | 'custom'

const OVERVIEW_RANGES: { id: OverviewRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: 'custom', label: 'Custom' },
]

const DETAIL_ROW_ICONS: Record<
  string,
  { iconClass: string; icon: ReactNode }
> = {
  'google-ads': {
    iconClass: 'admin-detail-icon--blue',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="M10 8.5v7l6-3.5-6-3.5z" fill="currentColor" />
      </svg>
    ),
  },
  'loyalty-points': {
    iconClass: 'admin-detail-icon--gold',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 7v10M9 10h6M9 14h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  subscriptions: {
    iconClass: 'admin-detail-icon--green',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M12 8v4l3 2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
}

const EMPTY_DETAIL_ROWS = [
  {
    id: 'deposits',
    title: 'Deposit volume',
    subtitle: 'Today',
    value: '$0',
    meta: '0 txns',
    valueTone: 'green' as const,
  },
  {
    id: 'withdrawals',
    title: 'Withdrawals',
    subtitle: 'Today',
    value: '$0',
    meta: '0 txns',
    valueTone: 'pink' as const,
  },
  {
    id: 'fees',
    title: 'Estimated platform fees',
    subtitle: 'Deposit / redeem fees',
    value: '$0',
    meta: '0 txns',
    valueTone: 'default' as const,
  },
]

const EMPTY_OVERVIEW: AdminOverview = {
  netProfit: '$0',
  changePct: '0%',
  txCount: 0,
  deposits: 0,
  depositsFormatted: '$0',
  withdrawals: 0,
  withdrawalsFormatted: '$0',
  platformFees: 0,
  platformFeesFormatted: '$0',
  detailRows: EMPTY_DETAIL_ROWS,
  platformStats: {
    activeVendors: 0,
    distributors: 0,
    customers: 0,
    suspended: 0,
    pendingApplications: 0,
  },
}

function detailIconFor(id: string, title: string) {
  return (
    DETAIL_ROW_ICONS[id] ?? {
      iconClass: 'admin-detail-icon--blue',
      icon: <span aria-hidden="true">{title.charAt(0).toUpperCase() || '•'}</span>,
    }
  )
}

function rangeCompareLabel(range: OverviewRange) {
  if (range === 'today') return 'vs yesterday'
  if (range === '7d') return 'vs prior 7 days'
  if (range === '30d') return 'vs prior 30 days'
  return 'vs prior period'
}

function OverviewSkeleton() {
  return (
    <div className="admin-overview-skel" aria-busy="true" aria-label="Loading profit reporting">
      <div className="admin-profit-hero admin-profit-hero--skel">
        <div className="admin-skel admin-skel--label" />
        <div className="admin-skel admin-skel--hero" />
        <div className="admin-skel admin-skel--meta" />
      </div>
      <div className="admin-profit-stats">
        <div className="admin-profit-stat-card">
          <div className="admin-skel admin-skel--stat" />
          <div className="admin-skel admin-skel--caption" />
        </div>
        <div className="admin-profit-stat-card">
          <div className="admin-skel admin-skel--stat" />
          <div className="admin-skel admin-skel--caption" />
        </div>
        <div className="admin-profit-stat-card">
          <div className="admin-skel admin-skel--stat" />
          <div className="admin-skel admin-skel--caption" />
        </div>
      </div>
      <div className="admin-detail-list">
        <div className="admin-detail-card">
          <div className="admin-skel admin-skel--icon" />
          <div className="admin-detail-info">
            <div className="admin-skel admin-skel--title" />
            <div className="admin-skel admin-skel--sub" />
          </div>
          <div className="admin-detail-values">
            <div className="admin-skel admin-skel--value" />
            <div className="admin-skel admin-skel--meta" />
          </div>
        </div>
        <div className="admin-detail-card">
          <div className="admin-skel admin-skel--icon" />
          <div className="admin-detail-info">
            <div className="admin-skel admin-skel--title" />
            <div className="admin-skel admin-skel--sub" />
          </div>
          <div className="admin-detail-values">
            <div className="admin-skel admin-skel--value" />
            <div className="admin-skel admin-skel--meta" />
          </div>
        </div>
      </div>
    </div>
  )
}

function AdminOverviewPage({
  onStats,
}: {
  onStats?: (stats: AdminOverview['platformStats']) => void
}) {
  const [range, setRange] = useState<OverviewRange>('today')
  const [data, setData] = useState<AdminOverview>(EMPTY_OVERVIEW)
  const [loading, setLoading] = useState(isApiConfigured())
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isApiConfigured()) {
      setData(EMPTY_OVERVIEW)
      onStats?.(EMPTY_OVERVIEW.platformStats)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')

    tapstackApi
      .adminOverview(range)
      .then((res) => {
        if (cancelled) return
        setData({
          ...EMPTY_OVERVIEW,
          ...res,
          netProfit: res.netProfit || '$0',
          changePct: res.changePct || '0%',
          txCount: res.txCount ?? 0,
          deposits: res.deposits ?? 0,
          depositsFormatted: res.depositsFormatted || '$0',
          withdrawals: res.withdrawals ?? 0,
          withdrawalsFormatted: res.withdrawalsFormatted || '$0',
          platformFees: res.platformFees ?? 0,
          platformFeesFormatted: res.platformFeesFormatted || '$0',
          detailRows: res.detailRows?.length ? res.detailRows : EMPTY_DETAIL_ROWS,
          platformStats: {
            activeVendors: res.platformStats?.activeVendors ?? 0,
            distributors: res.platformStats?.distributors ?? 0,
            customers: res.platformStats?.customers ?? 0,
            suspended: res.platformStats?.suspended ?? 0,
            pendingApplications: res.platformStats?.pendingApplications ?? 0,
          },
        })
        onStats?.(res.platformStats)
      })
      .catch((err) => {
        if (cancelled) return
        setData(EMPTY_OVERVIEW)
        setError(err instanceof ApiError ? err.message : 'Could not load overview.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [range, onStats])

  const detailRows = data.detailRows?.length ? data.detailRows : EMPTY_DETAIL_ROWS
  const platformStats = [
    {
      id: 'vendors',
      icon: '🏪',
      label: 'Active Vendors',
      value: String(data.platformStats?.activeVendors ?? 0),
    },
    {
      id: 'distributors',
      icon: '🏢',
      label: 'Distributors',
      value: String(data.platformStats?.distributors ?? 0),
    },
    {
      id: 'customers',
      icon: '👥',
      label: 'Total Customers',
      value: (data.platformStats?.customers ?? 0).toLocaleString(),
    },
    {
      id: 'suspended',
      icon: '⛔',
      label: 'Suspended',
      value: String(data.platformStats?.suspended ?? 0),
      tone: 'danger' as const,
    },
  ]

  const deposits = data.depositsFormatted || '$0'
  const withdrawals = data.withdrawalsFormatted || '$0'
  const fees = data.platformFeesFormatted || '$0'
  const changePct = data.changePct || '0%'
  const changeUp = changePct.trim().startsWith('+') && changePct !== '+0%'

  return (
    <div className="admin-overview">
      <AdminHeader />

      <section className="admin-overview-intro">
        <h1 className="admin-overview-title">Platform Overview</h1>
        <p className="admin-overview-status">
          <span className="admin-overview-status-dot" aria-hidden="true" />
          All systems operational
        </p>
      </section>

      {error ? <p className="admin-api-error">{error}</p> : null}

      <section className="admin-profit-section">
        <div className="admin-profit-toolbar">
          <h2 className="admin-profit-heading">Profit Reporting</h2>
          <div className="admin-range-pills" role="tablist" aria-label="Time range">
            {OVERVIEW_RANGES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={range === item.id}
                className={`admin-range-btn ${range === item.id ? 'admin-range-btn--active' : ''}`}
                onClick={() => setRange(item.id)}
                disabled={loading}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <OverviewSkeleton />
        ) : (
          <>
            <article className="admin-profit-hero" aria-label="Net platform profit">
              <div className="admin-profit-hero-top">
                <p className="admin-profit-hero-label">Net Platform Profit</p>
                <span
                  className={`admin-profit-hero-badge${changeUp ? '' : ' admin-profit-hero-badge--flat'}`}
                >
                  {changeUp ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M6 15l6-6 6 6"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                  {changePct}
                </span>
              </div>
              <p className="admin-profit-hero-value">{data.netProfit || '$0'}</p>
              <p className="admin-profit-hero-meta">
                {rangeCompareLabel(range)} · {(data.txCount ?? 0).toLocaleString()} transactions
              </p>
            </article>

            <div className="admin-profit-stats">
              <article className="admin-profit-stat-card">
                <p className="admin-profit-stat-value admin-profit-stat-value--green">{deposits}</p>
                <p className="admin-profit-stat-label">Deposits</p>
              </article>
              <article className="admin-profit-stat-card">
                <p className="admin-profit-stat-value admin-profit-stat-value--red">{withdrawals}</p>
                <p className="admin-profit-stat-label">Withdrawals</p>
              </article>
              <article className="admin-profit-stat-card">
                <p className="admin-profit-stat-value">{fees}</p>
                <p className="admin-profit-stat-label">Platform Fees</p>
              </article>
            </div>

            <section className="admin-detail-list" aria-label="Platform revenue details">
              {detailRows.map((row) => {
                const icon = detailIconFor(row.id, row.title)
                return (
                  <article key={row.id} className="admin-detail-card">
                    <span className={`admin-detail-icon ${icon.iconClass}`}>{icon.icon}</span>
                    <div className="admin-detail-info">
                      <h3 className="admin-detail-title">{row.title}</h3>
                      <p className="admin-detail-subtitle">{row.subtitle}</p>
                    </div>
                    <div className="admin-detail-values">
                      <p
                        className={`admin-detail-value ${
                          row.valueTone === 'negative' ? 'admin-detail-value--negative' : ''
                        }`}
                      >
                        {row.value || '$0'}
                      </p>
                      <p className="admin-detail-meta">{row.meta || '0 txns'}</p>
                    </div>
                  </article>
                )
              })}
            </section>
          </>
        )}
      </section>

      <section className="admin-platform-stats" aria-label="Platform statistics">
        {loading
          ? [1, 2, 3, 4].map((n) => (
              <article key={n} className="admin-platform-stat-card">
                <div className="admin-skel admin-skel--icon-sm" />
                <div className="admin-skel admin-skel--caption" />
                <div className="admin-skel admin-skel--stat-sm" />
              </article>
            ))
          : platformStats.map((stat) => (
              <article
                key={stat.id}
                className={`admin-platform-stat-card ${stat.tone === 'danger' ? 'admin-platform-stat-card--danger' : ''}`}
              >
                <span className="admin-platform-stat-icon" aria-hidden="true">
                  {stat.icon}
                </span>
                <p className="admin-platform-stat-label">{stat.label}</p>
                <p className="admin-platform-stat-value">{stat.value}</p>
              </article>
            ))}
      </section>
    </div>
  )
}

const DEMO_ADMIN_PROFILE: PlayerProfile = {
  displayName: 'Admin',
  username: '@admin',
  email: 'admin@tapstack.demo',
  phone: '—',
  initials: 'AV',
  level: 1,
  levelProgressPct: 0,
}

export default function AdminDashboard({ onLogout }: { onLogout?: () => void }) {
  const initialRoute = parseLocation()
  const [activeTab, setActiveTab] = useState<AdminTab>(() =>
    initialRoute.portal === 'admin' ? initialRoute.tab : 'overview',
  )
  const [navBadges, setNavBadges] = useState<Partial<Record<AdminTab, string>> | undefined>()
  const [showProfile, setShowProfile] = useState(false)
  const [profile, setProfile] = useState<PlayerProfile>(() => {
    const user = getSessionUser()
    if (user && normalizeSessionRole(user.role) === 'admin') {
      return profileFromUser(user)
    }
    return DEMO_ADMIN_PROFILE
  })

  useEffect(() => {
    function syncFromRoute() {
      const route = parseLocation()
      if (route.portal !== 'admin') return
      setActiveTab(route.tab)
    }
    window.addEventListener('popstate', syncFromRoute)
    return () => window.removeEventListener('popstate', syncFromRoute)
  }, [])

  useEffect(() => {
    applyDocumentTitle({ portal: 'admin', tab: activeTab })
  }, [activeTab])

  useEffect(() => {
    if (!isApiConfigured()) return
    let cancelled = false
    ;(async () => {
      try {
        const me = await tapstackApi.me()
        if (cancelled || !me?.user) return
        if (!isMeForCurrentSession(me.user)) return
        const role = normalizeSessionRole(me.user.role)
        if (role !== 'admin') return
        setProfile(profileFromUser(me.user, me.level, me.levelProgressPct))
      } catch {
        // Keep session/demo profile.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleOverviewStats = useCallback((stats: AdminOverview['platformStats']) => {
    const pending = stats?.pendingApplications
    setNavBadges({
      vendors: String(stats?.activeVendors ?? ''),
      ...(pending != null && pending > 0 ? { signups: String(pending) } : {}),
    })
  }, [])

  useEffect(() => {
    if (!isApiConfigured()) return
    let cancelled = false
    tapstackApi
      .adminOverview('today')
      .then((res) => {
        if (cancelled) return
        handleOverviewStats(res.platformStats)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [handleOverviewStats])

  function handleTabChange(tab: AdminTab) {
    setShowProfile(false)
    setActiveTab(tab)
    navigate({ portal: 'admin', tab })
  }

  const initials = profile.initials || initialsFromName(profile.displayName) || 'AV'

  return (
    <AdminShellProvider initials={initials} onProfileClick={() => setShowProfile(true)}>
      <div className="admin-dashboard">
        {showProfile ? (
          <div className="admin-dashboard-scroll admin-dashboard-scroll--profile">
            <ProfilePage
              profile={profile}
              showLevel={false}
              expectedRole="admin"
              onBack={() => setShowProfile(false)}
              onLogout={() => onLogout?.()}
              onProfileChange={setProfile}
            />
          </div>
        ) : (
          <>
            <div className="admin-dashboard-scroll">
              {activeTab === 'overview' && <AdminOverviewPage onStats={handleOverviewStats} />}
              {activeTab === 'vendors' && <AdminVendorsPage />}
              {activeTab === 'distributors' && <AdminDistributorsPage />}
              {activeTab === 'signups' && <AdminSignupsPage />}
              {activeTab === 'finance' && <AdminFinancePage />}
              {activeTab === 'settings' && <AdminSettingsPage />}
            </div>
            <AdminBottomNav activeTab={activeTab} onTabChange={handleTabChange} badges={navBadges} />
          </>
        )}
      </div>
    </AdminShellProvider>
  )
}
