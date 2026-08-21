/**
 * TapStack API client for the WordPress plugin (`/wp-json/tapstack/v1`).
 *
 * Set VITE_WP_API_URL in `.env` to your WordPress origin, e.g. http://localhost:8080
 */

const TOKEN_KEY = 'tapstack_token'
const ROLE_KEY = 'tapstack_role'
const USER_KEY = 'tapstack_user'

/** Bumped on every login/logout so in-flight /auth/me calls can be ignored. */
let sessionEpoch = 0

export function getSessionEpoch(): number {
  return sessionEpoch
}

export type SessionRole = 'player' | 'vendor' | 'distributor' | 'admin'

export type WalletTxn = {
  id: number
  type: string
  amount: number
  points: number
  title: string
  meta: Record<string, unknown>
  balanceAfter?: number | null
  createdAt: string
}

export type EarnDailyMission = {
  id: string
  title: string
  detail: string
  reward: number
  goal: number
  progress: number
  status: 'claim' | 'active' | 'done'
}

export type EarnDepositMission = {
  step: number
  title: string
  depositTotal: string
  target: number
  reward: string
  rewardPoints: number
  rewardExtra?: string | null
  status: 'completed' | 'claim' | 'active' | 'locked'
  statusNote?: string | null
}

export type EarnState = {
  points: number
  cashBalance: number
  cashFormatted: string
  spinsRemaining: number
  spinsTotal: number
  spinsUsed: number
  wheel: Array<{ label: string; points: number }>
  dailyMissions: EarnDailyMission[]
  mission: {
    step: number
    title: string
    deposited: number
    target: number
    pct: number
    reward: number
  }
  missions: EarnDepositMission[]
  lifetimeDeposited: number
  redeemRate: { points: number; cash: number; minPoints: number }
}

export type TicketTier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'platinum'

export type GiveawayTicket = {
  id: string
  number: number
  source: string
  createdAt: string
}

export type GiveawayState = {
  chips: number
  chipsPerTicket: number
  chipsNeeded: number
  ticketCount: number
  tickets: GiveawayTicket[]
  tier: TicketTier
  tierLabel: string
  tierRate: { dollars: number; tickets: number; summary: string }
  adsWatchedToday: number
  adsRemainingToday: number
  adsPerDay: number
  purchaseSpendTowardNext: number
  purchaseSpendNeeded: number
  title: string
  prize: string
  drawDate: string
  drawAt: string
  deadlineDays: number
  deadlineLabel: string
  howItWorks: string[]
}

export type AdminOverview = {
  range?: string
  rangeLabel?: string
  netProfit: string
  netProfitAmount?: number
  changePct: string
  txCount: number
  deposits: number
  depositsFormatted?: string
  withdrawals: number
  withdrawalsFormatted?: string
  platformFees: number
  platformFeesFormatted?: string
  detailRows: Array<{
    id: string
    title: string
    subtitle: string
    value: string
    meta: string
    valueTone?: string
  }>
  platformStats: {
    activeVendors: number
    distributors: number
    customers: number
    suspended: number
    pendingApplications?: number
  }
}

export type AdminVendor = {
  id: string
  initials: string
  avatarBg: string
  name: string
  distributor: string
  players: number
  status: 'active' | 'pending' | 'suspended' | 'deactivated' | string
  monthlyRevenue: string
  monthlyRevenueAmount?: number
  inAvg: string
  redeemAvg: string
}

export type AdminVendorSummary = {
  total: number
  active: number
  pending: number
  suspended: number
  deactivated?: number
}

export type AdminPeriodStats = {
  sales: string
  salesAmount: number
  redeems: string
  redeemsAmount: number
  net: string
  netAmount: number
  salesTx: number
  redeemTx: number
  txCount: number
  inAvg: string
  redeemAvg: string
}

export type AdminVendorDetail = {
  vendor: AdminVendor & {
    code?: string
    email?: string
    phone?: string
    address?: string
    handle?: string
    username?: string
    tier?: string
    distributorId?: string | null
    createdAt?: string
  }
  wallet: { balance: string; balanceAmount: number; currency: string }
  stats: {
    today: AdminPeriodStats
    '7d': AdminPeriodStats
    '30d': AdminPeriodStats
    month: AdminPeriodStats
    all: AdminPeriodStats
  }
  recentOrders: Array<{
    id: string
    name: string
    game: string
    type: string
    status: string
    amount: string
    time: string
    date: string
    positive?: boolean
  }>
}

export type AdminDistributor = {
  id: string
  initials: string
  name: string
  vendors: number
  earned: string
  status: 'active' | 'suspended' | string
}

export type AdminDistributorDetail = {
  distributor: AdminDistributor & {
    email?: string
    earnedAmount?: number
  }
  wallet: { balance: string; balanceAmount: number; currency: string }
  stats: {
    today: AdminPeriodStats
    '7d': AdminPeriodStats
    '30d': AdminPeriodStats
    month: AdminPeriodStats
    all: AdminPeriodStats
  }
  vendors: Array<{
    id: string
    name: string
    initials: string
    avatarBg: string
    status: string
    sales: string
    salesAmount: number
    redeems: string
    redeemsAmount: number
    net: string
    netAmount: number
    txCount: number
  }>
}

