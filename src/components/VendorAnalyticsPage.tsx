import { useEffect, useMemo, useState } from 'react'
import { ApiError, isApiConfigured, tapstackApi, type VendorCustomer } from '../api/client'
import './VendorAnalyticsPage.css'

type AnalyticsTab = 'customers' | 'financial' | 'games'

type CustomerRow = VendorCustomer

const ANALYTICS_TABS: { id: AnalyticsTab; label: string; icon: string }[] = [
  { id: 'customers', label: 'Customers', icon: '👥' },
  { id: 'financial', label: 'Financial', icon: '📈' },
  { id: 'games', label: 'Games', icon: '🎮' },
]

function downloadCustomersCsv(customers: CustomerRow[]) {
  const header = ['Name', 'Username', 'Last activity', 'In', 'Out', 'Visits']
  const rows = customers.map((c) => [
    c.name,
    c.username,
    c.meta,
    c.inAmount,
    c.outAmount,
    String(c.visits),
  ])
  const csv = [header, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? '')
          return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
        })
        .join(','),
    )
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'tapstack-customers.csv'
  anchor.click()
  URL.revokeObjectURL(url)
}

function CustomersTab() {
  const [query, setQuery] = useState('')
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(isApiConfigured())
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isApiConfigured()) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const res = await tapstackApi.vendorCustomers()
        if (cancelled) return
        setCustomers(res.customers || [])
        setTotal(res.total ?? res.customers?.length ?? 0)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Could not load customers.',
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredCustomers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((customer) => {
      const haystack = `${customer.name} ${customer.username}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [customers, query])

  return (
    <div className="vendor-analytics-content">
      <div className="vendor-analytics-toolbar">
        <h2 className="vendor-analytics-heading">
          Customers · {loading ? '…' : total.toLocaleString()}
        </h2>
        <button
          type="button"
          className="vendor-analytics-csv-btn"
          disabled={filteredCustomers.length === 0}
          onClick={() => downloadCustomersCsv(filteredCustomers)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 3v12M7 10l5 5 5-5M5 21h14"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          CSV
        </button>
      </div>

      <label className="vendor-analytics-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          placeholder="Search by name or username..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {error ? <p className="vendor-analytics-error">{error}</p> : null}

      <div className="vendor-analytics-table-head" aria-hidden="true">
        <span>PLAYER</span>
        <span>IN</span>
        <span>OUT</span>
        <span>VISITS</span>
      </div>

      {loading ? (
        <p className="vendor-analytics-empty">Loading customers…</p>
      ) : filteredCustomers.length === 0 ? (
        <p className="vendor-analytics-empty">
          No customers yet. Players who join with your invite code will appear here.
        </p>
      ) : (
        <ul className="vendor-analytics-list">
          {filteredCustomers.map((customer) => (
            <li key={customer.id} className="vendor-analytics-row">
              <div className="vendor-analytics-player">
                <div className="vendor-analytics-avatar">{customer.initial}</div>
                <div className="vendor-analytics-player-info">
                  <p className="vendor-analytics-player-name">{customer.name}</p>
                  <p className="vendor-analytics-player-meta">
                    {[customer.username, customer.meta].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              <span className="vendor-analytics-in">{customer.inAmount}</span>
              <span className="vendor-analytics-out">{customer.outAmount}</span>
              <span className="vendor-analytics-visits">{customer.visits}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

type GamesRange = 'today' | '7d' | '30d' | 'custom'

const GAMES_RANGES: { id: GamesRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: 'custom', label: 'Custom' },
]

type GamePerformanceItem = {
  id: string
  title: string
  players: number
  inAmount: string
  outAmount: string
  netAmount: string
}

function downloadGamesCsv(games: GamePerformanceItem[]) {
  const header = ['Game', 'Players', 'In', 'Out', 'Net']
  const rows = games.map((g) => [g.title, String(g.players), g.inAmount, g.outAmount, g.netAmount])
  const csv = [header, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? '')
          return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
        })
        .join(','),
    )
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'tapstack-game-performance.csv'
  anchor.click()
  URL.revokeObjectURL(url)
}

function GamesTab() {
  const [range, setRange] = useState<GamesRange>('7d')
  const [games, setGames] = useState<GamePerformanceItem[]>([])
  const [loading, setLoading] = useState(isApiConfigured())
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isApiConfigured()) {
      setGames([])
      setLoading(false)
      return
    }
    const queryRange = range === 'custom' ? '7d' : range
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const res = await tapstackApi.vendorAnalytics(queryRange)
        if (cancelled) return
        setGames((res.games || []) as GamePerformanceItem[])
      } catch (err) {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Could not load game performance.')
        setGames([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [range])

  return (
    <div className="vendor-analytics-content vendor-games-content">
      <div className="vendor-analytics-toolbar">
        <h2 className="vendor-analytics-heading">Per-Game Performance</h2>
        <button
          type="button"
          className="vendor-analytics-csv-btn"
          disabled={games.length === 0}
          onClick={() => downloadGamesCsv(games)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 3v12M7 10l5 5 5-5M5 21h14"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          CSV
        </button>
      </div>

      <div className="vendor-games-filter-pills" role="tablist" aria-label="Time range">
        {GAMES_RANGES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={range === item.id}
            className={`vendor-games-filter-btn ${range === item.id ? 'vendor-games-filter-btn--active' : ''}`}
            onClick={() => setRange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? <p className="otp-error">{error}</p> : null}
      {loading ? <p className="vendor-analytics-empty">Loading game performance…</p> : null}
      {!loading && !error && games.length === 0 ? (
        <p className="vendor-analytics-empty">No game activity for this period.</p>
      ) : null}

      <ul className="vendor-games-list">
        {games.map((game) => (
          <li key={game.id}>
            <button type="button" className="vendor-games-card">
              <div className="vendor-games-card-top">
                <div className="vendor-games-card-info">
                  <span className="vendor-games-card-icon" aria-hidden="true">
                    🎮
                  </span>
                  <div>
                    <p className="vendor-games-card-title">{game.title}</p>
                    <p className="vendor-games-card-meta">{game.players} players</p>
                  </div>
                </div>
                <svg
                  className="vendor-games-card-chevron"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M9 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div className="vendor-games-card-metrics">
                <div className="vendor-games-metric">
                  <span className="vendor-games-metric-label">IN</span>
                  <span className="vendor-games-metric-value vendor-games-metric-value--in">{game.inAmount}</span>
                </div>
                <div className="vendor-games-metric">
                  <span className="vendor-games-metric-label">OUT</span>
                  <span className="vendor-games-metric-value vendor-games-metric-value--out">{game.outAmount}</span>
                </div>
                <div className="vendor-games-metric vendor-games-metric--net">
                  <span className="vendor-games-metric-label">NET</span>
                  <span className="vendor-games-metric-value vendor-games-metric-value--net">{game.netAmount}</span>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

type FinancialRange = 'today' | '7d' | '30d' | 'custom'

const FINANCIAL_RANGES: { id: FinancialRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
  { id: 'custom', label: 'Custom' },
]

type DailyBreakdown = {
  day: string
  inAmount: number
  outAmount: number
  netProfit: number
  netLabel: string
}

type FinancialSummary = {
  periodLabel: string
  breakdownTitle: string
  netProfit: string
  deposits: string
  redeems: string
  platformFees: string
  distributorCut: string
}

const EMPTY_SUMMARY: FinancialSummary = {
  periodLabel: '—',
  breakdownTitle: 'Daily breakdown',
  netProfit: '$0',
  deposits: '$0',
  redeems: '$0',
  platformFees: '$0',
  distributorCut: '$0',
}

function FinancialTab() {
  const [range, setRange] = useState<FinancialRange>('7d')
  const [summary, setSummary] = useState<FinancialSummary>(EMPTY_SUMMARY)
  const [daily, setDaily] = useState<DailyBreakdown[]>([])
  const [loading, setLoading] = useState(isApiConfigured())
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isApiConfigured()) {
      setLoading(false)
      setSummary(EMPTY_SUMMARY)
      setDaily([])
      return
    }
    const queryRange = range === 'custom' ? '7d' : range
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const res = await tapstackApi.vendorAnalytics(queryRange)
        if (cancelled) return
        const financial = res.financial || {}
        setSummary({
          periodLabel: financial.periodLabel || EMPTY_SUMMARY.periodLabel,
          breakdownTitle: financial.breakdownTitle || EMPTY_SUMMARY.breakdownTitle,
          netProfit: financial.netProfit || '$0',
          deposits: financial.deposits || '$0',
          redeems: financial.redeems || '$0',
          platformFees: financial.platformFees || '$0',
          distributorCut: financial.distributorCut || '$0',
        })
        setDaily(
          (res.daily || []).map((day) => ({
            day: day.day,
            inAmount: Number(day.inAmount) || 0,
            outAmount: Number(day.outAmount) || 0,
            netProfit: Number(day.netProfit) || 0,
            netLabel: day.netLabel || '$0',
          })),
        )
      } catch (err) {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Could not load financial analytics.')
        setSummary(EMPTY_SUMMARY)
        setDaily([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [range])

  const maxBarValue = Math.max(1, ...daily.flatMap((day) => [day.inAmount, day.outAmount]))

  return (
    <div className="vendor-analytics-content vendor-financial-content">
      <div className="vendor-financial-toolbar">
        <h2 className="vendor-analytics-heading">Volume &amp; Profit</h2>
        <div className="vendor-financial-range-pills" role="tablist" aria-label="Time range">
          {FINANCIAL_RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={range === item.id}
              className={`vendor-financial-range-btn ${range === item.id ? 'vendor-financial-range-btn--active' : ''}`}
              onClick={() => setRange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="otp-error">{error}</p> : null}
      {loading ? <p className="vendor-analytics-empty">Loading financials…</p> : null}

      <section className="vendor-financial-hero" aria-label="Net profit summary">
        <p className="vendor-financial-hero-label">Net Profit · {summary.periodLabel}</p>
        <p className="vendor-financial-hero-value">{summary.netProfit}</p>
        <p className="vendor-financial-hero-subtitle">Deposits minus redeems</p>
      </section>

      <div className="vendor-financial-stats">
        <article className="vendor-financial-stat-card">
          <div className="vendor-financial-stat-head">
            <span className="vendor-financial-stat-icon vendor-financial-stat-icon--up" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 16l6-8 6 8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="vendor-financial-stat-label">Deposits</span>
          </div>
          <p className="vendor-financial-stat-value vendor-financial-stat-value--green">{summary.deposits}</p>
        </article>

        <article className="vendor-financial-stat-card">
          <div className="vendor-financial-stat-head">
            <span className="vendor-financial-stat-icon vendor-financial-stat-icon--down" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 8l6 8 6-8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="vendor-financial-stat-label">Redeems</span>
          </div>
          <p className="vendor-financial-stat-value vendor-financial-stat-value--orange">{summary.redeems}</p>
        </article>

        <article className="vendor-financial-stat-card">
          <span className="vendor-financial-stat-label">Platform Fees</span>
          <p className="vendor-financial-stat-value vendor-financial-stat-value--red">{summary.platformFees}</p>
        </article>

        <article className="vendor-financial-stat-card">
          <span className="vendor-financial-stat-label">Distributor Cut</span>
          <p className="vendor-financial-stat-value vendor-financial-stat-value--purple">{summary.distributorCut}</p>
        </article>
      </div>

      <section className="vendor-financial-chart-card" aria-label="Daily breakdown chart">
        <div className="vendor-financial-chart-header">
          <h3 className="vendor-financial-chart-title">{summary.breakdownTitle}</h3>
          <div className="vendor-financial-chart-legend">
            <span className="vendor-financial-legend-item">
              <span className="vendor-financial-legend-dot vendor-financial-legend-dot--in" aria-hidden="true" />
              In
            </span>
            <span className="vendor-financial-legend-item">
              <span className="vendor-financial-legend-dot vendor-financial-legend-dot--out" aria-hidden="true" />
              Out
            </span>
          </div>
        </div>

        {daily.length === 0 && !loading ? (
          <p className="vendor-analytics-empty">No volume for this period.</p>
        ) : (
          <>
            <div className="vendor-financial-chart">
              {daily.map((day) => (
                <div key={day.day} className="vendor-financial-chart-day">
                  <div className="vendor-financial-chart-bars" aria-hidden="true">
                    <span
                      className="vendor-financial-chart-bar vendor-financial-chart-bar--in"
                      style={{ height: `${(day.inAmount / maxBarValue) * 100}%` }}
                    />
                    <span
                      className="vendor-financial-chart-bar vendor-financial-chart-bar--out"
                      style={{ height: `${(day.outAmount / maxBarValue) * 100}%` }}
                    />
                  </div>
                  <span className="vendor-financial-chart-day-label">{day.day}</span>
                </div>
              ))}
            </div>

            <div className="vendor-financial-net-row">
              <span className="vendor-financial-net-row-label">Daily net profit</span>
              <div className="vendor-financial-net-row-values">
                {daily.map((day) => (
                  <span key={day.day} className="vendor-financial-net-row-value">
                    {day.netLabel}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default function VendorAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('customers')

  return (
    <div className="vendor-analytics-page">
      <div className="vendor-analytics-tabs" role="tablist" aria-label="Analytics sections">
        {ANALYTICS_TABS.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`vendor-analytics-tab ${active ? 'vendor-analytics-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="vendor-analytics-tab-icon" aria-hidden="true">
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {activeTab === 'customers' && <CustomersTab />}
      {activeTab === 'financial' && <FinancialTab />}
      {activeTab === 'games' && <GamesTab />}
    </div>
  )
}
