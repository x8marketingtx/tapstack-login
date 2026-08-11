import { TapStackLogo } from './TapStackLogo'

type DashboardHeaderProps = {
  level?: number
  levelProgressPct?: number
  initials?: string
  loading?: boolean
  onProfileClick?: () => void
}

export default function DashboardHeader({
  level = 1,
  levelProgressPct = 0,
  initials = 'P',
  loading = false,
  onProfileClick,
}: DashboardHeaderProps) {
  return (
    <header className="dash-header">
      <div className="dash-brand">
        <TapStackLogo height={40} />
      </div>

      <div className="dash-header-meta">
        {loading ? (
          <>
            <div className="dash-skeleton dash-skeleton--level" aria-hidden="true" />
            <div className="dash-skeleton dash-skeleton--avatar" aria-hidden="true" />
          </>
        ) : (
          <>
            <div className="level-badge">
              <span className="level-label">Lv {level}</span>
              <div className="level-bar">
                <div
                  className="level-fill"
                  style={{ width: `${Math.min(100, Math.max(0, levelProgressPct))}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              className="user-avatar"
              aria-label="Open profile"
              onClick={onProfileClick}
            >
              {initials}
            </button>
          </>
        )}
      </div>
    </header>
  )
}
