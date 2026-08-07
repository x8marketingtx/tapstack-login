export type VendorTab = 'home' | 'orders' | 'analytics' | 'promos' | 'settings'

const TABS: { id: VendorTab; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'orders', icon: '📋', label: 'Orders' },
  { id: 'analytics', icon: '📊', label: 'Analytics' },
  { id: 'promos', icon: '📣', label: 'Promos' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
]

type VendorBottomNavProps = {
  activeTab: VendorTab
  onTabChange: (tab: VendorTab) => void
}

export default function VendorBottomNav({ activeTab, onTabChange }: VendorBottomNavProps) {
  return (
    <nav className="vendor-bottom-nav" aria-label="Vendor navigation">
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
              </span>
              {active && <span className="vendor-nav-dot" aria-hidden="true" />}
              <span className="vendor-nav-label">{tab.label}</span>
            </button>
          )
        })}
      </div>
      <div className="vendor-home-indicator" aria-hidden="true" />
    </nav>
  )
}
