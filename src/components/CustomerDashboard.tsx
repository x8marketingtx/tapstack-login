import { useEffect, useState } from 'react'
import {
  createVendorFromInviteCode,
  loadLocalVendors,
  looksLikeVendorCatalogDump,
  saveLocalVendors,
  vendorFromApi,
  type Vendor,
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
import TopUpModal from './TopUpModal'
import ProfilePage, {
  DEMO_PLAYER_PROFILE,
  profileFromUser,
  type PlayerProfile,
} from './ProfilePage'
import {
  applyDocumentTitle,
  matchVendorFromList,
  navigate,
  parseLocation,
  vendorPathId,
} from '../lib/routing'
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
  onRemoveVendor,
  onVendorSelect,
  cashBalance,
  loading,
  activities,
  onSeeAllActivity,
}: {
  inviteCode: string
  onInviteCodeChange: (value: string) => void
  onAddVendor: () => void
  addingVendor: boolean
  addError: string
  vendors: Vendor[]
  favoriteKeys: Set<string>
  onToggleFavorite: (vendor: Vendor) => void
  onRemoveVendor: (vendor: Vendor) => void
  onVendorSelect: (vendor: Vendor) => void
  cashBalance: string
  loading?: boolean
  activities: ActivityRow[]
  onSeeAllActivity: () => void
}) {
  const sortedVendors = sortVendorsByFavorite(vendors, favoriteKeys)

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
            <div className="vendors-grid">
              {sortedVendors.map((vendor) => {
                const key = vendorStorageKey(vendor)
                const favorited = favoriteKeys.has(key)
                return (
                  <div key={vendor.id ?? `${vendor.name}-${vendor.handle}`} className="vendor-card">
                    <button
                      type="button"
                      className="vendor-card-main"
                      onClick={() => onVendorSelect(vendor)}
                    >
                      <div
                        className="vendor-icon"
                        style={{ background: vendor.color, color: vendor.text }}
                      >
                        {vendor.initials}
                      </div>
                      <div className="vendor-info">
                        <span className="vendor-name">{vendor.name}</span>
                      </div>
                    </button>
                    <div className="vendor-card-actions">
                      <button
                        type="button"
                        className={`vendor-card-action vendor-card-action--star${favorited ? ' is-on' : ''}`}
                        aria-label={favorited ? `Unfavorite ${vendor.name}` : `Favorite ${vendor.name}`}
                        aria-pressed={favorited}
                        onClick={(event) => {
                          event.stopPropagation()
                          onToggleFavorite(vendor)
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M12 3.5l2.6 5.3 5.9.9-4.3 4.2 1 5.8L12 16.9 6.8 19.7l1-5.8L3.5 9.7l5.9-.9L12 3.5z"
                            fill={favorited ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="vendor-card-action vendor-card-action--trash"
                        aria-label={`Remove ${vendor.name}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          onRemoveVendor(vendor)
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path
                            d="M4 7h16M9 7V5h6v2M8 7l1 12h6l1-12"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
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
  const [pendingVendorId, setPendingVendorId] = useState<string | null>(() =>
    initialRoute.portal === 'customer' && initialRoute.vendorId ? initialRoute.vendorId : null,
  )
  const [topUpOpen, setTopUpOpen] = useState(false)
  const [loading, setLoading] = useState(shouldLoadFromApi)
  const [cashBalance, setCashBalance] = useState(shouldLoadFromApi ? '' : '$125.00')
  const [pointsBalance, setPointsBalance] = useState(shouldLoadFromApi ? 0 : 3400)
  const [walletTxns, setWalletTxns] = useState<WalletTxn[]>([])
  const [profile, setProfile] = useState<PlayerProfile | null>(() => {
    if (cachedUser) return profileFromUser(cachedUser)
    return shouldLoadFromApi ? null : DEMO_PLAYER_PROFILE
  })

  function syncFromRoute() {
    const route = parseLocation()
    if (route.portal !== 'customer') return
    setActiveTab(route.tab)
    setShowProfile(Boolean(route.profile))
    if (route.vendorId) {
      setPendingVendorId(route.vendorId)
    } else {
      setPendingVendorId(null)
      setSelectedVendor(null)
    }
  }

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
  }, [activeTab, showProfile, selectedVendor])

  function openVendor(vendor: Vendor) {
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

  function handleTabChange(tab: DashboardTab) {
    setSelectedVendor(null)
    setShowProfile(false)
    setPendingVendorId(null)
    setActiveTab(tab)
    navigate({ portal: 'customer', tab })
  }

  function openProfile() {
    setSelectedVendor(null)
    setPendingVendorId(null)
    setShowProfile(true)
    navigate({ portal: 'customer', tab: activeTab, profile: true })
  }

  function closeProfile() {
    setShowProfile(false)
    navigate({ portal: 'customer', tab: activeTab })
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

        setVendors(nextVendors)
        saveLocalVendors(nextVendors, userId)

        const token = getToken()
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
        const res = await tapstackApi.linkVendor(code)
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
          onTopUp={() => setTopUpOpen(true)}
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
        />
        <TopUpModal
          open={topUpOpen}
          onClose={() => setTopUpOpen(false)}
          ownerType="player"
          title="Top up Tapstack balance"
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
            />

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
                onRemoveVendor={(vendor) => void removeVendor(vendor)}
                onVendorSelect={openVendor}
                cashBalance={cashBalance || '$0.00'}
                loading={loading}
                activities={
                  shouldLoadFromApi ? mapTxnsToActivities(walletTxns).slice(0, 8) : DEMO_ACTIVITIES
                }
                onSeeAllActivity={() => handleTabChange('account')}
              />
            )}

            {activeTab === 'earn' && (
              <EarnPage
                onTopUp={() => setTopUpOpen(true)}
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
                onTopUp={() => setTopUpOpen(true)}
                onOpenProfile={openProfile}
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

      {!showProfile ? <BottomNav activeTab={activeTab} onTabChange={handleTabChange} /> : null}

      <TopUpModal
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        ownerType="player"
        title="Top up Tapstack balance"
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
    </div>
  )
}
