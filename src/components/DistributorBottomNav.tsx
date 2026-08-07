export type DistributorTab = 'home' | 'vendors' | 'analytics' | 'invoices' | 'settings'

const TABS: { id: DistributorTab; icon: string; label: string; badge?: string }[] = [
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'vendors', icon: '🏪', label: 'Vendors', badge: '24' },
  { id: 'analytics', icon: '📈', label: 'Analytics' },
  { id: 'invoices', icon: '🧾', label: 'Invoices' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
]

type DistributorBottomNavProps = {
  activeTab: DistributorTab
  onTabChange: (tab: DistributorTab) => void
}

export default function DistributorBottomNav({ activeTab, onTabChange }: DistributorBottomNavProps) {
  return (
    <nav className="distributor-bottom-nav" aria-label="Distributor navigation">
      <div className="distributor-bottom-nav-items">
        {TABS.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              className={`distributor-nav-item ${active ? 'distributor-nav-item--active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              <span
                className={`distributor-nav-icon-wrap ${active ? 'distributor-nav-icon-wrap--active' : ''}`}
              >
                <span className="distributor-nav-icon" aria-hidden="true">
                  {tab.icon}
                </span>
                {tab.badge ? <span className="distributor-nav-badge">{tab.badge}</span> : null}
              </span>
              {active && <span className="distributor-nav-dot" aria-hidden="true" />}
              <span className="distributor-nav-label">{tab.label}</span>
            </button>
          )
        })}
      </div>
      <div className="distributor-home-indicator" aria-hidden="true" />
    </nav>
  )
}
