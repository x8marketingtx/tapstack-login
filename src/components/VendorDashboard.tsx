import { useEffect, useState } from 'react'
import {
  applyAuthSession,
  getSessionUser,
  getToken,
  isApiConfigured,
  isMeForCurrentSession,
  normalizeSessionRole,
  tapstackApi,
  type SessionRole,
} from '../api/client'
import { TapStackLogo } from './TapStackLogo'
import VendorBottomNav, { type VendorTab } from './VendorBottomNav'
import VendorOrdersPage from './VendorOrdersPage'
import VendorAnalyticsPage from './VendorAnalyticsPage'
import VendorPromosPage from './VendorPromosPage'
import VendorSettingsPage, { prefetchVendorGames } from './VendorSettingsPage'
import TopUpModal from './TopUpModal'
import ProfilePage, { initialsFromName, profileFromUser, type PlayerProfile } from './ProfilePage'
import { applyDocumentTitle, navigate, parseLocation } from '../lib/routing'
import './VendorDashboard.css'

const DEMO_VENDOR_PROFILE: PlayerProfile = {
  displayName: 'Lucky Strike Arcade',
  username: '@luckystrike',
  email: 'vendor@tapstack.demo',
  phone: '+1 555 812 4200',
  initials: 'LS',
  level: 1,
  levelProgressPct: 0,
}

function VendorHeader({
  initials,
  onProfileClick,
}: {
  initials: string
  onProfileClick: () => void
}) {
  return (
    <header className="vendor-dash-header">
      <div className="vendor-dash-header-row">
        <div className="vendor-dash-brand">
          <TapStackLogo height={40} />
        </div>

        <div className="vendor-dash-header-actions">
          <button type="button" className="vendor-icon-button vendor-icon-button--chat" aria-label="Messages">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
            <span className="vendor-badge">2</span>
          </button>

          <button
            type="button"
            className="vendor-avatar-button"
            aria-label="Open profile"
            onClick={onProfileClick}
          >
            {initials}
          </button>
        </div>
      </div>
    </header>
  )
}

function formatChangePct(pct: number | undefined): string {
  if (typeof pct !== 'number' || !Number.isFinite(pct)) return 'vs yesterday'
  const rounded = Math.round(pct * 10) / 10
  const sign = rounded > 0 ? '+' : ''
  return `${sign}${rounded}% vs yesterday`
}

