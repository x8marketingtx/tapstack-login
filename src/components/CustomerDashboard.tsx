import { useEffect, useRef, useState } from 'react'
import {
  createVendorFromInviteCode,
  decodeIcon,
  defaultGames,
  initialsFromName,
  loadLocalVendors,
  looksLikeVendorCatalogDump,
  saveLocalVendors,
  vendorFromApi,
  type Vendor,
  type VendorGame,
} from '../data/vendors'
import {
  ApiError,
  applyAuthSession,
  getToken,
  getSessionUser,
  isApiConfigured,
  isMeForCurrentSession,
  normalizeSessionRole,
  tapstackApi,
  type SessionRole,
  type WalletTxn,
} from '../api/client'
import BottomNav, { type DashboardTab } from './BottomNav'
import DashboardHeader from './DashboardHeader'
import AccountPage from './AccountPage'
import EarnPage from './EarnPage'
import GiveawayPage from './GiveawayPage'
import PromosPage from './PromosPage'
import VendorPage from './VendorPage'
import './VendorPage.css'
import TopUpModal from './TopUpModal'
import GameLoadModal, { type GameLoadTarget, type GameTransferIntent } from './GameLoadModal'
import ProfilePage, {
  DEMO_PLAYER_PROFILE,
  profileFromUser,
  type PlayerProfile,
} from './ProfilePage'
import VerifyPage, { VerifyBanner } from './VerifyPage'
import {
  needsVerification,
  rememberVerifyReturn,
  consumeVerifyReturn,
  verificationFromUser,
  type VerificationState,
} from '../lib/verify'
import {
  applyDocumentTitle,
  matchVendorFromList,
  navigate,
  parseLocation,
  vendorPathId,
} from '../lib/routing'
import { clearPlayerAffiliateRef, detectNewPlayerAffiliates, getPlayerAffiliateRef, rememberPlayerAffiliateIds, setPlayerAffiliateRef, type PlayerAffiliateWelcome } from '../lib/affiliate'
import {
  invalidateVendorBalanceCache,
  readCachedVendorTotals,
  writeCachedGameBalance,
  writeCachedVendorTotals,
} from '../lib/vendorBalanceCache'
import './CustomerDashboard.css'

function vendorStorageKey(vendor: Pick<Vendor, 'id' | 'code' | 'name'>): string {
  if (vendor.id != null && String(vendor.id) !== '') return `id:${vendor.id}`
  if (vendor.code) return `code:${String(vendor.code).toUpperCase()}`
  return `name:${vendor.name.toLowerCase()}`
}

function favoritesStorageKey(userId?: number | string | null): string {
  return `tapstack_favorite_vendors:${userId ?? 'guest'}`
}

