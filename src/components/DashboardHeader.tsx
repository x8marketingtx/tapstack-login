import { useEffect, useRef, useState } from 'react'
import { TapStackLogo } from './TapStackLogo'
import type { PlayerNotification, TicketTier } from '../api/client'
import { tierBadgeClass, tierLabel } from '../data/tiers'
import {
  formatPlayerNotificationTime,
  playerNotificationKindLabel,
} from '../lib/playerNotifications'

export type DashboardHeaderNotifications = {
  items: PlayerNotification[]
  unreadCount: number
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
}

type DashboardHeaderProps = {
  level?: number
  levelProgressPct?: number
  tier?: TicketTier | string | null
  initials?: string
  avatarUrl?: string
  avatarBg?: string
  avatarText?: string
  loading?: boolean
  notifications?: DashboardHeaderNotifications
  onProfileClick?: () => void
  onLogout?: () => void
  onLogoClick?: () => void
}

function NotificationBell({ notifications }: { notifications: DashboardHeaderNotifications }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const badge =
    notifications.unreadCount > 99 ? '99+' : String(notifications.unreadCount)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="dash-notif-menu" ref={wrapRef}>
      <button
        type="button"
        className="dash-notif-button"
        aria-label={
          notifications.unreadCount > 0
            ? `${notifications.unreadCount} unread notifications`
            : 'Notifications'
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6 9a6 6 0 1 1 12 0c0 3.2 1.2 4.8 1.8 5.5.3.3.2.9-.3.9H4.5c-.5 0-.6-.6-.3-.9C4.8 13.8 6 12.2 6 9Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M10 18.5a2 2 0 0 0 4 0"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        {notifications.unreadCount > 0 ? (
          <span className="dash-notif-badge">{badge}</span>
        ) : null}
      </button>
      {open ? (
        <div className="dash-notif-panel" role="dialog" aria-label="Notifications">
          <div className="dash-notif-panel-head">
            <h2 className="dash-notif-panel-title">Notifications</h2>
            {notifications.unreadCount > 0 ? (
              <button
                type="button"
                className="dash-notif-mark-all"
                onClick={() => notifications.onMarkAllRead()}
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="dash-notif-panel-body">
            {notifications.items.length === 0 ? (
              <p className="dash-notif-empty">You&apos;re all caught up.</p>
            ) : (
              <ul className="dash-notif-list">
                {notifications.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`dash-notif-item${item.read ? '' : ' dash-notif-item--unread'}`}
                      onClick={() => notifications.onMarkRead(item.id)}
                    >
                      <span
                        className={`dash-notif-kind dash-notif-kind--${item.kind}`}
                        aria-hidden="true"
                      >
                        {playerNotificationKindLabel(item.kind)}
                      </span>
                      <span className="dash-notif-copy">
                        <span className="dash-notif-item-title">{item.title}</span>
                        {item.body ? (
                          <span className="dash-notif-item-body">{item.body}</span>
                        ) : null}
                        <span className="dash-notif-item-time">
                          {formatPlayerNotificationTime(item.createdAt)}
                        </span>
                      </span>
                      {!item.read ? (
                        <span className="dash-notif-unread-dot" aria-hidden="true" />
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function DashboardHeader({
  levelProgressPct = 0,
  tier = 'bronze',
  initials = 'P',
  avatarUrl = '',
  avatarBg = '#f5b37c',
  avatarText = '#fff',
  loading = false,
  notifications,
  onProfileClick,
  onLogout,
  onLogoClick,
}: DashboardHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const accountMenu = Boolean(onProfileClick || onLogout)

  return (
    <header className="dash-header">
      <div className="dash-brand">
        <TapStackLogo height={40} onClick={onLogoClick} />
      </div>

      <div className="dash-header-meta">
        {loading ? (
          <>
            <div className="dash-skeleton dash-skeleton--level" aria-hidden="true" />
            <div className="dash-skeleton dash-skeleton--notif" aria-hidden="true" />
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
            {notifications ? <NotificationBell notifications={notifications} /> : null}
            {accountMenu ? (
              <div className="dash-avatar-menu" ref={menuRef}>
                <button
                  type="button"
                  className="user-avatar"
                  aria-label="Open account menu"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  onClick={() => setMenuOpen((open) => !open)}
                  style={
                    avatarUrl
                      ? undefined
                      : { background: avatarBg, color: avatarText }
                  }
                >
                  {avatarUrl ? <img src={avatarUrl} alt="" className="user-avatar-img" /> : initials}
                </button>
                {menuOpen ? (
                  <div className="dash-avatar-dropdown" role="menu">
                    {onProfileClick ? (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false)
                          onProfileClick()
                        }}
                      >
                        Profile
                      </button>
                    ) : null}
                    {onLogout ? (
                      <button
                        type="button"
                        role="menuitem"
                        className="dash-avatar-dropdown-logout"
                        onClick={() => {
                          setMenuOpen(false)
                          onLogout()
                        }}
                      >
                        Logout
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <div
                className="user-avatar user-avatar--static"
                style={
                  avatarUrl
                    ? undefined
                    : { background: avatarBg, color: avatarText }
                }
                aria-hidden="true"
              >
                {avatarUrl ? <img src={avatarUrl} alt="" className="user-avatar-img" /> : initials}
              </div>
            )}
          </>
        )}
      </div>
    </header>
  )
}
