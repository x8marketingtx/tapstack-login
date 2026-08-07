export type DashboardTab = 'games' | 'earn' | 'giveaway' | 'promos' | 'account'

const TABS: { id: DashboardTab; icon: string; label: string }[] = [
  { id: 'games', icon: '🎮', label: 'Games' },
  { id: 'earn', icon: '⚡', label: 'Earn' },
  { id: 'giveaway', icon: '🎟️', label: 'Giveaway' },
  { id: 'promos', icon: '🎁', label: 'Promos' },
  { id: 'account', icon: '🏦', label: 'Account' },
]

type BottomNavProps = {
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`nav-item ${activeTab === tab.id ? `nav-item--active nav-item--${tab.id}` : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
