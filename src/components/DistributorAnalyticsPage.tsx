import { useState } from 'react'
import { TapStackLogo } from './TapStackLogo'
import './DistributorDashboard.css'

type AnalyticsSubTab = 'overview' | 'by-vendor'
type RevenueRange = '7d' | '30d' | '90d' | 'custom'

const REVENUE_RANGES: { id: RevenueRange; label: string }[] = [
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
  { id: '90d', label: '90d' },
  { id: 'custom', label: 'Custom' },
]

const MONTHLY_EARNINGS = [
  { month: 'Jul', amount: 1800 },
  { month: 'Aug', amount: 2200 },
  { month: 'Sep', amount: 2500 },
  { month: 'Oct', amount: 2700 },
  { month: 'Nov', amount: 3100 },
  { month: 'Dec', amount: 3640 },
]

const ANALYTICS_SUBTABS: { id: AnalyticsSubTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'by-vendor', label: 'By Vendor' },
]

type VendorBreakdown = {
  id: string
  name: string
  earnings: string
  volume: string
  redeemed: string
  share: number
}

const VENDOR_BREAKDOWN: VendorBreakdown[] = [
  {
    id: 'lucky-strike',
    name: 'Lucky Strike Arcade',
    earnings: '$460.50',
    volume: '$18,420',
    redeemed: '$11,240',
    share: 44,
  },
  {
    id: 'pixel-palace',
    name: 'Pixel Palace Arcade',
    earnings: '$320.00',
    volume: '$12,800',
    redeemed: '$7,950',
    share: 31,
  },
  {
    id: 'nova-game-zone',
    name: 'Nova Game Zone',
    earnings: '$227.50',
    volume: '$9,100',
    redeemed: '$5,420',
    share: 22,
  },
  {
    id: 'galaxy-tokens',
    name: 'Galaxy Tokens',
    earnings: '$80.00',
    volume: '$3,200',
    redeemed: '$1,980',
    share: 8,
  },
]

function DistributorAnalyticsHeader() {
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

function OverviewIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={active ? 'distributor-analytics-subtab-icon distributor-analytics-subtab-icon--active' : 'distributor-analytics-subtab-icon'}
    >
      <path
        d="M4 18l4-8 4 4 4-10 4 14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ByVendorIcon({ active }: { active: boolean }) {
  return (
    <span
      className={`distributor-analytics-dollar-icon ${active ? 'distributor-analytics-dollar-icon--active' : ''}`}
      aria-hidden="true"
    >
      $
    </span>
  )
}

