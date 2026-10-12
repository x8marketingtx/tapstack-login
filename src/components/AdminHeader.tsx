import { createContext, useContext, type ReactNode } from 'react'
import AccountAvatarMenu from './AccountAvatarMenu'
import { TapStackLogo } from './TapStackLogo'
import './AccountAvatarMenu.css'
import './AdminDashboard.css'

type AdminShellContextValue = {
  initials: string
  onProfileClick: () => void
  onLogout?: () => void
  onLogoClick: () => void
  onHelpClick: () => void
  openTicketCount: number
}

const AdminShellContext = createContext<AdminShellContextValue>({
  initials: 'AV',
  onProfileClick: () => {},
  onLogout: undefined,
  onLogoClick: () => {},
  onHelpClick: () => {},
  openTicketCount: 0,
})

export function AdminShellProvider({
  initials,
  onProfileClick,
  onLogout,
  onLogoClick,
  onHelpClick,
  openTicketCount,
  children,
}: AdminShellContextValue & { children: ReactNode }) {
  return (
    <AdminShellContext.Provider
      value={{ initials, onProfileClick, onLogout, onLogoClick, onHelpClick, openTicketCount }}
    >
      {children}
    </AdminShellContext.Provider>
  )
}

export function useAdminShell() {
  return useContext(AdminShellContext)
}

export function AdminHeader() {
  const { initials, onProfileClick, onLogout, onLogoClick, onHelpClick } = useAdminShell()

  return (
    <header className="admin-dash-header">
      <div className="admin-dash-header-row">
        <TapStackLogo height={40} onClick={onLogoClick} />
        <div className="admin-dash-header-actions">
          <button type="button" className="admin-help-button admin-x8-support-button" onClick={onHelpClick}>
            X8 Support
          </button>
          <AccountAvatarMenu
            initials={initials || 'AV'}
            avatarClassName="admin-dash-avatar"
            onProfileClick={onProfileClick}
            onLogout={onLogout}
          />
        </div>
      </div>
    </header>
  )
}
