/**
 * TapStack API client for the WordPress plugin (`/wp-json/tapstack/v1`).
 *
 * Set VITE_WP_API_URL in `.env` to your WordPress origin, e.g. http://localhost:8080
 */

const TOKEN_KEY = 'tapstack_token'
const ROLE_KEY = 'tapstack_role'
const USER_KEY = 'tapstack_user'

export type SessionRole = 'player' | 'vendor' | 'distributor' | 'admin'

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
  setToken(input.token)
  localStorage.setItem(ROLE_KEY, input.role)
  if (input.user) localStorage.setItem(USER_KEY, JSON.stringify(input.user))
  else localStorage.removeItem(USER_KEY)
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
  }

  const res = await fetch(`${getApiBase()}${path}`, {
    method: options.method || 'GET',
    headers,
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

  requestOtp: (phone: string, intent: 'login' | 'signup' = 'login') =>
    apiRequest<{ ok: boolean; phone: string; demoCode?: string; intent?: string }>('/auth/otp/request', {
      method: 'POST',
      body: { phone, intent },
      auth: false,
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

  portalLogin: (email: string, password: string, type: 'vendor' | 'distributor' | 'admin') =>
    apiRequest<{ token: string; user: TapstackUser }>('/auth/login', {
      method: 'POST',
      body: { email, password, type },
      auth: false,
    }),

  me: () =>
    apiRequest<{ user: TapstackUser; level?: number; levelProgressPct?: number }>('/auth/me'),

  updateProfile: (profile: { fullName?: string; email?: string; phone?: string }) =>
    apiRequest<{ ok: boolean; user: TapstackUser }>('/auth/profile', {
      method: 'POST',
      body: profile,
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
      '/customer/vendors',
    ),
  linkVendor: (vendorName: string) =>
    apiRequest<{ ok: boolean; vendor: ApiVendor }>('/customer/vendors/link', {
      method: 'POST',
      body: { vendorName: vendorName.trim(), name: vendorName.trim(), vendorCode: vendorName.trim() },
    }),
  customerActivity: () => apiRequest<{ activity: unknown[] }>('/customer/activity'),
  customerPromos: () => apiRequest<{ promos: unknown[] }>('/customer/promos'),
  customerGiveaway: () => apiRequest<Record<string, unknown>>('/customer/giveaway'),
  customerEarn: () => apiRequest<Record<string, unknown>>('/customer/earn'),

  vendorDashboard: () => apiRequest<Record<string, unknown>>('/vendor/dashboard'),
  vendorOrders: () => apiRequest<Record<string, unknown>>('/vendor/orders'),
  vendorAnalytics: () => apiRequest<Record<string, unknown>>('/vendor/analytics'),
  vendorPromos: () => apiRequest<Record<string, unknown>>('/vendor/promos'),
  vendorSettings: () => apiRequest<Record<string, unknown>>('/vendor/settings'),

  adminOverview: () => apiRequest<Record<string, unknown>>('/admin/overview'),
  adminVendors: (search = '') =>
    apiRequest<{ vendors: unknown[] }>(`/admin/vendors${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  adminDistributors: () => apiRequest<{ distributors: unknown[] }>('/admin/distributors'),
  adminSignups: (status = 'all') =>
    apiRequest<{ signups: unknown[] }>(`/admin/signups?status=${encodeURIComponent(status)}`),
  adminFinance: () => apiRequest<Record<string, unknown>>('/admin/finance'),

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
  games: Array<{
    name: string
    icon: string
    iconBg: string
    active: boolean
    mode: 'auto' | 'manual'
    balance: string
  }>
}

export type CustomerDashboard = {
  user: TapstackUser
  wallet: { cashBalance: string; balance: number; points: number }
  level: number
  levelProgressPct: number
}

export function isApiConfigured(): boolean {
  return Boolean(import.meta.env.VITE_WP_API_URL)
}
