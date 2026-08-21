export type AdminTab = 'overview' | 'vendors' | 'distributors' | 'signups' | 'finance' | 'settings'

const TABS: { id: AdminTab; icon: string; label: string; badge?: string }[] = [
  { id: 'overview', icon: '🏠', label: 'Overview' },
  { id: 'vendors', icon: '🏪', label: 'Vendors', badge: '24' },
  { id: 'distributors', icon: '🏢', label: 'Distributors' },
  { id: 'signups', icon: '📋', label: 'Signups' },
  { id: 'finance', icon: '💰', label: 'Finance' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
]

type AdminBottomNavProps = {
  activeTab: AdminTab
  onTabChange: (tab: AdminTab) => void
  badges?: Partial<Record<AdminTab, string>>
}

export default function AdminBottomNav({ activeTab, onTabChange, badges }: AdminBottomNavProps) {
  return (
    <nav className="admin-bottom-nav" aria-label="Admin navigation">
      <div className="admin-bottom-nav-items">
        {TABS.map((tab) => {
          const active = activeTab === tab.id
          const badge = badges?.[tab.id] ?? tab.badge
          return (
            <button
              key={tab.id}
              type="button"
              className={`admin-nav-item ${active ? 'admin-nav-item--active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              <span className={`admin-nav-icon-wrap ${active ? 'admin-nav-icon-wrap--active' : ''}`}>
                <span className="admin-nav-icon" aria-hidden="true">
                  {tab.icon}
                </span>
                {badge ? <span className="admin-nav-badge">{badge}</span> : null}
              </span>
              {active && <span className="admin-nav-dot" aria-hidden="true" />}
              <span className="admin-nav-label">{tab.label}</span>
            </button>
          )
        })}
      </div>
      <div className="admin-home-indicator" aria-hidden="true" />
    </nav>
  )
}
