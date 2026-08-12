import { useEffect, useState } from 'react'
import {
  createVendorFromName,
  loadLocalVendors,
  saveLocalVendors,
  vendorFromApi,
  type Vendor,
} from '../data/vendors'
import {
  ApiError,
  getToken,
  getSessionUser,
  isApiConfigured,
  setSession,
  tapstackApi,
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
import './CustomerDashboard.css'

type ActivityAmount = {
  text: string
  variant: 'cash-positive' | 'cash-negative' | 'points-positive' | 'points-negative'
}

const ACTIVITIES: {
  icon: string
  iconBg: string
  title: string
  date: string
  amounts: ActivityAmount[]
}[] = [
  {
    icon: '💰',
    iconBg: '#dcfce7',
    title: 'Top Up — Card ending 4242',
    date: 'Jun 5',
    amounts: [{ text: '+$25.00', variant: 'cash-positive' }],
  },
]

function GamesHome({
  vendorName,
  onVendorNameChange,
  onAddVendor,
  addingVendor,
  addError,
  vendors,
  onVendorSelect,
  cashBalance,
  pointsBalance,
  loading,
  onTopUp,
}: {
  vendorName: string
  onVendorNameChange: (value: string) => void
  onAddVendor: () => void
  addingVendor: boolean
  addError: string
  vendors: Vendor[]
  onVendorSelect: (vendor: Vendor) => void
  cashBalance: string
  pointsBalance: number
  loading?: boolean
  onTopUp: () => void
}) {
  return (
    <div className="games-home-desktop">
      <div className="games-home-sidebar">
        <section className="balance-card" aria-busy={loading || undefined}>
          <div className="balance-top">
            <div>
              <p className="balance-label">CASH BALANCE</p>
              {loading ? (
                <div className="dash-skeleton dash-skeleton--amount" aria-hidden="true" />
              ) : (
                <p className="balance-amount">{cashBalance}</p>
              )}
            </div>
            <div className="points-badge">
              <span className="points-label">POINTS</span>
              {loading ? (
                <div className="dash-skeleton dash-skeleton--points" aria-hidden="true" />
              ) : (
                <span className="points-value">{pointsBalance.toLocaleString()} pts</span>
              )}
            </div>
          </div>

          <div className="balance-actions">
            <button
              type="button"
              className="balance-btn balance-btn--send"
              onClick={onTopUp}
              disabled={loading}
            >
              + Top Up
            </button>
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
                placeholder="Enter vendor name..."
                value={vendorName}
                onChange={(event) => onVendorNameChange(event.target.value)}
                aria-label="Vendor name"
                disabled={addingVendor}
              />
              <button
                type="submit"
                className="add-vendor-go"
                disabled={addingVendor || !vendorName.trim()}
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
              {vendors.map((vendor) => (
                <button
                  key={vendor.id ?? `${vendor.name}-${vendor.handle}`}
                  type="button"
                  className="vendor-card"
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
              ))}
            </div>
          )}
        </section>

        <section className="activity-section">
          <div className="activity-header">
            <h2 className="activity-title">Recent Activity</h2>
            <button type="button" className="activity-see-all">
              See all
            </button>
          </div>

          <ul className="activity-list">
            {ACTIVITIES.map((item) => (
              <li key={`${item.title}-${item.date}`} className="activity-item">
                <div className="activity-icon" style={{ background: item.iconBg }}>
                  {item.icon}
                </div>
                <div className="activity-details">
                  <p className="activity-name">{item.title}</p>
                  <p className="activity-date">{item.date}</p>
                </div>
                <div className="activity-amounts">
                  {item.amounts.map((amount) => (
                    <span key={amount.text} className={`activity-amount activity-amount--${amount.variant}`}>
                      {amount.text}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

export default function CustomerDashboard({ onLogout }: { onLogout: () => void }) {
  const shouldLoadFromApi = isApiConfigured() && Boolean(getToken())
  const cachedUser = getSessionUser()
  const [vendorName, setVendorName] = useState('')
  const [vendors, setVendors] = useState<Vendor[]>(() => loadLocalVendors())
  const [addingVendor, setAddingVendor] = useState(false)
  const [addError, setAddError] = useState('')
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [activeTab, setActiveTab] = useState<DashboardTab>('games')
  const [showProfile, setShowProfile] = useState(false)
  const [topUpOpen, setTopUpOpen] = useState(false)
  const [loading, setLoading] = useState(shouldLoadFromApi)
  const [cashBalance, setCashBalance] = useState(shouldLoadFromApi ? '' : '$125.00')
  const [pointsBalance, setPointsBalance] = useState(shouldLoadFromApi ? 0 : 3400)
  const [profile, setProfile] = useState<PlayerProfile | null>(() => {
    if (cachedUser) return profileFromUser(cachedUser)
    return shouldLoadFromApi ? null : DEMO_PLAYER_PROFILE
  })

  useEffect(() => {
    if (!shouldLoadFromApi) return

    let cancelled = false
    ;(async () => {
      try {
        const [dash, me, vendorRes] = await Promise.all([
          tapstackApi.customerDashboard(),
          tapstackApi.me().catch(() => null),
          tapstackApi.customerVendors().catch(() => ({ vendors: [] as never[] })),
        ])
        if (cancelled) return

        const user = me?.user ?? dash.user
        const level = me?.level ?? dash.level
        const levelProgressPct = me?.levelProgressPct ?? dash.levelProgressPct
        const nextProfile = profileFromUser(user, level, levelProgressPct)

        setCashBalance(dash.wallet.cashBalance)
        setPointsBalance(dash.wallet.points)
        setProfile(nextProfile)

        // Only show vendors the player has added locally. Never hydrate the
        // full seeded catalog if the API still returns every vendor.
        const saved = loadLocalVendors()
        const apiVendors = (vendorRes.vendors ?? []).map(vendorFromApi)
        if (saved.length === 0) {
          setVendors([])
        } else {
          const byKey = new Map<string, Vendor>()
          for (const vendor of apiVendors) {
            byKey.set(String(vendor.id ?? vendor.name.toLowerCase()), vendor)
            byKey.set(vendor.name.toLowerCase(), vendor)
          }
          const refreshed = saved.map((vendor) => {
            const key = String(vendor.id ?? vendor.name.toLowerCase())
            return byKey.get(key) ?? byKey.get(vendor.name.toLowerCase()) ?? vendor
          })
          setVendors(refreshed)
          saveLocalVendors(refreshed)
        }

        const token = getToken()
        if (token) {
          setSession({ token, role: 'player', user })
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
            })
          }
          setCashBalance((value) => value || '$0.00')
          setPointsBalance((value) => value || 0)
          setVendors(loadLocalVendors())
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [shouldLoadFromApi])

  async function handleAddVendor() {
    const name = vendorName.trim()
    if (!name || addingVendor) return

    setAddError('')
    const already = vendors.some((vendor) => vendor.name.toLowerCase() === name.toLowerCase())
    if (already) {
      setAddError('That vendor is already in your list.')
      return
    }

    setAddingVendor(true)
    try {
      let next: Vendor
      if (shouldLoadFromApi) {
        try {
          const res = await tapstackApi.linkVendor(name)
          next = vendorFromApi(res.vendor)
        } catch {
          // Older plugin builds may not support name linking yet.
          next = createVendorFromName(name)
        }
      } else {
        next = createVendorFromName(name)
      }

      setVendors((current) => {
        if (current.some((vendor) => vendor.name.toLowerCase() === next.name.toLowerCase())) {
          return current
        }
        const updated = [next, ...current]
        saveLocalVendors(updated)
        return updated
      })
      setVendorName('')
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : 'Could not add vendor.')
    } finally {
      setAddingVendor(false)
    }
  }

  function handleTabChange(tab: DashboardTab) {
    setSelectedVendor(null)
    setShowProfile(false)
    setActiveTab(tab)
  }

  function openProfile() {
    setSelectedVendor(null)
    setShowProfile(true)
  }

  if (selectedVendor) {
    return (
      <VendorPage
        vendor={selectedVendor}
        activeTab={activeTab}
        cashBalance={cashBalance || '$0.00'}
        pointsBalance={pointsBalance}
        onBack={() => setSelectedVendor(null)}
        onTabChange={handleTabChange}
      />
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
            onBack={() => setShowProfile(false)}
            onLogout={onLogout}
            onProfileChange={setProfile}
          />
        ) : (
          <>
            <DashboardHeader
              loading={loading && !headerProfile}
              level={headerProfile?.level}
              levelProgressPct={headerProfile?.levelProgressPct}
              initials={headerProfile?.initials}
              onProfileClick={openProfile}
            />

            {activeTab === 'games' && (
              <GamesHome
                vendorName={vendorName}
                onVendorNameChange={(value) => {
                  setVendorName(value)
                  if (addError) setAddError('')
                }}
                onAddVendor={handleAddVendor}
                addingVendor={addingVendor}
                addError={addError}
                vendors={vendors}
                onVendorSelect={setSelectedVendor}
                cashBalance={cashBalance || '$0.00'}
                pointsBalance={pointsBalance}
                loading={loading}
                onTopUp={() => setTopUpOpen(true)}
              />
            )}

            {activeTab === 'earn' && <EarnPage onTopUp={() => setTopUpOpen(true)} />}

            {activeTab === 'giveaway' && <GiveawayPage />}

            {activeTab === 'promos' && <PromosPage />}

            {activeTab === 'account' && headerProfile && (
              <AccountPage
                cashBalance={cashBalance || '$0.00'}
                pointsBalance={pointsBalance}
                profile={headerProfile}
                loading={loading}
                onTopUp={() => setTopUpOpen(true)}
                onOpenProfile={openProfile}
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
        title="Top up cash balance"
        onSuccess={(wallet) => {
          if (wallet) {
            setCashBalance(`$${wallet.balance.toFixed(2)}`)
            setPointsBalance(wallet.points)
          }
        }}
      />
    </div>
  )
}
