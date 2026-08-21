import { useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  isApiConfigured,
  tapstackApi,
  type AdminCustomerDetail,
  type AdminFees,
  type AdminFinance,
  type AdminFinanceCustomer,
  type AdminFinanceVendor,
  type AdminPeriodStats,
} from '../api/client'
import { AdminHeader } from './AdminHeader'
import { VendorDetailView } from './AdminVendorsPage'
import './AdminFinancePage.css'
import './AdminVendorsPage.css'

type FinanceSubTab = 'analytics' | 'customers' | 'vendors' | 'fees' | 'transfer'
type FinanceRange = 'today' | '7d' | '30d' | 'custom'

const FINANCE_SUB_TABS: { id: FinanceSubTab; label: string; icon: string }[] = [
  { id: 'analytics', label: 'Analytics', icon: '$' },
  { id: 'customers', label: 'Customers', icon: '👤' },
  { id: 'vendors', label: 'Vendors', icon: '🏪' },
  { id: 'fees', label: 'Fees', icon: '⚙️' },
  { id: 'transfer', label: 'Transfer', icon: '↔' },
]

const FINANCE_RANGES: { id: FinanceRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: 'custom', label: 'Custom' },
]

const RANGE_META_LABEL: Record<FinanceRange, string> = {
  today: 'Today',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  custom: 'Custom',
}

const METRIC_CARDS = [
  {
    id: 'deposits',
    label: 'Total Deposits',
    value: '$0',
    tone: 'green',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 12l4 4 4-4M12 8v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'withdrawals',
    label: 'Total Withdrawals',
    value: '$0',
    tone: 'red',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 12l4-4 4 4M12 16V8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'net-balance',
    label: 'Net Balance',
    value: '$0',
    tone: 'purple',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 8h10M7 16h10M9 6l-2 4 2 4M15 14l2-4-2-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'transaction-fees',
    label: 'Transaction Fees',
    value: '$0',
    tone: 'blue',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 10h4M10 8h4M18 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    value: '$0',
    tone: 'navy',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    id: 'google-ads',
    label: 'Google Ads',
    value: '$0',
    tone: 'orange',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 14l4-8h8l4 8-4 8H8l-4-8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'loyalty-retention',
    label: 'Loyalty Retention Fees',
    value: '$0',
    tone: 'magenta',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="9" r="4" stroke="currentColor" strokeWidth="1.8" />
        <path d="M6 20c1.5-3 3.5-4.5 6-4.5s4.5 1.5 6 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
]

type CustomerStatus = 'active' | 'suspended' | 'banned'
type CustomerFilter = 'all' | CustomerStatus

type CustomerItem = {
  id: string
  username: string
  initial: string
  avatarBg: string
  contact: string
  balance: string
  points: string
  status: CustomerStatus
}

const CUSTOMER_FILTERS: { id: CustomerFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'banned', label: 'Banned' },
]

type VendorFinancePeriod = 'daily' | 'weekly' | 'monthly' | 'custom'
type VendorFinanceSort = 'deposits' | 'redeems'

type VendorFinanceItem = {
  id: string
  initials: string
  name: string
  customers: number
  txns: number
  deposits: number
  redeems: number
  status: 'active' | 'suspended'
}

const VENDOR_FINANCE_PERIODS: { id: VendorFinancePeriod; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'custom', label: 'Custom' },
]

const EMPTY_RESERVE_WALLET = '$0.00'

const DETAIL_RANGES: { id: keyof AdminCustomerDetail['stats']; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: 'month', label: 'Month' },
  { id: 'all', label: 'All' },
]