export type AdminSignup = {
  id: string
  name: string
  code?: string
  applicant: string
  date: string
  time: string
  revenueRange: string
  status: 'pending' | 'approved' | 'rejected' | string
  icon?: 'vendor' | 'person' | string
  email?: string
  phone?: string
}

export type AdminFees = {
  withdrawalsEnabled: boolean
  depositsEnabled: boolean
  emailBlastsEnabled: boolean
  maintenanceMode: boolean
  depositFeePct: number
  redeemFeePct: number
  playerRankUpgradeMo: number
  vendorGameAutomationMo: number
}

export type AdminFinanceCustomer = {
  id: string
  username: string
  initial: string
  avatarBg: string
  contact: string
  balance: string
  points: number
  status: string
}

export type AdminCustomerDetail = {
  customer: AdminFinanceCustomer & {
    displayName?: string
    email?: string
    phone?: string
    balanceAmount?: number
    vendors?: number
    createdAt?: string
  }
  wallet: {
    balance: string
    balanceAmount: number
    points: number
    currency: string
  }
  stats: {
    today: AdminPeriodStats
    '7d': AdminPeriodStats
    '30d': AdminPeriodStats
    month: AdminPeriodStats
    all: AdminPeriodStats
  }
  vendors: Array<{
    id: string
    name: string
    status: string
  }>
  recentOrders: Array<{
    id: string
    name: string
    game: string
    type: string
    status: string
    amount: string
    time: string
    date: string
    positive?: boolean
  }>
}

export type AdminFinanceVendor = {
  id: string
  name: string
  deposits: string
  depositsAmount: number
  redeems: string
  redeemsAmount: number
  net: string
  netAmount: number
  volume?: number
  customers?: number
  status?: string
}

export type AdminFinanceTransferRecipient = {
  id: string
  label: string
}

export type AdminFinance = {
  range?: string
  analytics: {
    deposits: string
    withdrawals: string
    netBalance: string
    transactionFees: string
    subscriptions: string
    googleAds: string
    loyaltyRetentionFees: string
    platformRevenue: string
    txCount?: number
  }
  feeEstimate?: {
    total: string
    totalAmount: number
    deposits: string
    depositsAmount: number
    redeems: string
    redeemsAmount: number
    depositVolume?: number
    redeemVolume?: number
  }
  fees: AdminFees
  reserveWallet: string
  reserveWalletAmount?: number
  customers: AdminFinanceCustomer[]
  vendors?: AdminFinanceVendor[]
  topVendors?: AdminFinanceVendor[]
  transferRecipients?: {
    vendor?: AdminFinanceTransferRecipient[]
    player?: AdminFinanceTransferRecipient[]
    distributor?: AdminFinanceTransferRecipient[]
  }
}

export type AdminSettings = {
  account: { emailAlerts: boolean; smsAlerts: boolean }
  admins: Array<{
    id: string
    initials: string
    name: string
    email: string
    role: string
    lastActive: string
  }>
}

export type VendorPromotion = {
  id: string
  icon: string
  title: string
  type: string
  typeLabel: string
  endsLabel: string
  status: 'active' | 'draft' | 'expired'
  entries: number
  completions?: number
  valueGiven: string
  minAmount?: number
  rewardValue?: number
  summary?: string
  startsAt?: string
  endsAt?: string
  limitPerPlayer?: number
  limitPerDay?: number
  limitTotal?: number
  limitsLabel?: string
  playerTags?: string[]
  playerTagLabels?: string[]
  audienceLabel?: string
}

export type VendorCoupon = {
  id: string
  code: string
  bonusType: string
  bonusTypeLabel: string
  bonusValue: number
  useLimit: number
  usedCount: number
  maxRedemptions: number
  status: 'active' | 'draft' | 'expired'
  statusLabel: string
  meta: string
  limitsLabel?: string
  startsAt?: string
  endsAt?: string
}

export type EmailBlastAvailability = {
  available: boolean
  nextAvailable: string
  lastSentAt?: string | null
  blastsEnabled: boolean
  message: string
}

export type EmailBlastSegment = {
  id: string
  label: string
  count: number
}

export type EmailBlastItem = {
  id: string
  title: string
  subject?: string
  meta: string
  openRate: string
  sentCount?: number
  segmentLabel?: string
}

export const PLAYER_TAG_OPTIONS: { id: string; label: string }[] = [
  { id: 'vip', label: 'VIP' },
  { id: 'high-roller', label: 'High Roller' },
  { id: 'frequent', label: 'Frequent Player' },
  { id: 'new', label: 'New Player' },
  { id: 'regular', label: 'Regular' },
]

export type PlayerPromo = {
  id: string
  vendorId: string
  vendor: string
  vendorInitials: string
  vendorName: string
  heroGradient: string
  badge: string
  headline: string
  title: string
  categoryIcon: string
  category: string
  categoryClass: string
  description: string
  ends: string
  type: string
  minAmount: number
  rewardValue: number
  claimStatus: 'available' | 'active' | 'completed' | 'claimed'
  progress: number
  goal: number
  rewardAmount: number
  claimId?: string | null
}

