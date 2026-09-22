import { useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  applyAuthSession,
  clearSession,
  getSessionUser,
  getToken,
  isApiConfigured,
  isMeForCurrentSession,
  tapstackApi,
} from '../api/client'
import { joinLinkForSlug, slugFromJoinUrl } from '../lib/affiliate'
import { applyDocumentTitle, navigate, parseLocation, type DistributorTab } from '../lib/routing'
import { TapStackLogo } from './TapStackLogo'
import DistributorBottomNav from './DistributorBottomNav'
import ProfilePage, { initialsFromName, profileFromUser, type PlayerProfile } from './ProfilePage'
import VerifyPage, { VerifyBanner } from './VerifyPage'
import HelpCenter from './HelpCenter'
import {
  consumeVerifyReturn,
  needsVerification,
  rememberVerifyReturn,
  verificationFromUser,
  type VerificationState,
} from '../lib/verify'
import './DistributorDashboard.css'

type DashData = Awaited<ReturnType<typeof tapstackApi.distributorDashboard>>
type VendorsData = Awaited<ReturnType<typeof tapstackApi.distributorVendors>>
type AnalyticsData = Awaited<ReturnType<typeof tapstackApi.distributorAnalytics>>
type InvoicesData = Awaited<ReturnType<typeof tapstackApi.distributorInvoices>>
type SettingsData = Awaited<ReturnType<typeof tapstackApi.distributorSettings>>

type EarningsRange = 'today' | '7d' | '30d' | 'custom'
type AnalyticsRange = '7d' | '30d' | '90d' | 'custom'
type SettingsSub = 'profile' | 'alerts' | 'security'
type AnalyticsSub = 'overview' | 'byVendor' | 'byAffiliate'
type InvoiceFilter = 'all' | 'draft' | 'sent' | 'paid' | 'overdue'

function money(value?: string | number | null) {
  if (typeof value === 'number') return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (typeof value === 'string' && value.trim()) return value.startsWith('$') ? value : `$${value}`
  return '$0.00'
}

type DistributorVendorRow = NonNullable<VendorsData>['vendors'][number]

function parseVendorTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((tag) => {
      if (typeof tag === 'string') return tag
      if (tag && typeof tag === 'object' && 'label' in tag) {
        return String((tag as { label?: string }).label || '')
      }
      return String(tag)
    })
    .filter(Boolean)
}

function vendorIsAffiliate(vendor: DistributorVendorRow & Record<string, unknown>) {
  if (vendor.isAffiliate === true) return true
  if (vendor.is_affiliate === true) return true
  if (vendor.affiliate === true) return true
  if (vendor.isAffiliateVendor === true) return true
  if (vendor.joinedViaAffiliate === true) return true
  if (vendor.linkedViaAffiliate === true) return true
  if (String(vendor.referralSource || vendor.source || vendor.joinSource || '')
    .toLowerCase()
    .includes('affiliate')) {
    return true
  }
  if (vendor.affiliateSlug || vendor.distributorAffiliateId || vendor.affiliateId) return true
  const affiliateObj = vendor.affiliate
  if (affiliateObj && typeof affiliateObj === 'object') {
    const rec = affiliateObj as { enabled?: boolean; active?: boolean }
    if (rec.enabled === true || rec.active === true) return true
  }
  return (vendor.tags || []).some((tag) => /affiliate/i.test(String(tag)))
}

function unwrapVendorsPayload(data: VendorsData & Record<string, unknown>): VendorsData {
  const list =
    data.vendors ??
    data.networkVendors ??
    data.network_vendors ??
    (Array.isArray(data.items) ? data.items : [])
  return {
    ...data,
    vendors: Array.isArray(list) ? (list as VendorsData['vendors']) : [],
    total: data.total ?? data.vendorsTotal,
    active: data.active ?? data.activeCount,
  }
}

function normalizeDistributorVendors(data: VendorsData): VendorsData {
  const unwrapped = unwrapVendorsPayload(data as VendorsData & Record<string, unknown>)
  return {
    ...unwrapped,
    vendors: (unwrapped.vendors || []).map((raw) => {
      const row = raw as DistributorVendorRow & Record<string, unknown>
      const tags = parseVendorTags(row.tags)
      const normalized: DistributorVendorRow = {
        id: String(row.id ?? row.vendorId ?? row.userId ?? ''),
        name: String(row.name || row.gameroomName || row.businessName || 'Vendor'),
        tier: String(row.tier || row.plan || '—'),
        status: String(row.status || 'active'),
        deposits: String(row.deposits ?? row.depositsFormatted ?? '—'),
        redeems: String(row.redeems ?? row.redeemsFormatted ?? '—'),
        tags,
        isAffiliate: vendorIsAffiliate({ ...row, tags }),
      }
      return normalized
    }),
  }
}

function enrichVendorsAffiliateHints(
  vendors: DistributorVendorRow[],
  dash: DashData | null,
  analytics: AnalyticsData | null,
): DistributorVendorRow[] {
  const affiliateIds = new Set<string>()
  const affiliateNames = new Set<string>()

  for (const row of dash?.vendorEarnings || []) {
    if (row.badge && /affiliate/i.test(row.badge)) {
      affiliateIds.add(String(row.id))
      affiliateNames.add(row.name.trim().toLowerCase())
    }
  }

  for (const row of analytics?.byAffiliate || []) {
    affiliateIds.add(String(row.id))
    affiliateNames.add(row.name.trim().toLowerCase())
  }

  if (!affiliateIds.size && !affiliateNames.size) return vendors

  return vendors.map((vendor) => {
    if (vendor.isAffiliate) return vendor
    const key = vendor.name.trim().toLowerCase()
    const match = affiliateIds.has(String(vendor.id)) || affiliateNames.has(key)
    return match ? { ...vendor, isAffiliate: true } : vendor
  })
}

