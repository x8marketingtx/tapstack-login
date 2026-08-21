import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import type { Vendor } from '../data/vendors'
import { decodeIcon, vendorFromApi } from '../data/vendors'
import { ApiError, isApiConfigured, tapstackApi, type VendorOrderItem } from '../api/client'
import BottomNav, { type DashboardTab } from './BottomNav'
import DashboardHeader from './DashboardHeader'
import GameLoadModal, { type GameLoadTarget, type GameTransferIntent } from './GameLoadModal'
import './CustomerDashboard.css'
import './VendorPage.css'

type GameCredentials = { mobileId: string; password: string }

function credsStorageKey(vendorId: number | string, gameKey: string) {
  return `tapstack_game_creds:${vendorId}:${gameKey}`
}

function saveLocalCreds(vendorId: number | string, gameKey: string, creds: GameCredentials) {
  try {
    localStorage.setItem(credsStorageKey(vendorId, gameKey), JSON.stringify(creds))
  } catch {
    /* ignore quota */
  }
}

function loadLocalCreds(vendorId: number | string, gameKey: string): GameCredentials | null {
  try {
    const raw = localStorage.getItem(credsStorageKey(vendorId, gameKey))
    if (!raw) return null
    const parsed = JSON.parse(raw) as GameCredentials
    if (!parsed?.mobileId) return null
    return { mobileId: String(parsed.mobileId), password: String(parsed.password || '') }
  } catch {
    return null
  }
}

function clearLocalCreds(vendorId: number | string, gameKey: string) {
  try {
    localStorage.removeItem(credsStorageKey(vendorId, gameKey))
  } catch {
    /* ignore */
  }
}

function connectedCacheKey(vendorId: number | string) {
  return `tapstack_connected_games:${vendorId}`
}

function loadConnectedCache(vendorId: number | string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(connectedCacheKey(vendorId))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as string[] | Record<string, boolean>
    if (Array.isArray(parsed)) {
      return Object.fromEntries(parsed.map((key) => [key, true]))
    }
    if (parsed && typeof parsed === 'object') {
      return Object.fromEntries(
        Object.entries(parsed).filter(([, value]) => Boolean(value)),
      ) as Record<string, boolean>
    }
  } catch {
    /* ignore */
  }
  return {}
}

function saveConnectedCache(vendorId: number | string, connected: Record<string, boolean>) {
  try {
    const keys = Object.keys(connected).filter((key) => connected[key])
    localStorage.setItem(connectedCacheKey(vendorId), JSON.stringify(keys))
  } catch {
    /* ignore */
  }
}

function gameKeyFor(game: { id?: string; name: string }) {
  return (
    game.id ||
    game.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  )
}

function seedConnectedGames(vendor: Vendor): Record<string, boolean> {
  if (!vendor.id) return {}
  const seeded = { ...loadConnectedCache(vendor.id) }
  for (const game of vendor.games || []) {
    const key = gameKeyFor(game)
    if (game.connected) seeded[key] = true
    if (loadLocalCreds(vendor.id, key)) seeded[key] = true
  }
  return seeded
}

type VendorPageProps = {
  vendor: Vendor
  activeTab: DashboardTab
  cashBalance?: string
  onBack: () => void
  onTabChange: (tab: DashboardTab) => void
  onRemoveVendor?: () => void
  onCashBalanceChange?: (balance: string) => void
}

