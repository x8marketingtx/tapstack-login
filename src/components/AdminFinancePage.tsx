import { useMemo, useState } from 'react'
import { TapStackLogo } from './TapStackLogo'
import './AdminFinancePage.css'

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

const METRIC_CARDS = [
  {
    id: 'deposits',
    label: 'Total Deposits',
    value: '$284,720',
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
    value: '$198,340',
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
    value: '$86,380',
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
    value: '$19,195',
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
    value: '$15,946',
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
    value: '$10,200',
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
    value: '$6,300',
    tone: 'magenta',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="9" r="4" stroke="currentColor" strokeWidth="1.8" />
        <path d="M6 20c1.5-3 3.5-4.5 6-4.5s4.5 1.5 6 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
]

const TOP_VENDORS = [
  { id: 'lucky-strike', name: 'Lucky Strike Arcade', amount: 921 },
  { id: 'pixel-palace', name: 'Pixel Palace Arcade', amount: 640 },
  { id: 'nova-game-zone', name: 'Nova Game Zone', amount: 512 },
]

const topVendorMax = Math.max(...TOP_VENDORS.map((vendor) => vendor.amount))

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

const CUSTOMERS: CustomerItem[] = [
  {
    id: 'player-jace',
    username: 'player_jace',
    initial: 'J',
    avatarBg: '#dbeafe',
    contact: 'jm••••@gmail.com · (***) 482-0193',
    balance: '$120.50',
    points: '4,200 pts',
    status: 'active',
  },
  {
    id: 'lucky-quinn',
    username: 'lucky_quinn',
    initial: 'L',
    avatarBg: '#dcfce7',
    contact: 'lq••••@yahoo.com · (***) 291-7741',
    balance: '$55.00',
    points: '1,850 pts',
    status: 'active',
  },
  {
    id: 'high-roller99',
    username: 'high_roller99',
    initial: 'H',
    avatarBg: '#fef3c7',
    contact: 'hr••••@outlook.com · (***) 903-2210',
    balance: '$940.00',
    points: '18,400 pts',
    status: 'active',
  },
  {
    id: 'arcade-pro',
    username: 'arcade_pro',
    initial: 'A',
    avatarBg: '#fee2e2',
    contact: 'ap••••@icloud.com · (***) 118-9022',
    balance: '$0.00',
    points: '320 pts',
    status: 'suspended',
  },
  {
    id: 'nova-fan',
    username: 'nova_fan',
    initial: 'N',
    avatarBg: '#ede9fe',
    contact: 'nf••••@gmail.com · (***) 640-3318',
    balance: '$210.00',
    points: '7,600 pts',
    status: 'active',
  },
]

const CUSTOMER_FILTERS: { id: CustomerFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'banned', label: 'Banned' },
]

const TOTAL_PLAYERS = 28410

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

const VENDOR_FINANCE_LIST: VendorFinanceItem[] = [
  {
    id: 'lucky-strike',
    initials: 'LS',
    name: 'Lucky Strike Arcade',
    customers: 247,
    txns: 94,
    deposits: 3218,
    redeems: 2140,
    status: 'active',
  },
  {
    id: 'pixel-palace',
    initials: 'PP',
    name: 'Pixel Palace Arcade',
    customers: 188,
    txns: 78,
    deposits: 2740,
    redeems: 1980,
    status: 'active',
  },
  {
    id: 'nova-game-zone',
    initials: 'NG',
    name: 'Nova Game Zone',
    customers: 156,
    txns: 62,
    deposits: 2020,
    redeems: 1570,
    status: 'active',
  },
  {
    id: 'galaxy-tokens',
    initials: 'GT',
    name: 'Galaxy Tokens',
    customers: 134,
    txns: 52,
    deposits: 1420,
    redeems: 1180,
    status: 'active',
  },
  {
    id: 'sun-coast-gaming',
    initials: 'SC',
    name: 'Sun Coast Gaming',
    customers: 98,
    txns: 41,
    deposits: 640,
    redeems: 880,
    status: 'suspended',
  },
]