function formatCompactMoney(amount: number): string {
  if (!Number.isFinite(amount)) return '$0'
  if (Math.abs(amount) >= 1000) {
    return `$${(amount / 1000).toLocaleString('en-US', {
      maximumFractionDigits: 1,
      minimumFractionDigits: amount % 1000 === 0 ? 0 : 1,
    })}k`
  }
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

type VendorHomeStats = {
  depositsFormatted: string
  depositsChangePct?: number
  redeemsFormatted: string
  redeemsChangePct?: number
  netFormatted: string
  net: number
  customers: number
  customersNewWeek: number
}

type VendorMonthlyVolume = {
  current: number
  target: number
  remaining: number
  progressPct: number
  currentFormatted: string
  targetFormatted: string
  remainingFormatted: string
}

function VendorHome({
  walletBalance,
  storeName,
  storeInitials,
  inviteCode,
  recentTx,
  today,
  monthlyVolume,
  onTopUp,
  onProfileClick,
}: {
  walletBalance: string
  storeName: string
  storeInitials: string
  inviteCode: string
  recentTx: Array<{ id?: number; name: string; meta: string; amount: string; tone?: string }>
  today: VendorHomeStats
  monthlyVolume: VendorMonthlyVolume
  onTopUp: () => void
  onProfileClick: () => void
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopyCode() {
    if (!inviteCode) return
    try {
      await navigator.clipboard.writeText(inviteCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // ignore clipboard failures
    }
  }

  return (
    <div className="vendor-home">
      <section className="vendor-store-row">
        <button type="button" className="vendor-store-info" onClick={onProfileClick}>
          <div className="vendor-store-avatar">{storeInitials}</div>
          <div className="vendor-store-text">
            <span className="vendor-store-name">{storeName}</span>
            {inviteCode ? (
              <span className="vendor-store-invite-hint">Players join with your invite code</span>
            ) : null}
          </div>
        </button>
        <button type="button" className="vendor-icon-button" aria-label="Notifications">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </button>
      </section>

      {inviteCode ? (
        <section className="vendor-invite-card">
          <div className="vendor-invite-copy">
            <p className="vendor-invite-label">PLAYER INVITE CODE</p>
            <p className="vendor-invite-code">{inviteCode}</p>
          </div>
          <button type="button" className="vendor-invite-btn" onClick={handleCopyCode}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </section>
      ) : null}

      <section className="vendor-wallet-card">
        <div className="vendor-wallet-top">
          <div>
            <p className="vendor-wallet-label">WALLET BALANCE</p>
            <p className="vendor-wallet-amount">{walletBalance}</p>
            <p className="vendor-wallet-meta">USDC · Available</p>
          </div>
          <svg className="vendor-wallet-graphic" viewBox="0 0 80 80" fill="none" aria-hidden="true">
            <rect x="12" y="24" width="56" height="40" rx="8" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
            <path d="M12 34 H68" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
            <circle cx="56" cy="49" r="6" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
          </svg>
        </div>

        <div className="vendor-wallet-actions">
          <button type="button" className="vendor-wallet-btn vendor-wallet-btn--outline" onClick={onTopUp}>
            + Top Up
          </button>
          <button type="button" className="vendor-wallet-btn vendor-wallet-btn--primary">
            Withdraw
          </button>
        </div>
      </section>

      <section className="vendor-volume-card">
        <div className="vendor-volume-header">
          <div className="vendor-volume-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="9" cy="12" r="6" stroke="#b45309" strokeWidth="1.8" />
              <circle cx="15" cy="12" r="6" stroke="#b45309" strokeWidth="1.8" />
            </svg>
          </div>
          <div className="vendor-volume-info">
            <div className="vendor-volume-row">
              <span className="vendor-volume-label">Monthly Volume</span>
              <span className="vendor-volume-value">
                {formatCompactMoney(monthlyVolume.current)} / {formatCompactMoney(monthlyVolume.target)}
              </span>
            </div>
            <div className="vendor-volume-bar">
              <div
                className="vendor-volume-fill"
                style={{ width: `${Math.min(100, Math.max(0, monthlyVolume.progressPct))}%` }}
              />
            </div>
            <p className="vendor-volume-footnote">
              {monthlyVolume.remaining > 0 ? (
                <>
                  <span className="vendor-volume-highlight">
                    {monthlyVolume.remainingFormatted} more
                  </span>{' '}
                  unlocks <span className="vendor-volume-cashback">1% cashback</span>
                </>
              ) : (
                <>
                  <span className="vendor-volume-highlight">Target reached</span> —{' '}
                  <span className="vendor-volume-cashback">1% cashback unlocked</span>
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="vendor-stats-grid">
        <article className="vendor-stat-card">
          <div className="vendor-stat-top">
            <p className="vendor-stat-label">Today&apos;s Deposits</p>
            <svg className="vendor-stat-spark vendor-stat-spark--green" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 16 L10 10 L14 14 L20 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M16 6 H20 V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <p className="vendor-stat-value">{today.depositsFormatted}</p>
          <p className="vendor-stat-subtext">{formatChangePct(today.depositsChangePct)}</p>
        </article>

        <article className="vendor-stat-card">
          <div className="vendor-stat-top">
            <p className="vendor-stat-label">Today&apos;s Redeems</p>
            <svg className="vendor-stat-spark vendor-stat-spark--orange" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 8 L10 14 L14 10 L20 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M16 18 H20 V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <p className="vendor-stat-value">{today.redeemsFormatted}</p>
          <p className="vendor-stat-subtext">{formatChangePct(today.redeemsChangePct)}</p>
        </article>

        <article className="vendor-stat-card">
          <div className="vendor-stat-top">
            <p className="vendor-stat-label">Today&apos;s Net</p>
            <svg className="vendor-stat-spark vendor-stat-spark--purple" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 14 L10 8 L14 12 L20 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M16 4 H20 V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <p
            className={`vendor-stat-value ${
              today.net >= 0 ? 'vendor-stat-value--green' : 'vendor-stat-value--orange'
            }`}
          >
            {today.netFormatted}
          </p>
          <p className="vendor-stat-subtext">Deposits – redeems</p>
        </article>

        <article className="vendor-stat-card">
          <div className="vendor-stat-top">
            <p className="vendor-stat-label">Customers</p>
            <svg className="vendor-stat-people" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="9" cy="8" r="3" stroke="#2563eb" strokeWidth="1.8" />
              <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="#2563eb" strokeWidth="1.8" />
              <circle cx="17" cy="9" r="2.5" stroke="#2563eb" strokeWidth="1.8" />
              <path d="M14 20c.4-2.2 2-4 4-4" stroke="#2563eb" strokeWidth="1.8" />
            </svg>
          </div>
          <p className="vendor-stat-value">{today.customers.toLocaleString()}</p>
          <p className="vendor-stat-subtext">
            {today.customersNewWeek} new this week
          </p>
        </article>
      </section>

      <section className="vendor-transactions">
        <div className="vendor-transactions-header">
          <h2 className="vendor-transactions-title">Recent Transactions</h2>
        </div>

        <ul className="vendor-transactions-list">
          {recentTx.length === 0 ? (
            <li className="vendor-transaction-item">
              <div className="vendor-transaction-details">
                <p className="vendor-transaction-name">No ledger activity yet</p>
                <p className="vendor-transaction-meta">Loads, top-ups, and redeems will show here</p>
              </div>
            </li>
          ) : (
            recentTx.map((tx) => (
              <li key={tx.id ?? `${tx.name}-${tx.meta}`} className="vendor-transaction-item">
                <div className="vendor-transaction-details">
                  <p className="vendor-transaction-name">{tx.name}</p>
                  <p className="vendor-transaction-meta">{tx.meta}</p>
                </div>
                <span
                  className={`vendor-transaction-amount vendor-transaction-amount--${
                    tx.tone === 'green' ? 'green' : tx.tone === 'orange' ? 'orange' : 'pink'
                  }`}
                >
                  {tx.amount}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  )
}

export default function VendorDashboard({
  onLogout,
  onRoleMismatch,
}: {
  onLogout?: () => void
  onRoleMismatch?: (role: SessionRole) => void
}) {
  const shouldLoadFromApi = isApiConfigured() && Boolean(getToken())
  const cachedUser = getSessionUser()
  const initialRoute = parseLocation()
  const [activeTab, setActiveTab] = useState<VendorTab>(() =>
    initialRoute.portal === 'vendor' ? initialRoute.tab : 'home',
  )
  const [showProfile, setShowProfile] = useState(
    () => initialRoute.portal === 'vendor' && Boolean(initialRoute.profile),
  )
  const [topUpOpen, setTopUpOpen] = useState(false)
  const [walletBalance, setWalletBalance] = useState('$0.00')
  const [inviteCode, setInviteCode] = useState('')
  const [recentTx, setRecentTx] = useState<
    Array<{ id?: number; name: string; meta: string; amount: string; tone?: string }>
  >([])
  const [todayStats, setTodayStats] = useState<VendorHomeStats>({
    depositsFormatted: '$0.00',
    depositsChangePct: 0,
    redeemsFormatted: '$0.00',
    redeemsChangePct: 0,
    netFormatted: '$0.00',
    net: 0,
    customers: 0,
    customersNewWeek: 0,
  })
  const [monthlyVolume, setMonthlyVolume] = useState<VendorMonthlyVolume>({
    current: 0,
    target: 60000,
    remaining: 60000,
    progressPct: 0,
    currentFormatted: '$0.00',
    targetFormatted: '$60,000.00',
    remainingFormatted: '$60,000.00',
  })
  const [profile, setProfile] = useState<PlayerProfile>(() => {
    if (cachedUser?.role === 'vendor') return profileFromUser(cachedUser)
    return DEMO_VENDOR_PROFILE
  })

  function syncFromRoute() {
    const route = parseLocation()
    if (route.portal !== 'vendor') return
    setActiveTab(route.tab)
    setShowProfile(Boolean(route.profile))
  }

  useEffect(() => {
    window.addEventListener('popstate', syncFromRoute)
    return () => window.removeEventListener('popstate', syncFromRoute)
  }, [])

  useEffect(() => {
    if (showProfile) {
      applyDocumentTitle({ portal: 'vendor', tab: activeTab, profile: true })
      return
    }
    applyDocumentTitle({ portal: 'vendor', tab: activeTab })
  }, [activeTab, showProfile])

  function handleTabChange(tab: VendorTab) {
    setShowProfile(false)
    setActiveTab(tab)
    navigate({ portal: 'vendor', tab })
  }

  function openProfile() {
    setShowProfile(true)
    navigate({ portal: 'vendor', tab: activeTab, profile: true })
  }

  function closeProfile() {
    setShowProfile(false)
    navigate({ portal: 'vendor', tab: activeTab })
  }

  useEffect(() => {
    if (!shouldLoadFromApi) return

    prefetchVendorGames()

    let cancelled = false
    ;(async () => {
      try {
        const [me, dash] = await Promise.all([
          tapstackApi.me().catch(() => null),
          tapstackApi.vendorDashboard().catch(() => null),
        ])
        if (cancelled) return

        if (me?.user) {
          const role = normalizeSessionRole(me.user.role)
          if (role && role !== 'vendor' && isMeForCurrentSession(me.user)) {
            const token = getToken()
            if (token) applyAuthSession(token, me.user)
            onRoleMismatch?.(role)
            return
          }
          if (role === 'vendor' && isMeForCurrentSession(me.user)) {
            const next = profileFromUser(me.user, me.level, me.levelProgressPct)
            setProfile(next)
            const token = getToken()
            if (token) {
              applyAuthSession(token, me.user)
            }
          }
        } else if (getSessionUser()?.role === 'vendor') {
          setProfile(profileFromUser(getSessionUser()!))
        } else {
          // Never paint a player/customer account onto the vendor portal.
          setProfile(DEMO_VENDOR_PROFILE)
        }

        const balance = dash?.wallet
        const amount = balance?.amount
        if (typeof amount === 'number') {
          setWalletBalance(
            amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
          )
        } else if (typeof balance?.balance === 'string') {
          setWalletBalance(balance.balance)
        }

        const code = dash?.store?.inviteCode || dash?.store?.code || ''
        if (code) setInviteCode(String(code).toUpperCase())

        if (Array.isArray(dash?.recentTx)) {
          setRecentTx(dash.recentTx)
        }

        if (dash?.today) {
          const t = dash.today
          setTodayStats({
            depositsFormatted: t.depositsFormatted || '$0.00',
            depositsChangePct: t.depositsChangePct ?? 0,
            redeemsFormatted: t.redeemsFormatted || '$0.00',
            redeemsChangePct: t.redeemsChangePct ?? 0,
            netFormatted: t.netFormatted || '$0.00',
            net: typeof t.net === 'number' ? t.net : 0,
            customers: typeof t.customers === 'number' ? t.customers : 0,
            customersNewWeek: typeof t.customersNewWeek === 'number' ? t.customersNewWeek : 0,
          })
        }

        if (dash?.monthlyVolume) {
          const m = dash.monthlyVolume
          const current = typeof m.current === 'number' ? m.current : 0
          const target = typeof m.target === 'number' ? m.target : 60000
          const remaining =
            typeof m.cashbackUnlockRemaining === 'number'
              ? m.cashbackUnlockRemaining
              : Math.max(0, target - current)
          setMonthlyVolume({
            current,
            target,
            remaining,
            progressPct:
              typeof m.progressPct === 'number'
                ? m.progressPct
                : target > 0
                  ? Math.min(100, (current / target) * 100)
                  : 0,
            currentFormatted: m.currentFormatted || `$${current.toFixed(2)}`,
            targetFormatted: m.targetFormatted || `$${target.toFixed(2)}`,
            remainingFormatted: m.remainingFormatted || `$${remaining.toFixed(2)}`,
          })
        }
      } catch {
        const saved = getSessionUser()
        if (saved?.role === 'vendor') {
          setProfile(profileFromUser(saved))
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [shouldLoadFromApi, onRoleMismatch])

  function handleLogout() {
    onLogout?.()
  }

  const initials = profile.initials || initialsFromName(profile.displayName)

  return (
    <div className="vendor-dashboard">
      {!showProfile ? (
        <VendorHeader initials={initials} onProfileClick={openProfile} />
      ) : null}

      <main className={`vendor-main ${showProfile ? 'vendor-main--profile' : ''}`}>
        {showProfile ? (
          <ProfilePage
            profile={profile}
            showLevel={false}
            expectedRole="vendor"
            onBack={closeProfile}
            onLogout={handleLogout}
            onRoleMismatch={onRoleMismatch}
            onProfileChange={setProfile}
          />
        ) : (
          <>
            {activeTab === 'home' && (
              <VendorHome
                walletBalance={walletBalance}
                storeName={profile.displayName}
                storeInitials={initials}
                inviteCode={inviteCode}
                recentTx={recentTx}
                today={todayStats}
                monthlyVolume={monthlyVolume}
                onTopUp={() => setTopUpOpen(true)}
                onProfileClick={openProfile}
              />
            )}
            {activeTab === 'orders' && <VendorOrdersPage />}
            {activeTab === 'analytics' && <VendorAnalyticsPage />}
            {activeTab === 'promos' && <VendorPromosPage />}
            <div hidden={activeTab !== 'settings'}>
              <VendorSettingsPage />
            </div>
          </>
        )}
      </main>

      {!showProfile ? (
        <VendorBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      ) : null}

      <TopUpModal
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        ownerType="vendor"
        title="Top up USDC wallet"
        onSuccess={(wallet) => {
          if (wallet) setWalletBalance(`$${wallet.balance.toFixed(2)}`)
        }}
      />
    </div>
  )
}
