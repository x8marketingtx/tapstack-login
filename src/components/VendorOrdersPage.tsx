import { useState } from 'react'
import './VendorOrdersPage.css'

type OrdersTab = 'loads' | 'redeems' | 'history'

type ManualLoad = {
  id: string
  name: string
  game: string
  method: string
  time: string
  amount: string
  icon: string
  iconBg: string
}

type AutomatedLoad = {
  id: string
  name: string
  game: string
  method: string
  time: string
  amount: string
  icon: string
  iconBg: string
}

type PendingRedeem = {
  id: string
  name: string
  game: string
  time: string
  amount: string
  icon: string
  iconBg: string
}

const MANUAL_LOADS: ManualLoad[] = [
  {
    id: '1',
    name: 'Marcus R.',
    game: 'Lucky 7s',
    method: 'Cash at counter',
    time: '9:52 AM',
    amount: '+$120',
    icon: '🎰',
    iconBg: '#fef3c7',
  },
  {
    id: '2',
    name: 'Tanya H.',
    game: 'Golden Pick',
    method: 'Venmo',
    time: '9:51 AM',
    amount: '+$60',
    icon: '⛏️',
    iconBg: '#fef9c3',
  },
  {
    id: '3',
    name: 'Marcus R.',
    game: 'Lucky 7s',
    method: 'Cash at counter',
    time: '9:50 AM',
    amount: '+$120',
    icon: '🎰',
    iconBg: '#fef3c7',
  },
  {
    id: '4',
    name: 'Marcus R.',
    game: 'Lucky 7s',
    method: 'Cash at counter',
    time: '9:49 AM',
    amount: '+$120',
    icon: '🎰',
    iconBg: '#fef3c7',
  },
]

const AUTOMATED_LOADS: AutomatedLoad[] = [
  {
    id: '1',
    name: 'Alex P.',
    game: 'Gold Rush',
    method: 'App deposit',
    time: '9:48 AM',
    amount: '+$200',
    icon: '⛏️',
    iconBg: '#fef9c3',
  },
  {
    id: '2',
    name: 'Riley K.',
    game: 'SpinZone',
    method: 'App deposit',
    time: '9:45 AM',
    amount: '+$85',
    icon: '🎰',
    iconBg: '#fef3c7',
  },
  {
    id: '3',
    name: 'Jordan M.',
    game: 'Lucky 7s',
    method: 'App deposit',
    time: '9:41 AM',
    amount: '+$120',
    icon: '🌀',
    iconBg: '#ede9fe',
  },
]

const PENDING_REDEEMS: PendingRedeem[] = [
  {
    id: '1',
    name: 'Marcus R.',
    game: 'Lucky 7s',
    time: '9:41 AM',
    amount: '$250',
    icon: '🎰',
    iconBg: '#fef3c7',
  },
  {
    id: '2',
    name: 'Tanya H.',
    game: 'Gold Rush',
    time: '9:15 AM',
    amount: '$80',
    icon: '⛏️',
    iconBg: '#fef9c3',
  },
  {
    id: '3',
    name: 'Leo P.',
    game: 'Neon Spinner',
    time: '8:02 AM',
    amount: '$500',
    icon: '🌀',
    iconBg: '#ede9fe',
  },
  {
    id: '4',
    name: 'Chloe M.',
    game: 'Lucky 7s',
    time: '7:48 AM',
    amount: '$120',
    icon: '🎰',
    iconBg: '#fef3c7',
  },
]

const ORDERS_TABS: { id: OrdersTab; label: string; count?: number }[] = [
  { id: 'loads', label: 'Loads', count: 4 },
  { id: 'redeems', label: 'Redeems', count: 4 },
  { id: 'history', label: 'History' },
]

type HistoryRange = 'today' | '7d' | '30d' | 'custom'

type HistoryEntry = {
  id: string
  type: 'manual-load' | 'redeem' | 'auto-load'
  label: string
  name: string
  date: string
  amount: string
  positive: boolean
  icon: string
  iconBg: string
}

