import { createContext, useContext, type ReactNode } from 'react'
import { TapStackLogo } from './TapStackLogo'
import './AdminDashboard.css'

type AdminShellContextValue = {
  initials: string
  onProfileClick: () => void
}

const AdminShellContext = createContext<AdminShellContextValue>({
  initials: 'AV',
  onProfileClick: () => {},
})

export function AdminShellProvider({
  initials,
  onProfileClick,
  children,
}: AdminShellContextValue & { children: ReactNode }) {
  return (
    <AdminShellContext.Provider value={{ initials, onProfileClick }}>
      {children}
    </AdminShellContext.Provider>
  )
}

export function useAdminShell() {
  return useContext(AdminShellContext)
}

export function AdminHeader() {
  const { initials, onProfileClick } = useAdminShell()

  return (
    <header className="admin-dash-header">
      <div className="admin-dash-header-row">
        <TapStackLogo height={40} />
        <button
          type="button"
          className="admin-dash-avatar"
          aria-label="Admin profile"
          onClick={onProfileClick}
        >
          {initials || 'AV'}
        </button>
      </div>
    </header>
  )
}
