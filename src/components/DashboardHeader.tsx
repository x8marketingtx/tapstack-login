import { TapStackLogo } from './TapStackLogo'
import type { TicketTier } from '../api/client'
import { tierBadgeClass, tierLabel } from '../data/tiers'

type DashboardHeaderProps = {
  level?: number
  levelProgressPct?: number
  tier?: TicketTier | string | null
  initials?: string
  loading?: boolean
  onProfileClick?: () => void
}

export default function DashboardHeader({
  levelProgressPct = 0,
  tier = 'bronze',
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
            <div className={`level-badge ${tierBadgeClass(tier)}`}>
              <span className="level-label">{tierLabel(tier)}</span>
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
