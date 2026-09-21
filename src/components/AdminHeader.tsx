import { createContext, useContext, type ReactNode } from 'react'
import { TapStackLogo } from './TapStackLogo'
import './AdminDashboard.css'

type AdminShellContextValue = {
  initials: string
  onProfileClick: () => void
  onLogoClick: () => void
  onHelpClick: () => void
  openTicketCount: number
}

const AdminShellContext = createContext<AdminShellContextValue>({
  initials: 'AV',
  onProfileClick: () => {},
  onLogoClick: () => {},
  onHelpClick: () => {},
  openTicketCount: 0,
})

export function AdminShellProvider({
  initials,
  onProfileClick,
  onLogoClick,
  onHelpClick,
  openTicketCount,
  children,
}: AdminShellContextValue & { children: ReactNode }) {
  return (
    <AdminShellContext.Provider value={{ initials, onProfileClick, onLogoClick, onHelpClick, openTicketCount }}>
      {children}
    </AdminShellContext.Provider>
  )
}

export function useAdminShell() {
  return useContext(AdminShellContext)
}

export function AdminHeader() {
  const { initials, onProfileClick, onLogoClick, onHelpClick, openTicketCount } = useAdminShell()
  const badge = openTicketCount > 99 ? '99+' : String(openTicketCount)

  return (
    <header className="admin-dash-header">
      <div className="admin-dash-header-row">
        <TapStackLogo height={40} onClick={onLogoClick} />
        <div className="admin-dash-header-actions">
          <button type="button" className="admin-help-button" onClick={onHelpClick}>
            Help
            {openTicketCount > 0 ? <span className="admin-help-badge">{badge}</span> : null}
          </button>
          <button
            type="button"
            className="admin-dash-avatar"
            aria-label="Admin profile"
            onClick={onProfileClick}
          >
            {initials || 'AV'}
          </button>
        </div>
      </div>
    </header>
  )
}