export default function VendorPage({
  vendor: initialVendor,
  activeTab,
  cashBalance = '$0.00',
  onBack,
  onTabChange,
  onRemoveVendor,
  onCashBalanceChange,
}: VendorPageProps) {
  const [vendor, setVendor] = useState(initialVendor)
  const [walletBalance, setWalletBalance] = useState(cashBalance)
  const [walletLoading, setWalletLoading] = useState(false)
  const [loadGame, setLoadGame] = useState<GameLoadTarget | null>(null)
  const [transferIntent, setTransferIntent] = useState<GameTransferIntent>('load')
  const [connectGame, setConnectGame] = useState<string | null>(null)
  const [connectGameKey, setConnectGameKey] = useState('')
  const [connectGameIcon, setConnectGameIcon] = useState<{ icon: string; iconBg: string }>({
    icon: '🎰',
    iconBg: '#ede9fe',
  })
  const [connectMode, setConnectMode] = useState<'auto' | 'manual'>('manual')
  const [connectPlatform, setConnectPlatform] = useState('')
  const [connectStep, setConnectStep] = useState<'choose' | 'login' | 'generate' | 'created'>('choose')
  const [mobileId, setMobileId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [generatedCreds, setGeneratedCreds] = useState<GameCredentials | null>(null)
  const [revealCreds, setRevealCreds] = useState(false)
  const [copyNote, setCopyNote] = useState('')
  const [credsLoading, setCredsLoading] = useState(false)
  const [connectError, setConnectError] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [disconnectingKey, setDisconnectingKey] = useState<string | null>(null)
  const [gameMenuKey, setGameMenuKey] = useState<string | null>(null)
  const [connectedGames, setConnectedGames] = useState<Record<string, boolean>>(() =>
    seedConnectedGames(initialVendor),
  )
  const [gameBalances, setGameBalances] = useState<
    Record<string, { status: 'loading' | 'ready' | 'unavailable'; formatted: string }>
  >({})
  const [gamesLoading, setGamesLoading] = useState(isApiConfigured() && Boolean(initialVendor.id))
  const [connectionResolved, setConnectionResolved] = useState(
    !(isApiConfigured() && Boolean(initialVendor.id)),
  )
  const [pendingOrders, setPendingOrders] = useState<VendorOrderItem[]>([])
  const [pendingOpen, setPendingOpen] = useState(false)
  const [pendingLoading, setPendingLoading] = useState(false)

  useEffect(() => {
    setVendor(initialVendor)
    setConnectedGames((current) => ({ ...seedConnectedGames(initialVendor), ...current }))
  }, [initialVendor])

  useEffect(() => {
    setWalletBalance(cashBalance)
  }, [cashBalance])

  useEffect(() => {
    if (!isApiConfigured()) return
    let cancelled = false
    setWalletLoading(true)
    ;(async () => {
      try {
        const res = await tapstackApi.customerWallet()
        if (cancelled) return
        const next =
          res.wallet.formatted ||
          (typeof res.wallet.balance === 'number' ? `$${res.wallet.balance.toFixed(2)}` : '')
        if (next) {
          setWalletBalance(next)
          onCashBalanceChange?.(next)
        }
      } catch {
        /* keep prop / previous */
      } finally {
        if (!cancelled) setWalletLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [onCashBalanceChange])

  useEffect(() => {
    if (!gameMenuKey) return
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Element | null
      if (target?.closest(`[data-game-menu="${gameMenuKey}"]`)) return
      setGameMenuKey(null)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setGameMenuKey(null)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [gameMenuKey])

  async function refreshGameBalance(vendorId: number | string, gameKey: string) {
    setGameBalances((current) => ({
      ...current,
      [gameKey]: { status: 'loading', formatted: current[gameKey]?.formatted || '' },
    }))
    try {
      const res = await tapstackApi.vendorGameBalance(vendorId, gameKey)
      setGameBalances((current) => ({
        ...current,
        [gameKey]: {
          status: res.live || res.connected ? 'ready' : 'unavailable',
          formatted: res.formatted || '—',
        },
      }))
    } catch {
      setGameBalances((current) => ({
        ...current,
        [gameKey]: { status: 'unavailable', formatted: '—' },
      }))
    }
  }

  async function refreshPendingOrders(vendorId: number | string) {
    if (!isApiConfigured() || !vendorId) {
      setPendingOrders([])
      return
    }
    setPendingLoading(true)
    try {
      const res = await tapstackApi.customerVendorOrders(vendorId)
      setPendingOrders(res.pending || [])
    } catch {
      /* keep previous */
    } finally {
      setPendingLoading(false)
    }
  }

  useEffect(() => {
    if (!vendor.id || !isApiConfigured()) return
    void refreshPendingOrders(vendor.id)
  }, [vendor.id])

  useEffect(() => {
    if (!isApiConfigured() || !vendor.id) {
      setGamesLoading(false)
      return
    }

    let cancelled = false
    ;(async () => {
      setGamesLoading(true)
      setConnectionResolved(false)
      try {
        const [detail, gamesRes] = await Promise.all([
          tapstackApi.customerVendor(vendor.id!).catch(() => null),
          tapstackApi.customerVendorGames(vendor.id!).catch(() => null),
        ])
        if (cancelled) return

        if (detail?.vendor) {
          const next = vendorFromApi(detail.vendor)
          setVendor((current) => ({
            ...next,
            games: next.games.length ? next.games : current.games,
          }))
        }

        const remoteGames = gamesRes?.games ?? []
        if (remoteGames.length) {
          const nextConnected: Record<string, boolean> = {}
          const nextBalances: Record<
            string,
            { status: 'loading' | 'ready' | 'unavailable'; formatted: string }
          > = {}

          for (const game of remoteGames) {
            nextConnected[game.id] = Boolean(game.connected)
            if (game.title) nextConnected[game.title] = Boolean(game.connected)
            const cached = typeof game.balance === 'string' && game.balance ? game.balance : ''
            if (game.mode === 'auto' && game.connected) {
              nextBalances[game.id] = {
                status: 'loading',
                formatted: cached || '',
              }
            } else {
              nextBalances[game.id] = {
                status: 'unavailable',
                formatted: '—',
              }
            }
          }

          setConnectedGames(nextConnected)
          saveConnectedCache(vendor.id!, nextConnected)
          setGameBalances(nextBalances)
          setVendor((current) => ({
            ...current,
            games: current.games.map((game) => {
              const key = gameKeyFor(game)
              const remote = remoteGames.find((g) => g.id === key || g.title === game.name)
              if (!remote) return game
              return {
                ...game,
                id: remote.id || game.id,
                mode: remote.mode === 'auto' ? 'auto' : 'manual',
                platform: remote.platform || game.platform,
                connected: Boolean(remote.connected),
                active: remote.enabled !== false,
              }
            }),
          }))

          // Unlock Load / Redeem / Account as soon as connection status is known.
          setConnectionResolved(true)
          setGamesLoading(false)

          const vendorId = vendor.id!
          void Promise.all(
            remoteGames
              .filter((game) => game.mode === 'auto' && game.connected)
              .map((game) => refreshGameBalance(vendorId, game.id)),
          )
        }
      } catch {
        /* keep local / cached connection state */
      } finally {
        if (!cancelled) {
          setGamesLoading(false)
          setConnectionResolved(true)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [vendor.id])

  function openConnect(game: {
    name: string
    id?: string
    mode?: 'auto' | 'manual'
    platform?: string
    icon?: string
    iconBg?: string
  }) {
    const gameKey =
      game.id ||
      game.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    setConnectGame(game.name)
    setConnectGameKey(gameKey)
    setConnectGameIcon({
      icon: game.icon || '🎰',
      iconBg: game.iconBg || '#ede9fe',
    })
    setConnectMode(game.mode === 'auto' ? 'auto' : 'manual')
    setConnectPlatform(game.platform || '')
    setConnectStep(game.mode === 'auto' ? 'choose' : 'login')
    setMobileId('')
    setPassword('')
    setShowPassword(false)
    setFirstName('')
    setLastName('')
    setPhone('')
    setGeneratedCreds(null)
    setRevealCreds(false)
    setCopyNote('')
    setConnectError('')
  }

  function closeConnect() {
    setConnectGame(null)
    setConnectGameKey('')
    setConnectError('')
    setGeneratedCreds(null)
    setRevealCreds(false)
    setCopyNote('')
    setConnectStep('choose')
  }

  async function copyText(label: string, value: string) {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopyNote(`${label} copied`)
      window.setTimeout(() => setCopyNote(''), 1600)
    } catch {
      setCopyNote('Could not copy')
      window.setTimeout(() => setCopyNote(''), 1600)
    }
  }

  function openTransferGame(
    game: {
      name: string
      id?: string
      mode?: 'auto' | 'manual'
      icon?: string
      iconBg?: string
    },
    intent: GameTransferIntent,
  ) {
    const gameKey =
      game.id ||
      game.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    setGameMenuKey(null)
    setTransferIntent(intent)
    setLoadGame({
      gameKey,
      name: game.name,
      mode: game.mode === 'auto' ? 'auto' : 'manual',
      icon: game.icon,
      iconBg: game.iconBg,
      gameBalance: gameBalances[gameKey]?.formatted,
    })
  }

  async function openSavedCredentials(game: {
    name: string
    id?: string
    mode?: 'auto' | 'manual'
    platform?: string
    icon?: string
    iconBg?: string
  }) {
    if (!vendor.id) return
    const gameKey =
      game.id ||
      game.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    setConnectGame(game.name)
    setConnectGameKey(gameKey)
    setConnectGameIcon({
      icon: game.icon || '🎰',
      iconBg: game.iconBg || '#ede9fe',
    })
    setConnectMode('auto')
    setConnectPlatform(game.platform || '')
    setConnectError('')
    setRevealCreds(false)
    setCopyNote('')
    setConnectStep('created')

    const local = loadLocalCreds(vendor.id, gameKey)
    if (local) setGeneratedCreds(local)

    if (!isApiConfigured()) return

    setCredsLoading(true)
    try {
      const res = await tapstackApi.vendorGameCredentials(vendor.id, gameKey)
      const next = {
        mobileId: res.credentials.mobileId || res.credentials.account,
        password: res.credentials.password || '',
      }
      if (next.mobileId) {
        setGeneratedCreds(next)
        saveLocalCreds(vendor.id, gameKey, next)
      } else if (!local) {
        setConnectError('No saved password found. Disconnect and connect again to store credentials.')
      }
    } catch (err) {
      if (!local) {
        setConnectError(
          err instanceof ApiError
            ? err.message
            : 'Could not load saved account details.',
        )
      }
    } finally {
      setCredsLoading(false)
    }
  }

  async function handleDisconnect(gameKey: string, gameName: string) {
    if (!vendor.id) return
    if (!window.confirm(`Disconnect your ${gameName} account? You can connect again anytime.`)) {
      return
    }

    setDisconnectingKey(gameKey)
    setGameBalances((current) => ({
      ...current,
      [gameKey]: { status: 'loading', formatted: current[gameKey]?.formatted || '' },
    }))

    try {
      if (isApiConfigured()) {
        await tapstackApi.disconnectVendorGame(vendor.id, gameKey)
      }
      clearLocalCreds(vendor.id, gameKey)
      setConnectedGames((current) => {
        const next = { ...current }
        delete next[gameKey]
        delete next[gameName]
        if (vendor.id) saveConnectedCache(vendor.id, next)
        return next
      })
      setVendor((current) => ({
        ...current,
        games: current.games.map((game) => {
          const key =
            game.id ||
            game.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
          if (key !== gameKey && game.name !== gameName) return game
          return { ...game, connected: false }
        }),
      }))
      setGameBalances((current) => ({
        ...current,
        [gameKey]: { status: 'unavailable', formatted: '—' },
      }))
    } catch (err) {
      setGameBalances((current) => ({
        ...current,
        [gameKey]: {
          status: 'ready',
          formatted: current[gameKey]?.formatted || '$0.00',
        },
      }))
      window.alert(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not disconnect account.',
      )
    } finally {
      setDisconnectingKey(null)
    }
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault()
    if (!connectGame) return

    if (!mobileId.trim() || !password.trim()) {
      setConnectError('Enter your account ID and password.')
      return
    }

    const key = connectGameKey
    if (isApiConfigured() && vendor.id) {
      setConnecting(true)
      try {
        await tapstackApi.connectVendorGame(vendor.id, key, {
          mobileId: mobileId.trim(),
          password: password.trim(),
        })
        saveLocalCreds(vendor.id, key, {
          mobileId: mobileId.trim(),
          password: password.trim(),
        })
        setConnectedGames((current) => {
          const next = { ...current, [key]: true, [connectGame]: true }
          saveConnectedCache(vendor.id!, next)
          return next
        })
        closeConnect()
        void refreshGameBalance(vendor.id, key)
      } catch (err) {
        setConnectError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Could not connect account.',
        )
      } finally {
        setConnecting(false)
      }
      return
    }

    setConnectedGames((current) => ({ ...current, [key]: true, [connectGame]: true }))
    closeConnect()
  }

  async function handleGenerate(event: FormEvent) {
    event.preventDefault()
    if (!connectGame || !vendor.id) return

    const needsProfile = connectPlatform === 'golden-dragon' || connectPlatform === ''
    if (needsProfile && (!firstName.trim() || !phone.trim())) {
      setConnectError('First name and phone are required to create an account.')
      return
    }

    setConnecting(true)
    setConnectError('')
    try {
      const res = await tapstackApi.createVendorGameAccount(vendor.id, connectGameKey, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        account: mobileId.trim() || undefined,
        password: password.trim() || undefined,
      })
      setGeneratedCreds({
        mobileId: res.credentials.mobileId,
        password: res.credentials.password,
      })
      saveLocalCreds(vendor.id, connectGameKey, {
        mobileId: res.credentials.mobileId,
        password: res.credentials.password,
      })
      setRevealCreds(false)
      setCopyNote('')
      setConnectedGames((current) => {
        const next = {
          ...current,
          [connectGameKey]: true,
          [connectGame]: true,
        }
        saveConnectedCache(vendor.id!, next)
        return next
      })
      setConnectStep('created')
      void refreshGameBalance(vendor.id, connectGameKey)
    } catch (err) {
      setConnectError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not create account.',
      )
    } finally {
      setConnecting(false)
    }
  }

  const accent = vendor.accentSolid || vendor.text || '#7c3aed'
  const tagline = vendor.tagline?.trim() || 'Tap a game to load credits'
  const pageStyle = {
    '--vendor-accent': accent,
    '--vendor-accent-soft': vendor.color || '#ede9fe',
  } as CSSProperties

  return (
    <div className="dashboard vendor-page" style={pageStyle}>
      <div className="dashboard-scroll vendor-page-scroll">
        <DashboardHeader />

        <div className="vendor-page-body">
          <section className="vendor-storefront">
            {vendor.bannerUrl ? (
              <div className="vendor-storefront-banner">
                <img src={vendor.bannerUrl} alt="" />
              </div>
            ) : (
              <div className="vendor-storefront-hero" aria-hidden="true" />
            )}

            <div className="vendor-storefront-bar">
              <button type="button" className="vendor-back" onClick={onBack} aria-label="Back">
                ←
              </button>
              <div className="vendor-heading">
                <div
                  className="vendor-avatar"
                  style={{ background: vendor.color || 'var(--vendor-accent-soft)', color: accent }}
                  aria-hidden="true"
                >
                  {vendor.initials}
                </div>
                <div className="vendor-heading-text">
                  <h1 className="vendor-title">{vendor.name}</h1>
                  <p className="vendor-subtitle">{tagline}</p>
                </div>
              </div>
              {onRemoveVendor ? (
                <button
                  type="button"
                  className="vendor-delete"
                  aria-label={`Delete ${vendor.name}`}
                  onClick={onRemoveVendor}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M4 7h16M9 7V5h6v2M8 7l1 12h6l1-12"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ) : null}
            </div>
          </section>

          <div className="vendor-balance-card">
            <div className="vendor-balance-copy">
              <span className="vendor-balance-label">Tapstack Balance</span>
              <span className={`vendor-balance-value${walletLoading ? ' is-loading' : ''}`}>
                {walletBalance || '$0.00'}
              </span>
            </div>
            <div className="vendor-balance-mark" aria-hidden="true">
              <span>TS</span>
            </div>
          </div>

          <button
            type="button"
            className="vendor-pending-btn"
            onClick={() => {
              setPendingOpen(true)
              if (vendor.id) void refreshPendingOrders(vendor.id)
            }}
          >
            <span className="vendor-pending-btn-icon" aria-hidden="true">
              📋
            </span>
            <span className="vendor-pending-btn-copy">
              <strong>Pending orders</strong>
              <small>
                {pendingLoading
                  ? 'Checking…'
                  : pendingOrders.length > 0
                    ? `${pendingOrders.length} load${pendingOrders.length === 1 ? '' : 's'} / redeem${pendingOrders.length === 1 ? '' : 's'} need attention`
                    : 'Loads & redeems waiting on this vendor'}
              </small>
            </span>
            {pendingOrders.length > 0 ? (
              <span className="vendor-pending-btn-count">{pendingOrders.length}</span>
            ) : (
              <span className="vendor-pending-btn-chevron" aria-hidden="true">
                →
              </span>
            )}
          </button>

          <section className="games-section">
            <h2 className="games-title">Available Games</h2>

            <ul className="games-list">
              {vendor.games.map((game) => {
                const gameKey =
                  game.id ||
                  game.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                const connected = Boolean(
                  connectedGames[gameKey] || connectedGames[game.name] || game.connected,
                )
                const balanceState = gameBalances[gameKey]
                const showBalanceSkeleton =
                  gamesLoading ||
                  (connected && game.mode === 'auto' && (!balanceState || balanceState.status === 'loading'))
                const balanceText =
                  balanceState?.formatted ||
                  (connected && game.mode === 'auto' ? '$0.00' : '—')
                return (
                  <li key={gameKey} className="game-card">
                    <div className="game-card-main">
                      <button
                        type="button"
                        className="game-favorite"
                        aria-label={`Favorite ${game.name}`}
                      >
                        ☆
                      </button>

                      <div className="game-icon" style={{ background: game.iconBg }} aria-hidden="true">
                        {decodeIcon(game.icon, game.name)}
                      </div>

                      <div className="game-info">
                        <div className="game-badges">
                          <span
                            className={`game-badge game-badge--status ${game.active ? 'active' : 'inactive'}`}
                          >
                            • {game.active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                          <span className={`game-badge game-badge--mode game-badge--${game.mode}`}>
                            {game.mode === 'auto' ? 'AUTO' : 'MANUAL'}
                          </span>
                        </div>
                        <p className="game-name">{game.name}</p>
                      </div>
                    </div>

                    <div className="game-side">
                      {game.mode === 'auto' ? (
                        <div className="game-balance-wrap">
                          <span className="game-balance-label">Balance</span>
                          {showBalanceSkeleton ? (
                            <span className="game-balance-skeleton" aria-label="Loading balance" />
                          ) : (
                            <span className="game-balance">{balanceText}</span>
                          )}
                        </div>
                      ) : null}
                      {game.mode === 'auto' ? (
                        connected ? (
                          <div className="game-actions">
                            <button
                              type="button"
                              className="game-btn game-btn--load"
                              onClick={() => openTransferGame(game, 'load')}
                            >
                              Load
                            </button>
                            <button
                              type="button"
                              className="game-btn game-btn--redeem"
                              onClick={() => openTransferGame(game, 'redeem')}
                            >
                              Redeem
                            </button>
                            <div className="game-more" data-game-menu={gameKey}>
                              <button
                                type="button"
                                className={`game-more-toggle${gameMenuKey === gameKey ? ' is-open' : ''}`}
                                aria-label={`${game.name} account options`}
                                aria-expanded={gameMenuKey === gameKey}
                                aria-haspopup="menu"
                                onClick={() =>
                                  setGameMenuKey((current) => (current === gameKey ? null : gameKey))
                                }
                              >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                  <circle cx="8" cy="3.5" r="1.35" fill="currentColor" />
                                  <circle cx="8" cy="8" r="1.35" fill="currentColor" />
                                  <circle cx="8" cy="12.5" r="1.35" fill="currentColor" />
                                </svg>
                              </button>
                              {gameMenuKey === gameKey ? (
                                <div className="game-more-menu" role="menu">
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="game-more-item"
                                    onClick={() => {
                                      setGameMenuKey(null)
                                      openSavedCredentials(game)
                                    }}
                                  >
                                    <span className="game-more-item-icon" aria-hidden="true">
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.7" />
                                        <path
                                          d="M5.5 19.2c1.6-3 4-4.5 6.5-4.5s4.9 1.5 6.5 4.5"
                                          stroke="currentColor"
                                          strokeWidth="1.7"
                                          strokeLinecap="round"
                                        />
                                      </svg>
                                    </span>
                                    Account
                                  </button>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="game-more-item game-more-item--danger"
                                    disabled={disconnectingKey === gameKey}
                                    onClick={() => {
                                      setGameMenuKey(null)
                                      void handleDisconnect(gameKey, game.name)
                                    }}
                                  >
                                    <span className="game-more-item-icon" aria-hidden="true">
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <path
                                          d="M9 9.5V7.8A2.8 2.8 0 0 1 11.8 5h.4A2.8 2.8 0 0 1 15 7.8V9.5"
                                          stroke="currentColor"
                                          strokeWidth="1.7"
                                          strokeLinecap="round"
                                        />
                                        <path
                                          d="M15 9.5h3.2A1.3 1.3 0 0 1 19.5 10.8v7.4a1.3 1.3 0 0 1-1.3 1.3H5.8A1.3 1.3 0 0 1 4.5 18.2v-7.4A1.3 1.3 0 0 1 5.8 9.5H9"
                                          stroke="currentColor"
                                          strokeWidth="1.7"
                                          strokeLinecap="round"
                                        />
                                        <path
                                          d="M10.2 13.2v3.2M13.8 13.2v3.2"
                                          stroke="currentColor"
                                          strokeWidth="1.7"
                                          strokeLinecap="round"
                                        />
                                      </svg>
                                    </span>
                                    {disconnectingKey === gameKey ? 'Disconnecting…' : 'Disconnect'}
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : !connectionResolved ? (
                          <div className="game-actions game-actions--pending" aria-busy="true">
                            <span className="game-action-skeleton" />
                            <span className="game-action-skeleton" />
                            <span className="game-action-skeleton game-action-skeleton--icon" />
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="game-connect game-connect--side"
                            onClick={() => openConnect(game)}
                          >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                              <path
                                d="M5.5 9.5v.7A1.8 1.8 0 0 1 3.7 12H3A1.8 1.8 0 0 1 1.2 10.2V3.8A1.8 1.8 0 0 1 3 2h.7A1.8 1.8 0 0 1 5.5 3.8V4.5"
                                stroke="currentColor"
                                strokeWidth="1.3"
                                strokeLinecap="round"
                              />
                              <path
                                d="M8 7H4.2M8 7 6.6 5.6M8 7l-1.4 1.4"
                                stroke="currentColor"
                                strokeWidth="1.3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <rect
                                x="7.2"
                                y="4"
                                width="5.2"
                                height="6"
                                rx="1.2"
                                stroke="currentColor"
                                strokeWidth="1.3"
                              />
                            </svg>
                            Connect
                          </button>
                        )
                      ) : (
                        <div className="game-actions">
                          <button
                            type="button"
                            className="game-btn game-btn--load"
                            onClick={() => openTransferGame(game, 'load')}
                          >
                            Load
                          </button>
                          <button
                            type="button"
                            className="game-btn game-btn--redeem"
                            onClick={() => openTransferGame(game, 'redeem')}
                          >
                            Redeem
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>

        <button type="button" className="chat-fab" aria-label="Chat">
          💬
          <span className="chat-fab-badge">1</span>
        </button>

        {connectGame ? (
          <div className="connect-overlay" role="presentation" onClick={closeConnect}>
            <div
              className={`connect-modal connect-modal--xl ${connectMode === 'auto' ? 'connect-modal--auto' : ''}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="connect-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="connect-sheet-handle" aria-hidden="true" />

              <div className="connect-hero">
                <div
                  className="connect-hero-icon"
                  style={{ background: connectGameIcon.iconBg }}
                  aria-hidden="true"
                >
                  {decodeIcon(connectGameIcon.icon, connectGame || 'Game')}
                </div>
                <div className="connect-header">
                  <div className="connect-header-copy">
                    <div className="connect-pills">
                      <span className={`connect-pill connect-pill--mode connect-pill--${connectMode}`}>
                        {connectMode === 'auto' ? (
                          <>
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                              <path
                                d="M2 6.5 4.5 9 10 3"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            Auto
                          </>
                        ) : (
                          'Manual'
                        )}
                      </span>
                      {connectPlatform ? (
                        <span className="connect-pill connect-pill--platform">{connectPlatform}</span>
                      ) : null}
                    </div>
                    <h2 id="connect-title">
                      {connectStep === 'created' ? 'Account ready' : `Connect ${connectGame}`}
                    </h2>
                    {connectStep === 'choose' ? (
                      <p className="connect-subtitle">
                        Choose how you want to link {connectGame} for loads and redeems.
                      </p>
                    ) : null}
                  </div>
                  <button type="button" className="connect-close" onClick={closeConnect} aria-label="Close">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path
                        d="M3 3l8 8M11 3 3 11"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {connectMode === 'auto' && connectStep === 'choose' ? (
                <div className="connect-choose">
                  <button
                    type="button"
                    className="connect-choice connect-choice--login"
                    onClick={() => {
                      setConnectStep('login')
                      setConnectError('')
                    }}
                  >
                    <span className="connect-choice-icon connect-choice-icon--login" aria-hidden="true">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M10 17v1.2A2.8 2.8 0 0 1 7.2 21H5.8A2.8 2.8 0 0 1 3 18.2V5.8A2.8 2.8 0 0 1 5.8 3h1.4A2.8 2.8 0 0 1 10 5.8V7"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                        />
                        <path
                          d="M14 12H7.5M14 12l-2.2-2.2M14 12l-2.2 2.2"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <rect
                          x="13"
                          y="7"
                          width="8"
                          height="10"
                          rx="2"
                          stroke="currentColor"
                          strokeWidth="1.7"
                        />
                      </svg>
                    </span>
                    <span className="connect-choice-body">
                      <span className="connect-choice-title">Log in to existing</span>
                      <span className="connect-choice-meta">
                        Use your current Mobile ID / username and password.
                      </span>
                    </span>
                    <span className="connect-choice-arrow" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M3.5 8h9M8.5 4l4 4-4 4"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>

                  <button
                    type="button"
                    className="connect-choice connect-choice--primary"
                    onClick={() => {
                      setConnectStep('generate')
                      setConnectError('')
                    }}
                  >
                    <span className="connect-choice-badge">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path
                          d="M6 1.5 7.1 4.4 10.2 4.6 7.9 6.7 8.6 9.7 6 8.2 3.4 9.7 4.1 6.7 1.8 4.6 4.9 4.4 6 1.5Z"
                          fill="currentColor"
                        />
                      </svg>
                      Recommended
                    </span>
                    <span className="connect-choice-icon connect-choice-icon--create" aria-hidden="true">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 5v14M5 12h14"
                          stroke="currentColor"
                          strokeWidth="1.9"
                          strokeLinecap="round"
                        />
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
                      </svg>
                    </span>
                    <span className="connect-choice-body">
                      <span className="connect-choice-title">Generate new account</span>
                      <span className="connect-choice-meta">
                        Auto-create credentials from your TapStack profile.
                      </span>
                    </span>
                    <span className="connect-choice-arrow" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M3.5 8h9M8.5 4l4 4-4 4"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>

                  <div className="connect-trust" aria-hidden="true">
                    <span className="connect-trust-item">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path
                          d="M7 1.5 11.5 3.5v3.2c0 2.8-1.9 4.9-4.5 5.8C4.4 11.6 2.5 9.5 2.5 6.7V3.5L7 1.5Z"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinejoin="round"
                        />
                        <path
                          d="m4.8 7 1.5 1.5 2.9-3"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Secure link
                    </span>
                    <span className="connect-trust-item">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="5.2" stroke="currentColor" strokeWidth="1.3" />
                        <path
                          d="M7 4.2v3.2l2 1.2"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                        />
                      </svg>
                      Instant connect
                    </span>
                  </div>
                </div>
              ) : null}

              {(connectMode === 'manual' || connectStep === 'login') && connectStep !== 'created' ? (
                <form className="connect-form" onSubmit={handleLogin}>
                  {connectMode === 'auto' ? (
                    <button
                      type="button"
                      className="connect-back-link"
                      onClick={() => setConnectStep('choose')}
                    >
                      ← Back
                    </button>
                  ) : null}
                  <p className="connect-copy">
                    Enter your {connectPlatform === 'vblink' || connectPlatform === 'ultrapanda' ? 'account' : 'Mobile ID'}{' '}
                    and password for <strong>{connectGame}</strong>.
                  </p>
                  <label className="connect-label" htmlFor="connect-mobile-id">
                    {connectPlatform === 'vblink' || connectPlatform === 'ultrapanda' ? 'Account' : 'Mobile ID'}
                  </label>
                  <input
                    id="connect-mobile-id"
                    className="connect-input"
                    type="text"
                    autoComplete="username"
                    placeholder={
                      connectPlatform === 'vblink' || connectPlatform === 'ultrapanda'
                        ? 'Enter account username'
                        : 'Enter mobile ID'
                    }
                    value={mobileId}
                    onChange={(event) => {
                      setMobileId(event.target.value)
                      if (connectError) setConnectError('')
                    }}
                  />
                  <label className="connect-label" htmlFor="connect-password">
                    Password
                  </label>
                  <div className="connect-password-row">
                    <input
                      id="connect-password"
                      className="connect-input"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value)
                        if (connectError) setConnectError('')
                      }}
                    />
                    <button
                      type="button"
                      className="connect-password-toggle"
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {connectError ? <p className="connect-error">{connectError}</p> : null}
                  <button
                    type="submit"
                    className="connect-submit"
                    disabled={!mobileId.trim() || !password.trim() || connecting}
                  >
                    {connecting ? 'Connecting…' : 'Log in & connect'}
                  </button>
                </form>
              ) : null}

              {connectStep === 'generate' ? (
                <form className="connect-form" onSubmit={handleGenerate}>
                  <button type="button" className="connect-back-link" onClick={() => setConnectStep('choose')}>
                    ← Back
                  </button>
                  {connectPlatform === 'golden-dragon' ||
                  connectPlatform === '' ||
                  connectPlatform === 'magic-city' ? (
                    <>
                      <p className="connect-copy">
                        Confirm your details and we will create a new game account for you.
                      </p>
                      <label className="connect-label" htmlFor="connect-first-name">
                        First name
                      </label>
                      <input
                        id="connect-first-name"
                        className="connect-input"
                        type="text"
                        value={firstName}
                        onChange={(event) => setFirstName(event.target.value)}
                        placeholder="First name"
                        required
                      />
                      <label className="connect-label" htmlFor="connect-last-name">
                        Last name
                      </label>
                      <input
                        id="connect-last-name"
                        className="connect-input"
                        type="text"
                        value={lastName}
                        onChange={(event) => setLastName(event.target.value)}
                        placeholder="Last name (optional)"
                      />
                      <label className="connect-label" htmlFor="connect-phone">
                        Phone
                      </label>
                      <input
                        id="connect-phone"
                        className="connect-input"
                        type="tel"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="+1 555 000 0000"
                        required
                      />
                    </>
                  ) : (
                    <p className="connect-copy">
                      We&apos;ll create a new <strong>{connectGame}</strong> account automatically and show you the
                      login details.
                    </p>
                  )}
                  {connectError ? <p className="connect-error">{connectError}</p> : null}
                  <button type="submit" className="connect-submit" disabled={connecting}>
                    {connecting ? 'Creating account…' : 'Generate account'}
                  </button>
                </form>
              ) : null}

              {connectStep === 'created' ? (
                <div className="connect-created">
                  <div className="connect-success-banner">
                    <span className="connect-success-icon" aria-hidden="true">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
                        <path
                          d="m8.2 12.2 2.5 2.5 5.1-5.2"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <div>
                      <strong>Connected to {connectGame}</strong>
                      <p>Credentials are saved to your account. You can view them anytime.</p>
                    </div>
                  </div>

                  {credsLoading && !generatedCreds ? (
                    <div className="connect-cred-loading">Loading account details…</div>
                  ) : null}

                  {generatedCreds ? (
                    <div className="connect-cred-card">
                      <div className="connect-cred-toolbar">
                        <span className="connect-cred-toolbar-label">Login details</span>
                        <button
                          type="button"
                          className="connect-cred-reveal"
                          onClick={() => setRevealCreds((value) => !value)}
                        >
                          {revealCreds ? 'Hide' : 'View'}
                        </button>
                      </div>

                      <div className="connect-cred-row">
                        <div className="connect-cred-meta">
                          <span className="connect-cred-label">Username</span>
                          <strong className="connect-cred-value">
                            {revealCreds
                              ? generatedCreds.mobileId
                              : '•'.repeat(Math.min(12, Math.max(6, generatedCreds.mobileId.length)))}
                          </strong>
                        </div>
                        <button
                          type="button"
                          className="connect-cred-copy"
                          onClick={() => copyText('Username', generatedCreds.mobileId)}
                        >
                          Copy
                        </button>
                      </div>

                      <div className="connect-cred-row">
                        <div className="connect-cred-meta">
                          <span className="connect-cred-label">Password</span>
                          <strong className="connect-cred-value">
                            {revealCreds
                              ? generatedCreds.password || '—'
                              : '•'.repeat(
                                  Math.min(12, Math.max(6, (generatedCreds.password || 'hidden').length)),
                                )}
                          </strong>
                        </div>
                        <button
                          type="button"
                          className="connect-cred-copy"
                          disabled={!generatedCreds.password}
                          onClick={() => copyText('Password', generatedCreds.password)}
                        >
                          Copy
                        </button>
                      </div>

                      <button
                        type="button"
                        className="connect-cred-copy-all"
                        onClick={() =>
                          copyText(
                            'Login',
                            `Username: ${generatedCreds.mobileId}\nPassword: ${generatedCreds.password}`,
                          )
                        }
                      >
                        Copy username & password
                      </button>
                      {copyNote ? <p className="connect-copy-note">{copyNote}</p> : null}
                    </div>
                  ) : null}

                  {connectError ? <p className="connect-error">{connectError}</p> : null}

                  <button type="button" className="connect-submit" onClick={closeConnect}>
                    Done
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <GameLoadModal
        open={Boolean(loadGame)}
        intent={transferIntent}
        vendorId={vendor.id || 0}
        vendorName={vendor.name}
        game={loadGame}
        cashBalance={walletBalance}
        onClose={() => {
          setLoadGame(null)
          setTransferIntent('load')
        }}
        onSuccess={({ cashBalance: nextCash, gameBalance }) => {
          setWalletBalance(nextCash)
          onCashBalanceChange?.(nextCash)
          if (loadGame?.gameKey && gameBalance) {
            setGameBalances((current) => ({
              ...current,
              [loadGame.gameKey]: { status: 'ready', formatted: gameBalance },
            }))
          }
          if (vendor.id) void refreshPendingOrders(vendor.id)
        }}
      />

      {pendingOpen ? (
        <div
          className="vendor-pending-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vendor-pending-title"
          onClick={() => setPendingOpen(false)}
        >
          <div className="vendor-pending-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="vendor-pending-sheet-head">
              <div>
                <p className="vendor-pending-eyebrow">{vendor.name}</p>
                <h2 id="vendor-pending-title">Pending orders</h2>
                <p className="vendor-pending-sub">Loads and redeems waiting on the vendor</p>
              </div>
              <button
                type="button"
                className="vendor-pending-close"
                onClick={() => setPendingOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {pendingLoading ? <p className="vendor-pending-empty">Loading…</p> : null}

            {!pendingLoading && pendingOrders.length === 0 ? (
              <p className="vendor-pending-empty">No pending loads or redeems right now.</p>
            ) : null}

            {!pendingLoading && pendingOrders.length > 0 ? (
              <ul className="vendor-pending-list">
                {pendingOrders.map((order) => {
                  const type =
                    order.type === 'redeem'
                      ? 'Redeem'
                      : order.type === 'auto-load'
                        ? 'Auto load'
                        : 'Manual load'
                  const tone = order.attention || order.status === 'failed' || order.error
                    ? 'attention'
                    : 'pending'
                  return (
                    <li key={order.id} className="vendor-pending-item">
                      <div
                        className="vendor-pending-icon"
                        style={{ background: order.iconBg || '#ede9fe' }}
                        aria-hidden="true"
                      >
                        {decodeIcon(order.icon || '🎮', order.game)}
                      </div>
                      <div className="vendor-pending-main">
                        <div className="vendor-pending-top">
                          <strong>{order.game || type}</strong>
                          <span className={`vendor-pending-badge vendor-pending-badge--${tone}`}>
                            {order.statusLabel || (tone === 'attention' ? 'Attention needed' : 'Pending')}
                          </span>
                        </div>
                        <span>
                          {type}
                          {order.mobileId ? ` · ${order.mobileId}` : ''}
                          {` · ${order.date} ${order.time}`}
                        </span>
                        {order.note ? <p className="vendor-pending-note">{order.note}</p> : null}
                        {order.error ? <p className="vendor-pending-error">{order.error}</p> : null}
                      </div>
                      <strong className={`vendor-pending-amount ${order.positive ? 'is-in' : 'is-out'}`}>
                        {order.amount}
                      </strong>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}

      <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  )
}
