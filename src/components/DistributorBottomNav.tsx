import type { DistributorTab } from '../lib/routing'
import './VendorDashboard.css'

const TABS: { id: DistributorTab; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'vendors', icon: '🏪', label: 'Vendors' },
  { id: 'analytics', icon: '📊', label: 'Analytics' },
  { id: 'invoices', icon: '🧾', label: 'Invoices' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
]

export default function DistributorBottomNav({
  activeTab,
  onTabChange,
  vendorsBadge,
}: {
  activeTab: DistributorTab
  onTabChange: (tab: DistributorTab) => void
  vendorsBadge?: number
}) {
  return (
    <nav className="vendor-bottom-nav" aria-label="Distributor navigation">
      <div className="vendor-bottom-nav-items">
        {TABS.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              className={`vendor-nav-item ${active ? 'vendor-nav-item--active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              <span className={`vendor-nav-icon-wrap ${active ? 'vendor-nav-icon-wrap--active' : ''}`}>
                <span className="vendor-nav-icon" aria-hidden="true">
                  {tab.icon}
                </span>
                {tab.id === 'vendors' && vendorsBadge && vendorsBadge > 0 ? (
                  <span className="dist-nav-badge">{vendorsBadge > 99 ? '99+' : vendorsBadge}</span>
                ) : null}
              </span>
              {active ? <span className="vendor-nav-dot" aria-hidden="true" /> : null}
              <span className="vendor-nav-label">{tab.label}</span>
            </button>
          )
        })}
      </div>
      <div className="vendor-home-indicator" aria-hidden="true" />
    </nav>
  )
}