function loadFavoriteVendorKeys(userId?: number | string | null): string[] {
  try {
    const raw = localStorage.getItem(favoritesStorageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function saveFavoriteVendorKeys(keys: string[], userId?: number | string | null) {
  try {
    localStorage.setItem(favoritesStorageKey(userId), JSON.stringify(keys))
  } catch {
    /* ignore */
  }
}

function sortVendorsByFavorite(vendors: Vendor[], favoriteKeys: Set<string>): Vendor[] {
  return [...vendors].sort((a, b) => {
    const aFav = favoriteKeys.has(vendorStorageKey(a)) ? 0 : 1
    const bFav = favoriteKeys.has(vendorStorageKey(b)) ? 0 : 1
    return aFav - bFav
  })
}

function vendorGameKey(game: { id?: string; name: string }): string {
  return (
    game.id ||
    game.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  )
}

function toGameLoadTarget(game: VendorGame): GameLoadTarget {
  return {
    gameKey: vendorGameKey(game),
    name: game.name,
    mode: game.mode === 'auto' ? 'auto' : 'manual',
    icon: game.icon,
    iconBg: game.iconBg,
    gameBalance: game.balance,
    playerMobileId: undefined,
  }
}

function catalogToVendorGames(
  games: Array<{
    id: string
    title: string
    icon?: string
    mode: 'auto' | 'manual'
    enabled?: boolean
    platform?: string
    connected?: boolean
    balance?: string | null
    playerMobileId?: string | null
  }>,
): VendorGame[] {
  return games
    .filter((game) => game.enabled !== false)
    .map((game) => ({
      id: game.id,
      name: game.title,
      icon: decodeIcon(game.icon, game.title),
      iconBg: '#eef2ff',
      active: true,
      mode: game.mode === 'auto' ? 'auto' : 'manual',
      balance: game.balance || '$0.00',
      platform: game.platform,
      connected: Boolean(game.connected),
    }))
}

function VendorGamePickModal({
  vendorName,
  intent,
  games,
  loading,
  onSelect,
  onClose,
}: {
  vendorName: string
  intent: 'load' | 'redeem'
  games: VendorGame[]
  loading: boolean
  onSelect: (game: VendorGame) => void
  onClose: () => void
}) {
  const action = intent === 'redeem' ? 'redeem' : 'top up'
  return (
    <div className="game-load-overlay vendor-game-pick-overlay" role="presentation" onClick={onClose}>
      <div
        className="game-load-modal"
        role="dialog"
        aria-labelledby="vendor-game-pick-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="game-load-header">
          <div className="game-load-heading">
            <div>
              <h2 id="vendor-game-pick-title">Select a game</h2>
              <p className="game-load-sub">
                Choose a {vendorName} game to {action}
              </p>
            </div>
          </div>
          <button type="button" className="game-load-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {loading ? (
          <p className="vendor-game-pick-empty">Loading games…</p>
        ) : games.length === 0 ? (
          <p className="vendor-game-pick-empty">This vendor has no games yet.</p>
        ) : (
          <div className="vendor-game-pick-list">
            {games.map((game) => (
              <button
                key={vendorGameKey(game)}
                type="button"
                className="vendor-game-pick-item"
                onClick={() => onSelect(game)}
              >
                <span className="game-icon" style={{ background: game.iconBg }} aria-hidden="true">
                  {game.icon}
                </span>
                <span className="vendor-game-pick-copy">
                  <span className="vendor-game-pick-name">{game.name}</span>
                  <span className="vendor-game-pick-meta">
                    {game.mode === 'auto' ? 'Auto' : 'Manual'}
                    {game.connected ? ' · Connected' : ''}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

type ActivityAmount = {
  text: string
  variant: 'cash-positive' | 'cash-negative' | 'points-positive' | 'points-negative'
}

type ActivityRow = {
  id: string | number
  icon: string
  iconBg: string
  title: string
  date: string
  amounts: ActivityAmount[]
}

function formatActivityDate(value: string): string {
  if (!value) return ''
  const ts = Date.parse(value.includes('T') ? value : value.replace(' ', 'T'))
  if (!Number.isFinite(ts)) return value
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function mapTxnsToActivities(txns: WalletTxn[]): ActivityRow[] {
  return txns.map((txn) => {
    const meta = txn.meta || {}
    const icon = typeof meta.icon === 'string' ? meta.icon : txn.amount >= 0 ? '💰' : '🎮'
    const iconBg =
      typeof meta.iconBg === 'string' ? meta.iconBg : txn.amount >= 0 ? '#dcfce7' : '#dbeafe'
    const amounts: ActivityAmount[] = []
    if (txn.amount !== 0) {
      amounts.push({
        text: `${txn.amount >= 0 ? '+' : '-'}$${Math.abs(txn.amount).toFixed(2)}`,
        variant: txn.amount >= 0 ? 'cash-positive' : 'cash-negative',
      })
    }
    if (txn.points !== 0) {
      amounts.push({
        text: `${txn.points >= 0 ? '+' : ''}${txn.points} pts`,
        variant: txn.points >= 0 ? 'points-positive' : 'points-negative',
      })
    }
    if (amounts.length === 0) {
      amounts.push({ text: '$0.00', variant: 'cash-positive' })
    }
    return {
      id: txn.id,
      icon,
      iconBg,
      title: txn.title || txn.type || 'Transaction',
      date: formatActivityDate(txn.createdAt),
      amounts,
    }
  })
}

function parseMoney(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const n = Number(String(value ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`
}

const VENDORS_MOBILE_PREVIEW = 4
const VENDORS_MOBILE_MQ = '(max-width: 599px)'

const DEMO_ACTIVITIES: ActivityRow[] = [
  {
    id: 'demo-1',
    icon: '💰',
    iconBg: '#dcfce7',
    title: 'Top Up — Card ending 4242',
    date: 'Jun 5',
    amounts: [{ text: '+$25.00', variant: 'cash-positive' }],
  },
]

function GamesHome({
  inviteCode,
  onInviteCodeChange,
  onAddVendor,
  addingVendor,
  addError,
  vendors,
  favoriteKeys,
  onToggleFavorite,
  onVendorSelect,
  onVendorTransfer,
  cashBalance,
  loading,
  activities,
  onSeeAllActivity,
  balanceEpoch = 0,
}: {
  inviteCode: string
  onInviteCodeChange: (value: string) => void
  onAddVendor: () => void
  addingVendor: boolean
  addError: string
  vendors: Vendor[]
  favoriteKeys: Set<string>
  onToggleFavorite: (vendor: Vendor) => void
  onVendorSelect: (vendor: Vendor) => void
  onVendorTransfer: (vendor: Vendor, intent: 'load' | 'redeem') => void
  cashBalance: string
  loading?: boolean
  activities: ActivityRow[]
  onSeeAllActivity: () => void
  balanceEpoch?: number
}) {
  const sortedVendors = sortVendorsByFavorite(vendors, favoriteKeys)
  const [vendorsExpanded, setVendorsExpanded] = useState(false)
  const [vendorTotals, setVendorTotals] = useState<
    Record<string, { status: 'loading' | 'ready'; playable: number; redeemable: number }>
  >({})
  const [isMobileVendorList, setIsMobileVendorList] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(VENDORS_MOBILE_MQ).matches : false,
  )

  useEffect(() => {
    const mq = window.matchMedia(VENDORS_MOBILE_MQ)
    const sync = () => setIsMobileVendorList(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!isMobileVendorList) setVendorsExpanded(false)
  }, [isMobileVendorList])

  const vendorBalanceKey = vendors
    .map((vendor) => `${vendorStorageKey(vendor)}:${vendor.games.length}`)
    .join('|')

  useEffect(() => {
    let cancelled = false
    const token = getToken()
    const canFetch = isApiConfigured() && Boolean(token) && !token?.startsWith('demo:')

    const cachedReady: Record<
      string,
      { status: 'loading' | 'ready'; playable: number; redeemable: number }
    > = {}
    const toFetch: Vendor[] = []
    for (const vendor of vendors) {
      const key = vendorStorageKey(vendor)
      if (!canFetch || vendor.id == null || String(vendor.id).startsWith('local-')) {
        cachedReady[key] = { status: 'ready', playable: 0, redeemable: 0 }
        continue
      }
      const cached = readCachedVendorTotals(key)
      if (cached) {
        cachedReady[key] = { status: 'ready', playable: cached.playable, redeemable: cached.redeemable }
      } else {
        cachedReady[key] = { status: 'loading', playable: 0, redeemable: 0 }
        toFetch.push(vendor)
      }
    }
    setVendorTotals(cachedReady)

    if (toFetch.length === 0) {
      return () => {
        cancelled = true
      }
    }

    ;(async () => {
      const rows = await Promise.all(
        toFetch.map(async (vendor) => {
          const key = vendorStorageKey(vendor)
          try {
            const res = await tapstackApi.customerVendorGames(vendor.id!)
            const connectedAuto = (res.games || []).filter(
              (game) => game.enabled !== false && game.mode === 'auto' && game.connected,
            )
            const balances = await Promise.all(
              connectedAuto.map((game) =>
                tapstackApi.vendorGameBalance(vendor.id!, game.id).catch(() => null),
              ),
            )
            let playable = 0
            let redeemable = 0
            connectedAuto.forEach((game, index) => {
              const balance = balances[index]
              if (!balance) return
              const payable =
                typeof balance.payable === 'number'
                  ? balance.payable
                  : parseMoney(balance.payableFormatted)
              const redeem =
                typeof balance.redeemable === 'number'
                  ? balance.redeemable
                  : parseMoney(balance.redeemableFormatted)
              playable += payable
              redeemable += redeem
              writeCachedGameBalance(vendor.id!, game.id, {
                payable,
                redeemable: redeem,
                payableFormatted: balance.payableFormatted || balance.formatted || formatMoney(payable),
                redeemableFormatted:
                  balance.redeemableFormatted || balance.formatted || formatMoney(redeem),
              })
            })
            writeCachedVendorTotals(key, playable, redeemable)
            return [key, { status: 'ready' as const, playable, redeemable }] as const
          } catch {
            return [key, { status: 'ready' as const, playable: 0, redeemable: 0 }] as const
          }
        }),
      )
      if (!cancelled) {
        setVendorTotals((current) => ({ ...current, ...Object.fromEntries(rows) }))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [vendorBalanceKey, balanceEpoch])

  const hasMoreVendors = sortedVendors.length > VENDORS_MOBILE_PREVIEW
  const visibleVendors =
    isMobileVendorList && hasMoreVendors && !vendorsExpanded
      ? sortedVendors.slice(0, VENDORS_MOBILE_PREVIEW)
      : sortedVendors
  const hiddenVendorCount = Math.max(0, sortedVendors.length - VENDORS_MOBILE_PREVIEW)

  return (
    <div className="games-home-desktop">
      <div className="games-home-sidebar">
        <section className="balance-card" aria-busy={loading || undefined}>
          <div className="balance-card-main">
            <div className="balance-copy">
              <p className="balance-label">Tapstack Balance</p>
              {loading ? (
                <div className="dash-skeleton dash-skeleton--amount" aria-hidden="true" />
              ) : (
                <p className="balance-amount">{cashBalance}</p>
              )}
            </div>
            <button type="button" className="balance-btn balance-btn--withdraw" disabled={loading}>
              Withdraw
            </button>
          </div>
        </section>

        <section className="add-vendor">
          <div className="add-vendor-icon">+</div>
          <div className="add-vendor-content">
            <p className="add-vendor-title">Add Vendor</p>
            <form
              className="add-vendor-row"
              onSubmit={(event) => {
                event.preventDefault()
                onAddVendor()
              }}
            >
              <input
                type="text"
                className="add-vendor-input"
                placeholder="Enter invite code..."
                value={inviteCode}
                onChange={(event) =>
                  onInviteCodeChange(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                }
                aria-label="Vendor invite code"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                maxLength={16}
                disabled={addingVendor}
              />
              <button
                type="submit"
                className="add-vendor-go"
                disabled={addingVendor || !inviteCode.trim()}
              >
                {addingVendor ? '…' : 'Go'}
              </button>
            </form>
            {addError ? <p className="add-vendor-error">{addError}</p> : null}
          </div>
        </section>
      </div>

      <div className="games-home-main">
        <section className="vendors-section">
          <h2 className="vendors-title">Your Vendors</h2>
          <p className="vendors-subtitle">
            {vendors.length === 0
              ? 'Add a vendor by name to get started'
              : 'Tap to view games & manage your Game IDs'}
          </p>

          {vendors.length === 0 ? (
            <div className="vendors-empty">
              <p className="vendors-empty-title">No vendors yet</p>
              <p className="vendors-empty-copy">Type a vendor name above and tap Go to add them.</p>
            </div>
          ) : (
            <>
            <div className="vendors-grid games-list">
              {visibleVendors.map((vendor) => {
                const key = vendorStorageKey(vendor)
                const favorited = favoriteKeys.has(key)
                const bannerUrl = vendor.bannerUrl?.trim() || ''
                const totals = vendorTotals[key]
                const totalsLoading = !totals || totals.status === 'loading'
                return (
                  <div
                    key={vendor.id ?? `${vendor.name}-${vendor.handle}`}
                    className={`vendor-home-card${bannerUrl ? ' has-banner' : ''}`}
                  >
                    {bannerUrl ? (
                      <div className="vendor-home-card-bg" aria-hidden="true">
                        <img src={bannerUrl} alt="" />
                      </div>
                    ) : null}
                    <div className="game-card vendor-home-card-body">
                    <div className="game-card-main">
                      <button
                        type="button"
                        className={`game-favorite${favorited ? ' is-on' : ''}`}
                        aria-label={favorited ? `Unfavorite ${vendor.name}` : `Favorite ${vendor.name}`}
                        aria-pressed={favorited}
                        onClick={() => onToggleFavorite(vendor)}
                      >
                        {favorited ? '★' : '☆'}
                      </button>
                      <button
                        type="button"
                        className="vendor-card-open"
                        onClick={() => onVendorSelect(vendor)}
                      >
                        <div
                          className="game-icon"
                          style={
                            bannerUrl
                              ? undefined
                              : { background: vendor.color, color: vendor.text }
                          }
                          aria-hidden="true"
                        >
                          {bannerUrl ? (
                            <img className="game-icon-img" src={bannerUrl} alt="" />
                          ) : (
                            vendor.initials || initialsFromName(vendor.name)
                          )}
                        </div>
                        <div className="game-info">
                          <div className="game-badges">
                            <span className="game-badge game-badge--status active">• ACTIVE</span>
                            {vendor.hasPublicPromo ? (
                              <span className="game-badge game-badge--mode game-badge--auto">PROMO</span>
                            ) : null}
                          </div>
                          <p className="game-name">{vendor.name}</p>
                        </div>
                      </button>
                    </div>

                    <div className="game-balance-payable">
                      <div className="game-balance-wrap">
                        <span className="game-balance-label">
                          Playable<span className="game-balance-label-rest"> Balance</span>
                        </span>
                        <div className="game-balance-value-row">
                          {totalsLoading ? (
                            <span className="game-balance-skeleton" aria-label="Loading playable balance" />
                          ) : (
                            <span className="game-balance">{formatMoney(totals.playable)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="game-balance-redeem">
                      <div className="game-balance-wrap">
                        <span className="game-balance-label">
                          Redeemable<span className="game-balance-label-rest"> Balance</span>
                        </span>
                        <div className="game-balance-value-row">
                          {totalsLoading ? (
                            <span className="game-balance-skeleton" aria-label="Loading redeemable balance" />
                          ) : (
                            <span className="game-balance">{formatMoney(totals.redeemable)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="game-card-actions">
                      <div className="game-side">
                        <div className="game-actions">
                          <button
                            type="button"
                            className="game-btn game-btn--load"
                            onClick={() => onVendorTransfer(vendor, 'load')}
                          >
                            Top Up
                          </button>
                          <button
                            type="button"
                            className="game-btn game-btn--redeem"
                            onClick={() => onVendorTransfer(vendor, 'redeem')}
                          >
                            Redeem
                          </button>
                          <button
                            type="button"
                            className="game-btn game-btn--move"
                            onClick={() => onVendorSelect(vendor)}
                          >
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {isMobileVendorList && hasMoreVendors ? (
              <button
                type="button"
                className="vendors-view-all"
                aria-expanded={vendorsExpanded}
                onClick={() => setVendorsExpanded((open) => !open)}
              >
                {vendorsExpanded
                  ? 'Show less'
                  : `View all (${hiddenVendorCount} more)`}
              </button>
            ) : null}
            </>
          )}
        </section>

        <section className="activity-section">
          <div className="activity-header">
            <h2 className="activity-title">Recent Activity</h2>
            <button type="button" className="activity-see-all" onClick={onSeeAllActivity}>
              See all
            </button>
          </div>

          {loading ? (
            <div className="activity-empty" aria-busy="true">
              <div className="dash-skeleton dash-skeleton--card" aria-hidden="true" />
            </div>
          ) : activities.length === 0 ? (
            <div className="activity-empty">
              <p className="activity-empty-title">No ledger activity yet</p>
              <p className="activity-empty-copy">Top ups and game loads will show up here.</p>
            </div>
          ) : (
            <ul className="activity-list">
              {activities.map((item) => (
                <li key={item.id} className="activity-item">
                  <div className="activity-icon" style={{ background: item.iconBg }}>
                    {item.icon}
                  </div>
                  <div className="activity-details">
                    <p className="activity-name">{item.title}</p>
                    <p className="activity-date">{item.date}</p>
                  </div>
                  <div className="activity-amounts">
                    {item.amounts.map((amount) => (
                      <span
                        key={`${item.id}-${amount.text}`}
                        className={`activity-amount activity-amount--${amount.variant}`}
                      >
                        {amount.text}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

export default function CustomerDashboard({
  onLogout,
  onRoleMismatch,
}: {
  onLogout: () => void
  onRoleMismatch?: (role: SessionRole) => void
}) {
  const shouldLoadFromApi = isApiConfigured() && Boolean(getToken())
  const cachedUser = getSessionUser()
  const initialRoute = parseLocation()
  const [inviteCode, setInviteCode] = useState('')
  const [vendors, setVendors] = useState<Vendor[]>(() => loadLocalVendors(cachedUser?.id))
  const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(
    () => new Set(loadFavoriteVendorKeys(cachedUser?.id)),
  )
  const [addingVendor, setAddingVendor] = useState(false)
  const [addError, setAddError] = useState('')
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [activeTab, setActiveTab] = useState<DashboardTab>(() =>
    initialRoute.portal === 'customer' ? initialRoute.tab : 'games',
  )
  const [showProfile, setShowProfile] = useState(
    () => initialRoute.portal === 'customer' && Boolean(initialRoute.profile),
  )
  const [showVerify, setShowVerify] = useState(
    () => initialRoute.portal === 'customer' && Boolean(initialRoute.verify),
  )
  const [verification, setVerification] = useState<VerificationState>(() =>
    verificationFromUser(cachedUser),
  )
  const [pendingVendorId, setPendingVendorId] = useState<string | null>(() =>
    initialRoute.portal === 'customer' && initialRoute.vendorId ? initialRoute.vendorId : null,
  )
  const [topUpOpen, setTopUpOpen] = useState(false)
  const [gamePick, setGamePick] = useState<{ vendor: Vendor; intent: 'load' | 'redeem' } | null>(null)
  const [gamePickLoading, setGamePickLoading] = useState(false)
  const [vendorBalanceEpoch, setVendorBalanceEpoch] = useState(0)
  const [homeTransfer, setHomeTransfer] = useState<{
    vendor: Vendor
    intent: GameTransferIntent
    game: GameLoadTarget
  } | null>(null)
  const [loading, setLoading] = useState(shouldLoadFromApi)
  const [cashBalance, setCashBalance] = useState(shouldLoadFromApi ? '' : '$125.00')
  const [pointsBalance, setPointsBalance] = useState(shouldLoadFromApi ? 0 : 3400)
  const [walletTxns, setWalletTxns] = useState<WalletTxn[]>([])
  const [profile, setProfile] = useState<PlayerProfile | null>(() => {
    if (cachedUser) return profileFromUser(cachedUser)
    return shouldLoadFromApi ? null : DEMO_PLAYER_PROFILE
  })
  const [affiliateWelcome, setAffiliateWelcome] = useState<PlayerAffiliateWelcome | null>(null)
  const playerAffiliatesRef = useRef<Array<{ vendorId?: number; vendorName?: string; enabled?: boolean }>>(
    [],
  )

  function syncFromRoute() {
    const route = parseLocation()
    if (route.portal !== 'customer') return
    setActiveTab(route.tab)
    setShowProfile(Boolean(route.profile))
    setShowVerify(Boolean(route.verify))
    if (route.vendorId) {
      setPendingVendorId(route.vendorId)
    } else {
      setPendingVendorId(null)
      setSelectedVendor(null)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const aff = (params.get('a') || params.get('aff') || '').trim()
    const vendorInvite = (params.get('v') || params.get('join') || '').trim()
    if (aff) setPlayerAffiliateRef(aff)
    if (vendorInvite) setInviteCode(vendorInvite.toUpperCase())
  }, [])

  useEffect(() => {
    const token = getToken()
    if (!isApiConfigured() || !token || token.startsWith('demo:')) return
    const playerId = Number(getSessionUser()?.id)
    if (!playerId) return
    let cancelled = false
    ;(async () => {
      try {
        const rows = (await tapstackApi.customerAffiliates()).affiliates || []
        if (cancelled) return
        playerAffiliatesRef.current = rows
        const welcome = detectNewPlayerAffiliates(rows, playerId)
        if (welcome) setAffiliateWelcome(welcome)
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    window.addEventListener('popstate', syncFromRoute)
    return () => window.removeEventListener('popstate', syncFromRoute)
  }, [])

  useEffect(() => {
    if (!pendingVendorId) return
    const match = matchVendorFromList(vendors, pendingVendorId)
    if (match) {
      setSelectedVendor(match)
      setShowProfile(false)
      setPendingVendorId(null)
    }
  }, [vendors, pendingVendorId])

  useEffect(() => {
    if (showVerify) {
      applyDocumentTitle({ portal: 'customer', tab: activeTab, verify: true })
      return
    }
    if (showProfile) {
      applyDocumentTitle({ portal: 'customer', tab: activeTab, profile: true })
      return
    }
    if (selectedVendor) {
      applyDocumentTitle(
        { portal: 'customer', tab: 'games', vendorId: vendorPathId(selectedVendor) },
        { vendorName: selectedVendor.name },
      )
      return
    }
    applyDocumentTitle({ portal: 'customer', tab: activeTab })
  }, [activeTab, showProfile, showVerify, selectedVendor])

  useEffect(() => {
    if (!needsVerification(verification)) return
    setSelectedVendor(null)
    setShowProfile(false)
    setTopUpOpen(false)
    if (!showVerify) setShowVerify(true)
    navigate({ portal: 'customer', tab: activeTab, verify: true }, 'replace')
  }, [verification, showVerify, activeTab])

  function openVendor(vendor: Vendor) {
    if (needsVerification(verification)) {
      setShowVerify(true)
      navigate({ portal: 'customer', tab: activeTab, verify: true }, 'replace')
      return
    }
    setSelectedVendor(vendor)
    setShowProfile(false)
    setActiveTab('games')
    navigate({ portal: 'customer', tab: 'games', vendorId: vendorPathId(vendor) })
  }

  function closeVendor() {
    setSelectedVendor(null)
    navigate({ portal: 'customer', tab: activeTab === 'games' ? 'games' : activeTab })
  }

  function toggleFavoriteVendor(vendor: Vendor) {
    const key = vendorStorageKey(vendor)
    setFavoriteKeys((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      saveFavoriteVendorKeys([...next], getSessionUser()?.id ?? cachedUser?.id)
      return next
    })
  }

  async function removeVendor(vendor: Vendor) {
    if (!window.confirm('Are you sure you want to delete this vendor?')) return

    const userId = getSessionUser()?.id ?? cachedUser?.id
    const key = vendorStorageKey(vendor)

    try {
      if (shouldLoadFromApi && vendor.id != null) {
        const res = await tapstackApi.unlinkVendor(vendor.id)
        if (Array.isArray(res.vendors)) {
          const nextList = res.vendors.map(vendorFromApi)
          setVendors(nextList)
          saveLocalVendors(nextList, userId)
        } else {
          setVendors((current) => {
            const next = current.filter((item) => vendorStorageKey(item) !== key)
            saveLocalVendors(next, userId)
            return next
          })
        }
      } else {
        setVendors((current) => {
          const next = current.filter((item) => vendorStorageKey(item) !== key)
          saveLocalVendors(next, userId)
          return next
        })
      }

      setFavoriteKeys((current) => {
        if (!current.has(key)) return current
        const next = new Set(current)
        next.delete(key)
        saveFavoriteVendorKeys([...next], userId)
        return next
      })

      if (selectedVendor && vendorStorageKey(selectedVendor) === key) {
        closeVendor()
      }
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Could not remove vendor.')
    }
  }

  function goHome() {
    setSelectedVendor(null)
    setPendingVendorId(null)
    setShowProfile(false)
    setShowVerify(false)
    setTopUpOpen(false)
    setActiveTab('games')
    navigate({ portal: 'customer', tab: 'games' }, 'replace')
  }

  function handleTabChange(tab: DashboardTab) {
    if (needsVerification(verification)) {
      setActiveTab(tab)
      setShowVerify(true)
      navigate({ portal: 'customer', tab, verify: true }, 'replace')
      return
    }
    setSelectedVendor(null)
    setShowProfile(false)
    setShowVerify(false)
    setPendingVendorId(null)
    setActiveTab(tab)
    navigate({ portal: 'customer', tab })
  }

  function openProfile() {
    if (needsVerification(verification)) {
      setShowVerify(true)
      navigate({ portal: 'customer', tab: activeTab, verify: true }, 'replace')
      return
    }
    setSelectedVendor(null)
    setPendingVendorId(null)
    setShowVerify(false)
    setShowProfile(true)
    navigate({ portal: 'customer', tab: activeTab, profile: true })
  }

  function closeProfile() {
    setShowProfile(false)
    navigate({ portal: 'customer', tab: activeTab })
  }

  function openVerify() {
    rememberVerifyReturn()
    setSelectedVendor(null)
    setShowProfile(false)
    setTopUpOpen(false)
    setShowVerify(true)
    navigate({ portal: 'customer', tab: activeTab, verify: true })
  }

  function closeVerify() {
    const current = verificationFromUser(getSessionUser())
    setVerification(current)
    if (needsVerification(current) || needsVerification(verification)) {
      setShowVerify(true)
      navigate({ portal: 'customer', tab: activeTab, verify: true }, 'replace')
      return
    }
    setShowVerify(false)
    const back = consumeVerifyReturn()
    if (back) {
      const route = parseLocation(back)
      if (route.portal === 'customer' && route.vendorId) {
        setPendingVendorId(route.vendorId)
        navigate({ portal: 'customer', tab: 'games', vendorId: route.vendorId })
        return
      }
      if (route.portal === 'customer' && route.profile) {
        setShowProfile(true)
        navigate({ portal: 'customer', tab: activeTab, profile: true })
        return
      }
    }
    navigate({ portal: 'customer', tab: activeTab })
  }

  function requireVerified(): boolean {
    const current = verificationFromUser(getSessionUser())
    setVerification(current)
    if (!needsVerification(current)) return true
    openVerify()
    return false
  }

  function openHomeTransfer(vendor: Vendor, intent: 'load' | 'redeem', game: VendorGame) {
    setGamePick(null)
    setHomeTransfer({
      vendor,
      intent,
      game: toGameLoadTarget(game),
    })
  }

  async function startVendorTransfer(vendor: Vendor, intent: 'load' | 'redeem') {
    if (!requireVerified()) return
    let localGames = vendor.games.filter((game) => game.active !== false)
    const canFetch =
      Boolean(vendor.id) &&
      !String(vendor.id).startsWith('local-') &&
      isApiConfigured() &&
      !getToken()?.startsWith('demo:')
    if (!localGames.length && !canFetch) {
      localGames = defaultGames(vendor.name)
    }

    if (!canFetch) {
      const nextVendor = { ...vendor, games: localGames }
      if (localGames.length === 1) {
        openHomeTransfer(nextVendor, intent, localGames[0])
        return
      }
      setGamePick({ vendor: nextVendor, intent })
      setGamePickLoading(false)
      return
    }

    setGamePick({ vendor, intent })
    setGamePickLoading(true)
    try {
      const res = await tapstackApi.customerVendorGames(vendor.id!)
      const games = catalogToVendorGames(res.games || [])
      const nextVendor = { ...vendor, games }
      setVendors((current) => {
        const updated = current.map((item) =>
          String(item.id) === String(vendor.id) ? nextVendor : item,
        )
        saveLocalVendors(updated, getSessionUser()?.id)
        return updated
      })
      if (games.length === 1) {
        openHomeTransfer(nextVendor, intent, games[0])
        return
      }
      setGamePick({ vendor: nextVendor, intent })
    } catch {
      setGamePick({ vendor, intent })
    } finally {
      setGamePickLoading(false)
    }
  }

  useEffect(() => {
    if (!shouldLoadFromApi) return

    let cancelled = false
    ;(async () => {
      try {
        const me = await tapstackApi.me().catch(() => null)
        if (cancelled) return

        const authUser = me?.user
        const authRole = normalizeSessionRole(authUser?.role)
        if (
          authUser &&
          authRole &&
          authRole !== 'player' &&
          isMeForCurrentSession(authUser)
        ) {
          const token = getToken()
          if (token) applyAuthSession(token, authUser)
          onRoleMismatch?.(authRole)
          return
        }

        const [dash, vendorRes] = await Promise.all([
          tapstackApi.customerDashboard(),
          tapstackApi.customerVendors().catch(() => ({ vendors: [] as never[] })),
        ])
        if (cancelled) return

        const sessionUser = getSessionUser()
        const dashUser =
          dash.user && isMeForCurrentSession(dash.user) ? dash.user : null
        const user = (authUser && isMeForCurrentSession(authUser) ? authUser : null) ?? dashUser ?? sessionUser
        if (!user) {
          throw new ApiError('Could not load player profile.', 401, 'tapstack_unauthorized')
        }
        const level = me?.level ?? dash.level
        const levelProgressPct = me?.levelProgressPct ?? dash.levelProgressPct
        const nextProfile = profileFromUser(user, level, levelProgressPct)
        const userId = user?.id

        setCashBalance(dash.wallet.cashBalance)
        setPointsBalance(dash.wallet.points)
        if (Array.isArray(dash.recentTx)) {
          setWalletTxns(dash.recentTx)
        }
        setProfile(nextProfile)
        setVerification(verificationFromUser(user))

        const saved = loadLocalVendors(userId)
        const apiVendors = (vendorRes.vendors ?? []).map(vendorFromApi)
        const linkedOnly = Boolean(
          (vendorRes as { linkedOnly?: boolean }).linkedOnly ||
            typeof (vendorRes as { linkedCount?: number }).linkedCount === 'number',
        )
        const catalogDump = !linkedOnly && looksLikeVendorCatalogDump(apiVendors)

        // Server-linked list is the source of truth (works in private windows).
        // Local storage is only a cache / offline fallback.
        let nextVendors: Vendor[]
        if (linkedOnly) {
          nextVendors = apiVendors
        } else if (catalogDump) {
          nextVendors = saved
        } else {
          nextVendors = apiVendors.length > 0 ? apiVendors : saved
        }

        const token = getToken()
        if (token && !token.startsWith('demo:')) {
          nextVendors = await Promise.all(
            nextVendors.map(async (vendor) => {
              if (vendor.bannerUrl || vendor.id == null || String(vendor.id).startsWith('local-')) {
                return vendor
              }
              try {
                const detail = await tapstackApi.customerVendor(vendor.id)
                const fresh = vendorFromApi(detail.vendor)
                return {
                  ...vendor,
                  bannerUrl: fresh.bannerUrl || vendor.bannerUrl,
                  initials: fresh.initials || vendor.initials,
                  color: fresh.color || vendor.color,
                  text: fresh.text || vendor.text,
                  tagline: fresh.tagline || vendor.tagline,
                }
              } catch {
                return vendor
              }
            }),
          )
        }

        setVendors(nextVendors)
        saveLocalVendors(nextVendors, userId)

        if (token && isMeForCurrentSession(user)) {
          applyAuthSession(token, user)
        }
      } catch {
        if (!cancelled) {
          const fallback = getSessionUser()
          if (fallback) {
            setProfile(profileFromUser(fallback))
          } else {
            setProfile({
              displayName: 'Player',
              username: '@player',
              email: '—',
              phone: '—',
              initials: 'P',
              level: 1,
              levelProgressPct: 0,
              tier: 'bronze',
            })
          }
          setCashBalance((value) => value || '$0.00')
          setPointsBalance((value) => value || 0)
          setVendors(loadLocalVendors(fallback?.id))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [shouldLoadFromApi, onRoleMismatch])

  async function handleAddVendor() {
    const code = inviteCode.trim().toUpperCase()
    if (!code || addingVendor) return

    setAddError('')
    const already = vendors.some(
      (vendor) => (vendor.code || '').toUpperCase() === code || vendor.name.toLowerCase() === code.toLowerCase(),
    )
    if (already) {
      setAddError('That vendor is already in your list.')
      return
    }

    setAddingVendor(true)
    try {
      let nextList: Vendor[] | null = null
      let next: Vendor
      if (shouldLoadFromApi) {
        const res = await tapstackApi.linkVendor(code, getPlayerAffiliateRef() || undefined)
        if (getPlayerAffiliateRef()) clearPlayerAffiliateRef()
        next = vendorFromApi(res.vendor)
        if (Array.isArray(res.vendors)) {
          nextList = res.vendors.map(vendorFromApi)
        }
      } else {
        next = createVendorFromInviteCode(code)
      }

      const userId = getSessionUser()?.id
      setVendors((current) => {
        const updated = nextList
          ? nextList
          : current.some(
                (vendor) =>
                  vendor.id === next.id ||
                  (vendor.code || '').toUpperCase() === (next.code || '').toUpperCase(),
              )
            ? current
            : [next, ...current]
        saveLocalVendors(updated, userId)
        return updated
      })
      setInviteCode('')
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : 'Could not add vendor.')
    } finally {
      setAddingVendor(false)
    }
  }

  function dismissAffiliateWelcome() {
    rememberPlayerAffiliateIds(playerAffiliatesRef.current)
    setAffiliateWelcome(null)
  }

  const verifyLocked = needsVerification(verification)

  const affiliateWelcomeModal = affiliateWelcome ? (
    <div
      className="player-affiliate-overlay"
      role="presentation"
      onClick={dismissAffiliateWelcome}
    >
      <div
        className="player-affiliate-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-affiliate-title"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="player-affiliate-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M20 7.5 9.75 17.5 4 12"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <h2 id="player-affiliate-title" className="player-affiliate-title">
          {affiliateWelcome.alreadyJoined ? "You're an affiliate" : "You're now an affiliate"}
        </h2>
        <p className="player-affiliate-name">{affiliateWelcome.vendorName}</p>
        <p className="player-affiliate-copy">You earn affiliate payouts from this gameroom.</p>
        <button type="button" className="player-affiliate-btn" onClick={dismissAffiliateWelcome}>
          Got it
        </button>
      </div>
    </div>
  ) : null

  if (showVerify || verifyLocked) {
    return (
      <div className="dashboard">
        <div className="dashboard-scroll">
          <VerifyPage
            onBack={closeVerify}
            onVerified={closeVerify}
            onLogout={onLogout}
            lockExit={verifyLocked}
            initial={verification}
            onUserUpdate={(user) => {
              setVerification(verificationFromUser(user))
              setProfile((current) =>
                current
                  ? profileFromUser(user, current.level, current.levelProgressPct)
                  : profileFromUser(user),
              )
            }}
          />
        </div>
      </div>
    )
  }

  if (selectedVendor) {
    return (
      <>
        <VendorPage
          vendor={selectedVendor}
          activeTab={activeTab}
          cashBalance={cashBalance || '$0.00'}
          profile={profile}
          onBack={closeVendor}
          onTabChange={handleTabChange}
          onRemoveVendor={() => void removeVendor(selectedVendor)}
          onProfileClick={openProfile}
          onLogoClick={goHome}
          onTopUp={() => {
            if (!requireVerified()) return
            setTopUpOpen(true)
          }}
          onRequireVerified={requireVerified}
          verification={verification}
          onOpenVerify={openVerify}
          onCashBalanceChange={(next) => {
            setCashBalance(next)
            if (shouldLoadFromApi) {
              void tapstackApi
                .customerWallet()
                .then((res) => {
                  if (Array.isArray(res.recentTx)) setWalletTxns(res.recentTx)
                })
                .catch(() => {
                  /* keep current */
                })
            }
          }}
          onGameTransferSuccess={() => {
            if (selectedVendor) {
              invalidateVendorBalanceCache(vendorStorageKey(selectedVendor), selectedVendor.id)
            }
            setVendorBalanceEpoch((value) => value + 1)
          }}
        />
        <TopUpModal
          open={topUpOpen}
          onClose={() => setTopUpOpen(false)}
          ownerType="player"
          title="Top up Tapstack balance"
          onVerifyRequired={openVerify}
          onSuccess={(wallet) => {
            if (wallet) {
              setCashBalance(`$${wallet.balance.toFixed(2)}`)
              setPointsBalance(wallet.points)
            }
            if (shouldLoadFromApi) {
              void tapstackApi
                .customerWallet()
                .then((res) => {
                  if (res.wallet?.formatted) setCashBalance(res.wallet.formatted)
                  else if (typeof res.wallet?.balance === 'number') {
                    setCashBalance(`$${res.wallet.balance.toFixed(2)}`)
                  }
                  if (typeof res.wallet?.points === 'number') setPointsBalance(res.wallet.points)
                  if (Array.isArray(res.recentTx)) setWalletTxns(res.recentTx)
                })
                .catch(() => {
                  /* keep current */
                })
            }
          }}
        />
        {affiliateWelcomeModal}
      </>
    )
  }

  const headerProfile = profile

  return (
    <div className="dashboard">
      <div className="dashboard-scroll">
        {showProfile && headerProfile ? (
          <ProfilePage
            profile={headerProfile}
            expectedRole="player"
            onBack={closeProfile}
            onLogout={onLogout}
            onRoleMismatch={onRoleMismatch}
            onProfileChange={setProfile}
            onOpenVerify={openVerify}
            verification={verification}
          />
        ) : (
          <>
            <DashboardHeader
              loading={loading && !headerProfile}
              level={headerProfile?.level}
              levelProgressPct={headerProfile?.levelProgressPct}
              tier={headerProfile?.tier}
              initials={headerProfile?.initials}
              onProfileClick={openProfile}
              onLogoClick={goHome}
            />

            <VerifyBanner state={verification} onVerify={openVerify} />

            {activeTab === 'games' && (
              <GamesHome
                inviteCode={inviteCode}
                onInviteCodeChange={(value) => {
                  setInviteCode(value)
                  if (addError) setAddError('')
                }}
                onAddVendor={handleAddVendor}
                addingVendor={addingVendor}
                addError={addError}
                vendors={vendors}
                favoriteKeys={favoriteKeys}
                onToggleFavorite={toggleFavoriteVendor}
                onVendorSelect={openVendor}
                onVendorTransfer={startVendorTransfer}
                cashBalance={cashBalance || '$0.00'}
                loading={loading}
                balanceEpoch={vendorBalanceEpoch}
                activities={
                  shouldLoadFromApi ? mapTxnsToActivities(walletTxns).slice(0, 8) : DEMO_ACTIVITIES
                }
                onSeeAllActivity={() => handleTabChange('account')}
              />
            )}

            {activeTab === 'earn' && (
              <EarnPage
                onTopUp={() => {
                  if (!requireVerified()) return
                  setTopUpOpen(true)
                }}
                pointsBalance={pointsBalance}
                onWalletUpdate={(wallet) => {
                  if (typeof wallet.points === 'number') setPointsBalance(wallet.points)
                  if (wallet.formatted) setCashBalance(wallet.formatted)
                  else if (typeof wallet.balance === 'number') {
                    setCashBalance(`$${wallet.balance.toFixed(2)}`)
                  }
                }}
              />
            )}

            {activeTab === 'giveaway' && <GiveawayPage />}

            <div hidden={activeTab !== 'promos'} aria-hidden={activeTab !== 'promos'}>
              <PromosPage active={activeTab === 'promos'} />
            </div>

            {activeTab === 'account' && headerProfile && (
              <AccountPage
                cashBalance={cashBalance || '$0.00'}
                pointsBalance={pointsBalance}
                profile={headerProfile}
                loading={loading}
                transactions={walletTxns}
                onOpenProfile={openProfile}
                onVerifyRequired={openVerify}
                onWalletUpdate={(wallet) => {
                  if (typeof wallet.points === 'number') setPointsBalance(wallet.points)
                  if (wallet.formatted) setCashBalance(wallet.formatted)
                  else if (typeof wallet.balance === 'number') {
                    setCashBalance(`$${wallet.balance.toFixed(2)}`)
                  }
                  if (shouldLoadFromApi) {
                    void tapstackApi
                      .customerWallet()
                      .then((res) => {
                        if (Array.isArray(res.recentTx)) setWalletTxns(res.recentTx)
                      })
                      .catch(() => {
                        /* keep */
                      })
                  }
                }}
              />
            )}

            {activeTab === 'account' && loading && !headerProfile ? (
              <div className="account-loading-skel" aria-busy="true">
                <div className="dash-skeleton dash-skeleton--card" />
                <div className="dash-skeleton dash-skeleton--card" />
              </div>
            ) : null}
          </>
        )}
      </div>

      {!showProfile && !showVerify ? <BottomNav activeTab={activeTab} onTabChange={handleTabChange} /> : null}

      <TopUpModal
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        ownerType="player"
        title="Top up Tapstack balance"
        onVerifyRequired={openVerify}
        onSuccess={(wallet) => {
          if (wallet) {
            setCashBalance(`$${wallet.balance.toFixed(2)}`)
            setPointsBalance(wallet.points)
          }
          if (shouldLoadFromApi) {
            void tapstackApi
              .customerWallet()
              .then((res) => {
                if (res.wallet?.formatted) setCashBalance(res.wallet.formatted)
                else if (typeof res.wallet?.balance === 'number') {
                  setCashBalance(`$${res.wallet.balance.toFixed(2)}`)
                }
                if (typeof res.wallet?.points === 'number') setPointsBalance(res.wallet.points)
                if (Array.isArray(res.recentTx)) setWalletTxns(res.recentTx)
              })
              .catch(() => {
                /* keep current */
              })
          }
        }}
      />
      {gamePick ? (
        <VendorGamePickModal
          vendorName={gamePick.vendor.name}
          intent={gamePick.intent}
          games={gamePick.vendor.games.filter((game) => game.active !== false)}
          loading={gamePickLoading}
          onSelect={(game) => openHomeTransfer(gamePick.vendor, gamePick.intent, game)}
          onClose={() => {
            setGamePick(null)
            setGamePickLoading(false)
          }}
        />
      ) : null}
      {homeTransfer ? (
        <GameLoadModal
          open
          intent={homeTransfer.intent}
          vendorId={homeTransfer.vendor.id || 0}
          vendorName={homeTransfer.vendor.name}
          game={homeTransfer.game}
          games={homeTransfer.vendor.games.map(toGameLoadTarget)}
          cashBalance={cashBalance || '$0.00'}
          onClose={() => setHomeTransfer(null)}
          onSuccess={({ cashBalance: nextCash }) => {
            setCashBalance(nextCash)
            invalidateVendorBalanceCache(
              vendorStorageKey(homeTransfer.vendor),
              homeTransfer.vendor.id,
            )
            setVendorBalanceEpoch((value) => value + 1)
            if (shouldLoadFromApi) {
              void tapstackApi
                .customerWallet()
                .then((res) => {
                  if (Array.isArray(res.recentTx)) setWalletTxns(res.recentTx)
                })
                .catch(() => {
                  /* keep current */
                })
            }
          }}
          onVerifyRequired={openVerify}
        />
      ) : null}
      {affiliateWelcomeModal}
    </div>
  )
}
