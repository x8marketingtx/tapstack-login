import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ApiError,
  applyAuthSession,
  getToken,
  isApiConfigured,
  tapstackApi,
  type RedeemApprovalMode,
  type VendorGameRecord,
  type VendorRedeemSettings,
} from '../api/client'
import './VendorSettingsPage.css'

type SettingsTab = 'profile' | 'games' | 'billing'

const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'games', label: 'Games' },
  { id: 'billing', label: 'Billing' },
]

function SettingsToggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description: string
}) {
  return (
    <div className="vendor-settings-toggle-row">
      <div>
        <p className="vendor-settings-toggle-label">{label}</p>
        <p className="vendor-settings-toggle-desc">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`vendor-settings-toggle ${checked ? 'vendor-settings-toggle--on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="vendor-settings-toggle-knob" />
      </button>
    </div>
  )
}

function ProfileTab() {
  const [loading, setLoading] = useState(isApiConfigured())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveOk, setSaveOk] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [inviteCopied, setInviteCopied] = useState(false)
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [initials, setInitials] = useState('V')
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [smsAlerts, setSmsAlerts] = useState(false)
  const [withdrawalAlerts, setWithdrawalAlerts] = useState(true)
  const [accentColor, setAccentColor] = useState('purple')
  const [venueTagline, setVenueTagline] = useState('')
  const [bannerId, setBannerId] = useState(0)
  const [bannerUrl, setBannerUrl] = useState('')
  const [bannerName, setBannerName] = useState('')
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordOk, setPasswordOk] = useState('')

  const accentColors = [
    { id: 'purple', value: '#7c3aed' },
    { id: 'blue', value: '#2563eb' },
    { id: 'green', value: '#059669' },
    { id: 'red', value: '#ef4444' },
    { id: 'orange', value: '#f97316' },
    { id: 'pink', value: '#ec4899' },
  ]

  useEffect(() => {
    if (!isApiConfigured()) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)

    const pickInvite = (value: unknown): string =>
      String(value || '')
        .replace(/^@/, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')

    Promise.all([
      tapstackApi.vendorSettings().catch(() => null),
      tapstackApi.vendorDashboard().catch(() => null),
    ])
      .then(([settingsRes, dashRes]) => {
        if (cancelled) return

        const p = settingsRes?.profile || {}
        const fromSettings = pickInvite(p.inviteCode || p.code)
        const fromDash = pickInvite(dashRes?.store?.inviteCode || dashRes?.store?.code)
        setInviteCode(fromSettings || fromDash)

        setBusinessName(p.businessName || '')
        setEmail(p.email || '')
        setPhone(p.phone || '')
        setAddress(p.address || '')
        setInitials((p.initials || 'V').slice(0, 2).toUpperCase())
        setEmailAlerts(p.emailAlerts !== false)
        setSmsAlerts(Boolean(p.smsAlerts))
        setWithdrawalAlerts(p.withdrawalAlerts !== false)
        setAccentColor(p.accentColor || 'purple')
        setVenueTagline(p.venueTagline || '')
        setBannerId(Number(p.bannerId) || 0)
        setBannerUrl(p.bannerUrl || '')
        setBannerName(p.bannerName || '')
      })
      .catch((err) => {
        if (!cancelled) {
          setSaveError(err instanceof Error ? err.message : 'Could not load profile.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleCopyInvite() {
    if (!inviteCode) return
    try {
      await navigator.clipboard.writeText(inviteCode)
      setInviteCopied(true)
      window.setTimeout(() => setInviteCopied(false), 1600)
    } catch {
      // ignore
    }
  }

  async function handleSave() {
    if (!isApiConfigured()) {
      setSaveError('WordPress API is not configured.')
      return
    }
    setSaving(true)
    setSaveError('')
    setSaveOk(false)
    try {
      const res = await tapstackApi.saveVendorSettings({
        profile: {
          businessName: businessName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
          emailAlerts,
          smsAlerts,
          withdrawalAlerts,
          accentColor,
          venueTagline: venueTagline.trim(),
          bannerId,
        },
      })
      const p = res.profile || {}
      if (typeof p.businessName === 'string') setBusinessName(p.businessName)
      if (typeof p.email === 'string') setEmail(p.email)
      if (typeof p.phone === 'string') setPhone(p.phone)
      if (typeof p.address === 'string') setAddress(p.address)
      if (typeof p.inviteCode === 'string' || typeof p.code === 'string') {
        const next = String(p.inviteCode || p.code || '')
          .replace(/^@/, '')
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
        if (next) setInviteCode(next)
      }
      if (typeof p.initials === 'string') setInitials(p.initials.slice(0, 2).toUpperCase())
      if (typeof p.accentColor === 'string') setAccentColor(p.accentColor)
      if (typeof p.venueTagline === 'string') setVenueTagline(p.venueTagline)
      if (typeof p.bannerId === 'number') setBannerId(p.bannerId)
      if (typeof p.bannerUrl === 'string') setBannerUrl(p.bannerUrl)
      if (typeof p.bannerName === 'string') setBannerName(p.bannerName)
      setSaveOk(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordUpdate() {
    setPasswordError('')
    setPasswordOk('')
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }
    setPasswordBusy(true)
    try {
      if (isApiConfigured()) {
        const res = await tapstackApi.changePassword(currentPassword, newPassword)
        applyAuthSession(res.token, res.user)
        setPasswordOk('Password updated.')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setShowPasswordForm(false)
      } else {
        setPasswordOk('Password updated (demo).')
        setShowPasswordForm(false)
      }
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : 'Could not update password.')
    } finally {
      setPasswordBusy(false)
    }
  }

  return (
    <div className="vendor-settings-content">
      <div className="vendor-settings-profile-header">
        <div className="vendor-settings-avatar" aria-hidden="true">
          {initials || 'V'}
        </div>
        <div>
          <h2 className="vendor-settings-business-name">
            {loading ? 'Loading…' : businessName || 'Vendor'}
          </h2>
          <button type="button" className="vendor-settings-change-photo">
            Change photo
          </button>
        </div>
      </div>

      <section className="vendor-settings-info-card">
        <div className="vendor-settings-info-block">
          <p className="vendor-settings-info-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M8 11V8a4 4 0 0 1 8 0v3"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            PLAYER INVITE CODE
          </p>
          <div className="vendor-settings-link-field">
            <span className="vendor-settings-readonly-value vendor-settings-invite-code">
              {inviteCode || '—'}
            </span>
            <button
              type="button"
              className="vendor-settings-copy-btn"
              onClick={handleCopyInvite}
              disabled={!inviteCode}
            >
              {inviteCopied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="vendor-settings-info-help">
            Players enter this code under Add Vendor to join your store. Change it from WordPress →
            Users → Player invite code.
          </p>
        </div>
      </section>

      <label className="vendor-settings-field">
        <span className="vendor-settings-field-label">Business Name</span>
        <input
          type="text"
          className="vendor-settings-input"
          value={businessName}
          onChange={(event) => setBusinessName(event.target.value)}
        />
      </label>

      <label className="vendor-settings-field">
        <span className="vendor-settings-field-label">Email Address</span>
        <input
          type="email"
          className="vendor-settings-input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <label className="vendor-settings-field">
        <span className="vendor-settings-field-label">Phone</span>
        <input
          type="tel"
          className="vendor-settings-input"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </label>

      <label className="vendor-settings-field">
        <span className="vendor-settings-field-label">Address</span>
        <input
          type="text"
          className="vendor-settings-input"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
        />
      </label>

      <section className="vendor-settings-panel">
        <h3 className="vendor-settings-panel-title">NOTIFICATIONS</h3>
        <SettingsToggle
          label="Email alerts"
          description="Withdrawal confirmations, reports"
          checked={emailAlerts}
          onChange={setEmailAlerts}
        />
        <SettingsToggle
          label="SMS alerts"
          description="Critical events only"
          checked={smsAlerts}
          onChange={setSmsAlerts}
        />
        <SettingsToggle
          label="Withdrawal approvals"
          description="Notify when approved/rejected"
          checked={withdrawalAlerts}
          onChange={setWithdrawalAlerts}
        />
      </section>

      <section className="vendor-settings-panel">
        <div className="vendor-settings-branding-header">
          <span className="vendor-settings-branding-icon" aria-hidden="true">
            🎨
          </span>
          <div>
            <h3 className="vendor-settings-panel-title">STOREFRONT BRANDING</h3>
            <p className="vendor-settings-branding-subtitle">
              Customize how your venue looks to players
            </p>
          </div>
        </div>

        <div className="vendor-settings-branding-block">
          <span className="vendor-settings-field-label">Banner Image</span>
          {bannerUrl ? (
            <div className="vendor-settings-banner-preview">
              <img src={bannerUrl} alt="" />
            </div>
          ) : null}
          <label className="vendor-settings-banner-upload">
            <input
              type="file"
              accept="image/*"
              className="vendor-settings-banner-input"
              disabled={uploadingBanner || saving}
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (!file || !isApiConfigured()) return
                setUploadingBanner(true)
                setSaveError('')
                void tapstackApi
                  .uploadVendorBanner(file)
                  .then((res) => {
                    setBannerId(res.bannerId)
                    setBannerUrl(res.bannerUrl)
                    setBannerName(res.bannerName || file.name)
                    setSaveOk(true)
                  })
                  .catch((err) => {
                    setSaveError(err instanceof Error ? err.message : 'Banner upload failed.')
                  })
                  .finally(() => setUploadingBanner(false))
              }}
            />
            <span className="vendor-settings-banner-name">
              {uploadingBanner
                ? 'Uploading…'
                : bannerName || bannerUrl
                  ? bannerName || 'Banner selected'
                  : 'No banner selected'}
            </span>
            <span className="vendor-settings-banner-change">
              {uploadingBanner ? '…' : 'Change'}
            </span>
          </label>
        </div>

        <div className="vendor-settings-branding-block">
          <span className="vendor-settings-field-label">Accent Color</span>
          <div className="vendor-settings-color-row" role="radiogroup" aria-label="Accent color">
            {accentColors.map((color) => {
              const active = accentColor === color.id
              return (
                <button
                  key={color.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`vendor-settings-color-swatch ${active ? 'vendor-settings-color-swatch--active' : ''}`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setAccentColor(color.id)}
                />
              )
            })}
          </div>
        </div>

        <label className="vendor-settings-branding-block">
          <span className="vendor-settings-field-label">Venue Tagline</span>
          <input
            type="text"
            className="vendor-settings-input"
            value={venueTagline}
            onChange={(event) => setVenueTagline(event.target.value)}
          />
        </label>
      </section>

      {saveError ? <p className="vendor-settings-modal-error">{saveError}</p> : null}
      {saveOk ? <p className="vendor-settings-save-ok">Profile saved.</p> : null}

      <div className="vendor-settings-actions">
        <button
          type="button"
          className="vendor-settings-password-btn"
          onClick={() => {
            setShowPasswordForm((open) => !open)
            setPasswordError('')
            setPasswordOk('')
          }}
        >
          {showPasswordForm ? 'Cancel password change' : 'Change Password'}
        </button>
        <button
          type="button"
          className="vendor-settings-save-btn"
          disabled={saving || loading}
          onClick={() => void handleSave()}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {showPasswordForm ? (
        <section className="vendor-settings-password-panel">
          <h3 className="vendor-settings-panel-title">Change password</h3>
          <label className="vendor-settings-field">
            <span className="vendor-settings-field-label">Current password</span>
            <input
              type="password"
              className="vendor-settings-input"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>
          <label className="vendor-settings-field">
            <span className="vendor-settings-field-label">New password</span>
            <input
              type="password"
              className="vendor-settings-input"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
            />
          </label>
          <label className="vendor-settings-field">
            <span className="vendor-settings-field-label">Confirm new password</span>
            <input
              type="password"
              className="vendor-settings-input"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
            />
          </label>
          {passwordError ? <p className="vendor-settings-modal-error">{passwordError}</p> : null}
          {passwordOk ? <p className="vendor-settings-save-ok">{passwordOk}</p> : null}
          <button
            type="button"
            className="vendor-settings-save-btn"
            disabled={passwordBusy || !currentPassword || !newPassword || !confirmPassword}
            onClick={() => void handlePasswordUpdate()}
          >
            {passwordBusy ? 'Updating…' : 'Update password'}
          </button>
        </section>
      ) : null}
      {passwordOk && !showPasswordForm ? (
        <p className="vendor-settings-save-ok">{passwordOk}</p>
      ) : null}
    </div>
  )
}

type GameStatus = 'auto' | 'manual'
type GameCategory = 'Slot' | 'Arcade' | 'Shooter'
type GamePlatform = 'golden-dragon' | 'magic-city' | 'vblink' | 'ultrapanda'

type AgentCredentials = {
  username?: string
  password?: string
  profileId?: string
  drawerNo?: string
  kioskId?: string
  appId?: string
  appSecret?: string
  hasPassword?: boolean
  hasAppSecret?: boolean
}

type VendorGame = {
  id: string
  icon: string
  title: string
  statusBadge: GameStatus
  badge: string
  category: GameCategory
  players: number
  enabled: boolean
  platform?: GamePlatform
  credentials?: AgentCredentials
}

const GAME_ICONS: Record<GameCategory, string> = {
  Slot: '🎰',
  Arcade: '🕹️',
  Shooter: '🎯',
}

const PLATFORMS: { id: GamePlatform; label: string }[] = [
  { id: 'golden-dragon', label: 'Golden Dragon' },
  { id: 'magic-city', label: 'Magic City' },
  { id: 'vblink', label: 'VBlink' },
  { id: 'ultrapanda', label: 'UltraPanda' },
]

type PlatformField = {
  key: keyof AgentCredentials
  label: string
  type: 'text' | 'password'
  required: boolean
  placeholder?: string
}

/** Matches Game Automation admin settings per platform. */
const PLATFORM_FIELDS: Record<GamePlatform, PlatformField[]> = {
  'golden-dragon': [
    { key: 'username', label: 'Agent Username', type: 'text', required: true, placeholder: 'Agent username' },
    { key: 'password', label: 'Agent Password', type: 'password', required: true, placeholder: 'Agent password' },
    { key: 'profileId', label: 'Profile ID', type: 'text', required: true, placeholder: 'Profile ID' },
    { key: 'drawerNo', label: 'Drawer No', type: 'text', required: true, placeholder: '1' },
  ],
  'magic-city': [
    { key: 'username', label: 'Agent Username', type: 'text', required: true, placeholder: 'Agent username' },
    { key: 'password', label: 'Agent Password', type: 'password', required: true, placeholder: 'Agent password' },
    { key: 'kioskId', label: 'Kiosk ID', type: 'text', required: true, placeholder: 'Kiosk ID' },
  ],
  vblink: [
    { key: 'appId', label: 'App ID', type: 'text', required: true, placeholder: 'App ID' },
    { key: 'appSecret', label: 'App Secret', type: 'password', required: true, placeholder: 'App Secret' },
  ],
  ultrapanda: [
    { key: 'appId', label: 'App ID', type: 'text', required: true, placeholder: 'App ID' },
    { key: 'appSecret', label: 'App Secret', type: 'password', required: true, placeholder: 'App Secret' },
  ],
}

function emptyCredentials(): AgentCredentials {
  return {
    username: '',
    password: '',
    profileId: '',
    drawerNo: '1',
    kioskId: '',
    appId: '',
    appSecret: '',
  }
}

function AutoRequiredMark({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <span className="vendor-settings-modal-required" aria-hidden="true">
      *
    </span>
  )
}

function credentialsForPlatform(platform: GamePlatform, values: AgentCredentials): AgentCredentials {
  const next: AgentCredentials = {}
  for (const field of PLATFORM_FIELDS[platform]) {
    const key = field.key
    if (key === 'hasPassword' || key === 'hasAppSecret') continue
    const value = values[key]
    if (typeof value === 'string') {
      Object.assign(next, { [key]: value })
    }
  }
  return next
}

function platformCredentialsReady(
  platform: GamePlatform,
  values: AgentCredentials,
  options?: { allowEmptySecrets?: boolean },
): boolean {
  const allowEmptySecrets = options?.allowEmptySecrets === true
  return PLATFORM_FIELDS[platform]
    .filter((field) => field.required)
    .filter((field) => !(allowEmptySecrets && (field.key === 'password' || field.key === 'appSecret')))
    .every((field) => String(values[field.key] ?? '').trim() !== '')
}

function gameMeta(category: GameCategory, players: number, status: GameStatus) {
  if (status === 'manual') return `${category} · Offline`
  return `${category} · ${players} Players`
}

function gameBadge(status: GameStatus) {
  if (status === 'auto') return 'API linked'
  return 'Manual mode'
}

function toApiGames(games: VendorGame[]): VendorGameRecord[] {
  return games.map((game) => ({
    id: game.id,
    title: game.title,
    icon: game.icon,
    category: game.category,
    mode: game.statusBadge,
    platform: game.platform || '',
    enabled: game.enabled,
    credentials: game.credentials,
  }))
}

function fromApiGames(games: VendorGameRecord[]): VendorGame[] {
  return games.map((game) => {
    const mode: GameStatus = game.mode === 'auto' ? 'auto' : 'manual'
    const category = (game.category as GameCategory) || 'Arcade'
    return {
      id: game.id,
      icon: game.icon || GAME_ICONS[category] || '🎮',
      title: game.title,
      statusBadge: mode,
      badge: game.badge || gameBadge(mode),
      category,
      players: 0,
      enabled: game.enabled !== false,
      platform: (game.platform as GamePlatform) || undefined,
      credentials: {
        ...emptyCredentials(),
        ...(game.credentials || {}),
        password: '',
        appSecret: '',
      },
    }
  })
}

/** Session cache — load once, reuse across tab switches; update after saves. */
let vendorGamesCache: VendorGame[] | null = null
let vendorGamesCacheError = ''
let vendorGamesInflight: Promise<VendorGame[]> | null = null

function rememberVendorGames(games: VendorGame[], error = '') {
  vendorGamesCache = games
  vendorGamesCacheError = error
}

async function loadVendorGames(force = false): Promise<{ games: VendorGame[]; error: string }> {
  if (!force && vendorGamesCache) {
    return { games: vendorGamesCache, error: vendorGamesCacheError }
  }

  if (!isApiConfigured()) {
    const error = 'WordPress API is not configured.'
    rememberVendorGames([], error)
    return { games: [], error }
  }

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('tapstack_token') : null
  if (!token || token.startsWith('demo:')) {
    const error = 'Log in with your vendor account (not demo mode) so games load from WordPress.'
    rememberVendorGames([], error)
    return { games: [], error }
  }

  if (!force && vendorGamesInflight) {
    const games = await vendorGamesInflight
    return { games, error: vendorGamesCacheError }
  }

  vendorGamesInflight = tapstackApi
    .vendorGames()
    .then((res) => {
      const games = fromApiGames(res.games || [])
      rememberVendorGames(games, '')
      return games
    })
    .catch((err) => {
      const error = err instanceof Error ? err.message : 'Could not load games from WordPress.'
      rememberVendorGames(vendorGamesCache || [], error)
      return vendorGamesCache || []
    })
    .finally(() => {
      vendorGamesInflight = null
    })

  const games = await vendorGamesInflight
  return { games, error: vendorGamesCacheError }
}

/** Prefetch on vendor dashboard open so Games tab is instant. */
export function prefetchVendorGames(): void {
  if (!isApiConfigured()) return
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('tapstack_token') : null
  if (!token || token.startsWith('demo:')) return
  void loadVendorGames()
}

export function clearVendorGamesCache(): void {
  vendorGamesCache = null
  vendorGamesCacheError = ''
  vendorGamesInflight = null
}

function GamesTab() {
  const [games, setGames] = useState<VendorGame[]>(() => vendorGamesCache || [])
  const [loading, setLoading] = useState(() => isApiConfigured() && vendorGamesCache === null)
  const [saving, setSaving] = useState(false)
  const [listError, setListError] = useState(() => vendorGamesCacheError)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<GameCategory>('Slot')
  const [newMode, setNewMode] = useState<GameStatus>('manual')
  const [newPlatform, setNewPlatform] = useState<GamePlatform>('golden-dragon')
  const [agentCreds, setAgentCreds] = useState<AgentCredentials>(emptyCredentials())
  const [formError, setFormError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(vendorGamesCache === null && isApiConfigured())
    void loadVendorGames().then(({ games: next, error }) => {
      if (cancelled) return
      setGames(next)
      setListError(error)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const isEditing = editingId !== null
  const activeCount = games.filter((game) => game.enabled).length
  const autoCredentialsReady =
    newMode === 'auto' &&
    platformCredentialsReady(newPlatform, agentCreds, { allowEmptySecrets: isEditing })
  const canSubmit =
    newName.trim().length > 0 && (newMode !== 'auto' || autoCredentialsReady)

  function resetGameForm() {
    setEditingId(null)
    setNewName('')
    setNewCategory('Slot')
    setNewMode('manual')
    setNewPlatform('golden-dragon')
    setAgentCreds(emptyCredentials())
    setFormError('')
  }

  function closeGameModal() {
    setModalOpen(false)
    resetGameForm()
  }

  function openAddGame() {
    resetGameForm()
    setModalOpen(true)
  }

  function openEditGame(game: VendorGame) {
    setEditingId(game.id)
    setNewName(game.title)
    setNewCategory(game.category)
    setNewMode(game.statusBadge)
    setNewPlatform(game.platform || 'golden-dragon')
    setAgentCreds({
      ...emptyCredentials(),
      ...(game.credentials || {}),
      password: '',
      appSecret: '',
    })
    setFormError('')
    setModalOpen(true)
  }

  async function persistGames(next: VendorGame[]) {
    if (!isApiConfigured()) {
      rememberVendorGames(next)
      setGames(next)
      setFormError('WordPress API is not configured (VITE_WP_API_URL). Games stay local only.')
      return false
    }
    setSaving(true)
    setFormError('')
    setListError('')
    try {
      const res = await tapstackApi.saveVendorGames(toApiGames(next))
      const saved = fromApiGames(res.games || [])
      rememberVendorGames(saved)
      setGames(saved)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save games to WordPress.'
      setFormError(message)
      setListError(message)
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveGame(event: React.FormEvent) {
    event.preventDefault()
    const title = newName.trim()
    if (!title) {
      setFormError('Enter a game name.')
      return
    }
    if (
      newMode === 'auto' &&
      !platformCredentialsReady(newPlatform, agentCreds, { allowEmptySecrets: isEditing })
    ) {
      setFormError('Fill in the required agent fields for this platform.')
      return
    }

    const id =
      editingId ||
      title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ||
      `game-${Date.now()}`
    const existing = games.find((game) => game.id === id)

    const nextGame: VendorGame = {
      id,
      icon: GAME_ICONS[newCategory],
      title,
      statusBadge: newMode,
      badge: gameBadge(newMode),
      category: newCategory,
      players: existing?.players ?? 0,
      enabled: existing?.enabled ?? true,
      platform: newMode === 'auto' ? newPlatform : undefined,
      credentials:
        newMode === 'auto' ? credentialsForPlatform(newPlatform, agentCreds) : undefined,
    }

    const next: VendorGame[] = isEditing
      ? games.map((game) => (game.id === editingId ? nextGame : game))
      : [...games.filter((game) => game.id !== id), nextGame]

    const ok = await persistGames(next)
    if (ok) closeGameModal()
  }

  function toggleGame(id: string, enabled: boolean) {
    void persistGames(games.map((game) => (game.id === id ? { ...game, enabled } : game)))
  }

  async function deleteGame(game: VendorGame) {
    if (deletingId || saving) return
    const confirmed = window.confirm(`Delete “${game.title}”? This removes it from your catalog.`)
    if (!confirmed) return
    setDeletingId(game.id)
    try {
      await persistGames(games.filter((item) => item.id !== game.id))
      if (editingId === game.id) closeGameModal()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="vendor-settings-content">
      <div className="vendor-settings-games-toolbar">
        <div>
          <h2 className="vendor-settings-games-heading">Games</h2>
          <p className="vendor-settings-games-meta">
            {loading
              ? 'Loading…'
              : `${activeCount} of ${games.length} active${saving ? ' · Saving…' : ''}`}
          </p>
        </div>
        <button type="button" className="vendor-settings-add-game-btn" onClick={openAddGame}>
          + Add Game
        </button>
      </div>

      {listError ? <p className="vendor-settings-modal-error">{listError}</p> : null}

      <section className="vendor-settings-games-list">
        {!loading && games.length === 0 ? (
          <p className="vendor-settings-games-meta">No games yet. Click + Add Game to create one.</p>
        ) : null}
        {games.map((game) => (
          <article key={game.id} className="vendor-settings-game-bonus-card">
            <span className="vendor-settings-game-bonus-icon" aria-hidden="true">
              {game.icon}
            </span>
            <div className="vendor-settings-game-bonus-info">
              <div className="vendor-settings-game-bonus-title-row">
                <h4 className="vendor-settings-game-bonus-title">{game.title}</h4>
                {game.statusBadge === 'auto' ? (
                  <span className="vendor-settings-game-status-badge vendor-settings-game-status-badge--auto">
                    <span aria-hidden="true">⚡</span> Auto
                  </span>
                ) : (
                  <span className="vendor-settings-game-status-badge vendor-settings-game-status-badge--manual">
                    <span aria-hidden="true">✋</span> Manual
                  </span>
                )}
              </div>
              <span className="vendor-settings-game-bonus-pill">{game.badge}</span>
              <p className="vendor-settings-game-bonus-meta">
                {game.platform ? `${game.platform} · ` : ''}
                {gameMeta(game.category, game.players, game.statusBadge)}
              </p>
            </div>
            <div className="vendor-settings-game-bonus-actions">
              <button
                type="button"
                role="switch"
                aria-checked={game.enabled}
                aria-label={`Enable ${game.title}`}
                className={`vendor-settings-toggle ${game.enabled ? 'vendor-settings-toggle--on' : ''}`}
                onClick={() => toggleGame(game.id, !game.enabled)}
              >
                <span className="vendor-settings-toggle-knob" />
              </button>
              <button
                type="button"
                className="vendor-settings-game-settings-btn"
                aria-label={`Edit ${game.title}`}
                onClick={() => openEditGame(game)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 10h4M10 8h4M18 16h4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="vendor-settings-game-delete-btn"
                aria-label={`Delete ${game.title}`}
                disabled={deletingId === game.id || saving}
                onClick={() => void deleteGame(game)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M10 11v6M14 11v6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </article>
        ))}
      </section>

      {modalOpen
        ? createPortal(
            <div className="vendor-settings-modal-overlay" role="presentation" onClick={closeGameModal}>
              <div
                className="vendor-settings-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="game-modal-title"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="vendor-settings-modal-header">
                  <h2 id="game-modal-title">{isEditing ? 'Edit Game' : 'Add Game'}</h2>
                  <button
                    type="button"
                    className="vendor-settings-modal-close"
                    onClick={closeGameModal}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <p className="vendor-settings-modal-copy">
                  Manual games need vendor approval. Auto games use your own platform agent account to load
                  credits for connected players.
                </p>

                <form className="vendor-settings-modal-form" onSubmit={handleSaveGame}>
                  <label className="vendor-settings-modal-label" htmlFor="game-modal-name">
                    Game name
                    <AutoRequiredMark show={newMode === 'auto'} />
                  </label>
                  <input
                    id="game-modal-name"
                    className="vendor-settings-modal-input"
                    type="text"
                    placeholder="e.g. Neon Spinner"
                    required={newMode === 'auto'}
                    aria-required={newMode === 'auto'}
                    value={newName}
                    onChange={(event) => {
                      setNewName(event.target.value)
                      if (formError) setFormError('')
                    }}
                    autoFocus
                  />

                  <label className="vendor-settings-modal-label" htmlFor="game-modal-category">
                    Category
                    <AutoRequiredMark show={newMode === 'auto'} />
                  </label>
                  <select
                    id="game-modal-category"
                    className="vendor-settings-modal-input"
                    required={newMode === 'auto'}
                    aria-required={newMode === 'auto'}
                    value={newCategory}
                    onChange={(event) => setNewCategory(event.target.value as GameCategory)}
                  >
                    <option value="Slot">Slot</option>
                    <option value="Arcade">Arcade</option>
                    <option value="Shooter">Shooter</option>
                  </select>

                  <span className="vendor-settings-modal-label">Load mode</span>
                  <div className="vendor-settings-modal-mode-row" role="radiogroup" aria-label="Load mode">
                    {(
                      [
                        { id: 'manual', label: 'Manual' },
                        { id: 'auto', label: 'Auto' },
                      ] as const
                    ).map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={newMode === option.id}
                        className={`vendor-settings-modal-mode-btn ${newMode === option.id ? 'vendor-settings-modal-mode-btn--active' : ''}`}
                        onClick={() => setNewMode(option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {newMode === 'auto' ? (
                    <div className="vendor-settings-modal-agent">
                      <p className="vendor-settings-modal-copy">
                        Enter <strong>your platform&apos;s</strong> credentials (it is recommended to use a dedicated account
                        and drawer, where applicable, for each automation. It greatly enhances overall
                        experience). Players will connect their own accounts separately.
                        {isEditing ? ' Leave password fields blank to keep the current value.' : ''}
                      </p>

                      <label className="vendor-settings-modal-label" htmlFor="game-modal-platform">
                        Platform
                        <AutoRequiredMark show />
                      </label>
                      <select
                        id="game-modal-platform"
                        className="vendor-settings-modal-input"
                        required
                        aria-required="true"
                        value={newPlatform}
                        onChange={(event) => {
                          setNewPlatform(event.target.value as GamePlatform)
                          setAgentCreds(emptyCredentials())
                        }}
                      >
                        {PLATFORMS.map((platform) => (
                          <option key={platform.id} value={platform.id}>
                            {platform.label}
                          </option>
                        ))}
                      </select>

                      {PLATFORM_FIELDS[newPlatform].map((field) => {
                        const inputId = `agent-${field.key}`
                        const value = String(agentCreds[field.key] ?? '')
                        const isSecret = field.key === 'password' || field.key === 'appSecret'
                        return (
                          <div key={field.key}>
                            <label className="vendor-settings-modal-label" htmlFor={inputId}>
                              {field.label}
                              <AutoRequiredMark show />
                            </label>
                            <input
                              id={inputId}
                              className="vendor-settings-modal-input"
                              type={field.type}
                              required={!(isEditing && isSecret)}
                              aria-required={!(isEditing && isSecret)}
                              autoComplete={field.type === 'password' ? 'new-password' : 'off'}
                              value={value}
                              placeholder={
                                isEditing && isSecret
                                  ? 'Leave blank to keep current'
                                  : field.placeholder
                              }
                              onChange={(event) =>
                                setAgentCreds((current) => ({
                                  ...current,
                                  [field.key]: event.target.value,
                                }))
                              }
                            />
                          </div>
                        )
                      })}
                    </div>
                  ) : null}

                  {formError ? <p className="vendor-settings-modal-error">{formError}</p> : null}

                  <div className="vendor-settings-modal-actions">
                    {isEditing ? (
                      <button
                        type="button"
                        className="vendor-settings-modal-delete"
                        disabled={saving || deletingId === editingId}
                        onClick={() => {
                          const game = games.find((item) => item.id === editingId)
                          if (game) void deleteGame(game)
                        }}
                      >
                        Delete
                      </button>
                    ) : null}
                    <button type="submit" className="vendor-settings-modal-submit" disabled={!canSubmit || saving}>
                      {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Game'}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.querySelector('.vendor-dashboard') ?? document.body,
          )
        : null}
    </div>
  )
}

function BillingTab() {
  const [minRedeem, setMinRedeem] = useState('10')
  const [maxRedeem, setMaxRedeem] = useState('500')
  const [autoLoads, setAutoLoads] = useState(true)
  const [approval, setApproval] = useState<RedeemApprovalMode>('hybrid')
  const [autoThreshold, setAutoThreshold] = useState('500')
  const [autoPayin, setAutoPayin] = useState('500')
  const [staffPayin, setStaffPayin] = useState('1000')
  const [vipPayinEnabled, setVipPayinEnabled] = useState(true)
  const [vipAutoPayin, setVipAutoPayin] = useState('500')
  const [vipStaffPayin, setVipStaffPayin] = useState('1000')
  const [coverLoadbackFees, setCoverLoadbackFees] = useState(false)
  const [loadbackFeePct, setLoadbackFeePct] = useState('100')
  const [tipsEnabled, setTipsEnabled] = useState(true)
  const [payinCaps, setPayinCaps] = useState({
    auto: 500,
    staff: 1000,
    gameRoomMode: 'launch',
    gameRoomThreshold: 3000,
    gameRoomWindowDays: 14,
  })
  const [gameRoomThreshold, setGameRoomThreshold] = useState('3000')
  const [linkedCount, setLinkedCount] = useState(0)
  const [gameCount, setGameCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveOk, setSaveOk] = useState(false)

  function applyGames(games: Partial<VendorRedeemSettings> | null | undefined) {
    if (!games) return
    if (games.minRedeem != null) setMinRedeem(String(games.minRedeem))
    if (games.maxRedeem != null) setMaxRedeem(String(games.maxRedeem))
    if (typeof games.autoLoads === 'boolean') setAutoLoads(games.autoLoads)
    const mode = games.redeemApproval
    if (mode === 'manual' || mode === 'auto' || mode === 'hybrid') {
      setApproval(mode)
    } else if (typeof games.autoRedeems === 'boolean') {
      setApproval(games.autoRedeems ? 'auto' : 'hybrid')
    }
    if (games.autoRedeemThreshold != null) setAutoThreshold(String(games.autoRedeemThreshold))
    else if (games.maxRedeem != null) setAutoThreshold(String(games.maxRedeem))
    if (games.autoPayinThreshold != null) setAutoPayin(String(games.autoPayinThreshold))
    if (games.staffPayinThreshold != null) setStaffPayin(String(games.staffPayinThreshold))
    if (typeof games.vipPayinEnabled === 'boolean') setVipPayinEnabled(games.vipPayinEnabled)
    if (games.vipAutoPayinThreshold != null) setVipAutoPayin(String(games.vipAutoPayinThreshold))
    if (games.vipStaffPayinThreshold != null) setVipStaffPayin(String(games.vipStaffPayinThreshold))
    if (games.gameRoomThreshold != null) setGameRoomThreshold(String(games.gameRoomThreshold))
    if (typeof games.coverLoadbackFees === 'boolean') setCoverLoadbackFees(games.coverLoadbackFees)
    if (games.loadbackFeePct != null) setLoadbackFeePct(String(games.loadbackFeePct))
    if (typeof games.tipsEnabled === 'boolean') setTipsEnabled(games.tipsEnabled)
  }

  useEffect(() => {
    let cancelled = false
    const token = getToken()
    const demo = !isApiConfigured() || Boolean(token?.startsWith('demo:'))

    ;(async () => {
      setLoading(true)
      try {
        if (demo) {
          try {
            const raw = localStorage.getItem('tapstack_vendor_redeem_settings')
            if (raw) applyGames(JSON.parse(raw) as VendorRedeemSettings)
          } catch {
            /* keep defaults */
          }
        } else {
          const settings = await tapstackApi.vendorSettings().catch(() => null)
          if (!cancelled) {
            applyGames(settings?.games)
            if (settings?.payinCaps) {
              setPayinCaps({
                auto: settings.payinCaps.auto,
                staff: settings.payinCaps.staff,
                gameRoomMode: settings.payinCaps.gameRoomMode || 'launch',
                gameRoomThreshold: settings.payinCaps.gameRoomThreshold || 3000,
                gameRoomWindowDays: settings.payinCaps.gameRoomWindowDays || 14,
              })
            }
          }
        }
        const { games } = await loadVendorGames()
        if (!cancelled) {
          setGameCount(games.length)
          setLinkedCount(games.filter((game) => game.statusBadge === 'auto').length)
        }
      } catch (err) {
        if (!cancelled) {
          setSaveError(err instanceof Error ? err.message : 'Could not load redeem settings.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleSave() {
    const min = Math.max(0, Number(minRedeem) || 0)
    const max = Math.max(min, Number(maxRedeem) || 0)
    const threshold = Math.max(0, Number(autoThreshold) || max)
    const capAuto = Math.max(0, payinCaps.auto || 500)
    const capStaff = Math.max(capAuto, payinCaps.staff || 1000)
    const clamp = (value: number, cap: number) => Math.round(Math.min(Math.max(0, value), cap) * 100) / 100
    const autoPayinValue = clamp(Number(autoPayin) || 0, capAuto)
    const vipAutoValue = clamp(Number(vipAutoPayin) || 0, capAuto)
    const payload: VendorRedeemSettings = {
      minRedeem: Math.round(min * 100) / 100,
      maxRedeem: Math.round(max * 100) / 100,
      autoLoads,
      autoRedeems: approval !== 'manual',
      redeemApproval: approval,
      autoRedeemThreshold: Math.round(threshold * 100) / 100,
      autoPayinThreshold: autoPayinValue,
      staffPayinThreshold: Math.max(autoPayinValue, clamp(Number(staffPayin) || 0, capStaff)),
      vipPayinEnabled,
      vipAutoPayinThreshold: vipAutoValue,
      vipStaffPayinThreshold: Math.max(vipAutoValue, clamp(Number(vipStaffPayin) || 0, capStaff)),
      gameRoomThreshold: Math.max(0, Math.round((Number(gameRoomThreshold) || 0) * 100) / 100),
      coverLoadbackFees,
      loadbackFeePct: coverLoadbackFees
        ? Math.max(0, Math.min(100, Math.round((Number(loadbackFeePct) || 0) * 100) / 100))
        : 0,
      tipsEnabled,
    }

    setSaving(true)
    setSaveError('')
    setSaveOk(false)
    try {
      const token = getToken()
      if (!isApiConfigured() || token?.startsWith('demo:')) {
        localStorage.setItem('tapstack_vendor_redeem_settings', JSON.stringify(payload))
        applyGames(payload)
        setSaveOk(true)
        return
      }
      const res = await tapstackApi.saveVendorSettings({ games: payload })
      const saved = (res.settings as { games?: VendorRedeemSettings } | undefined)?.games
      applyGames(saved || payload)
      setSaveOk(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save redeem settings.')
    } finally {
      setSaving(false)
    }
  }

  const money = (value: string) => {
    const n = Number(value)
    return Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'
  }

  const needsThreshold = approval === 'auto' || approval === 'hybrid'
  const thresholdLabel = approval === 'auto' ? 'Maximum auto-redeem' : 'Auto-approve up to'
  const thresholdHelp =
    approval === 'auto'
      ? `Redemptions at or below $${money(autoThreshold)} are approved automatically. Larger requests are blocked.`
      : `Redemptions at or below $${money(autoThreshold)} are approved automatically. Amounts above that (up to $${money(maxRedeem)}) wait in Pending Redeems.`

  return (
    <div className="vendor-settings-content">
      <div className="vendor-settings-games-toolbar">
        <div>
          <h2 className="vendor-settings-games-heading">Billing</h2>
          <p className="vendor-settings-games-meta">Redeems, pay-ins, and automation</p>
        </div>
      </div>

      <section className="vendor-settings-panel">
        <div className="vendor-settings-games-card-header">
          <span className="vendor-settings-games-card-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="18" cy="6" r="3" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="18" cy="18" r="3" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8.6 10.6l6.8-3.2M8.6 13.4l6.8 3.2" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </span>
          <div>
            <h3 className="vendor-settings-games-card-title">Redeem Settings</h3>
            <p className="vendor-settings-games-card-desc">
              General redeem limits that apply across all of your games.
            </p>
          </div>
        </div>

        <div className="vendor-settings-redeem-row">
          <label className="vendor-settings-redeem-field">
            <span className="vendor-settings-field-label">Minimum Redeem</span>
            <div className="vendor-settings-money-input-wrap">
              <span className="vendor-settings-money-prefix">$</span>
              <input
                type="number"
                className="vendor-settings-money-input"
                value={minRedeem}
                onChange={(event) => setMinRedeem(event.target.value)}
                min="0"
                step="1"
              />
            </div>
          </label>
          <label className="vendor-settings-redeem-field">
            <span className="vendor-settings-field-label">Maximum Redeem</span>
            <div className="vendor-settings-money-input-wrap">
              <span className="vendor-settings-money-prefix">$</span>
              <input
                type="number"
                className="vendor-settings-money-input"
                value={maxRedeem}
                onChange={(event) => setMaxRedeem(event.target.value)}
                min="0"
                step="1"
              />
            </div>
          </label>
        </div>

        <p className="vendor-settings-panel-help">
          Players can redeem between ${money(minRedeem)} and ${money(maxRedeem)} per request, across
          every game.
        </p>
      </section>

      <section className="vendor-settings-panel">
        <div className="vendor-settings-games-card-header">
          <span className="vendor-settings-games-card-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 11l3 3L22 4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div>
            <h3 className="vendor-settings-games-card-title">Redeem Approval</h3>
            <p className="vendor-settings-games-card-desc">
              Choose how player redemptions are approved at your store.
            </p>
          </div>
        </div>

        <div className="vendor-settings-mode-list" role="radiogroup" aria-label="Redeem approval method">
          {(
            [
              {
                id: 'manual' as const,
                label: 'Manual',
                description: 'All redemptions require manual approval.',
              },
              {
                id: 'auto' as const,
                label: 'Auto',
                description:
                  'Redemptions below your threshold are approved automatically. Larger amounts are blocked.',
              },
              {
                id: 'hybrid' as const,
                label: 'Hybrid',
                description:
                  'Set the dollar amount that can be automatically approved. Amounts above that wait for you.',
              },
            ] satisfies { id: RedeemApprovalMode; label: string; description: string }[]
          ).map((mode) => {
            const active = approval === mode.id
            return (
              <button
                key={mode.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={`vendor-settings-mode-card ${active ? 'vendor-settings-mode-card--active' : ''}`}
                onClick={() => setApproval(mode.id)}
              >
                <span className="vendor-settings-mode-radio" aria-hidden="true" />
                <span>
                  <span className="vendor-settings-mode-label">{mode.label}</span>
                  <span className="vendor-settings-mode-desc">{mode.description}</span>
                </span>
              </button>
            )
          })}
        </div>

        {needsThreshold ? (
          <label className="vendor-settings-redeem-field vendor-settings-threshold-field">
            <span className="vendor-settings-field-label">{thresholdLabel}</span>
            <div className="vendor-settings-money-input-wrap">
              <span className="vendor-settings-money-prefix">$</span>
              <input
                type="number"
                className="vendor-settings-money-input"
                value={autoThreshold}
                onChange={(event) => setAutoThreshold(event.target.value)}
                min="0"
                step="1"
              />
            </div>
            <span className="vendor-settings-panel-help">{thresholdHelp}</span>
          </label>
        ) : (
          <p className="vendor-settings-panel-help">
            Every redeem request will show up under Orders → Redeems for you to approve or reject.
          </p>
        )}
      </section>

      <section className="vendor-settings-panel">
        <div className="vendor-settings-games-card-header">
          <span className="vendor-settings-games-card-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3v18M5 8h14M7 16h10"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div>
            <h3 className="vendor-settings-games-card-title">Autocomplete</h3>
            <p className="vendor-settings-games-card-desc">
              Set the maximum amount to autocomplete. TapStack still caps auto at $
              {money(String(payinCaps.auto))} and staff at ${money(String(payinCaps.staff))}.
            </p>
          </div>
        </div>

        <div className="vendor-settings-redeem-row">
          <label className="vendor-settings-redeem-field">
            <span className="vendor-settings-field-label">Maximum amount to autocomplete</span>
            <div className="vendor-settings-money-input-wrap">
              <span className="vendor-settings-money-prefix">$</span>
              <input
                type="number"
                className="vendor-settings-money-input"
                value={autoPayin}
                onChange={(event) => setAutoPayin(event.target.value)}
                min="0"
                max={payinCaps.auto}
                step="1"
              />
            </div>
          </label>
          <label className="vendor-settings-redeem-field">
            <span className="vendor-settings-field-label">Staff-approve payins up to</span>
            <div className="vendor-settings-money-input-wrap">
              <span className="vendor-settings-money-prefix">$</span>
              <input
                type="number"
                className="vendor-settings-money-input"
                value={staffPayin}
                onChange={(event) => setStaffPayin(event.target.value)}
                min="0"
                max={payinCaps.staff}
                step="1"
              />
            </div>
          </label>
        </div>
        <p className="vendor-settings-panel-help">
          Loads at or below ${money(autoPayin)} autocomplete when the game is API-linked.
          Amounts up to ${money(staffPayin)} wait for staff approval. Larger payins are blocked.
        </p>

        <div className="vendor-settings-auto-list">
          <div className="vendor-settings-auto-item">
            <SettingsToggle
              label="Override autocomplete limit for VIPs"
              description="Let VIP customers use a higher autocomplete amount at this store"
              checked={vipPayinEnabled}
              onChange={setVipPayinEnabled}
            />
          </div>
        </div>

        {vipPayinEnabled ? (
          <>
            <div className="vendor-settings-redeem-row">
              <label className="vendor-settings-redeem-field">
                <span className="vendor-settings-field-label">VIP autocomplete up to</span>
                <div className="vendor-settings-money-input-wrap">
                  <span className="vendor-settings-money-prefix">$</span>
                  <input
                    type="number"
                    className="vendor-settings-money-input"
                    value={vipAutoPayin}
                    onChange={(event) => setVipAutoPayin(event.target.value)}
                    min="0"
                    max={payinCaps.auto}
                    step="1"
                  />
                </div>
              </label>
              <label className="vendor-settings-redeem-field">
                <span className="vendor-settings-field-label">VIP staff-approve up to</span>
                <div className="vendor-settings-money-input-wrap">
                  <span className="vendor-settings-money-prefix">$</span>
                  <input
                    type="number"
                    className="vendor-settings-money-input"
                    value={vipStaffPayin}
                    onChange={(event) => setVipStaffPayin(event.target.value)}
                    min="0"
                    max={payinCaps.staff}
                    step="1"
                  />
                </div>
              </label>
            </div>
            <p className="vendor-settings-panel-help">
              VIP customers tagged in Analytics can auto-load up to ${money(vipAutoPayin)} and request
              staff approval up to ${money(vipStaffPayin)}. TapStack VIP override can raise a player
              to the platform caps.
            </p>
          </>
        ) : null}
      </section>

      <section className="vendor-settings-panel">
        <div className="vendor-settings-games-card-header">
          <span className="vendor-settings-games-card-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3v18M7 8h7.5a3.5 3.5 0 0 1 0 7H9"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div>
            <h3 className="vendor-settings-games-card-title">Loadback fees</h3>
            <p className="vendor-settings-games-card-desc">
              Cover the processing fee on customer loads from your TapStack balance.
            </p>
          </div>
        </div>
        <div className="vendor-settings-auto-list">
          <div className="vendor-settings-auto-item">
            <SettingsToggle
              label="Cover customer loadback fees"
              description="Give the initial processing fee back to clients when they load"
              checked={coverLoadbackFees}
              onChange={setCoverLoadbackFees}
            />
          </div>
        </div>
        {coverLoadbackFees ? (
          <>
            <label className="vendor-settings-redeem-field">
              <span className="vendor-settings-field-label">Percent of the fee you cover</span>
              <div className="vendor-settings-money-input-wrap">
                <input
                  type="number"
                  className="vendor-settings-money-input"
                  value={loadbackFeePct}
                  onChange={(event) => setLoadbackFeePct(event.target.value)}
                  min="0"
                  max="100"
                  step="1"
                />
                <span className="vendor-settings-money-prefix">%</span>
              </div>
            </label>
            <p className="vendor-settings-panel-help">
              {Number(loadbackFeePct) >= 100
                ? 'You cover the full processing fee. Players are not charged extra on loads.'
                : `You cover ${money(loadbackFeePct)}% of the processing fee. Players pay the rest.`}
            </p>
          </>
        ) : null}
      </section>

      <section className="vendor-settings-panel">
        <div className="vendor-settings-auto-list">
          <div className="vendor-settings-auto-item">
            <SettingsToggle
              label="Allow players to tip this gameroom"
              description="Players can send a wallet tip from the Game Room page"
              checked={tipsEnabled}
              onChange={setTipsEnabled}
            />
          </div>
        </div>
      </section>

      <section className="vendor-settings-panel">
        <div className="vendor-settings-games-card-header">
          <span className="vendor-settings-games-card-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 19V5h16v14H4zm4-4h8M8 11h8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div>
            <h3 className="vendor-settings-games-card-title">Game Room Monitoring</h3>
            <p className="vendor-settings-games-card-desc">
              {payinCaps.gameRoomMode === 'vendor'
                ? 'TapStack notifies operators when a player’s loads at this store reach your threshold. Set 0 to turn alerts off.'
                : payinCaps.gameRoomMode === 'always'
                  ? `TapStack notifies operators when a player’s loads at this store reach $${money(String(payinCaps.gameRoomThreshold))}.`
                  : `For a new player’s first ${payinCaps.gameRoomWindowDays} days, TapStack is notified at $${money(String(payinCaps.gameRoomThreshold))} of loads on this store.`}
            </p>
          </div>
        </div>
        {payinCaps.gameRoomMode === 'vendor' ? (
          <div className="vendor-settings-redeem-row">
            <label className="vendor-settings-redeem-field">
              <span className="vendor-settings-field-label">Notify TapStack at</span>
              <div className="vendor-settings-money-input-wrap">
                <span className="vendor-settings-money-prefix">$</span>
                <input
                  type="number"
                  className="vendor-settings-money-input"
                  value={gameRoomThreshold}
                  onChange={(event) => setGameRoomThreshold(event.target.value)}
                  min="0"
                  step="1"
                />
              </div>
            </label>
          </div>
        ) : null}
      </section>

      <section className="vendor-settings-panel">
        <div className="vendor-settings-games-card-header">
          <span className="vendor-settings-games-card-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M13 2L4 14h7l-1 8 10-14h-7l0-6z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <h3 className="vendor-settings-games-card-title">Automate Loads</h3>
            <p className="vendor-settings-games-card-desc">
              Link your game platform APIs to credit loads automatically.
            </p>
          </div>
        </div>

        <div className="vendor-settings-auto-list">
          <div className="vendor-settings-auto-item">
            <SettingsToggle
              label="Auto Loads"
              description="Credit games instantly on deposit"
              checked={autoLoads}
              onChange={setAutoLoads}
            />
          </div>
        </div>

        <p className="vendor-settings-panel-help">
          {gameCount > 0
            ? `${linkedCount} of ${gameCount} games are API-linked. Open a game's settings to link its platform.`
            : 'Open a game’s Settings tab to link its platform for automatic loads.'}
        </p>
      </section>

      {saveError ? <p className="vendor-settings-modal-error">{saveError}</p> : null}
      {saveOk ? <p className="vendor-settings-save-ok">Billing settings saved.</p> : null}

      <div className="vendor-settings-actions vendor-settings-actions--single">
        <button
          type="button"
          className="vendor-settings-save-btn"
          disabled={saving || loading}
          onClick={() => void handleSave()}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

export default function VendorSettingsPage({
  portal: _portal = 'vendor',
}: {
  portal?: 'vendor' | 'distributor'
}) {
  return <VendorStoreSettingsPage />
}

function VendorStoreSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

  return (
    <div className="vendor-settings-page">
      <div className="vendor-settings-tabs" role="tablist" aria-label="Settings sections">
        {SETTINGS_TABS.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`vendor-settings-tab ${active ? 'vendor-settings-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div role="tabpanel" hidden={activeTab !== 'profile'}>
        <ProfileTab />
      </div>
      <div role="tabpanel" hidden={activeTab !== 'games'}>
        <GamesTab />
      </div>
      <div role="tabpanel" hidden={activeTab !== 'billing'}>
        <BillingTab />
      </div>
    </div>
  )
}