const HISTORY_ENTRIES: HistoryEntry[] = [
  {
    id: '1',
    type: 'manual-load',
    label: 'Manual Load',
    name: 'Marcus R.',
    date: 'Today · 9:50 AM',
    amount: '+$100',
    positive: true,
    icon: '💵',
    iconBg: '#dcfce7',
  },
  {
    id: '2',
    type: 'redeem',
    label: 'Redeem',
    name: 'Tanya H.',
    date: 'Today · 9:30 AM',
    amount: '-$250',
    positive: false,
    icon: '🏧',
    iconBg: '#dbeafe',
  },
  {
    id: '3',
    type: 'auto-load',
    label: 'Auto Load',
    name: 'Leo P.',
    date: 'Today · 8:12 AM',
    amount: '+$200',
    positive: true,
    icon: '⚡',
    iconBg: '#fef9c3',
  },
  {
    id: '4',
    type: 'redeem',
    label: 'Redeem',
    name: 'Chloe M.',
    date: 'Jun 8 · Jun 8',
    amount: '-$80',
    positive: false,
    icon: '🏧',
    iconBg: '#dbeafe',
  },
  {
    id: '5',
    type: 'auto-load',
    label: 'Auto Load',
    name: 'Sam K.',
    date: 'Jun 8 · Jun 8',
    amount: '+$50',
    positive: true,
    icon: '⚡',
    iconBg: '#fef9c3',
  },
  {
    id: '6',
    type: 'manual-load',
    label: 'Manual Load',
    name: 'Darius K.',
    date: 'Jun 8 · Jun 8',
    amount: '+$340',
    positive: true,
    icon: '💵',
    iconBg: '#dcfce7',
  },
  {
    id: '7',
    type: 'auto-load',
    label: 'Auto Load',
    name: 'Nina W.',
    date: 'Jun 7 · Jun 7',
    amount: '+$75',
    positive: true,
    icon: '⚡',
    iconBg: '#fef9c3',
  },
  {
    id: '8',
    type: 'manual-load',
    label: 'Manual Load',
    name: 'Dan T.',
    date: 'Jun 7 · Jun 7',
    amount: '+$150',
    positive: true,
    icon: '💵',
    iconBg: '#dcfce7',
  },
]

const HISTORY_RANGES: { id: HistoryRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: 'custom', label: 'Custom' },
]