function AnalyticsOverviewTab() {
  const [range, setRange] = useState<RevenueRange>('30d')
  const maxBarValue = Math.max(...MONTHLY_EARNINGS.map((item) => item.amount))

  return (
    <div className="distributor-analytics-content">
      <div className="distributor-analytics-toolbar">
        <h2 className="distributor-analytics-heading">Revenue Overview</h2>
        <div className="distributor-analytics-ranges" role="tablist" aria-label="Revenue time range">
          {REVENUE_RANGES.map((item) => {
            const active = range === item.id
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`distributor-analytics-range ${active ? 'distributor-analytics-range--active' : ''}`}
                onClick={() => setRange(item.id)}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="distributor-analytics-stats">
        <article className="distributor-analytics-stat-card">
          <p className="distributor-analytics-stat-label">Total Earned</p>
          <p className="distributor-analytics-stat-value distributor-analytics-stat-value--blue">$18,420</p>
          <p className="distributor-analytics-stat-meta">All-time</p>
        </article>

        <article className="distributor-analytics-stat-card">
          <p className="distributor-analytics-stat-label">This Month</p>
          <p className="distributor-analytics-stat-value distributor-analytics-stat-value--purple">$3,200</p>
          <p className="distributor-analytics-stat-meta">+8.5% vs Nov</p>
        </article>

        <article className="distributor-analytics-stat-card">
          <p className="distributor-analytics-stat-label">Distributor Cut</p>
          <p className="distributor-analytics-stat-value">$1,088</p>
          <p className="distributor-analytics-stat-meta">Avg monthly</p>
        </article>

        <article className="distributor-analytics-stat-card">
          <p className="distributor-analytics-stat-label">Add-on Fees</p>
          <p className="distributor-analytics-stat-value distributor-analytics-stat-value--blue">$246</p>
          <p className="distributor-analytics-stat-meta">This month</p>
        </article>
      </div>

      <section className="distributor-analytics-chart-card" aria-label="Monthly earnings chart">
        <h3 className="distributor-analytics-chart-title">Monthly Earnings (6mo)</h3>

        <div className="distributor-analytics-chart">
          {MONTHLY_EARNINGS.map((item) => (
            <div key={item.month} className="distributor-analytics-chart-col">
              <span
                className="distributor-analytics-chart-bar"
                style={{ height: `${(item.amount / maxBarValue) * 100}%` }}
                aria-hidden="true"
              />
              <span className="distributor-analytics-chart-label">{item.month}</span>
            </div>
          ))}
        </div>

        <div className="distributor-analytics-chart-footer">
          <span className="distributor-analytics-chart-footer-label">6-month total</span>
          <span className="distributor-analytics-chart-footer-value">$15,940</span>
        </div>
      </section>

      <button type="button" className="distributor-analytics-export-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3v12M7 10l5 5 5-5M5 21h14"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Export Revenue Report (CSV)
      </button>
    </div>
  )
}

function VendorBreakdownCard({ vendor }: { vendor: VendorBreakdown }) {
  return (
    <article className="distributor-vendor-breakdown-card">
      <div className="distributor-vendor-breakdown-head">
        <h3 className="distributor-vendor-breakdown-name">{vendor.name}</h3>
        <div className="distributor-vendor-breakdown-amount-row">
          <span className="distributor-vendor-breakdown-amount">{vendor.earnings}</span>
          <button type="button" className="distributor-vendor-breakdown-chevron" aria-label={`Open ${vendor.name}`}>
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

      <div className="distributor-vendor-breakdown-track">
        <span
          className="distributor-vendor-breakdown-fill"
          style={{ width: `${vendor.share}%` }}
        />
      </div>

      <div className="distributor-vendor-breakdown-stats">
        <div className="distributor-vendor-breakdown-stat">
          <p className="distributor-vendor-breakdown-stat-label">Volume</p>
          <p className="distributor-vendor-breakdown-stat-value">{vendor.volume}</p>
        </div>
        <div className="distributor-vendor-breakdown-stat">
          <p className="distributor-vendor-breakdown-stat-label">Redeemed</p>
          <p className="distributor-vendor-breakdown-stat-value">{vendor.redeemed}</p>
        </div>
        <div className="distributor-vendor-breakdown-stat">
          <p className="distributor-vendor-breakdown-stat-label">Share</p>
          <p className="distributor-vendor-breakdown-stat-value">{vendor.share}%</p>
        </div>
      </div>
    </article>
  )
}

function AnalyticsByVendorTab() {
  return (
    <div className="distributor-analytics-content">
      <div className="distributor-analytics-toolbar">
        <h2 className="distributor-analytics-heading">Per-Vendor Breakdown</h2>
        <button type="button" className="distributor-analytics-csv-btn">
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

      <div className="distributor-vendor-breakdown-list">
        {VENDOR_BREAKDOWN.map((vendor) => (
          <VendorBreakdownCard key={vendor.id} vendor={vendor} />
        ))}
      </div>
    </div>
  )
}

export default function DistributorAnalyticsPage() {
  const [activeSubTab, setActiveSubTab] = useState<AnalyticsSubTab>('overview')

  return (
    <div className="distributor-analytics-page">
      <DistributorAnalyticsHeader />

      <nav className="distributor-analytics-subtabs" aria-label="Analytics sections">
        {ANALYTICS_SUBTABS.map((tab) => {
          const active = activeSubTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`distributor-analytics-subtab ${active ? 'distributor-analytics-subtab--active' : ''}`}
              onClick={() => setActiveSubTab(tab.id)}
            >
              {tab.id === 'overview' ? <OverviewIcon active={active} /> : <ByVendorIcon active={active} />}
              <span className="distributor-analytics-subtab-label">{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {activeSubTab === 'overview' ? <AnalyticsOverviewTab /> : <AnalyticsByVendorTab />}
    </div>
  )
}