export type VendorOrderItem = {
  id: string
  playerId?: string
  vendorId?: string
  name: string
  game: string
  gameKey?: string
  platform?: string
  method: string
  time: string
  amount: string
  icon: string
  iconBg: string
  type: string
  status: string
  date: string
  createdAt?: string
  positive: boolean
  label: string
  error?: string
  mobileId?: string
  note?: string
  attention?: boolean
  statusLabel?: string
}

export type VendorCustomer = {
  id: string
  name: string
  username: string
  meta: string
  initial: string
  inAmount: string
  outAmount: string
  visits: number
  linkedAt?: string
  lastActivityAt?: string | null
  phone?: string
  email?: string
  tags?: string[]
  tagLabels?: string[]
}

export type VendorGameAccount = {
  gameKey: string
  title: string
  platform: string
  mobileId: string
  pinId: string
  password: string
  hasPassword: boolean
  connectedAt: string
  updatedAt: string
  icon: string
  iconBg: string
  mode: string
}

export function getApiBase(): string {
  const origin = (import.meta.env.VITE_WP_API_URL as string | undefined)?.replace(/\/$/, '') || ''
  return origin ? `${origin}/wp-json/tapstack/v1` : '/wp-json/tapstack/v1'
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function getSessionRole(): SessionRole | null {
  const role = localStorage.getItem(ROLE_KEY)
  if (role === 'player' || role === 'vendor' || role === 'distributor' || role === 'admin') {
    return role
  }
  return null
}

export function getSessionUser(): TapstackUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as TapstackUser
  } catch {
    return null
  }
}

export function setSession(input: {
  token: string
  role: SessionRole
  user?: TapstackUser | null
}): void {
  sessionEpoch += 1
  setToken(input.token)
  localStorage.setItem(ROLE_KEY, input.role)
  if (input.user) localStorage.setItem(USER_KEY, JSON.stringify(input.user))
  else localStorage.removeItem(USER_KEY)
}

export function normalizeSessionRole(role: unknown): SessionRole | null {
  if (role === 'player' || role === 'vendor' || role === 'distributor' || role === 'admin') {
    return role
  }
  return null
}

/**
 * Persist auth from the API. Role always comes from `user.role` — never from a
 * portal guess (that caused vendor tokens to be labeled as players).
 */
export function applyAuthSession(token: string, user: TapstackUser): SessionRole {
  const role = normalizeSessionRole(user.role) ?? 'player'
  setSession({ token, role, user: { ...user, role } })
  return role
}

/**
 * Host GET cache sometimes returns another user's /auth/me payload.
 * Reject those so a player login cannot be overwritten by a cached vendor body.
 */
export function isMeForCurrentSession(user: TapstackUser | null | undefined): boolean {
  if (!user?.id) return false
  const current = getSessionUser()
  if (!current?.id) return true
  return Number(current.id) === Number(user.id)
}

/** Offline / demo login when WordPress API is not configured. */
export function setDemoSession(role: SessionRole, user?: Partial<TapstackUser>): void {
  setSession({
    token: `demo:${role}`,
    role,
    user: {
      id: 0,
      email: user?.email || `${role}@tapstack.demo`,
      displayName: user?.displayName || role.charAt(0).toUpperCase() + role.slice(1),
      role,
      ...user,
    },
  })
}

export function clearSession(): void {
  sessionEpoch += 1
  setToken(null)
  localStorage.removeItem(ROLE_KEY)
  localStorage.removeItem(USER_KEY)
}

export function homeViewForRole(role: SessionRole): 'customer' | 'vendor' | 'admin' | 'distributor' {
  if (role === 'vendor') return 'vendor'
  if (role === 'distributor') return 'distributor'
  if (role === 'admin') return 'admin'
  return 'customer'
}

export function roleForView(view: 'customer' | 'vendor' | 'admin' | 'distributor'): SessionRole {
  if (view === 'vendor') return 'vendor'
  if (view === 'distributor') return 'distributor'
  if (view === 'admin') return 'admin'
  return 'player'
}

export function canAccessView(view: string, role: SessionRole | null): boolean {
  if (view === 'customer' || view === 'vendor' || view === 'admin' || view === 'distributor') {
    return role === roleForView(view)
  }
  return true
}

export class ApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

