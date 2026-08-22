export type DashboardTab = 'games' | 'earn' | 'giveaway' | 'promos' | 'account'

function TicketIcon({ gold = false }: { gold?: boolean }) {
  return (
    <svg
      className={`nav-ticket-icon${gold ? ' nav-ticket-icon--gold' : ''}`}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3.5 9.5A2.5 2.5 0 0 0 6 7h12a2.5 2.5 0 0 0 2.5 2.5V11a1.5 1.5 0 1 1 0 3v1.5A2.5 2.5 0 0 0 18 18H6a2.5 2.5 0 0 0-2.5-2.5V14a1.5 1.5 0 1 1 0-3V9.5Z"
        fill="currentColor"
        opacity="0.95"
      />
      <path
        d="M9 8v8M15 8v8"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="1.8 2.2"
      />
    </svg>
  )
}

const TABS: { id: DashboardTab; label: string; icon?: string; ticket?: boolean }[] = [
  { id: 'games', icon: '🎮', label: 'Games' },
  { id: 'earn', icon: '⚡', label: 'Earn' },
  { id: 'giveaway', ticket: true, label: 'Tickets' },
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
          <span className="nav-icon">
            {tab.ticket ? <TicketIcon gold /> : tab.icon}
          </span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