function VendorAffiliateMark() {
  return (
    <span className="dist-vendor-affiliate-mark" title="Affiliate vendor" aria-label="Affiliate vendor">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M10 13a5 5 0 0 0 7.54.54l2.5-2.5a5 5 0 0 0-7.07-7.07l-1.72 1.71"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14 11a5 5 0 0 0-7.54-.54l-2.5 2.5a5 5 0 0 0 7.07 7.07l1.71-1.71"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

async function copyText(text: string): Promise<boolean> {
  if (!text.trim()) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

const DEMO_DIST_SLUG = 'pacific-gaming'

const DEMO_DIST_DASH: DashData = {
  name: 'Pacific Gaming',
  initials: 'PG',
  vendorsTotal: 4,
  vendorsActive: 3,
  signupLink: `${DEMO_DIST_SLUG}`,
  signupLinkDisplay: `tapstack.app/join/${DEMO_DIST_SLUG}`,
  slug: DEMO_DIST_SLUG,
  wallet: {
    balance: 2840.5,
    balanceFormatted: '$2,840.50',
    pending: 420,
    pendingFormatted: '$420.00',
    currency: 'USDC',
    commissions: 1280,
    commissionsFormatted: '$1,280.00',
    invoicesPaid: 960,
    invoicesPaidFormatted: '$960.00',
  },
  earningsPeriod: {
    amount: 312.4,
    amountFormatted: '$312.40',
    txCount: 48,
    range: 'today',
    vendorsCount: 3,
  },
  volumeIncentive: {
    current: 42000,
    target: 60000,
    progressPct: 70,
    currentFormatted: '$42,000.00',
    targetFormatted: '$60,000.00',
    remainingFormatted: '$18,000.00',
    currentRate: '8%',
    nextRate: '10%',
    tiers: [
      { label: 'Starter', rate: '6%', active: false },
      { label: 'Growth', rate: '8%', active: true },
      { label: 'Elite', rate: '10%', active: false },
    ],
  },
  vendorEarnings: [
    {
      id: '1',
      name: 'Lucky Strike Arcade',
      amount: 620,
      amountFormatted: '$620.00',
      fill: 72,
      badge: 'Affiliate',
    },
    {
      id: '2',
      name: 'Victory Valley',
      amount: 410,
      amountFormatted: '$410.00',
      fill: 48,
    },
    {
      id: '3',
      name: 'Ocean Sluggerz',
      amount: 290,
      amountFormatted: '$290.00',
      fill: 34,
      badge: 'Affiliate',
    },
  ],
  activity: [],
}

const DEMO_DIST_VENDORS: VendorsData = {
  vendors: [
    {
      id: '1',
      name: 'Lucky Strike Arcade',
      tier: 'Gold',
      status: 'active',
      deposits: '$12,400',
      redeems: '$8,200',
      tags: ['Auto', 'Affiliate'],
      isAffiliate: true,
    },
    {
      id: '2',
      name: 'Victory Valley',
      tier: 'Pro',
      status: 'active',
      deposits: '$9,800',
      redeems: '$6,100',
      tags: ['Marketing'],
    },
    {
      id: '3',
      name: 'Ocean Sluggerz',
      tier: 'Standard',
      status: 'active',
      deposits: '$7,200',
      redeems: '$4,900',
      tags: ['Promos'],
      isAffiliate: true,
    },
  ],
  total: 4,
  active: 3,
  range: '30d',
}

const DEMO_DIST_ANALYTICS: AnalyticsData = {
  totalEarned: '$12,480.00',
  thisMonth: '$1,920.00',
  distributorCut: '$312.40',
  addOnFees: '$960.00',
  monthlyEarnings: [
    { month: 'Apr', amount: 980 },
    { month: 'May', amount: 1120 },
    { month: 'Jun', amount: 1340 },
    { month: 'Jul', amount: 1180 },
    { month: 'Aug', amount: 1560 },
    { month: 'Sep', amount: 1920 },
  ],
  byVendor: [
    {
      id: 'v1',
      name: 'Lucky Strike Arcade',
      earnings: '$620.00',
      volume: '$12,400',
      redeemed: '$8,200',
      share: 42,
    },
    {
      id: 'v2',
      name: 'Victory Valley',
      earnings: '$410.00',
      volume: '$9,800',
      redeemed: '$6,100',
      share: 28,
    },
    {
      id: 'v3',
      name: 'Ocean Sluggerz',
      earnings: '$290.00',
      volume: '$7,200',
      redeemed: '$4,900',
      share: 20,
    },
  ],
  byAffiliate: [
    {
      id: 'v1',
      name: 'Lucky Strike Arcade',
      earnings: '$480.00',
      volume: '$12,400',
      redeemed: '$8,200',
      share: 38,
      vendorsReferred: 1,
      status: 'active',
    },
    {
      id: 'a1',
      name: 'West Coast Promotions',
      earnings: '$480.00',
      volume: '$14,600',
      redeemed: '$3,800',
      share: 38,
      vendorsReferred: 2,
      status: 'active',
    },
    {
      id: 'a2',
      name: 'Metro Arcade Partners',
      earnings: '$320.00',
      volume: '$9,400',
      redeemed: '$2,650',
      share: 26,
      vendorsReferred: 1,
      status: 'active',
    },
    {
      id: 'a3',
      name: 'Direct / organic signup',
      earnings: '$180.00',
      volume: '$5,400',
      redeemed: '$1,900',
      share: 14,
      vendorsReferred: 1,
      status: 'active',
    },
  ],
  range: '30d',
}

export default function DistributorDashboard({
  onLogout,
  onRoleMismatch,
}: {
  onLogout: () => void
  onRoleMismatch: (role: 'player' | 'vendor' | 'admin' | 'distributor') => void
}) {
  const initial = parseLocation()
  const cachedUser = getSessionUser()
  const [tab, setTab] = useState<DistributorTab>(
    initial.portal === 'distributor' ? initial.tab : 'home',
  )
  const [showProfile, setShowProfile] = useState(
    () => initial.portal === 'distributor' && Boolean(initial.profile),
  )
  const [showVerify, setShowVerify] = useState(
    () => initial.portal === 'distributor' && Boolean(initial.verify),
  )
  const [showHelp, setShowHelp] = useState(false)
  const [verification, setVerification] = useState<VerificationState>(() =>
    verificationFromUser(cachedUser),
  )
  const [profile, setProfile] = useState<PlayerProfile>(() => {
    if (cachedUser?.role === 'distributor') return profileFromUser(cachedUser)
    return {
      displayName: 'Distributor',
      username: '@distributor',
      email: '',
      phone: '',
      initials: 'D',
      level: 1,
      levelProgressPct: 0,
      tier: 'bronze',
    }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dash, setDash] = useState<DashData | null>(null)
  const [vendors, setVendors] = useState<VendorsData | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [invoices, setInvoices] = useState<InvoicesData | null>(null)
  const [settings, setSettings] = useState<SettingsData | null>(null)

  const [earningsRange, setEarningsRange] = useState<EarningsRange>('today')
  const [vendorsRange, setVendorsRange] = useState<EarningsRange>('30d')
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>('30d')
  const [analyticsSub, setAnalyticsSub] = useState<AnalyticsSub>('overview')
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilter>('all')
  const [settingsSub, setSettingsSub] = useState<SettingsSub>('profile')
  const [vendorQuery, setVendorQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  function syncFromRoute() {
    const route = parseLocation()
    if (route.portal !== 'distributor') return
    setTab(route.tab)
    setShowProfile(Boolean(route.profile))
    setShowVerify(Boolean(route.verify))
  }

  useEffect(() => {
    window.addEventListener('popstate', syncFromRoute)
    return () => window.removeEventListener('popstate', syncFromRoute)
  }, [])

  useEffect(() => {
    if (showVerify) {
      applyDocumentTitle({ portal: 'distributor', tab, verify: true })
      return
    }
    if (showProfile) {
      applyDocumentTitle({ portal: 'distributor', tab, profile: true })
      return
    }
    applyDocumentTitle({ portal: 'distributor', tab })
  }, [tab, showProfile, showVerify])

  useEffect(() => {
    if (!needsVerification(verification)) return
    setShowProfile(false)
    if (!showVerify) setShowVerify(true)
    navigate({ portal: 'distributor', tab, verify: true }, 'replace')
  }, [verification, showVerify, tab])

  function goHome() {
    setShowProfile(false)
    setShowVerify(false)
    setShowHelp(false)
    setTab('home')
    navigate({ portal: 'distributor', tab: 'home' }, 'replace')
  }

  function changeTab(next: DistributorTab) {
    if (needsVerification(verification)) {
      setTab(next)
      setShowVerify(true)
      navigate({ portal: 'distributor', tab: next, verify: true }, 'replace')
      return
    }
    setShowProfile(false)
    setShowVerify(false)
    setShowHelp(false)
    setTab(next)
    navigate({ portal: 'distributor', tab: next })
  }

  function openProfile() {
    if (needsVerification(verification)) {
      setShowVerify(true)
      navigate({ portal: 'distributor', tab, verify: true }, 'replace')
      return
    }
    setShowVerify(false)
    setShowHelp(false)
    setShowProfile(true)
    navigate({ portal: 'distributor', tab, profile: true })
  }

  function closeProfile() {
    setShowProfile(false)
    navigate({ portal: 'distributor', tab })
  }

  function openVerify() {
    rememberVerifyReturn()
    setShowProfile(false)
    setShowVerify(true)
    navigate({ portal: 'distributor', tab, verify: true })
  }

  function closeVerify() {
    const current = verificationFromUser(getSessionUser())
    setVerification(current)
    if (needsVerification(current) || needsVerification(verification)) {
      setShowVerify(true)
      navigate({ portal: 'distributor', tab, verify: true }, 'replace')
      return
    }
    setShowVerify(false)
    const back = consumeVerifyReturn()
    if (back) {
      const route = parseLocation(back)
      if (route.portal === 'distributor' && route.profile) {
        setShowProfile(true)
        navigate({ portal: 'distributor', tab, profile: true })
        return
      }
    }
    navigate({ portal: 'distributor', tab })
  }

  async function loadHome(range: EarningsRange = earningsRange) {
    const data = await tapstackApi.distributorDashboard(range)
    setDash(data)
  }

  async function loadVendors(range: EarningsRange = vendorsRange) {
    const token = getToken()
    if (!isApiConfigured() || token?.startsWith('demo:')) {
      setVendors(normalizeDistributorVendors(DEMO_DIST_VENDORS))
      return
    }
    const data = normalizeDistributorVendors(await tapstackApi.distributorVendors(range))
    setVendors(data)
  }

  async function loadAnalytics(range: AnalyticsRange = analyticsRange) {
    const mapped = range === '90d' ? '30d' : range
    const token = getToken()
    if (!isApiConfigured() || token?.startsWith('demo:')) {
      setAnalytics({ ...DEMO_DIST_ANALYTICS, range: mapped })
      return
    }
    const data = await tapstackApi.distributorAnalytics(mapped)
    setAnalytics({
      ...data,
      byAffiliate: data.byAffiliate ?? [],
    })
  }

  async function loadInvoices() {
    const data = await tapstackApi.distributorInvoices()
    setInvoices(data)
  }

  async function loadSettings() {
    const data = await tapstackApi.distributorSettings()
    setSettings(data)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const token = getToken()
      if (!token) {
        setLoading(false)
        onLogout()
        return
      }

      const useLiveApi = isApiConfigured() && !token.startsWith('demo:')
      if (!useLiveApi) {
        const user = getSessionUser()
        if (user?.role === 'distributor') {
          setProfile(profileFromUser(user))
          setVerification(verificationFromUser(user))
        }
        setDash(DEMO_DIST_DASH)
        setVendors(normalizeDistributorVendors(DEMO_DIST_VENDORS))
        setError('')
        setLoading(false)
        return
      }

      try {
        const me = await tapstackApi.me()
        if (!isMeForCurrentSession(me.user) || cancelled) return
        if (me.user.role !== 'distributor' && me.user.role !== 'admin') {
          onRoleMismatch(me.user.role)
          return
        }
        if (me.user.role === 'distributor') {
          const next = profileFromUser(me.user, me.level, me.levelProgressPct)
          setProfile(next)
          setVerification(verificationFromUser(me.user))
          const token = getToken()
          if (token) applyAuthSession(token, me.user)
        }
        await Promise.all([loadHome('today'), loadVendors('30d')])
        if (cancelled) return
        setError('')
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 401) {
          clearSession()
          onLogout()
          return
        }
        setError(err instanceof ApiError ? err.message : 'Could not load distributor portal.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (loading) return
    if (tab === 'vendors') {
      if (!vendors) void loadVendors(vendorsRange).catch(() => undefined)
      if (!analytics) void loadAnalytics(analyticsRange).catch(() => undefined)
    }
    if (tab === 'analytics' && !analytics) void loadAnalytics(analyticsRange).catch(() => undefined)
    if (tab === 'invoices' && !invoices) void loadInvoices().catch(() => undefined)
    if (tab === 'settings' && !settings) void loadSettings().catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, loading])

  const filteredVendors = useMemo(() => {
    let list = enrichVendorsAffiliateHints(vendors?.vendors || [], dash, analytics)
    const q = vendorQuery.trim().toLowerCase()
    if (q) list = list.filter((v) => v.name.toLowerCase().includes(q))
    return list
  }, [vendors, vendorQuery, dash, analytics])

  const filteredInvoices = useMemo(() => {
    const list = invoices?.invoices || []
    if (invoiceFilter === 'all') return list
    return list.filter((inv) => inv.status.toLowerCase() === invoiceFilter)
  }, [invoices, invoiceFilter])

  async function saveProfile() {
    if (!settings) return
    setBusy(true)
    setNotice('')
    try {
      const profile = { ...settings.profile }
      delete profile.affiliateLink
      delete profile.affiliateLinkDisplay
      await tapstackApi.distributorSaveSettings({ profile })
      setNotice('Profile saved.')
      await loadSettings()
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : 'Could not save profile.')
    } finally {
      setBusy(false)
    }
  }

  async function saveAlerts(next: Record<string, boolean>) {
    setSettings((prev) => (prev ? { ...prev, alerts: next } : prev))
    try {
      await tapstackApi.distributorSaveSettings({ alerts: next })
    } catch {
      // keep local toggle; refresh on next load
    }
  }

  const verifyLocked = needsVerification(verification)

  if (showVerify || verifyLocked) {
    return (
      <div className="dist-dashboard">
        <main className="dist-main dist-main--profile">
          <VerifyPage
            onBack={closeVerify}
            onVerified={closeVerify}
            onLogout={onLogout}
            lockExit={verifyLocked}
            initial={verification}
            onUserUpdate={(user) => {
              setVerification(verificationFromUser(user))
              setProfile(profileFromUser(user))
            }}
          />
        </main>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="dist-dashboard" aria-busy="true" aria-label="Loading">
        <header className="dist-header">
          <TapStackLogo height={36} onClick={goHome} />
          <div className="dist-header-actions">
            <span className="dist-help-button dist-help-button--skel" aria-hidden="true" />
            <span className="dist-avatar dist-avatar--skel" aria-hidden="true" />
          </div>
        </header>
        <main className="dist-main">
          <div className="dist-skel dist-skel--title" />
          <div className="dist-skel dist-skel--card" />
          <div className="dist-skel dist-skel--card-sm" />
          <div className="dist-skel dist-skel--card-sm" />
        </main>
        <DistributorBottomNav activeTab={tab} onTabChange={changeTab} />
      </div>
    )
  }

  const name = dash?.name || profile.displayName || 'Distributor'
  const initials =
    profile.initials ||
    dash?.initials ||
    initialsFromName(name) ||
    name.slice(0, 2).toUpperCase()
  const vendorsTotal = dash?.vendorsTotal ?? vendors?.total ?? 0
  const vendorsActive = dash?.vendorsActive ?? vendors?.active ?? 0
  // Always build join URLs from VITE_APP_URL (never the WP API host).
  const affiliateSlug =
    (dash?.slug || '').trim() ||
    slugFromJoinUrl(settings?.profile.affiliateLink || dash?.signupLink || '')
  const affiliate = affiliateSlug ? joinLinkForSlug(affiliateSlug) : { url: '', display: '' }

  return (
    <div className="dist-dashboard">
      {!showProfile && !showHelp ? (
        <header className="dist-header">
          <TapStackLogo height={36} onClick={goHome} />
          <div className="dist-header-actions">
            <button type="button" className="dist-help-button" onClick={() => setShowHelp(true)}>
              Help
            </button>
            <button type="button" className="dist-avatar" aria-label="Open profile" onClick={openProfile}>
              {initials}
            </button>
          </div>
        </header>
      ) : null}

      <main className={`dist-main${showProfile || showHelp ? ' dist-main--profile' : ''}`}>
        {showHelp ? (
          <HelpCenter mode="submitter" onBack={() => setShowHelp(false)} />
        ) : showProfile ? (
          <ProfilePage
            profile={profile}
            showLevel={false}
            expectedRole="distributor"
            avatarTone="distributor"
            onBack={closeProfile}
            onLogout={onLogout}
            onRoleMismatch={onRoleMismatch}
            onProfileChange={setProfile}
            onOpenVerify={openVerify}
            verification={verification}
          />
        ) : (
          <>
            {error ? <p className="dist-error">{error}</p> : null}
            {notice ? <p className="dist-notice">{notice}</p> : null}
            <VerifyBanner state={verification} onVerify={openVerify} />

            {tab === 'home' && dash ? (
              <HomeView
                dash={dash}
                name={name}
                vendorsTotal={vendorsTotal}
                vendorsActive={vendorsActive}
                earningsRange={earningsRange}
                onRange={async (range) => {
                  setEarningsRange(range)
                  try {
                    await loadHome(range)
                  } catch {
                    /* keep prior */
                  }
                }}
              />
            ) : null}

            {tab === 'vendors' && !vendors ? (
              <p className="dist-empty">{loading ? 'Loading vendors…' : 'No vendor data yet.'}</p>
            ) : null}

            {tab === 'vendors' && vendors ? (
              <VendorsView
                vendors={filteredVendors}
                total={vendors?.total ?? vendorsTotal}
                active={vendors?.active ?? vendorsActive}
                range={vendorsRange}
                query={vendorQuery}
                onQuery={setVendorQuery}
                onRange={async (range) => {
                  setVendorsRange(range)
                  try {
                    await loadVendors(range)
                  } catch {
                    /* keep prior */
                  }
                }}
                affiliateLink={affiliate.url}
              />
            ) : null}

            {tab === 'analytics' && analytics ? (
              <AnalyticsView
                data={analytics}
                sub={analyticsSub}
                onSub={setAnalyticsSub}
                range={analyticsRange}
                onRange={async (range) => {
                  setAnalyticsRange(range)
                  try {
                    await loadAnalytics(range)
                  } catch {
                    /* keep prior */
                  }
                }}
              />
            ) : null}

            {tab === 'invoices' ? (
              <InvoicesView
                invoices={filteredInvoices}
                filter={invoiceFilter}
                onFilter={setInvoiceFilter}
                onRefresh={() => void loadInvoices()}
              />
            ) : null}

            {tab === 'settings' && settings ? (
              <SettingsView
                settings={settings}
                affiliateLink={affiliate.url}
                affiliateLinkDisplay={affiliate.display}
                sub={settingsSub}
                onSub={setSettingsSub}
                busy={busy}
                onChangeProfile={(nextProfile) =>
                  setSettings((prev) => (prev ? { ...prev, profile: nextProfile } : prev))
                }
                onSaveProfile={() => void saveProfile()}
                onToggleAlert={(key, value) => {
                  const next = { ...(settings.alerts || {}), [key]: value }
                  void saveAlerts(next)
                }}
                onLogout={onLogout}
              />
            ) : null}
          </>
        )}
      </main>

      {!showProfile && !showHelp ? (
        <DistributorBottomNav activeTab={tab} onTabChange={changeTab} vendorsBadge={vendorsTotal || undefined} />
      ) : null}
    </div>
  )
}

function HomeView({
  dash,
  name,
  vendorsTotal,
  vendorsActive,
  earningsRange,
  onRange,
}: {
  dash: DashData
  name: string
  vendorsTotal: number
  vendorsActive: number
  earningsRange: EarningsRange
  onRange: (range: EarningsRange) => void
}) {
  return (
    <div className="dist-stack">
      <div className="dist-title-row">
        <div>
          <div className="dist-title-line">
            <h1 className="dist-title">{name}</h1>
            <span className="dist-role-pill">Distributor</span>
          </div>
          <p className="dist-subtitle">
            <span className="dist-dot" />
            {vendorsTotal} vendors · {vendorsActive} active
          </p>
        </div>
      </div>

      <section className="dist-wallet-card">
        <div className="dist-wallet-head">
          <div>
            <p className="dist-wallet-label">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5V9h-3.25a2.75 2.75 0 0 0 0 5.5H21v1.5A2.5 2.5 0 0 1 18.5 18.5h-13A2.5 2.5 0 0 1 3 16V7.5zm15.75 4.25a1.25 1.25 0 1 1 0-2.5H21v2.5h-2.25z"
                />
              </svg>
              Wallet Balance
            </p>
            <p className="dist-wallet-amount">{money(dash.wallet.balanceFormatted ?? dash.wallet.balance)}</p>
            <p className="dist-wallet-meta">
              {dash.wallet.currency || 'USDC'} · from your vendors
            </p>
          </div>
          <div className="dist-pending-pill">
            <span>Pending</span>
            <strong>{money(dash.wallet.pendingFormatted ?? dash.wallet.pending)}</strong>
          </div>
        </div>
        <div className="dist-wallet-stats">
          <div>
            <span>% Commissions</span>
            <strong>{money(dash.wallet.commissionsFormatted ?? dash.wallet.commissions)}</strong>
          </div>
          <div>
            <span>Invoices Paid</span>
            <strong>{money(dash.wallet.invoicesPaidFormatted ?? dash.wallet.invoicesPaid)}</strong>
          </div>
        </div>
        <div className="dist-wallet-actions">
          <button type="button" className="dist-btn dist-btn--soft">
            + Top Up
          </button>
          <button type="button" className="dist-btn dist-btn--soft">
            <span aria-hidden="true">✈ </span>Send
          </button>
          <button type="button" className="dist-btn dist-btn--primary">
            Withdraw
          </button>
        </div>
      </section>

      <section className="dist-section">
        <div className="dist-section-head">
          <h2>Earnings Reporting</h2>
          <div className="dist-seg">
            {(['today', '7d', '30d', 'custom'] as EarningsRange[]).map((r) => (
              <button
                key={r}
                type="button"
                className={`dist-seg-btn${earningsRange === r ? ' is-active' : ''}`}
                onClick={() => onRange(r)}
              >
                {r === 'today' ? 'Today' : r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : 'Custom'}
              </button>
            ))}
          </div>
        </div>
        <div className="dist-earnings-card">
          <p className="dist-muted">Earnings this period</p>
          <p className="dist-earnings-amount">
            {money(dash.earningsPeriod.amountFormatted ?? dash.earningsPeriod.amount)}
          </p>
          <p className="dist-muted">
            {earningsRange === 'today'
              ? 'Today'
              : earningsRange === '7d'
                ? '7 Days'
                : earningsRange === '30d'
                  ? '30 Days'
                  : 'Custom'}{' '}
            · {dash.earningsPeriod.txCount} transactions
          </p>
          <p className="dist-vendors-chip">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M4 20V9l8-5 8 5v11H4zm4-2h3v-4h2v4h3v-7.2L12 7.2 8 10.8V18z"
              />
            </svg>
            {dash.earningsPeriod.vendorsCount ?? vendorsTotal} vendors
          </p>
        </div>
      </section>

      <section className="dist-section">
        <h2 className="dist-section-title">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M7.5 4A3.5 3.5 0 0 0 4 7.5V9h2V7.5A1.5 1.5 0 0 1 7.5 6H9V4H7.5zM15 4v2h1.5A1.5 1.5 0 0 1 18 7.5V9h2V7.5A3.5 3.5 0 0 0 16.5 4H15zM4 15v1.5A3.5 3.5 0 0 0 7.5 20H9v-2H7.5A1.5 1.5 0 0 1 6 16.5V15H4zm14 0v1.5A1.5 1.5 0 0 1 16.5 18H15v2h1.5a3.5 3.5 0 0 0 3.5-3.5V15h-2zM9 11h2v2H9v-2zm4 0h2v2h-2v-2z"
            />
          </svg>
          Earnings by Vendor — This Month
        </h2>
        <div className="dist-vendor-earn-list">
          {(dash.vendorEarnings || []).map((row) => (
            <div key={row.id} className="dist-vendor-earn-row">
              <div className="dist-vendor-earn-top">
                <span>
                  {row.name}
                  {row.badge ? <em className="dist-badge dist-badge--warn">{row.badge}</em> : null}
                </span>
                <strong>{money(row.amountFormatted ?? row.amount)}</strong>
              </div>
              <div className="dist-bar">
                <span style={{ width: `${Math.max(8, row.fill || 0)}%` }} />
              </div>
            </div>
          ))}
          {!dash.vendorEarnings?.length ? <p className="dist-empty">No vendor earnings yet.</p> : null}
        </div>
      </section>

      <section className="dist-section">
        <h2>Recent Activity</h2>
        <ul className="dist-activity">
          {(dash.activity || []).map((item) => (
            <li key={item.id}>
              <span className={item.unread ? 'dist-activity-dot' : 'dist-activity-dot is-dim'} />
              <div>
                <p>{item.text}</p>
                <small>{item.time}</small>
              </div>
            </li>
          ))}
          {!dash.activity?.length ? <li className="dist-empty">No recent activity.</li> : null}
        </ul>
      </section>
    </div>
  )
}

function VendorsView({
  vendors,
  total,
  active,
  range,
  query,
  onQuery,
  onRange,
  affiliateLink,
}: {
  vendors: NonNullable<VendorsData>['vendors']
  total: number
  active: number
  range: EarningsRange
  query: string
  onQuery: (q: string) => void
  onRange: (range: EarningsRange) => void
  affiliateLink: string
}) {
  return (
    <div className="dist-stack">
      <div className="dist-title-row">
        <div>
          <h1 className="dist-title">My Vendors</h1>
          <p className="dist-subtitle">
            {active} active · {total} total
          </p>
        </div>
        <button
          type="button"
          className="dist-btn dist-btn--primary dist-btn--sm"
          onClick={() => {
            if (affiliateLink) copyText(affiliateLink)
          }}
        >
          + Add
        </button>
      </div>

      <input
        className="dist-search"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Search vendors…"
      />

      <div className="dist-seg">
        {(['today', '7d', '30d', 'custom'] as EarningsRange[]).map((r) => (
          <button
            key={r}
            type="button"
            className={`dist-seg-btn${range === r ? ' is-active' : ''}`}
            onClick={() => onRange(r)}
          >
            {r === 'today' ? 'Today' : r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : 'Custom'}
          </button>
        ))}
      </div>

      <div className="dist-vendor-cards">
        {vendors.map((v) => {
          const isAffiliate = Boolean(v.isAffiliate) || vendorIsAffiliate(v as DistributorVendorRow & Record<string, unknown>)
          return (
          <article
            key={v.id}
            className={`dist-vendor-card${isAffiliate ? ' dist-vendor-card--affiliate' : ''}`}
          >
            {isAffiliate ? <VendorAffiliateMark /> : null}
            <div className="dist-vendor-card-top">
              <div>
                <h3>
                  {v.name}{' '}
                  <span className={`dist-badge ${v.status === 'active' ? 'dist-badge--ok' : 'dist-badge--warn'}`}>
                    {v.status === 'active' ? 'Active' : 'Restricted'}
                  </span>
                </h3>
                <p className="dist-muted">{v.tier}</p>
              </div>
            </div>
            <div className="dist-vendor-metrics">
              <div>
                <span>Deposits</span>
                <strong className="is-green">{v.deposits}</strong>
              </div>
              <div>
                <span>Redeems</span>
                <strong className="is-orange">{v.redeems}</strong>
              </div>
            </div>
            <div className="dist-tag-row">
              {isAffiliate ? (
                <span className="dist-tag dist-tag--affiliate">Affiliate</span>
              ) : null}
              {(v.tags?.length ? v.tags : ['Withdrawals', v.tier === 'Pro' ? 'Marketing' : 'Promos'])
                .filter((tag) => !isAffiliate || !/affiliate/i.test(tag))
                .map((tag) => (
                <span key={tag} className="dist-tag">
                  {tag}
                </span>
              ))}
            </div>
          </article>
          )
        })}
        {!vendors.length ? (
          <p className="dist-empty">
            No vendors in your network yet. Share your affiliate link from Settings so vendors can join.
          </p>
        ) : null}
      </div>
    </div>
  )
}

function AnalyticsView({
  data,
  sub,
  onSub,
  range,
  onRange,
}: {
  data: AnalyticsData
  sub: AnalyticsSub
  onSub: (s: AnalyticsSub) => void
  range: AnalyticsRange
  onRange: (r: AnalyticsRange) => void
}) {
  const maxBar = Math.max(1, ...(data.monthlyEarnings || []).map((m) => m.amount))
  const sixTotal = (data.monthlyEarnings || []).reduce((sum, m) => sum + m.amount, 0)

  return (
    <div className="dist-stack">
      <div className="dist-subtabs">
        <button type="button" className={sub === 'overview' ? 'is-active' : ''} onClick={() => onSub('overview')}>
          Overview
        </button>
        <button type="button" className={sub === 'byVendor' ? 'is-active' : ''} onClick={() => onSub('byVendor')}>
          By Vendor
        </button>
        <button
          type="button"
          className={sub === 'byAffiliate' ? 'is-active' : ''}
          onClick={() => onSub('byAffiliate')}
        >
          By Affiliate
        </button>
      </div>

      {sub === 'overview' ? (
        <>
          <div className="dist-seg">
            {(['7d', '30d', '90d', 'custom'] as AnalyticsRange[]).map((r) => (
              <button
                key={r}
                type="button"
                className={`dist-seg-btn${range === r ? ' is-active' : ''}`}
                onClick={() => onRange(r)}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="dist-metric-grid">
            <div>
              <span>Total Earned</span>
              <strong>{data.totalEarned}</strong>
              <small>All-time</small>
            </div>
            <div>
              <span>This Month</span>
              <strong>{data.thisMonth}</strong>
              <small>Current month</small>
            </div>
            <div>
              <span>Distributor Cut</span>
              <strong>{data.distributorCut}</strong>
              <small>This period</small>
            </div>
            <div>
              <span>Add-on Fees</span>
              <strong>{data.addOnFees}</strong>
              <small>Invoices paid</small>
            </div>
          </div>
          <section className="dist-card">
            <h2>Monthly Earnings (6mo)</h2>
            <div className="dist-bars">
              {(data.monthlyEarnings || []).map((m) => (
                <div key={m.month} className="dist-bars-col">
                  <div className="dist-bars-fill" style={{ height: `${Math.max(8, (m.amount / maxBar) * 100)}%` }} />
                  <span>{m.month}</span>
                </div>
              ))}
            </div>
            <p className="dist-six-total">
              6-month total <strong>{money(sixTotal)}</strong>
            </p>
          </section>
          <button type="button" className="dist-export-btn">
            Export Revenue Report (CSV)
          </button>
        </>
      ) : null}

      {sub === 'byVendor' ? (
        <section className="dist-section">
          <div className="dist-section-head">
            <h2>Per-Vendor Breakdown</h2>
            <button type="button" className="dist-btn dist-btn--ghost dist-btn--sm">
              CSV
            </button>
          </div>
          <div className="dist-by-vendor">
            {(data.byVendor || []).map((row) => (
              <article key={row.id} className="dist-by-vendor-card">
                <div className="dist-by-vendor-top">
                  <h3>{row.name}</h3>
                  <strong>{row.earnings}</strong>
                </div>
                <div className="dist-bar">
                  <span style={{ width: `${Math.max(6, row.share || 0)}%` }} />
                </div>
                <div className="dist-by-vendor-meta">
                  <span>
                    Volume <b>{row.volume}</b>
                  </span>
                  <span>
                    Redeemed <b>{row.redeemed}</b>
                  </span>
                  <span>
                    Share <b>{row.share}%</b>
                  </span>
                </div>
              </article>
            ))}
            {!data.byVendor?.length ? <p className="dist-empty">No vendor analytics yet.</p> : null}
          </div>
        </section>
      ) : null}

      {sub === 'byAffiliate' ? (
        <section className="dist-section">
          <div className="dist-section-head">
            <h2>Connected Affiliates</h2>
            <button type="button" className="dist-btn dist-btn--ghost dist-btn--sm">
              CSV
            </button>
          </div>
          <p className="dist-section-lead">
            Performance from affiliates linked to your distributor network — referred vendor volume and your
            share of commission.
          </p>
          <div className="dist-by-vendor dist-by-affiliate">
            {(data.byAffiliate || []).map((row) => (
              <article key={row.id} className="dist-by-vendor-card dist-by-affiliate-card">
                <div className="dist-by-vendor-top">
                  <h3>
                    {row.name}
                    {row.status ? (
                      <span
                        className={`dist-badge ${row.status === 'active' ? 'dist-badge--ok' : 'dist-badge--warn'}`}
                      >
                        {row.status === 'active' ? 'Active' : row.status}
                      </span>
                    ) : null}
                  </h3>
                  <strong>{row.earnings}</strong>
                </div>
                <div className="dist-bar dist-bar--affiliate">
                  <span style={{ width: `${Math.max(6, row.share || 0)}%` }} />
                </div>
                <div className="dist-by-vendor-meta">
                  <span>
                    Volume <b>{row.volume}</b>
                  </span>
                  <span>
                    Redeemed <b>{row.redeemed}</b>
                  </span>
                  {row.vendorsReferred != null ? (
                    <span>
                      Vendors <b>{row.vendorsReferred}</b>
                    </span>
                  ) : null}
                  <span>
                    Share <b>{row.share}%</b>
                  </span>
                </div>
              </article>
            ))}
            {!data.byAffiliate?.length ? (
              <p className="dist-empty">
                No connected affiliates yet. Affiliates who join through your network will appear here with
                volume and earnings.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function InvoicesView({
  invoices,
  filter,
  onFilter,
  onRefresh,
}: {
  invoices: NonNullable<InvoicesData>['invoices']
  filter: InvoiceFilter
  onFilter: (f: InvoiceFilter) => void
  onRefresh: () => void
}) {
  return (
    <div className="dist-stack">
      <div className="dist-title-row">
        <div>
          <h1 className="dist-title">Invoices</h1>
          <p className="dist-subtitle">Bill vendors · track payments</p>
        </div>
        <button type="button" className="dist-btn dist-btn--primary dist-btn--sm" onClick={onRefresh}>
          + Create
        </button>
      </div>

      <div className="dist-seg">
        {(['all', 'draft', 'sent', 'paid', 'overdue'] as InvoiceFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`dist-seg-btn${filter === f ? ' is-active' : ''}`}
            onClick={() => onFilter(f)}
          >
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="dist-invoice-list">
        {invoices.map((inv) => (
          <article key={inv.id} className="dist-invoice-card">
            <div className="dist-invoice-top">
              <h3>
                {inv.invoiceId} {inv.vendor}
              </h3>
              <span className={`dist-badge dist-badge--${inv.status.toLowerCase()}`}>{inv.status}</span>
            </div>
            <p className="dist-muted">{inv.description}</p>
            <div className="dist-invoice-foot">
              <span>{inv.attachments ? `📎 ${inv.attachments}` : ''}</span>
              <div>
                <strong>{inv.amount}</strong>
				<small>{inv.dueDate}</small>
              </div>
            </div>
          </article>
        ))}
        {!invoices.length ? <p className="dist-empty">No invoices yet.</p> : null}
      </div>
    </div>
  )
}

function SettingsView({
  settings,
  affiliateLink,
  affiliateLinkDisplay,
  sub,
  onSub,
  busy,
  onChangeProfile,
  onSaveProfile,
  onToggleAlert,
  onLogout,
}: {
  settings: SettingsData
  affiliateLink: string
  affiliateLinkDisplay: string
  sub: SettingsSub
  onSub: (s: SettingsSub) => void
  busy: boolean
  onChangeProfile: (profile: SettingsData['profile']) => void
  onSaveProfile: () => void
  onToggleAlert: (key: string, value: boolean) => void
  onLogout: () => void
}) {
  const [affiliateCopied, setAffiliateCopied] = useState(false)
  const profile = settings.profile
  const alerts = settings.alerts || {}
  const alertRows: Array<{ key: string; label: string; desc: string; group: string }> = [
    { group: 'VENDOR ACTIVITY', key: 'newVendorJoined', label: 'New Vendor Joined', desc: 'When a vendor links to your network.' },
    { group: 'VENDOR ACTIVITY', key: 'vendorDeposit', label: 'Vendor Deposit', desc: "Each time a vendor's customer loads." },
    { group: 'VENDOR ACTIVITY', key: 'vendorSuspended', label: 'Vendor Suspended', desc: 'When admin suspends one of your vendors.' },
    { group: 'FINANCIALS', key: 'commissionPaid', label: 'Commission Paid', desc: 'When a settlement hits your wallet.' },
    { group: 'FINANCIALS', key: 'invoiceDue', label: 'Invoice Due', desc: 'Reminders before invoice deadlines.' },
    { group: 'REPORTS & SYSTEM', key: 'weeklySummary', label: 'Weekly Summary', desc: 'Earnings & volume digest every Monday.' },
    { group: 'REPORTS & SYSTEM', key: 'marketingUpdates', label: 'Marketing Updates', desc: 'Platform promotions and new features.' },
    { group: 'REPORTS & SYSTEM', key: 'systemAlerts', label: 'System Alerts', desc: 'Downtime, maintenance notices.' },
  ]

  const groups = ['VENDOR ACTIVITY', 'FINANCIALS', 'REPORTS & SYSTEM']

  return (
    <div className="dist-stack">
      <div className="dist-title-row">
        <div>
          <h1 className="dist-title">Settings</h1>
          <p className="dist-subtitle">{profile.businessName || 'Distributor'}</p>
        </div>
      </div>

      <div className="dist-subtabs">
        <button type="button" className={sub === 'profile' ? 'is-active' : ''} onClick={() => onSub('profile')}>
          Profile
        </button>
        <button type="button" className={sub === 'alerts' ? 'is-active' : ''} onClick={() => onSub('alerts')}>
          Alerts
        </button>
        <button type="button" className={sub === 'security' ? 'is-active' : ''} onClick={() => onSub('security')}>
          Security
        </button>
      </div>

      {sub === 'profile' ? (
        <>
          <section className="dist-card">
            <p className="dist-card-kicker">AFFILIATE LINK</p>
            <div className="dist-affiliate-row">
              <input readOnly value={affiliateLinkDisplay || affiliateLink || ''} />
              <button
                type="button"
                className={`dist-btn dist-btn--primary dist-btn--sm${affiliateCopied ? ' dist-btn--copied' : ''}`}
                onClick={() => {
                  void (async () => {
                    const ok = await copyText(affiliateLink || '')
                    if (!ok) return
                    setAffiliateCopied(true)
                    window.setTimeout(() => setAffiliateCopied(false), 2000)
                  })()
                }}
              >
                {affiliateCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            {affiliateCopied ? (
              <p className="dist-copy-confirm" role="status" aria-live="polite">
                Link copied to clipboard
              </p>
            ) : null}
            <p className="dist-muted">
              Share this link in your marketing — vendors who sign up through it are automatically added to your
              network.
            </p>
          </section>

          <section className="dist-card">
            <p className="dist-card-kicker">BUSINESS INFO</p>
            {(
              [
                ['businessName', 'Business Name'],
                ['contactPerson', 'Contact Person'],
                ['email', 'Email Address'],
                ['phone', 'Phone Number'],
                ['serviceRegion', 'Service Region'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="dist-field">
                <span>{label}</span>
                <input
                  value={(profile[key] as string) || ''}
                  onChange={(e) => onChangeProfile({ ...profile, [key]: e.target.value })}
                />
              </label>
            ))}
            <button type="button" className="dist-btn dist-btn--primary" disabled={busy} onClick={onSaveProfile}>
              Save Changes
            </button>
          </section>
        </>
      ) : null}

      {sub === 'alerts' ? (
        <div className="dist-alert-groups">
          {groups.map((group) => (
            <section key={group} className="dist-card">
              <p className="dist-card-kicker">{group}</p>
              {alertRows
                .filter((row) => row.group === group)
                .map((row) => (
                  <label key={row.key} className="dist-toggle-row">
                    <div>
                      <strong>{row.label}</strong>
                      <span>{row.desc}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(alerts[row.key])}
                      onChange={(e) => onToggleAlert(row.key, e.target.checked)}
                    />
                  </label>
                ))}
            </section>
          ))}
        </div>
      ) : null}

      {sub === 'security' ? (
        <>
          <section className="dist-card">
            <p className="dist-card-kicker">CHANGE PASSWORD</p>
            <label className="dist-field">
              <span>Current Password</span>
              <input type="password" autoComplete="current-password" />
            </label>
            <label className="dist-field">
              <span>New Password</span>
              <input type="password" autoComplete="new-password" />
            </label>
            <label className="dist-field">
              <span>Confirm New Password</span>
              <input type="password" autoComplete="new-password" />
            </label>
            <button type="button" className="dist-btn dist-btn--primary">
              Update Password
            </button>
          </section>
          <section className="dist-card">
            <p className="dist-card-kicker">TWO-FACTOR AUTHENTICATION</p>
            <div className="dist-2fa-row">
              <span>Authenticator App (Google / Authy TOTP)</span>
              <em className={`dist-badge ${settings.security?.twoFactorEnabled ? 'dist-badge--ok' : 'dist-badge--warn'}`}>
                {settings.security?.twoFactorEnabled ? 'Enabled' : 'Off'}
              </em>
            </div>
            <button type="button" className="dist-btn dist-btn--ghost">
              Manage 2FA
            </button>
          </section>
          <button type="button" className="dist-btn dist-btn--ghost" onClick={onLogout}>
            Log out
          </button>
        </>
      ) : null}
    </div>
  )
}