type RequestOptions = {
  method?: string
  body?: unknown
  /** Default true. Set false for public endpoints. */
  auth?: boolean
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  let requestPath = path
  const needsAuth = options.auth !== false
  if (needsAuth) {
    const token = getToken()
    if (!token) {
      throw new ApiError(
        'Authentication required. Log in via OTP/portal first so a Bearer token is saved.',
        401,
        'tapstack_unauthorized',
      )
    }
    headers.Authorization = `Bearer ${token}`
    // Host proxy often strips Authorization on cache-MISS; plugin also reads this.
    headers['X-TapStack-Token'] = token
    // Query fallback — required on tap.x8dev.net when Authorization never reaches PHP.
    if (!token.startsWith('demo:') && !requestPath.includes('access_token=')) {
      const sep = requestPath.includes('?') ? '&' : '?'
      requestPath = `${requestPath}${sep}access_token=${encodeURIComponent(token)}`
    }
  }

  const res = await fetch(`${getApiBase()}${requestPath}`, {
    method: options.method || 'GET',
    headers,
    cache: 'no-store',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message =
      (data as { message?: string }).message ||
      (data as { error?: string }).error ||
      `Request failed (${res.status})`
    const code = (data as { code?: string }).code
    throw new ApiError(message, res.status, code)
  }

  return data as T
}

export const tapstackApi = {
  health: () => apiRequest<{ ok: boolean; version: string }>('/health', { auth: false }),

  requestOtp: (phone: string, intent: 'login' | 'signup' | 'change_phone' = 'login') =>
    apiRequest<{ ok: boolean; phone: string; demoCode?: string; intent?: string }>('/auth/otp/request', {
      method: 'POST',
      body: { phone, intent },
      // change_phone requires the logged-in player's token
      auth: intent === 'change_phone',
    }),

  playerExists: (phone: string) =>
    apiRequest<{ exists: boolean; phone: string }>('/auth/player/exists', {
      method: 'POST',
      body: { phone },
      auth: false,
    }),

  verifyOtp: (phone: string, code: string, profile?: { fullName?: string; email?: string }) =>
    apiRequest<{
      token: string
      user: TapstackUser
      wallet: { balance: number; points: number; currency: string }
    }>('/auth/otp/verify', {
      method: 'POST',
      body: { phone, code, ...profile },
      auth: false,
    }),

  changePhone: (phone: string, code: string) =>
    apiRequest<{ ok: boolean; user: TapstackUser; phone: string }>('/auth/phone/change', {
      method: 'POST',
      body: { phone, code },
    }),

  portalLogin: (email: string, password: string, type: 'vendor' | 'distributor' | 'admin') =>
    apiRequest<{ token: string; user: TapstackUser }>('/auth/login', {
      method: 'POST',
      body: { email, password, type },
      auth: false,
    }),

  me: async () => {
    try {
      return await apiRequest<{ user: TapstackUser; level?: number; levelProgressPct?: number }>(
        '/auth/me',
        { method: 'POST', body: {} },
      )
    } catch (err) {
      // Older plugins only expose GET /auth/me — but host GET cache is unreliable.
      // Prefer the local session user over a possibly poisoned GET body.
      if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
        const user = getSessionUser()
        if (user) {
          return { user, level: user.level ?? 1, levelProgressPct: 0 }
        }
      }
      throw err
    }
  },

  updateProfile: (profile: { fullName?: string; email?: string; phone?: string }) =>
    apiRequest<{ ok: boolean; user: TapstackUser }>('/auth/profile', {
      method: 'POST',
      body: profile,
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<{ ok: boolean; token: string; user: TapstackUser }>('/auth/password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    }),

  logout: async () => {
    try {
      const token = getToken()
      if (token && !token.startsWith('demo:')) {
        await apiRequest('/auth/logout', { method: 'POST' })
      }
    } finally {
      clearSession()
    }
  },

  customerDashboard: () => apiRequest<CustomerDashboard>('/customer/dashboard'),
  customerVendors: () =>
    apiRequest<{ vendors: ApiVendor[]; linkedOnly?: boolean; linkedCount?: number }>(
      '/customer/my-vendors',
    ).catch(() =>
      // Fallback for older plugin builds that only expose /customer/vendors.
      apiRequest<{ vendors: ApiVendor[]; linkedOnly?: boolean; linkedCount?: number }>(
        '/customer/vendors',
      ),
    ),
  linkVendor: (inviteCode: string) =>
    apiRequest<{
      ok: boolean
      vendor: ApiVendor
      vendors?: ApiVendor[]
      linkedOnly?: boolean
      linkedCount?: number
    }>('/customer/vendors/link', {
      method: 'POST',
      body: {
        vendorCode: inviteCode.trim(),
        inviteCode: inviteCode.trim(),
        code: inviteCode.trim(),
      },
    }),
  unlinkVendor: (vendorId: number | string) =>
    apiRequest<{
      ok: boolean
      vendors: ApiVendor[]
      linkedOnly?: boolean
      linkedCount?: number
    }>('/customer/vendors/unlink', {
      method: 'POST',
      body: { vendorId: Number(vendorId), id: Number(vendorId) },
    }),
  customerVendor: (vendorId: number | string) =>
    apiRequest<{ vendor: ApiVendor }>(`/customer/vendors/${vendorId}`),
  customerActivity: () => apiRequest<{ activity: unknown[] }>('/customer/activity'),
  customerWallet: () =>
    apiRequest<{
      wallet: { id: number; balance: number; formatted: string; points: number; currency: string }
      recentTx: WalletTxn[]
    }>('/customer/wallet'),
  customerWalletTransactions: (beforeId?: number) =>
    apiRequest<{ transactions: WalletTxn[]; nextBeforeId: number | null }>(
      `/customer/wallet/transactions?limit=30${beforeId ? `&beforeId=${beforeId}` : ''}`,
    ),
  customerWalletSend: (recipient: string, amount: number) =>
    apiRequest<{ ok: boolean; wallet: { balance: number; points: number } }>('/customer/wallet/send', {
      method: 'POST',
      body: { recipient, amount },
    }),
  customerPromos: () =>
    apiRequest<{ promos: PlayerPromo[] }>('/customer/promos'),
  customerPromoActivate: (id: number | string) =>
    apiRequest<{ ok: boolean; promo: PlayerPromo }>(`/customer/promos/${id}/activate`, {
      method: 'POST',
    }),
  customerPromoClaim: (id: number | string) =>
    apiRequest<{
      ok: boolean
      promo: PlayerPromo
      wallet?: { balance: number; formatted?: string; points: number }
    }>(`/customer/promos/${id}/claim`, { method: 'POST' }),
  customerGiveaway: () => apiRequest<GiveawayState>('/customer/giveaway'),
  customerWatchAd: () =>
    apiRequest<{
      ok: boolean
      chipsEarned: number
      newTickets: GiveawayTicket[]
      ticketsConverted: number
      giveaway: GiveawayState
    }>('/customer/tickets/watch-ad', { method: 'POST' }),
  customerEarn: () => apiRequest<EarnState>('/customer/earn'),
  customerEarnSpin: () =>
    apiRequest<{
      ok: boolean
      pointsWon: number
      segmentIndex: number
      spinsRemaining: number
      wallet: { balance: number; points: number; formatted?: string }
      earn: EarnState
    }>('/customer/earn/spin', { method: 'POST' }),
  customerEarnClaimMission: (id: string) =>
    apiRequest<{
      ok: boolean
      reward: number
      wallet: { balance: number; points: number; formatted?: string }
      earn: EarnState
    }>(`/customer/earn/missions/${encodeURIComponent(id)}/claim`, { method: 'POST' }),
  customerEarnClaimDeposit: (step: number) =>
    apiRequest<{
      ok: boolean
      reward: number
      wallet: { balance: number; points: number; formatted?: string }
      earn: EarnState
    }>(`/customer/earn/deposits/${step}/claim`, { method: 'POST' }),
  customerRedeemPoints: (points: number) =>
    apiRequest<{
      ok: boolean
      wallet: { balance: number; points: number; formatted?: string }
    }>('/customer/wallet/redeem-points', {
      method: 'POST',
      body: { points },
    }),

  vendorDashboard: () =>
    apiRequest<{
      store?: { id?: number; name?: string; initials?: string; inviteCode?: string; code?: string }
      wallet?: { balance?: string; amount?: number; currency?: string }
      monthlyVolume?: {
        current?: number
        target?: number
        cashbackUnlockRemaining?: number
        progressPct?: number
        currentFormatted?: string
        targetFormatted?: string
        remainingFormatted?: string
      }
      today?: {
        deposits?: number
        depositsFormatted?: string
        depositsChangePct?: number
        redeems?: number
        redeemsFormatted?: string
        redeemsChangePct?: number
        net?: number
        netFormatted?: string
        customers?: number
        customersNewWeek?: number
      }
      recentTx?: Array<{
        id?: number
        name: string
        meta: string
        amount: string
        tone?: string
        rawAmount?: number
      }>
    }>('/vendor/dashboard'),
  vendorWallet: () =>
    apiRequest<{
      wallet: { id: number; balance: number; formatted: string; points: number; currency: string }
      recentTx: WalletTxn[]
    }>('/vendor/wallet'),
  vendorWalletTransactions: (beforeId?: number) =>
    apiRequest<{ transactions: WalletTxn[]; nextBeforeId: number | null }>(
      `/vendor/wallet/transactions?limit=30${beforeId ? `&beforeId=${beforeId}` : ''}`,
    ),
  vendorOrders: () =>
    apiRequest<{
      manualLoads: VendorOrderItem[]
      autoLoads: VendorOrderItem[]
      loads?: VendorOrderItem[]
      redeems: VendorOrderItem[]
      history: VendorOrderItem[]
      pendingTotal: string
    }>('/vendor/orders'),
  vendorOrderDetail: (id: number | string) =>
    apiRequest<{
      ok: boolean
      order: VendorOrderItem
      customer: VendorCustomer
      accounts: VendorGameAccount[]
      orders: VendorOrderItem[]
    }>(`/vendor/orders/${id}`),
  vendorOrderApprove: (id: number | string) =>
    apiRequest<{ ok: boolean; status: string }>('/vendor/orders/' + id + '/approve', { method: 'POST' }),
  vendorOrderReject: (id: number | string) =>
    apiRequest<{ ok: boolean; status: string }>('/vendor/orders/' + id + '/reject', { method: 'POST' }),
  vendorCustomers: (search = '') =>
    apiRequest<{
      ok: boolean
      vendorId: number
      inviteCode: string
      total: number
      customers: VendorCustomer[]
    }>(`/vendor/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  vendorCustomerDetail: (playerId: string | number) =>
    apiRequest<{
      ok: boolean
      customer: VendorCustomer & {
        phone?: string
        email?: string
        netAmount?: string
        inValue?: number
        outValue?: number
        netValue?: number
      }
      accounts: VendorGameAccount[]
      orders: VendorOrderItem[]
    }>(`/vendor/customers/${playerId}`),
  vendorAnalytics: (range = '7d') =>
    apiRequest<{
      ok?: boolean
      range?: string
      financial?: {
        periodLabel?: string
        breakdownTitle?: string
        netProfit?: string
        deposits?: string
        redeems?: string
        platformFees?: string
        distributorCut?: string
      }
      daily?: Array<{
        day: string
        inAmount: number
        outAmount: number
        netProfit: number
        netLabel: string
      }>
      games?: Array<{
        id: string
        title: string
        players: number
        inAmount: string
        outAmount: string
        netAmount: string
      }>
      customers?: VendorCustomer[]
    }>(`/vendor/analytics?range=${encodeURIComponent(range)}`),
  vendorGameAnalytics: (gameKey: string, range = '7d') =>
    apiRequest<{
      ok?: boolean
      range?: string
      periodLabel?: string
      vendorId?: number
      game: {
        id: string
        title: string
        players: number
        inAmount: string
        outAmount: string
        netAmount: string
      }
      transactions: Array<
        VendorOrderItem & {
          direction?: 'in' | 'out'
          directionLabel?: string
        }
      >
    }>(
      `/vendor/analytics?range=${encodeURIComponent(range)}&gameKey=${encodeURIComponent(gameKey)}`,
    ),
  vendorPromos: () =>
    apiRequest<{ promotions: VendorPromotion[] }>('/vendor/promos'),
  vendorPromoCreate: (payload: {
    title: string
    type: string
    summary?: string
    minAmount: number
    rewardValue: number
    startDate?: string
    startTime?: string
    endDate?: string
    endTime?: string
    limitPerPlayer?: number
    limitPerDay?: number
    limitTotal?: number
    playerTags?: string[]
  }) =>
    apiRequest<{ ok: boolean; promotion: VendorPromotion }>('/vendor/promos', {
      method: 'POST',
      body: payload,
    }),
  vendorPromoUpdate: (
    id: string,
    payload: {
      title: string
      type: string
      summary?: string
      minAmount: number
      rewardValue: number
      startDate?: string
      startTime?: string
      endDate?: string
      endTime?: string
      limitPerPlayer?: number
      limitPerDay?: number
      limitTotal?: number
      playerTags?: string[]
    },
  ) =>
    apiRequest<{ ok: boolean; promotion: VendorPromotion }>(`/vendor/promos/${id}`, {
      method: 'POST',
      body: payload,
    }),
  vendorPromoSetStatus: (id: string, status: 'active' | 'paused') =>
    apiRequest<{ ok: boolean; promotion: VendorPromotion }>(`/vendor/promos/${id}/status`, {
      method: 'POST',
      body: { status },
    }),
  vendorPromoDelete: (id: string) =>
    apiRequest<{ ok: boolean }>(`/vendor/promos/${id}`, {
      method: 'DELETE',
    }),
  vendorCoupons: () =>
    apiRequest<{ coupons: VendorCoupon[] }>('/vendor/coupons'),
  vendorCouponCreate: (payload: {
    code: string
    bonusType: string
    bonusValue: number
    useLimit?: number | string
    maxRedemptions?: number
    startDate?: string
    startTime?: string
    endDate?: string
    endTime?: string
  }) =>
    apiRequest<{ ok: boolean; coupon: VendorCoupon }>('/vendor/coupons', {
      method: 'POST',
      body: payload,
    }),
  vendorCouponSetStatus: (id: string, status: 'active' | 'paused') =>
    apiRequest<{ ok: boolean; coupon: VendorCoupon }>(`/vendor/coupons/${id}/status`, {
      method: 'POST',
      body: { status },
    }),
  vendorCouponDelete: (id: string) =>
    apiRequest<{ ok: boolean }>(`/vendor/coupons/${id}`, {
      method: 'DELETE',
    }),
  vendorEmailBlasts: () =>
    apiRequest<{
      ok?: boolean
      availability: EmailBlastAvailability
      segments: EmailBlastSegment[]
      recent: EmailBlastItem[]
    }>('/vendor/email-blasts'),
  vendorEmailBlastPreview: (payload: {
    segment: string
    filters?: {
      field?: string
      operator?: string
      value?: number | string
      window?: string
    }
  }) =>
    apiRequest<{
      ok?: boolean
      count: number
      segment: string
      segmentLabel: string
      sample: Array<{ id: string; name: string; email: string }>
    }>('/vendor/email-blasts/preview', {
      method: 'POST',
      body: payload,
    }),
  vendorEmailBlastInterpret: (prompt: string) =>
    apiRequest<{
      ok?: boolean
      segment: string
      segmentLabel: string
      count: number
      sample: Array<{ id: string; name: string; email: string }>
    }>('/vendor/email-blasts/interpret', {
      method: 'POST',
      body: { prompt },
    }),
  vendorEmailBlastSend: (payload: {
    subject: string
    message: string
    segment: string
    filters?: Record<string, unknown>
  }) =>
    apiRequest<{
      ok: boolean
      sentCount: number
      failedCount: number
      recipientCount: number
      blast: EmailBlastItem
      availability: EmailBlastAvailability
    }>('/vendor/email-blasts', {
      method: 'POST',
      body: payload,
    }),
  vendorCustomerSetTags: (playerId: string | number, tags: string[]) =>
    apiRequest<{
      ok: boolean
      playerId: string
      tags: string[]
      tagLabels: string[]
    }>(`/vendor/customers/${playerId}/tags`, {
      method: 'POST',
      body: { tags },
    }),
  vendorSettings: () =>
    apiRequest<{
      profile?: {
        username?: string
        inviteCode?: string
        code?: string
        playerLink?: string
        businessName?: string
        email?: string
        phone?: string
        address?: string
        initials?: string
        vendorId?: number
        emailAlerts?: boolean
        smsAlerts?: boolean
        withdrawalAlerts?: boolean
        accentColor?: string
        venueTagline?: string
        bannerId?: number
        bannerUrl?: string
        bannerName?: string
      }
      games?: Record<string, unknown>
      gameCatalog?: VendorGameRecord[]
    }>('/vendor/settings'),
  saveVendorSettings: (payload: Record<string, unknown>) =>
    apiRequest<{
      ok: boolean
      profile?: Record<string, unknown>
      settings?: Record<string, unknown>
    }>('/vendor/settings', {
      method: 'PUT',
      body: payload,
    }),
  uploadVendorBanner: async (file: File) => {
    const base = getApiBase()
    const token = getToken()
    const body = new FormData()
    body.append('file', file)
    const qs =
      token && !token.startsWith('demo:')
        ? `?access_token=${encodeURIComponent(token)}`
        : ''
    const res = await fetch(`${base}/vendor/profile/banner${qs}`, {
      method: 'POST',
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
            'X-TapStack-Token': token,
            Accept: 'application/json',
          }
        : { Accept: 'application/json' },
      body,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new ApiError(
        (data as { message?: string }).message || `Upload failed (${res.status})`,
        res.status,
        (data as { code?: string }).code,
      )
    }
    return data as { ok: boolean; bannerId: number; bannerUrl: string; bannerName: string }
  },
  vendorGames: () =>
    apiRequest<{
      vendorId?: number
      games: VendorGameRecord[]
      platforms: Record<string, string>
      automationAvailable: boolean
    }>('/vendor/games'),
  saveVendorGames: (games: VendorGameRecord[]) =>
    apiRequest<{ ok: boolean; games: VendorGameRecord[]; vendorId?: number }>('/vendor/games', {
      method: 'PUT',
      body: { games },
    }),

  customerVendorGames: (vendorId: number | string) =>
    apiRequest<{ games: Array<VendorGameRecord & { connected?: boolean; playerMobileId?: string | null }> }>(
      `/customer/vendors/${vendorId}/games`,
    ),
  connectVendorGame: (
    vendorId: number | string,
    gameKey: string,
    payload: { mobileId: string; password: string },
  ) =>
    apiRequest<{ ok: boolean; connection: { gameKey: string; mobileId: string; connected: boolean } }>(
      `/customer/vendors/${vendorId}/games/${encodeURIComponent(gameKey)}/connect`,
      { method: 'POST', body: payload },
    ),
  createVendorGameAccount: (
    vendorId: number | string,
    gameKey: string,
    payload: {
      firstName?: string
      lastName?: string
      phone?: string
      account?: string
      password?: string
    } = {},
  ) =>
    apiRequest<{
      ok: boolean
      generated: boolean
      credentials: { mobileId: string; password: string; account: string }
      connection: { gameKey: string; mobileId: string; connected: boolean; platform?: string }
    }>(`/customer/vendors/${vendorId}/games/${encodeURIComponent(gameKey)}/create`, {
      method: 'POST',
      body: payload,
    }),
  disconnectVendorGame: (vendorId: number | string, gameKey: string) =>
    apiRequest<{ ok: boolean }>(
      `/customer/vendors/${vendorId}/games/${encodeURIComponent(gameKey)}/disconnect`,
      { method: 'POST' },
    ),
  vendorGameBalance: (vendorId: number | string, gameKey: string) =>
    apiRequest<{
      ok: boolean
      connected: boolean
      live: boolean
      gameKey?: string
      formatted: string
      amount: number | null
    }>(`/customer/vendors/${vendorId}/games/${encodeURIComponent(gameKey)}/balance`),
  vendorGameCredentials: (vendorId: number | string, gameKey: string) =>
    apiRequest<{
      ok: boolean
      connected: boolean
      gameKey: string
      platform?: string
      credentials: {
        mobileId: string
        account: string
        password: string
        hasPassword: boolean
      }
    }>(`/customer/vendors/${vendorId}/games/${encodeURIComponent(gameKey)}/credentials`),
  createVendorLoad: (
    vendorId: number | string,
    payload: { gameKey: string; amount: number; mobileId?: string; note?: string },
  ) =>
    apiRequest<{
      ok: boolean
      id: number
      status: string
      auto: boolean
      wallet?: { id: number; balance: number; formatted: string; points: number; currency: string }
    }>(`/customer/vendors/${vendorId}/loads`, { method: 'POST', body: payload }),
  createVendorRedeem: (
    vendorId: number | string,
    payload: { gameKey: string; amount: number; mobileId?: string; note?: string },
  ) =>
    apiRequest<{
      ok: boolean
      id: number
      status: string
      auto: boolean
      wallet?: { id: number; balance: number; formatted: string; points: number; currency: string }
    }>(`/customer/vendors/${vendorId}/redeems`, { method: 'POST', body: payload }),
  customerVendorOrders: (vendorId: number | string) =>
    apiRequest<{
      ok: boolean
      pending: VendorOrderItem[]
      pendingCount: number
      orders: VendorOrderItem[]
    }>(`/customer/vendors/${vendorId}/orders`),

  adminOverview: (range = 'today') =>
    apiRequest<AdminOverview>(`/admin/overview?range=${encodeURIComponent(range)}`),
  adminVendors: (search = '') =>
    apiRequest<{ vendors: AdminVendor[]; summary?: AdminVendorSummary }>(
      `/admin/vendors${search ? `?search=${encodeURIComponent(search)}` : ''}`,
    ),
  adminCreateVendor: (payload: {
    name: string
    email: string
    phone?: string
    address?: string
    contactName?: string
    status?: 'active' | 'pending' | 'suspended'
    password?: string
    distributorId?: string | number | null
  }) =>
    apiRequest<{
      ok: boolean
      vendor: {
        id: string
        name: string
        email: string
        phone?: string
        status: string
        code?: string
        distributor?: string
      }
      login: { email: string; temporaryPassword: string }
    }>('/admin/vendors', { method: 'POST', body: payload }),
  adminVendorDetail: (id: string | number) =>
    apiRequest<AdminVendorDetail>(`/admin/vendors/${id}`),
  adminVendorUpdateStatus: (
    id: string | number,
    status: 'active' | 'pending' | 'suspended' | 'deactivated',
  ) =>
    apiRequest<{ ok: boolean; id: string; status: string }>(`/admin/vendors/${id}`, {
      method: 'PATCH',
      body: { status },
    }),
  adminDistributors: () => apiRequest<{ distributors: AdminDistributor[] }>('/admin/distributors'),
  adminDistributorDetail: (id: string | number) =>
    apiRequest<AdminDistributorDetail>(`/admin/distributors/${id}`),
  adminCustomerDetail: (id: string | number) =>
    apiRequest<AdminCustomerDetail>(`/admin/customers/${id}`),
  adminSignups: (status = 'all') =>
    apiRequest<{ signups: AdminSignup[]; pendingCount?: number }>(
      `/admin/signups?status=${encodeURIComponent(status)}`,
    ),
  adminSignupUpdate: (id: string | number, status: 'pending' | 'approved' | 'rejected') =>
    apiRequest<{ ok: boolean; id: number; status: string }>(`/admin/signups/${id}`, {
      method: 'PATCH',
      body: { status },
    }),
  adminFinance: (range = '30d') =>
    apiRequest<AdminFinance>(`/admin/finance?range=${encodeURIComponent(range)}`),
  adminFinanceUpdateFees: (fees: Partial<AdminFees>) =>
    apiRequest<{ ok: boolean; fees: AdminFees }>('/admin/finance/fees', {
      method: 'PUT',
      body: fees,
    }),
  adminFinanceTransfer: (payload: {
    recipient: string
    amount: number
    memo: string
    recipientType?: string
  }) =>
    apiRequest<{ ok: boolean; recipient?: string; amount?: number; reserveWallet?: string }>(
      '/admin/finance/transfer',
      { method: 'POST', body: payload },
    ),
  adminSettings: () => apiRequest<AdminSettings>('/admin/settings'),
  adminSettingsUpdate: (payload: { account?: Partial<AdminSettings['account']> }) =>
    apiRequest<{ ok: boolean }>('/admin/settings', { method: 'PUT', body: payload }),

  distributorDashboard: () => apiRequest<Record<string, unknown>>('/distributor/dashboard'),
  distributorVendors: () => apiRequest<{ vendors: unknown[] }>('/distributor/vendors'),
  distributorAnalytics: () => apiRequest<Record<string, unknown>>('/distributor/analytics'),
  distributorInvoices: () => apiRequest<{ invoices: unknown[] }>('/distributor/invoices'),

  apply: (payload: Record<string, unknown>) =>
    apiRequest<{ ok: boolean; id: number }>('/apply', {
      method: 'POST',
      body: payload,
      auth: false,
    }),

  wertConfig: () => apiRequest('/payments/wert/config', { auth: false }),
  wertSession: (amount: number, ownerType?: string) =>
    apiRequest('/payments/wert/session', {
      method: 'POST',
      body: { amount, ownerType },
    }),
}

export type VendorGameRecord = {
  id: string
  title: string
  icon?: string
  category?: string
  mode: 'auto' | 'manual'
  platform?: string
  enabled?: boolean
  statusBadge?: string
  badge?: string
  linked?: boolean
  connected?: boolean
  playerMobileId?: string | null
  balance?: string | null
  credentials?: {
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
}

export type TapstackUser = {
  id: number
  email: string
  displayName: string
  firstName?: string
  lastName?: string
  role: 'player' | 'vendor' | 'distributor' | 'admin'
  phone?: string
  username?: string
  level?: number
  tier?: TicketTier
  vendorId?: number | null
  distributorId?: number | null
}

export type ApiVendor = {
  id: number
  initials: string
  name: string
  handle: string
  color: string
  text: string
  code: string
  bannerUrl?: string
  bannerId?: number
  accentColor?: string
  accentSolid?: string
  tagline?: string
  games: Array<{
    id?: string
    name: string
    icon: string
    iconBg: string
    active: boolean
    mode: 'auto' | 'manual'
    balance: string
    platform?: string
    connected?: boolean
  }>
}

export type CustomerDashboard = {
  user: TapstackUser
  wallet: { cashBalance: string; balance: number; points: number }
  recentTx?: WalletTxn[]
  level: number
  levelProgressPct: number
}

export function isApiConfigured(): boolean {
  return Boolean(import.meta.env.VITE_WP_API_URL)
}