function LoadsTab() {
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  function toggleCheck(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="vendor-orders-content">
      <div className="vendor-orders-notice">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <p>Unchecked manual loads &amp; completed redeems auto-move to History at 12:00 AM CST.</p>
      </div>

      <section className="vendor-orders-section">
        <div className="vendor-orders-section-header">
          <div className="vendor-orders-section-title">
            <span className="vendor-orders-section-icon vendor-orders-section-icon--purple" aria-hidden="true">
              💵
            </span>
            <span className="vendor-orders-section-name">Manual Loads</span>
            <span className="vendor-orders-priority-badge">PRIORITY</span>
          </div>
          <span className="vendor-orders-section-count">4 to do</span>
        </div>

        <ul className="vendor-orders-list">
          {MANUAL_LOADS.map((load) => (
            <li key={load.id} className="vendor-order-card">
              <button
                type="button"
                className={`vendor-order-check ${checked[load.id] ? 'vendor-order-check--checked' : ''}`}
                aria-label={`Mark ${load.name} load as checked`}
                onClick={() => toggleCheck(load.id)}
              >
                {checked[load.id] && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 12l5 5L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                )}
              </button>

              <div className="vendor-order-game-icon" style={{ background: load.iconBg }}>
                {load.icon}
              </div>

              <div className="vendor-order-details">
                <p className="vendor-order-name">{load.name}</p>
                <p className="vendor-order-meta">
                  {load.game} · {load.method} · {load.time}
                </p>
              </div>

              <span className="vendor-order-amount">{load.amount}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="vendor-orders-section">
        <div className="vendor-orders-section-header vendor-orders-section-header--subtle">
          <div className="vendor-orders-section-title">
            <span className="vendor-orders-section-icon" aria-hidden="true">
              ⚡
            </span>
            <span className="vendor-orders-section-name vendor-orders-section-name--muted">
              Automated Loads
            </span>
            <span className="vendor-orders-section-subtitle">· no action needed</span>
          </div>
        </div>

        <ul className="vendor-orders-list">
          {AUTOMATED_LOADS.map((load) => (
            <li key={load.id} className="vendor-order-card vendor-order-card--auto">
              <div className="vendor-order-game-icon" style={{ background: load.iconBg }}>
                {load.icon}
              </div>

              <div className="vendor-order-details">
                <p className="vendor-order-name">{load.name}</p>
                <p className="vendor-order-meta">
                  {load.game} · {load.method} · {load.time}
                </p>
              </div>

              <div className="vendor-order-right">
                <span className="vendor-order-amount">{load.amount}</span>
                <span className="vendor-order-auto-badge">Auto</span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function RedeemsTab() {
  return (
    <div className="vendor-orders-content">
      <div className="vendor-redeems-summary">
        <div>
          <h2 className="vendor-redeems-title">Pending Redeems</h2>
          <p className="vendor-redeems-subtitle">4 awaiting review</p>
        </div>
        <div className="vendor-redeems-total">
          <span className="vendor-redeems-total-label">Total pending</span>
          <span className="vendor-redeems-total-amount">$950</span>
        </div>
      </div>

      <ul className="vendor-redeems-list">
        {PENDING_REDEEMS.map((redeem) => (
          <li key={redeem.id} className="vendor-redeem-card">
            <div className="vendor-redeem-top">
              <div className="vendor-order-game-icon" style={{ background: redeem.iconBg }}>
                {redeem.icon}
              </div>

              <div className="vendor-order-details">
                <p className="vendor-order-name">{redeem.name}</p>
                <p className="vendor-order-meta">
                  {redeem.game} · {redeem.time}
                </p>
              </div>

              <span className="vendor-redeem-amount">{redeem.amount}</span>
            </div>

            <div className="vendor-redeem-actions">
              <button type="button" className="vendor-redeem-btn vendor-redeem-btn--reject">
                Reject
              </button>
              <button type="button" className="vendor-redeem-btn vendor-redeem-btn--approve">
                Approve
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function HistoryTab() {
  const [range, setRange] = useState<HistoryRange>('30d')

  return (
    <div className="vendor-orders-content">
      <h2 className="vendor-history-title">Order History</h2>

      <div className="vendor-history-select-wrap">
        <select className="vendor-history-select" defaultValue="all" aria-label="Filter activity">
          <option value="all">All Activity</option>
          <option value="loads">Loads</option>
          <option value="redeems">Redeems</option>
        </select>
        <svg className="vendor-history-select-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 6 L8 10 L12 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="vendor-history-filters">
        <span className="vendor-history-filters-label">Last 30 days</span>
        <div className="vendor-history-filter-pills" role="tablist" aria-label="Time range">
          {HISTORY_RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={range === item.id}
              className={`vendor-history-filter-btn ${range === item.id ? 'vendor-history-filter-btn--active' : ''}`}
              onClick={() => setRange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <ul className="vendor-history-list">
        {HISTORY_ENTRIES.map((entry) => (
          <li key={entry.id} className="vendor-history-item">
            <div className="vendor-history-icon" style={{ background: entry.iconBg }}>
              {entry.icon}
            </div>
            <div className="vendor-order-details">
              <p className="vendor-history-item-title">
                {entry.label} · {entry.name}
              </p>
              <p className="vendor-order-meta">{entry.date}</p>
            </div>
            <span
              className={`vendor-history-amount ${entry.positive ? 'vendor-history-amount--positive' : 'vendor-history-amount--negative'}`}
            >
              {entry.amount}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function VendorOrdersPage() {
  const [activeOrdersTab, setActiveOrdersTab] = useState<OrdersTab>('loads')

  return (
    <div className="vendor-orders-page">
      <div className="vendor-orders-tabs" role="tablist" aria-label="Order types">
        {ORDERS_TABS.map((tab) => {
          const active = activeOrdersTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`vendor-orders-tab ${active ? 'vendor-orders-tab--active' : ''}`}
              onClick={() => setActiveOrdersTab(tab.id)}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="vendor-orders-tab-badge">{tab.count}</span>
              )}
            </button>
          )
        })}
      </div>

      {activeOrdersTab === 'loads' && <LoadsTab />}
      {activeOrdersTab === 'redeems' && <RedeemsTab />}
      {activeOrdersTab === 'history' && <HistoryTab />}
    </div>
  )
}
