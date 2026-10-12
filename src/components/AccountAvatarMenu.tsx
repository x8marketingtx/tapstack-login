import { useEffect, useRef, useState, type ReactNode } from 'react'

type AccountAvatarMenuProps = {
  initials: string
  avatarLabel?: string
  avatarClassName?: string
  menuClassName?: string
  dropdownClassName?: string
  logoutClassName?: string
  onProfileClick: () => void
  onLogout?: () => void
  avatarContent?: ReactNode
}

export default function AccountAvatarMenu({
  initials,
  avatarLabel = 'Open account menu',
  avatarClassName = '',
  menuClassName = 'account-avatar-menu',
  dropdownClassName = 'account-avatar-dropdown',
  logoutClassName = 'account-avatar-dropdown-logout',
  onProfileClick,
  onLogout,
  avatarContent,
}: AccountAvatarMenuProps) {
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

  return (
    <div className={menuClassName} ref={menuRef}>
      <button
        type="button"
        className={avatarClassName}
        aria-label={avatarLabel}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        onClick={() => setMenuOpen((open) => !open)}
      >
        {avatarContent ?? initials}
      </button>
      {menuOpen ? (
        <div className={dropdownClassName} role="menu">
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
          {onLogout ? (
            <button
              type="button"
              role="menuitem"
              className={logoutClassName}
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
  )
}