const EMPTY_PERIOD_STATS: AdminPeriodStats = {
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

function normalizeCustomerStatus(status: string): CustomerStatus {
  if (status === 'suspended' || status === 'banned') return status
  return 'active'
}

function statusLabel(status: CustomerStatus): string {
  if (status === 'suspended') return 'Suspended'
  if (status === 'banned') return 'Banned'
  return 'Active'
}

function mapApiCustomer(customer: AdminFinanceCustomer): CustomerItem {
  return {
    id: customer.id,
    username: customer.username,
    initial: customer.initial || customer.username.charAt(0).toUpperCase() || '?',
    avatarBg: customer.avatarBg || '#dbeafe',
    contact: customer.contact,
    balance: customer.balance,
    points: `${Number(customer.points || 0).toLocaleString()} pts`,
    status: normalizeCustomerStatus(customer.status),
  }
}

function vendorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function mapApiVendor(vendor: AdminFinanceVendor): VendorFinanceItem {
  return {
    id: vendor.id,
    initials: vendorInitials(vendor.name),
    name: vendor.name,
    customers: vendor.customers ?? 0,
    txns: vendor.volume ?? 0,
    deposits: vendor.depositsAmount ?? 0,
    redeems: vendor.redeemsAmount ?? 0,
    status: vendor.status === 'suspended' ? 'suspended' : 'active',
  }
}

const VENDOR_PERIOD_TO_RANGE: Record<VendorFinancePeriod, FinanceRange> = {
  daily: 'today',
  weekly: '7d',
  monthly: '30d',
  custom: 'custom',
}

const RANGE_TO_VENDOR_PERIOD: Record<FinanceRange, VendorFinancePeriod> = {
  today: 'daily',
  '7d': 'weekly',
  '30d': 'monthly',
  custom: 'custom',
}

function parseMoney(value: string): number {
  const n = Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function formatUsd(amount: number): string {
  return `$${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

function FinanceAnalyticsSkeleton() {
  return (
    <div className="admin-finance-analytics" aria-busy="true" aria-label="Loading analytics">
      <div className="admin-finance-toolbar">
        <h1 className="admin-finance-title">Platform Analytics</h1>
        <button type="button" className="admin-finance-csv-btn" disabled>
          CSV
        </button>
      </div>
      <div className="admin-skel admin-skel--block-lg" />
      <div className="admin-finance-metrics">
        {METRIC_CARDS.map((metric) => (
          <div key={metric.id} className="admin-finance-metric-card">
            <div className="admin-skel admin-skel--icon-sm" />
            <div className="admin-skel admin-skel--stat" />
            <div className="admin-skel admin-skel--caption" />
          </div>
        ))}
      </div>
      <div className="admin-skel admin-skel--block" />
      <div className="admin-skel admin-skel--block" />
      <div className="admin-skel admin-skel--block" />
    </div>
  )
}

function FinanceAnalyticsTab({
  finance,
  useApi,
  loading,
  range,
  onRangeChange,
}: {
  finance: AdminFinance | null
  useApi: boolean
  loading: boolean
  range: FinanceRange
  onRangeChange: (range: FinanceRange) => void
}) {
  if (loading) return <FinanceAnalyticsSkeleton />

  const analytics = useApi && finance ? finance.analytics : null

  const metricCards = METRIC_CARDS.map((metric) => {
    if (!analytics) return metric
    const valueById: Record<string, string> = {
      deposits: analytics.deposits,
      withdrawals: analytics.withdrawals,
      'net-balance': analytics.netBalance,
      'transaction-fees': analytics.transactionFees,
      subscriptions: analytics.subscriptions,
      'google-ads': analytics.googleAds,
      'loyalty-retention': analytics.loyaltyRetentionFees,
    }
    return { ...metric, value: valueById[metric.id] ?? '$0' }
  })

  const platformRevenue = analytics?.platformRevenue ?? '$0'

  const topVendors = useApi
    ? (finance?.topVendors || finance?.vendors || []).map((vendor) => ({
        id: vendor.id,
        name: vendor.name,
        amount: vendor.netAmount ?? vendor.depositsAmount ?? 0,
      }))
    : []
  const chartMax = Math.max(...topVendors.map((vendor) => vendor.amount), 1)

  return (
    <div className="admin-finance-analytics">
      <div className="admin-finance-toolbar">
        <h1 className="admin-finance-title">Platform Analytics</h1>
        <button type="button" className="admin-finance-csv-btn">
          CSV
        </button>
      </div>

      <div className="admin-finance-range-pills" role="tablist" aria-label="Time range">
        {FINANCE_RANGES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={range === item.id}
            className={`admin-finance-range-btn ${range === item.id ? 'admin-finance-range-btn--active' : ''}`}
            onClick={() => onRangeChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <article className="admin-finance-revenue-card">
        <p className="admin-finance-revenue-label">PLATFORM REVENUE</p>
        <p className="admin-finance-revenue-value">{platformRevenue}</p>
        <p className="admin-finance-revenue-meta">
          {RANGE_META_LABEL[range]} · fees + subscriptions + Google Ads + loyalty retention
        </p>
      </article>

      <div className="admin-finance-metrics">
        {metricCards.map((metric) => (
          <button key={metric.id} type="button" className="admin-finance-metric-card">
            <div className="admin-finance-metric-top">
              <span className={`admin-finance-metric-icon admin-finance-metric-icon--${metric.tone}`}>
                {metric.icon}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M9 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className={`admin-finance-metric-value admin-finance-metric-value--${metric.tone}`}>
              {metric.value}
            </p>
            <p className="admin-finance-metric-label">{metric.label}</p>
          </button>
        ))}
      </div>

      <section className="admin-finance-top-vendors" aria-label="Top vendors by revenue">
        <h2 className="admin-finance-top-vendors-title">TOP VENDORS BY REVENUE</h2>
        <div className="admin-finance-top-vendors-list">
          {topVendors.length === 0 ? (
            <p className="admin-empty-hint">No vendor revenue yet.</p>
          ) : (
            topVendors.map((vendor) => (
              <article key={vendor.id} className="admin-finance-top-vendor-row">
                <div className="admin-finance-top-vendor-head">
                  <span className="admin-finance-top-vendor-name">{vendor.name}</span>
                  <span className="admin-finance-top-vendor-amount">
                    ${vendor.amount.toLocaleString()}
                  </span>
                </div>
                <div className="admin-finance-top-vendor-track" aria-hidden="true">
                  <span
                    className="admin-finance-top-vendor-fill"
                    style={{ width: `${(vendor.amount / chartMax) * 100}%` }}
                  />
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <button type="button" className="admin-finance-ai-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3l1.2 4.2L17.5 8 13.2 9.2 12 13.5 10.8 9.2 6.5 8l4.3-.8L12 3zM5 14l.8 2.8L8.5 17l-2.7 1.2L5 21l-.8-2.8L1.5 17l2.7-1.2L5 14zM19 14l.8 2.8L22.5 17l-2.7 1.2L19 21l-.8-2.8L15.5 17l2.7-1.2L19 14z"
            fill="currentColor"
          />
        </svg>
        Ask AI
      </button>
    </div>
  )
}

function CustomerDetailView({
  customerId,
  onBack,
}: {
  customerId: string
  onBack: () => void
}) {
  const [range, setRange] = useState<keyof AdminCustomerDetail['stats']>('30d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState<AdminCustomerDetail | null>(null)

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
      .adminCustomerDetail(customerId)
      .then((res) => {
        if (!cancelled) setDetail(res)
      })
      .catch((err) => {
        if (!cancelled) {
          setDetail(null)
          setError(err instanceof ApiError ? err.message : 'Could not load customer details.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [customerId])

  const customer = detail?.customer
  const stats = detail?.stats?.[range] ?? EMPTY_PERIOD_STATS
  const status = normalizeCustomerStatus(customer?.status || 'active')

  return (
    <div className="admin-finance-customer-detail">
      <button type="button" className="admin-finance-customer-detail-back" onClick={onBack}>
        ← Back
      </button>

      {error ? <p className="admin-api-error">{error}</p> : null}

      {loading || !customer ? (
        <div aria-busy="true" aria-label="Loading customer details">
          <div className="admin-skel admin-skel--block-lg" />
          <div className="admin-skel admin-skel--block" style={{ marginTop: 12 }} />
          <div className="admin-skel admin-skel--block" style={{ marginTop: 12 }} />
        </div>
      ) : (
        <>
          <section className="admin-finance-customer-detail-hero">
            <span
              className="admin-finance-customer-avatar admin-finance-customer-avatar--lg"
              style={{ backgroundColor: customer.avatarBg || '#dbeafe' }}
            >
              {customer.initial}
            </span>
            <div className="admin-finance-customer-detail-hero-main">
              <div className="admin-finance-customer-detail-hero-top">
                <h1 className="admin-finance-customer-detail-title">{customer.username}</h1>
                <span className={`admin-finance-customer-status admin-finance-customer-status--${status}`}>
                  {statusLabel(status)}
                </span>
              </div>
              <p className="admin-finance-customer-detail-meta">
                {customer.displayName || customer.username}
                {customer.vendors != null
                  ? ` · ${customer.vendors} ${customer.vendors === 1 ? 'vendor' : 'vendors'}`
                  : ''}
              </p>
            </div>
          </section>

          <div className="admin-finance-customer-detail-info-grid">
            <article className="admin-finance-customer-detail-info-card">
              <p className="admin-finance-customer-detail-info-label">Wallet</p>
              <p className="admin-finance-customer-detail-info-value">
                {detail.wallet?.balance || '$0.00'}{' '}
                <span>{detail.wallet?.currency || 'USD'}</span>
              </p>
            </article>
            <article className="admin-finance-customer-detail-info-card">
              <p className="admin-finance-customer-detail-info-label">Points</p>
              <p className="admin-finance-customer-detail-info-value">
                {(detail.wallet?.points ?? customer.points ?? 0).toLocaleString()}
              </p>
            </article>
            <article className="admin-finance-customer-detail-info-card">
              <p className="admin-finance-customer-detail-info-label">Email</p>
              <p className="admin-finance-customer-detail-info-value">{customer.email || '—'}</p>
            </article>
            <article className="admin-finance-customer-detail-info-card">
              <p className="admin-finance-customer-detail-info-label">Phone</p>
              <p className="admin-finance-customer-detail-info-value">
                {customer.phone || customer.contact || '—'}
              </p>
            </article>
          </div>

          <div className="admin-finance-customer-detail-ranges" role="tablist" aria-label="Stats range">
            {DETAIL_RANGES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={range === item.id}
                className={`admin-finance-customer-detail-range ${
                  range === item.id ? 'admin-finance-customer-detail-range--active' : ''
                }`}
                onClick={() => setRange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="admin-finance-customer-detail-stats">
            <article className="admin-finance-customer-detail-stat">
              <p className="admin-finance-customer-detail-stat-value admin-finance-customer-detail-stat-value--green">
                {stats.sales}
              </p>
              <p className="admin-finance-customer-detail-stat-label">Loads</p>
              <p className="admin-finance-customer-detail-stat-meta">{stats.salesTx} txns</p>
            </article>
            <article className="admin-finance-customer-detail-stat">
              <p className="admin-finance-customer-detail-stat-value admin-finance-customer-detail-stat-value--red">
                {stats.redeems}
              </p>
              <p className="admin-finance-customer-detail-stat-label">Redeems</p>
              <p className="admin-finance-customer-detail-stat-meta">{stats.redeemTx} txns</p>
            </article>
            <article className="admin-finance-customer-detail-stat">
              <p className="admin-finance-customer-detail-stat-value">{stats.net}</p>
              <p className="admin-finance-customer-detail-stat-label">Net</p>
              <p className="admin-finance-customer-detail-stat-meta">{stats.txCount} total</p>
            </article>
          </div>

          <div className="admin-finance-customer-detail-avgs">
            <span>Avg load {stats.inAvg}</span>
            <span>Avg redeem {stats.redeemAvg}</span>
          </div>

          <section>
            <h2 className="admin-finance-customer-detail-section-title">Linked vendors</h2>
            {(detail.vendors || []).length === 0 ? (
              <p className="admin-empty-hint">No linked vendors.</p>
            ) : (
              <div className="admin-finance-customer-detail-vendors">
                {detail.vendors.map((vendor) => (
                  <article key={vendor.id} className="admin-finance-customer-detail-vendor">
                    <p className="admin-finance-customer-detail-vendor-name">{vendor.name}</p>
                    <p className="admin-finance-customer-detail-vendor-meta">{vendor.status}</p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="admin-finance-customer-detail-section-title">Recent orders</h2>
            {(detail.recentOrders || []).length === 0 ? (
              <p className="admin-empty-hint">No recent orders.</p>
            ) : (
              <div className="admin-finance-customer-detail-orders">
                {detail.recentOrders.map((order) => (
                  <article key={order.id} className="admin-finance-customer-detail-order">
                    <div>
                      <p className="admin-finance-customer-detail-order-title">
                        {order.name || order.game || order.type}
                      </p>
                      <p className="admin-finance-customer-detail-order-meta">
                        {order.type} · {order.status} · {order.date} {order.time}
                      </p>
                    </div>
                    <p
                      className={`admin-finance-customer-detail-order-amount ${
                        order.positive === false ? 'admin-finance-customer-detail-order-amount--out' : ''
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

function FinanceCustomersTab({
  finance,
  useApi,
  loading,
}: {
  finance: AdminFinance | null
  useApi: boolean
  loading: boolean
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<CustomerFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const customers = useApi && finance ? finance.customers.map(mapApiCustomer) : []
  const totalPlayers = customers.length

  const walletBalanceLabel = useMemo(() => {
    if (!customers.length) return '$0'
    const sum = customers.reduce((acc, customer) => acc + parseMoney(customer.balance), 0)
    return formatUsd(sum)
  }, [customers])

  const pointsIssuedLabel = useMemo(() => {
    if (!finance?.customers.length) return '0 pts'
    const sum = finance.customers.reduce((acc, customer) => acc + Number(customer.points || 0), 0)
    return `${sum.toLocaleString()} pts`
  }, [finance])

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return customers.filter((customer) => {
      const matchesFilter = filter === 'all' || customer.status === filter
      const matchesSearch =
        !query ||
        customer.username.toLowerCase().includes(query) ||
        customer.contact.toLowerCase().includes(query)
      return matchesFilter && matchesSearch
    })
  }, [customers, search, filter])

  if (selectedId) {
    return <CustomerDetailView customerId={selectedId} onBack={() => setSelectedId(null)} />
  }

  if (loading) {
    return (
      <div className="admin-finance-customers" aria-busy="true" aria-label="Loading customers">
        <div className="admin-finance-customer-stats">
          {[1, 2, 3].map((n) => (
            <article key={n} className="admin-finance-customer-stat-card">
              <div className="admin-skel admin-skel--stat admin-skel--center" />
              <div className="admin-skel admin-skel--caption admin-skel--center" />
            </article>
          ))}
        </div>
        <div className="admin-skel admin-skel--block" style={{ height: 46, borderRadius: 999 }} />
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="admin-skel admin-skel--block" style={{ marginTop: 10 }} />
        ))}
      </div>
    )
  }

  return (
    <div className="admin-finance-customers">
      <div className="admin-finance-customer-stats">
        <article className="admin-finance-customer-stat-card">
          <p className="admin-finance-customer-stat-value">{totalPlayers.toLocaleString()}</p>
          <p className="admin-finance-customer-stat-label">Total Players</p>
        </article>
        <article className="admin-finance-customer-stat-card">
          <p className="admin-finance-customer-stat-value admin-finance-customer-stat-value--purple">
            {walletBalanceLabel}
          </p>
          <p className="admin-finance-customer-stat-label">Wallet Bal. (Σ)</p>
        </article>
        <article className="admin-finance-customer-stat-card">
          <p className="admin-finance-customer-stat-value admin-finance-customer-stat-value--gold">
            {pointsIssuedLabel}
          </p>
          <p className="admin-finance-customer-stat-label">Points Issued</p>
        </article>
      </div>

      <label className="admin-finance-customer-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          placeholder="Search username, email, or phone..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search customers"
        />
      </label>

      <div className="admin-finance-customer-filters" role="tablist" aria-label="Customer filters">
        {CUSTOMER_FILTERS.map((item) => {
          const active = filter === item.id
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`admin-finance-customer-filter ${active ? 'admin-finance-customer-filter--active' : ''}`}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <p className="admin-finance-customer-count">
        {filteredCustomers.length} of {totalPlayers.toLocaleString()} players
      </p>

      <div className="admin-finance-customer-list">
        {filteredCustomers.length === 0 ? (
          <p className="admin-empty-hint">No customers yet.</p>
        ) : (
          filteredCustomers.map((customer) => (
            <button
              key={customer.id}
              type="button"
              className="admin-finance-customer-card"
              onClick={() => setSelectedId(customer.id)}
            >
              <span
                className="admin-finance-customer-avatar"
                style={{ backgroundColor: customer.avatarBg }}
              >
                {customer.initial}
              </span>
              <div className="admin-finance-customer-info">
                <p className="admin-finance-customer-username">{customer.username}</p>
                <p className="admin-finance-customer-contact">{customer.contact}</p>
              </div>
              <div className="admin-finance-customer-balances">
                <p className="admin-finance-customer-balance">{customer.balance}</p>
                <p className="admin-finance-customer-points">{customer.points}</p>
              </div>
              <span className={`admin-finance-customer-status admin-finance-customer-status--${customer.status}`}>
                {statusLabel(customer.status)}
              </span>
              <span className="admin-finance-customer-chevron" aria-hidden="true">
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
            </button>
          ))
        )}
      </div>
    </div>
  )
}

function FinanceVendorsTab({
  finance,
  useApi,
  loading,
  range,
  onRangeChange,
}: {
  finance: AdminFinance | null
  useApi: boolean
  loading: boolean
  range: FinanceRange
  onRangeChange: (range: FinanceRange) => void
}) {
  const period = RANGE_TO_VENDOR_PERIOD[range]
  const [sortBy, setSortBy] = useState<VendorFinanceSort>('deposits')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const vendorList = useMemo(() => {
    if (!useApi || !finance) return []
    const source = finance.vendors || finance.topVendors || []
    return source.map(mapApiVendor)
  }, [finance, useApi])

  const summary = useMemo(() => {
    if (!useApi || !finance) return { deposits: 0, redeems: 0, net: 0 }
    const source = finance.vendors || finance.topVendors || []
    const deposits = source.reduce((acc, vendor) => acc + (vendor.depositsAmount ?? 0), 0)
    const redeems = source.reduce((acc, vendor) => acc + (vendor.redeemsAmount ?? 0), 0)
    return { deposits, redeems, net: deposits - redeems }
  }, [finance, useApi])

  const sortedVendors = useMemo(() => {
    const vendors = [...vendorList]
    vendors.sort((a, b) => (sortBy === 'deposits' ? b.deposits - a.deposits : b.redeems - a.redeems))
    return vendors.map((vendor, index) => ({ ...vendor, rank: index + 1 }))
  }, [sortBy, vendorList])

  if (selectedId) {
    return <VendorDetailView vendorId={selectedId} onBack={() => setSelectedId(null)} />
  }

  if (loading) {
    return (
      <div className="admin-finance-vendors" aria-busy="true" aria-label="Loading vendor financials">
        <div className="admin-finance-vendors-intro">
          <h1 className="admin-finance-vendors-title">Vendor Financials</h1>
          <p className="admin-finance-vendors-subtitle">Deposits &amp; redeems per vendor</p>
        </div>
        <div className="admin-finance-vendors-summary">
          {[1, 2, 3].map((n) => (
            <article key={n} className="admin-finance-vendors-summary-card">
              <div className="admin-skel admin-skel--stat admin-skel--center" />
              <div className="admin-skel admin-skel--caption admin-skel--center" />
            </article>
          ))}
        </div>
        {[1, 2, 3].map((n) => (
          <div key={n} className="admin-skel admin-skel--block-lg" style={{ marginTop: 10 }} />
        ))}
      </div>
    )
  }

  return (
    <div className="admin-finance-vendors">
      <div className="admin-finance-vendors-intro">
        <h1 className="admin-finance-vendors-title">Vendor Financials</h1>
        <p className="admin-finance-vendors-subtitle">
          Deposits &amp; redeems per vendor · {RANGE_META_LABEL[range]}
        </p>
      </div>

      <div className="admin-finance-vendors-periods" role="tablist" aria-label="Time period">
        {VENDOR_FINANCE_PERIODS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={period === item.id}
            className={`admin-finance-vendors-period ${period === item.id ? 'admin-finance-vendors-period--active' : ''}`}
            onClick={() => onRangeChange(VENDOR_PERIOD_TO_RANGE[item.id])}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="admin-finance-vendors-summary">
        <article className="admin-finance-vendors-summary-card">
          <p className="admin-finance-vendors-summary-value admin-finance-vendors-summary-value--green">
            ${summary.deposits.toLocaleString()}
          </p>
          <p className="admin-finance-vendors-summary-label">Deposits</p>
        </article>
        <article className="admin-finance-vendors-summary-card">
          <p className="admin-finance-vendors-summary-value admin-finance-vendors-summary-value--red">
            ${summary.redeems.toLocaleString()}
          </p>
          <p className="admin-finance-vendors-summary-label">Redeems</p>
        </article>
        <article className="admin-finance-vendors-summary-card">
          <p className="admin-finance-vendors-summary-value admin-finance-vendors-summary-value--purple">
            ${summary.net.toLocaleString()}
          </p>
          <p className="admin-finance-vendors-summary-label">Net</p>
        </article>
      </div>

      <div className="admin-finance-vendors-sort">
        <span className="admin-finance-vendors-sort-label">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M8 9l4-4 4 4M8 15l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Sort by
        </span>
        <div className="admin-finance-vendors-sort-options">
          <button
            type="button"
            className={`admin-finance-vendors-sort-btn ${sortBy === 'deposits' ? 'admin-finance-vendors-sort-btn--active' : ''}`}
            onClick={() => setSortBy('deposits')}
          >
            Highest Deposits
          </button>
          <button
            type="button"
            className={`admin-finance-vendors-sort-btn ${sortBy === 'redeems' ? 'admin-finance-vendors-sort-btn--active' : ''}`}
            onClick={() => setSortBy('redeems')}
          >
            Highest Redeems
          </button>
        </div>
      </div>

      <div className="admin-finance-vendors-list">
        {sortedVendors.length === 0 ? (
          <p className="admin-empty-hint">No vendor financials yet.</p>
        ) : (
          sortedVendors.map((vendor) => {
            const net = vendor.deposits - vendor.redeems
            const barMax = Math.max(vendor.deposits, vendor.redeems, 1)
            const statusText = vendor.status === 'active' ? 'Active' : 'Suspended'

            return (
              <button
                key={vendor.id}
                type="button"
                className="admin-finance-vendor-card"
                onClick={() => setSelectedId(vendor.id)}
              >
                <div className="admin-finance-vendor-card-head">
                  <div className="admin-finance-vendor-card-title-row">
                    <span className="admin-finance-vendor-avatar">{vendor.initials}</span>
                    <div>
                      <h3 className="admin-finance-vendor-name">
                        #{vendor.rank} {vendor.name}
                      </h3>
                      <p className="admin-finance-vendor-meta">
                        {vendor.customers} customers · {vendor.txns} txns
                      </p>
                    </div>
                  </div>
                  <span className={`admin-finance-vendor-status admin-finance-vendor-status--${vendor.status}`}>
                    {statusText}
                  </span>
                </div>

                <div className="admin-finance-vendor-metric">
                  <div className="admin-finance-vendor-metric-head">
                    <span>Deposits</span>
                    <span className="admin-finance-vendor-metric-value admin-finance-vendor-metric-value--green">
                      ${vendor.deposits.toLocaleString()}
                    </span>
                  </div>
                  <div className="admin-finance-vendor-track" aria-hidden="true">
                    <span
                      className="admin-finance-vendor-fill admin-finance-vendor-fill--green"
                      style={{ width: `${(vendor.deposits / barMax) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="admin-finance-vendor-metric">
                  <div className="admin-finance-vendor-metric-head">
                    <span>Redeems</span>
                    <span className="admin-finance-vendor-metric-value admin-finance-vendor-metric-value--red">
                      ${vendor.redeems.toLocaleString()}
                    </span>
                  </div>
                  <div className="admin-finance-vendor-track" aria-hidden="true">
                    <span
                      className="admin-finance-vendor-fill admin-finance-vendor-fill--red"
                      style={{ width: `${(vendor.redeems / barMax) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="admin-finance-vendor-net">
                  <span>Net (deposits – redeems)</span>
                  <span
                    className={`admin-finance-vendor-net-value ${
                      net < 0 ? 'admin-finance-vendor-net-value--negative' : ''
                    }`}
                  >
                    {net < 0 ? '-' : ''}${Math.abs(net).toLocaleString()}
                  </span>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

function FeeSettingsToggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description: string
}) {
  return (
    <div className="admin-finance-fees-toggle-row">
      <div>
        <p className="admin-finance-fees-toggle-label">{label}</p>
        <p className="admin-finance-fees-toggle-desc">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`admin-finance-fees-toggle ${checked ? 'admin-finance-fees-toggle--on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="admin-finance-fees-toggle-knob" />
      </button>
    </div>
  )
}

function FinanceFeesTab({
  finance,
  useApi,
  onFeesUpdated,
  onRefresh,
}: {
  finance: AdminFinance | null
  useApi: boolean
  onFeesUpdated?: (fees: AdminFees) => void
  onRefresh?: () => Promise<void>
}) {
  const [withdrawalsEnabled, setWithdrawalsEnabled] = useState(true)
  const [depositsEnabled, setDepositsEnabled] = useState(true)
  const [emailBlastsEnabled, setEmailBlastsEnabled] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [depositFee, setDepositFee] = useState('2')
  const [redeemFee, setRedeemFee] = useState('2')
  const [playerRankUpgrade, setPlayerRankUpgrade] = useState('9.99')
  const [vendorGameAutomation, setVendorGameAutomation] = useState('999')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!useApi || !finance?.fees || dirty) return
    const fees = finance.fees
    setWithdrawalsEnabled(Boolean(fees.withdrawalsEnabled))
    setDepositsEnabled(Boolean(fees.depositsEnabled))
    setEmailBlastsEnabled(Boolean(fees.emailBlastsEnabled))
    setMaintenanceMode(Boolean(fees.maintenanceMode))
    setDepositFee(String(fees.depositFeePct ?? 2))
    setRedeemFee(String(fees.redeemFeePct ?? 2))
    setPlayerRankUpgrade(String(fees.playerRankUpgradeMo ?? 9.99))
    setVendorGameAutomation(String(fees.vendorGameAutomationMo ?? 999))
  }, [dirty, finance, useApi])

  const feeEstimate = useMemo(() => {
    const depositVolume = Number(finance?.feeEstimate?.depositVolume ?? 0)
    const redeemVolume = Number(finance?.feeEstimate?.redeemVolume ?? 0)
    const depositPct = Number(depositFee)
    const redeemPct = Number(redeemFee)
    const safeDepositPct = Number.isFinite(depositPct) ? Math.max(0, depositPct) : 0
    const safeRedeemPct = Number.isFinite(redeemPct) ? Math.max(0, redeemPct) : 0

    const deposits =
      depositVolume > 0
        ? (depositVolume * safeDepositPct) / 100
        : Number(finance?.feeEstimate?.depositsAmount ?? 0)
    const redeems =
      redeemVolume > 0
        ? (redeemVolume * safeRedeemPct) / 100
        : Number(finance?.feeEstimate?.redeemsAmount ?? 0)

    return {
      deposits,
      redeems,
      total: deposits + redeems,
      depositVolume,
      redeemVolume,
    }
  }, [depositFee, finance?.feeEstimate, redeemFee])

  function markDirty<T>(setter: (value: T) => void) {
    return (value: T) => {
      setDirty(true)
      setSuccess('')
      setter(value)
    }
  }

  async function handleSave() {
    if (!useApi) {
      setError('API is not configured.')
      return
    }
    const depositFeePct = Number(depositFee)
    const redeemFeePct = Number(redeemFee)
    const playerRankUpgradeMo = Number(playerRankUpgrade)
    const vendorGameAutomationMo = Number(vendorGameAutomation)
    if (
      ![depositFeePct, redeemFeePct, playerRankUpgradeMo, vendorGameAutomationMo].every(
        (n) => Number.isFinite(n) && n >= 0,
      )
    ) {
      setError('Enter valid non-negative fee and pricing values.')
      return
    }

    setBusy(true)
    setError('')
    setSuccess('')
    const payload: Partial<AdminFees> = {
      withdrawalsEnabled,
      depositsEnabled,
      emailBlastsEnabled,
      maintenanceMode,
      depositFeePct,
      redeemFeePct,
      playerRankUpgradeMo,
      vendorGameAutomationMo,
    }
    try {
      const res = await tapstackApi.adminFinanceUpdateFees(payload)
      onFeesUpdated?.(res.fees)
      setDirty(false)
      setSuccess('Fee configuration saved.')
      await onRefresh?.()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save fee configuration.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-finance-fees">
      <div className="admin-finance-fees-intro">
        <h1 className="admin-finance-fees-title">Platform Fee Settings</h1>
        <p className="admin-finance-fees-subtitle">All changes are audit-logged</p>
      </div>

      {error ? <p className="admin-api-error">{error}</p> : null}
      {success ? <p className="admin-api-success">{success}</p> : null}

      <section className="admin-finance-fees-card">
        <h2 className="admin-finance-fees-section-title">GLOBAL CONTROLS</h2>
        <FeeSettingsToggle
          label="Withdrawals Enabled"
          description="Platform-wide withdrawal toggle"
          checked={withdrawalsEnabled}
          onChange={markDirty(setWithdrawalsEnabled)}
        />
        <FeeSettingsToggle
          label="Deposits Enabled"
          description="Platform-wide deposit toggle"
          checked={depositsEnabled}
          onChange={markDirty(setDepositsEnabled)}
        />
        <FeeSettingsToggle
          label="Email Blasts Enabled"
          description="Allow all vendor blasts"
          checked={emailBlastsEnabled}
          onChange={markDirty(setEmailBlastsEnabled)}
        />
        <FeeSettingsToggle
          label="Maintenance Mode"
          description="Lock platform for all users"
          checked={maintenanceMode}
          onChange={markDirty(setMaintenanceMode)}
        />
      </section>

      <section className="admin-finance-fees-card">
        <h2 className="admin-finance-fees-section-title">TRANSACTION FEES</h2>
        <div className="admin-finance-fees-input-row">
          <label className="admin-finance-fees-field">
            <span className="admin-finance-fees-field-label">Deposit Fee %</span>
            <div className="admin-finance-fees-percent-wrap">
              <input
                type="number"
                className="admin-finance-fees-percent-input"
                value={depositFee}
                onChange={(event) => markDirty(setDepositFee)(event.target.value)}
                min="0"
                step="0.1"
              />
              <span className="admin-finance-fees-percent-suffix">%</span>
            </div>
            <span className="admin-finance-fees-field-help admin-finance-fees-field-help--green">
              Charged on each player deposit
            </span>
          </label>

          <label className="admin-finance-fees-field">
            <span className="admin-finance-fees-field-label">Redeem Fee %</span>
            <div className="admin-finance-fees-percent-wrap">
              <input
                type="number"
                className="admin-finance-fees-percent-input"
                value={redeemFee}
                onChange={(event) => markDirty(setRedeemFee)(event.target.value)}
                min="0"
                step="0.1"
              />
              <span className="admin-finance-fees-percent-suffix">%</span>
            </div>
            <span className="admin-finance-fees-field-help admin-finance-fees-field-help--red">
              Charged on each redeem / payout
            </span>
          </label>
        </div>

        <p className="admin-finance-fees-estimate">
          Est. lifetime take: <strong>{formatUsd(feeEstimate.total)}</strong> (
          <span className="admin-finance-fees-estimate-green">
            {formatUsd(feeEstimate.deposits)} deposits
          </span>{' '}
          +{' '}
          <span className="admin-finance-fees-estimate-red">
            {formatUsd(feeEstimate.redeems)} redeems
          </span>
          )
        </p>
        <p className="admin-finance-fees-estimate-meta">
          Based on {formatUsd(feeEstimate.depositVolume)} deposit volume ·{' '}
          {formatUsd(feeEstimate.redeemVolume)} redeem volume
        </p>
      </section>

      <section className="admin-finance-fees-card">
        <h2 className="admin-finance-fees-section-title">SUBSCRIPTION PRICING</h2>
        <p className="admin-finance-fees-section-desc">Two subscription tiers on the platform</p>

        <label className="admin-finance-fees-subscription-field">
          <span className="admin-finance-fees-subscription-label">
            <span className="admin-finance-fees-subscription-label-main">
              Player Rank Upgrade ($/mo)
            </span>
            <span className="admin-finance-fees-subscription-label-desc">
              {' '}
              — Faster rank & tier progression
            </span>
          </span>
          <div className="admin-finance-fees-money-wrap">
            <span className="admin-finance-fees-money-prefix">$</span>
            <input
              type="number"
              className="admin-finance-fees-money-input"
              value={playerRankUpgrade}
              onChange={(event) => markDirty(setPlayerRankUpgrade)(event.target.value)}
              min="0"
              step="0.01"
            />
          </div>
        </label>

        <label className="admin-finance-fees-subscription-field">
          <span className="admin-finance-fees-subscription-label">
            <span className="admin-finance-fees-subscription-label-main">
              Vendor Game Automation ($/mo)
            </span>
            <span className="admin-finance-fees-subscription-label-desc">
              {' '}
              — Monthly automation subscription
            </span>
          </span>
          <div className="admin-finance-fees-money-wrap">
            <span className="admin-finance-fees-money-prefix">$</span>
            <input
              type="number"
              className="admin-finance-fees-money-input"
              value={vendorGameAutomation}
              onChange={(event) => markDirty(setVendorGameAutomation)(event.target.value)}
              min="0"
              step="1"
            />
          </div>
        </label>
      </section>

      <button
        type="button"
        className="admin-finance-fees-save-btn"
        onClick={() => void handleSave()}
        disabled={busy || !useApi}
      >
        {busy ? 'Saving…' : 'Save Fee Configuration'}
      </button>
    </div>
  )
}

function FinanceTransferTab({
  finance,
  useApi,
  reserveWallet,
  onReserveWalletChange,
  onRefresh,
}: {
  finance: AdminFinance | null
  useApi: boolean
  reserveWallet: string
  onReserveWalletChange: (value: string) => void
  onRefresh?: () => Promise<void>
}) {
  const [username, setUsername] = useState('')
  const [amount, setAmount] = useState('')
  const [recipientType, setRecipientType] = useState<'vendor' | 'player' | 'distributor'>('vendor')
  const [recipient, setRecipient] = useState('')
  const [structuredAmount, setStructuredAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const displayReserve =
    reserveWallet ||
    (useApi && finance?.reserveWallet ? finance.reserveWallet : EMPTY_RESERVE_WALLET)

  const recipientOptions = useMemo(() => {
    const recipients = finance?.transferRecipients
    if (!recipients) return []
    if (recipientType === 'vendor') return recipients.vendor ?? []
    if (recipientType === 'player') return recipients.player ?? []
    return recipients.distributor ?? []
  }, [finance?.transferRecipients, recipientType])

  useEffect(() => {
    if (!recipientOptions.length) {
      setRecipient('')
      return
    }
    if (!recipientOptions.some((option) => option.id === recipient)) {
      setRecipient(recipientOptions[0].id)
    }
  }, [recipient, recipientOptions])

  async function runTransfer(payload: {
    recipient: string
    amount: number
    memo: string
    recipientType?: string
  }) {
    if (!useApi) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const res = await tapstackApi.adminFinanceTransfer(payload)
      if (res.reserveWallet) onReserveWalletChange(res.reserveWallet)
      setSuccess('Transfer completed.')
      await onRefresh?.()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Transfer failed.')
    } finally {
      setBusy(false)
    }
  }

  async function handleUsernameSend() {
    const trimmed = username.trim()
    const value = Number(amount)
    if (!trimmed) {
      setError('Enter a username.')
      return
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a valid amount.')
      return
    }
    await runTransfer({
      recipient: trimmed,
      amount: value,
      memo: 'P2P transfer',
      recipientType: 'player',
    })
  }

  async function handleStructuredTransfer() {
    const value = Number(structuredAmount)
    const memoText = memo.trim()
    if (!recipient) {
      setError('Select a recipient.')
      return
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a valid amount.')
      return
    }
    if (!memoText) {
      setError('Memo is required.')
      return
    }
    await runTransfer({
      recipient,
      amount: value,
      memo: memoText,
      recipientType,
    })
  }

  return (
    <div className="admin-finance-transfer">
      <div className="admin-finance-transfer-intro">
        <h1 className="admin-finance-transfer-title">Fund Transfer</h1>
        <p className="admin-finance-transfer-subtitle">
          Move funds from reserve wallet to any entity
        </p>
      </div>

      {error ? <p className="admin-api-error">{error}</p> : null}
      {success ? <p className="admin-api-success">{success}</p> : null}

      <section className="admin-finance-transfer-wallet">
        <p className="admin-finance-transfer-wallet-label">Platform Reserve Wallet</p>
        <p className="admin-finance-transfer-wallet-balance">{displayReserve}</p>
        <p className="admin-finance-transfer-wallet-currency">USDC available</p>
      </section>

      <section className="admin-finance-transfer-card">
        <div className="admin-finance-transfer-card-head">
          <span className="admin-finance-transfer-card-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M22 2L11 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M22 2L15 22L11 13L2 9L22 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <h2 className="admin-finance-transfer-card-title">Send to a Username</h2>
            <p className="admin-finance-transfer-card-desc">
              Send funds peer-to-peer to any @username on the platform.
            </p>
          </div>
        </div>

        <label className="admin-finance-transfer-field">
          <div className="admin-finance-transfer-username-wrap">
            <span className="admin-finance-transfer-username-prefix">@</span>
            <input
              type="text"
              className="admin-finance-transfer-username-input"
              placeholder="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
        </label>

        <div className="admin-finance-transfer-send-row">
          <div className="admin-finance-transfer-amount-wrap">
            <span className="admin-finance-transfer-amount-prefix">$</span>
            <input
              type="number"
              className="admin-finance-transfer-amount-input"
              placeholder="0.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              min="0"
              step="0.01"
            />
          </div>
          <button
            type="button"
            className="admin-finance-transfer-send-btn"
            onClick={() => void handleUsernameSend()}
            disabled={busy}
          >
            {busy ? 'Sending…' : 'Send'}
          </button>
        </div>
      </section>

      <div className="admin-finance-transfer-divider" aria-hidden="true">
        OR STRUCTURED TRANSFER
      </div>

      <section className="admin-finance-transfer-structured">
        <label className="admin-finance-transfer-select-field">
          <span className="admin-finance-transfer-select-label">Recipient Type</span>
          <div className="admin-finance-transfer-select-wrap">
            <select
              className="admin-finance-transfer-select"
              value={recipientType}
              onChange={(event) => {
                setRecipientType(event.target.value as 'vendor' | 'player' | 'distributor')
              }}
            >
              <option value="vendor">Vendor</option>
              <option value="player">Player</option>
              <option value="distributor">Distributor</option>
            </select>
            <svg
              className="admin-finance-transfer-select-icon"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4 10l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </label>

        <label className="admin-finance-transfer-select-field">
          <span className="admin-finance-transfer-select-label">Recipient</span>
          <div className="admin-finance-transfer-select-wrap">
            <select
              className="admin-finance-transfer-select"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              disabled={!recipientOptions.length}
            >
              {recipientOptions.length === 0 ? (
                <option value="">No recipients available</option>
              ) : (
                recipientOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))
              )}
            </select>
            <svg
              className="admin-finance-transfer-select-icon"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4 10l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </label>

        <label className="admin-finance-transfer-select-field">
          <span className="admin-finance-transfer-select-label">Amount (USDC)</span>
          <div className="admin-finance-transfer-amount-wrap admin-finance-transfer-amount-wrap--full">
            <span className="admin-finance-transfer-amount-prefix">$</span>
            <input
              type="number"
              className="admin-finance-transfer-amount-input"
              placeholder="0.00"
              value={structuredAmount}
              onChange={(event) => setStructuredAmount(event.target.value)}
              min="0"
              step="0.01"
            />
          </div>
        </label>

        <label className="admin-finance-transfer-select-field">
          <span className="admin-finance-transfer-select-label">Memo (required)</span>
          <input
            type="text"
            className="admin-finance-transfer-memo-input"
            placeholder="Reason for transfer..."
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
          />
        </label>

        <button
          type="button"
          className="admin-finance-transfer-execute-btn"
          onClick={() => void handleStructuredTransfer()}
          disabled={busy}
        >
          {busy ? 'Transferring…' : 'Execute Transfer'}
        </button>
      </section>
    </div>
  )
}

export default function AdminFinancePage() {
  const useApi = isApiConfigured()
  const [subTab, setSubTab] = useState<FinanceSubTab>('analytics')
  const [range, setRange] = useState<FinanceRange>('30d')
  const [finance, setFinance] = useState<AdminFinance | null>(null)
  const [loading, setLoading] = useState(useApi)
  const [error, setError] = useState('')
  const [reserveWallet, setReserveWallet] = useState(EMPTY_RESERVE_WALLET)

  async function refreshFinance(nextRange = range) {
    if (!useApi) return
    const res = await tapstackApi.adminFinance(nextRange)
    setFinance(res)
    if (res.reserveWallet) setReserveWallet(res.reserveWallet)
  }

  useEffect(() => {
    if (!useApi) {
      setFinance(null)
      setLoading(false)
      setError('')
      setReserveWallet(EMPTY_RESERVE_WALLET)
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')

    tapstackApi
      .adminFinance(range)
      .then((res) => {
        if (cancelled) return
        setFinance(res)
        if (res.reserveWallet) setReserveWallet(res.reserveWallet)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Could not load finance data.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [range, useApi])

  return (
    <div className="admin-finance-page">
      <AdminHeader />

      <nav className="admin-finance-subtabs" aria-label="Finance sections">
        {FINANCE_SUB_TABS.map((tab) => {
          const active = subTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              className={`admin-finance-subtab ${active ? 'admin-finance-subtab--active' : ''}`}
              onClick={() => setSubTab(tab.id)}
            >
              <span className="admin-finance-subtab-icon" aria-hidden="true">
                {tab.icon}
              </span>
              <span className="admin-finance-subtab-label">{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {error ? <p className="admin-api-error">{error}</p> : null}

      {subTab === 'analytics' ? (
        <FinanceAnalyticsTab
          finance={finance}
          useApi={useApi}
          loading={loading}
          range={range}
          onRangeChange={setRange}
        />
      ) : subTab === 'customers' ? (
        <FinanceCustomersTab finance={finance} useApi={useApi} loading={loading} />
      ) : subTab === 'vendors' ? (
        <FinanceVendorsTab
          finance={finance}
          useApi={useApi}
          loading={loading}
          range={range}
          onRangeChange={setRange}
        />
      ) : subTab === 'fees' ? (
        loading ? (
          <div aria-busy="true" aria-label="Loading fee settings">
            <div className="admin-skel admin-skel--block-lg" />
            <div className="admin-skel admin-skel--block-lg" style={{ marginTop: 12 }} />
          </div>
        ) : (
          <FinanceFeesTab
            finance={finance}
            useApi={useApi}
            onFeesUpdated={(fees) =>
              setFinance((prev) => (prev ? { ...prev, fees } : prev))
            }
            onRefresh={() => refreshFinance()}
          />
        )
      ) : subTab === 'transfer' ? (
        loading ? (
          <div aria-busy="true" aria-label="Loading transfer">
            <div className="admin-skel admin-skel--block-lg" />
            <div className="admin-skel admin-skel--block" style={{ marginTop: 12 }} />
            <div className="admin-skel admin-skel--block" style={{ marginTop: 12 }} />
          </div>
        ) : (
          <FinanceTransferTab
            finance={finance}
            useApi={useApi}
            reserveWallet={reserveWallet}
            onReserveWalletChange={setReserveWallet}
            onRefresh={() => refreshFinance()}
          />
        )
      ) : (
        <div className="admin-finance-placeholder">
          <p>{FINANCE_SUB_TABS.find((tab) => tab.id === subTab)?.label} coming soon.</p>
        </div>
      )}
    </div>
  )
}