const VENDOR_FINANCE_SUMMARY = {
  deposits: 9978,
  redeems: 7690,
  net: 2288,
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

function FinanceAnalyticsTab() {
  const [range, setRange] = useState<FinanceRange>('30d')

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
            onClick={() => setRange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <article className="admin-finance-revenue-card">
        <p className="admin-finance-revenue-label">PLATFORM REVENUE</p>
        <p className="admin-finance-revenue-value">$51,640</p>
        <p className="admin-finance-revenue-meta">
          Last 30 Days · fees + subscriptions + Google Ads + loyalty retention
        </p>
      </article>

      <div className="admin-finance-metrics">
        {METRIC_CARDS.map((metric) => (
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
          {TOP_VENDORS.map((vendor) => (
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
                  style={{ width: `${(vendor.amount / topVendorMax) * 100}%` }}
                />
              </div>
            </article>
          ))}
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

function FinanceCustomersTab() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<CustomerFilter>('all')

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return CUSTOMERS.filter((customer) => {
      const matchesFilter = filter === 'all' || customer.status === filter
      const matchesSearch =
        !query ||
        customer.username.toLowerCase().includes(query) ||
        customer.contact.toLowerCase().includes(query)
      return matchesFilter && matchesSearch
    })
  }, [search, filter])

  return (
    <div className="admin-finance-customers">
      <div className="admin-finance-customer-stats">
        <article className="admin-finance-customer-stat-card">
          <p className="admin-finance-customer-stat-value">28,410</p>
          <p className="admin-finance-customer-stat-label">Total Players</p>
        </article>
        <article className="admin-finance-customer-stat-card">
          <p className="admin-finance-customer-stat-value admin-finance-customer-stat-value--purple">
            $48,320
          </p>
          <p className="admin-finance-customer-stat-label">Wallet Bal. (Σ)</p>
        </article>
        <article className="admin-finance-customer-stat-card">
          <p className="admin-finance-customer-stat-value admin-finance-customer-stat-value--gold">
            9.4M pts
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
        {filteredCustomers.length} of {TOTAL_PLAYERS.toLocaleString()} players
      </p>

      <div className="admin-finance-customer-list">
        {filteredCustomers.map((customer) => (
          <article key={customer.id} className="admin-finance-customer-card">
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
              {customer.status}
            </span>
            <button type="button" className="admin-finance-customer-chevron" aria-label={`Open ${customer.username}`}>
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
          </article>
        ))}
      </div>
    </div>
  )
}

function FinanceVendorsTab() {
  const [period, setPeriod] = useState<VendorFinancePeriod>('daily')
  const [sortBy, setSortBy] = useState<VendorFinanceSort>('deposits')

  const sortedVendors = useMemo(() => {
    const vendors = [...VENDOR_FINANCE_LIST]
    vendors.sort((a, b) => (sortBy === 'deposits' ? b.deposits - a.deposits : b.redeems - a.redeems))
    return vendors.map((vendor, index) => ({ ...vendor, rank: index + 1 }))
  }, [sortBy])

  return (
    <div className="admin-finance-vendors">
      <div className="admin-finance-vendors-intro">
        <h1 className="admin-finance-vendors-title">Vendor Financials</h1>
        <p className="admin-finance-vendors-subtitle">Deposits &amp; redeems per vendor</p>
      </div>

      <div className="admin-finance-vendors-periods" role="tablist" aria-label="Time period">
        {VENDOR_FINANCE_PERIODS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={period === item.id}
            className={`admin-finance-vendors-period ${period === item.id ? 'admin-finance-vendors-period--active' : ''}`}
            onClick={() => setPeriod(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="admin-finance-vendors-summary">
        <article className="admin-finance-vendors-summary-card">
          <p className="admin-finance-vendors-summary-value admin-finance-vendors-summary-value--green">
            ${VENDOR_FINANCE_SUMMARY.deposits.toLocaleString()}
          </p>
          <p className="admin-finance-vendors-summary-label">Deposits</p>
        </article>
        <article className="admin-finance-vendors-summary-card">
          <p className="admin-finance-vendors-summary-value admin-finance-vendors-summary-value--red">
            ${VENDOR_FINANCE_SUMMARY.redeems.toLocaleString()}
          </p>
          <p className="admin-finance-vendors-summary-label">Redeems</p>
        </article>
        <article className="admin-finance-vendors-summary-card">
          <p className="admin-finance-vendors-summary-value admin-finance-vendors-summary-value--purple">
            ${VENDOR_FINANCE_SUMMARY.net.toLocaleString()}
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
        {sortedVendors.map((vendor) => {
          const net = vendor.deposits - vendor.redeems
          const barMax = Math.max(vendor.deposits, vendor.redeems)
          const statusLabel = vendor.status === 'active' ? 'Active' : 'Suspended'

          return (
            <article key={vendor.id} className="admin-finance-vendor-card">
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
                  {statusLabel}
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
            </article>
          )
        })}
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

function FinanceFeesTab() {
  const [withdrawalsEnabled, setWithdrawalsEnabled] = useState(true)
  const [depositsEnabled, setDepositsEnabled] = useState(true)
  const [emailBlastsEnabled, setEmailBlastsEnabled] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [depositFee, setDepositFee] = useState('5.0')
  const [redeemFee, setRedeemFee] = useState('2.5')
  const [playerRankUpgrade, setPlayerRankUpgrade] = useState('9.99')
  const [vendorGameAutomation, setVendorGameAutomation] = useState('199')

  return (
    <div className="admin-finance-fees">
      <div className="admin-finance-fees-intro">
        <h1 className="admin-finance-fees-title">Platform Fee Settings</h1>
        <p className="admin-finance-fees-subtitle">All changes are audit-logged</p>
      </div>

      <section className="admin-finance-fees-card">
        <h2 className="admin-finance-fees-section-title">GLOBAL CONTROLS</h2>
        <FeeSettingsToggle
          label="Withdrawals Enabled"
          description="Platform-wide withdrawal toggle"
          checked={withdrawalsEnabled}
          onChange={setWithdrawalsEnabled}
        />
        <FeeSettingsToggle
          label="Deposits Enabled"
          description="Platform-wide deposit toggle"
          checked={depositsEnabled}
          onChange={setDepositsEnabled}
        />
        <FeeSettingsToggle
          label="Email Blasts Enabled"
          description="Allow all vendor blasts"
          checked={emailBlastsEnabled}
          onChange={setEmailBlastsEnabled}
        />
        <FeeSettingsToggle
          label="Maintenance Mode"
          description="Lock platform for all users"
          checked={maintenanceMode}
          onChange={setMaintenanceMode}
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
                onChange={(event) => setDepositFee(event.target.value)}
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
                onChange={(event) => setRedeemFee(event.target.value)}
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
          Est. lifetime take: <strong>$19,195</strong> (
          <span className="admin-finance-fees-estimate-green">$14,236 deposits</span> +{' '}
          <span className="admin-finance-fees-estimate-red">$4,959 redeems</span>)
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
              onChange={(event) => setPlayerRankUpgrade(event.target.value)}
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
              onChange={(event) => setVendorGameAutomation(event.target.value)}
              min="0"
              step="1"
            />
          </div>
        </label>
      </section>

      <button type="button" className="admin-finance-fees-save-btn">
        Save Fee Configuration
      </button>
    </div>
  )
}

function FinanceTransferTab() {
  const [username, setUsername] = useState('')
  const [amount, setAmount] = useState('')
  const [recipientType, setRecipientType] = useState('vendor')
  const [recipient, setRecipient] = useState('lucky-strike')
  const [structuredAmount, setStructuredAmount] = useState('')
  const [memo, setMemo] = useState('')

  const recipientOptions =
    recipientType === 'vendor'
      ? [
          { id: 'lucky-strike', label: 'Lucky Strike Arcade' },
          { id: 'galaxy-tokens', label: 'Galaxy Tokens' },
          { id: 'sun-coast', label: 'Sun Coast Gaming' },
        ]
      : recipientType === 'player'
        ? [
            { id: 'marco-v', label: 'Marco V.' },
            { id: 'priya-s', label: 'Priya S.' },
            { id: 'tom-h', label: 'Tom H.' },
          ]
        : [
            { id: 'west-region', label: 'West Region Partners' },
            { id: 'east-region', label: 'East Region Partners' },
          ]

  return (
    <div className="admin-finance-transfer">
      <div className="admin-finance-transfer-intro">
        <h1 className="admin-finance-transfer-title">Fund Transfer</h1>
        <p className="admin-finance-transfer-subtitle">
          Move funds from reserve wallet to any entity
        </p>
      </div>

      <section className="admin-finance-transfer-wallet">
        <p className="admin-finance-transfer-wallet-label">Platform Reserve Wallet</p>
        <p className="admin-finance-transfer-wallet-balance">$142,800.00</p>
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
          <button type="button" className="admin-finance-transfer-send-btn">
            Send
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
                setRecipientType(event.target.value)
                setRecipient(
                  event.target.value === 'vendor'
                    ? 'lucky-strike'
                    : event.target.value === 'player'
                      ? 'marco-v'
                      : 'west-region',
                )
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
            >
              {recipientOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
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

        <button type="button" className="admin-finance-transfer-execute-btn">
          Execute Transfer
        </button>
      </section>
    </div>
  )
}

export default function AdminFinancePage() {
  const [subTab, setSubTab] = useState<FinanceSubTab>('analytics')

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

      {subTab === 'analytics' ? (
        <FinanceAnalyticsTab />
      ) : subTab === 'customers' ? (
        <FinanceCustomersTab />
      ) : subTab === 'vendors' ? (
        <FinanceVendorsTab />
      ) : subTab === 'fees' ? (
        <FinanceFeesTab />
      ) : subTab === 'transfer' ? (
        <FinanceTransferTab />
      ) : (
        <div className="admin-finance-placeholder">
          <p>{FINANCE_SUB_TABS.find((tab) => tab.id === subTab)?.label} coming soon.</p>
        </div>
      )}
    </div>
  )
}
