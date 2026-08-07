import { TapStackLogo } from './TapStackLogo'

export default function DashboardHeader() {
  return (
    <header className="dash-header">
      <div className="dash-brand">
        <TapStackLogo height={40} />
      </div>

      <div className="dash-header-meta">
        <div className="level-badge">
          <span className="level-label">Lv 7</span>
          <div className="level-bar">
            <div className="level-fill" style={{ width: '62%' }} />
          </div>
        </div>
        <button type="button" className="user-avatar" aria-label="Profile">
          JS
        </button>
      </div>
    </header>
  )
}
