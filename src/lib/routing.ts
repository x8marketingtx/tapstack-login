/** Lightweight path router — keeps URLs in sync and supports deep links. */

export type AppPortal = 'login' | 'otp' | 'signup' | 'apply' | 'terms' | 'privacy' | 'returns'
export type DashboardPortal = 'customer' | 'vendor' | 'admin' | 'distributor'

export type CustomerTab = 'games' | 'earn' | 'giveaway' | 'promos' | 'account'
export type VendorTab = 'home' | 'orders' | 'analytics' | 'promos' | 'settings'
export type AdminTab = 'overview' | 'vendors' | 'distributors' | 'signups' | 'finance' | 'settings'
export type DistributorTab = 'home' | 'vendors' | 'analytics' | 'invoices' | 'settings'

export type RouteState =
  | { portal: 'login' }
  | { portal: 'otp' }
  | { portal: 'signup' }
  | { portal: 'apply' }
  | { portal: 'terms' | 'privacy' | 'returns' }
  | { portal: 'customer'; tab: CustomerTab; vendorId?: string; profile?: boolean }
  | { portal: 'vendor'; tab: VendorTab; profile?: boolean }
  | { portal: 'admin'; tab: AdminTab }
  | { portal: 'distributor'; tab: DistributorTab }

const CUSTOMER_TABS = new Set<CustomerTab>(['games', 'earn', 'giveaway', 'promos', 'account'])
const VENDOR_TABS = new Set<VendorTab>(['home', 'orders', 'analytics', 'promos', 'settings'])
const ADMIN_TABS = new Set<AdminTab>(['overview', 'vendors', 'distributors', 'signups', 'finance', 'settings'])
const DISTRIBUTOR_TABS = new Set<DistributorTab>(['home', 'vendors', 'analytics', 'invoices', 'settings'])

function cleanPath(pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || '/'
  return path.startsWith('/') ? path : `/${path}`
}

/** Migrate legacy `#customer` / `#vendor` hashes into path URLs once. */
export function migrateLegacyHash(): void {
  const hash = window.location.hash.replace(/^#/, '').trim()
  if (!hash) return

  const map: Record<string, string> = {
    customer: '/customer',
    vendor: '/vendor',
    admin: '/admin',
    distributor: '/distributor',
    signup: '/signup',
    'player-signup': '/signup',
    apply: '/apply',
    terms: '/terms',
    privacy: '/privacy',
    returns: '/returns',
    'return-policy': '/returns',
  }

  const next = map[hash]
  if (next) {
    window.history.replaceState(null, '', next)
  }
}

export function parseLocation(pathname = window.location.pathname, hash = window.location.hash): RouteState {
  // Prefer path; fall back to legacy hash if path is still `/`.
  let path = cleanPath(pathname)
  if (path === '/' && hash) {
    const h = hash.replace(/^#/, '')
    if (h === 'customer') path = '/customer'
    else if (h === 'vendor') path = '/vendor'
    else if (h === 'admin') path = '/admin'
    else if (h === 'distributor') path = '/distributor'
    else if (h === 'signup' || h === 'player-signup') path = '/signup'
    else if (h === 'apply') path = '/apply'
    else if (h === 'terms') path = '/terms'
    else if (h === 'privacy') path = '/privacy'
    else if (h === 'returns' || h === 'return-policy') path = '/returns'
  }

  const parts = path.split('/').filter(Boolean)
  const root = parts[0] || ''

  if (root === 'terms') return { portal: 'terms' }
  if (root === 'privacy') return { portal: 'privacy' }
  if (root === 'returns' || root === 'return-policy') return { portal: 'returns' }
  if (root === 'signup' || root === 'player-signup') return { portal: 'signup' }
  if (root === 'apply') return { portal: 'apply' }
  if (root === 'otp') return { portal: 'otp' }

  if (root === 'customer') {
    if (parts[1] === 'profile') return { portal: 'customer', tab: 'games', profile: true }
    if (parts[1] === 'vendors' && parts[2]) {
      return { portal: 'customer', tab: 'games', vendorId: decodeURIComponent(parts[2]) }
    }
    const tab = (parts[1] || 'games') as CustomerTab
    const resolved = CUSTOMER_TABS.has(tab) ? tab : 'games'
    return { portal: 'customer', tab: resolved }
  }

  if (root === 'vendor') {
    if (parts[1] === 'profile') return { portal: 'vendor', tab: 'home', profile: true }
    const tab = (parts[1] || 'home') as VendorTab
    return { portal: 'vendor', tab: VENDOR_TABS.has(tab) ? tab : 'home' }
  }

  if (root === 'admin') {
    const tab = (parts[1] || 'overview') as AdminTab
    return { portal: 'admin', tab: ADMIN_TABS.has(tab) ? tab : 'overview' }
  }

  if (root === 'distributor') {
    const tab = (parts[1] || 'home') as DistributorTab
    return { portal: 'distributor', tab: DISTRIBUTOR_TABS.has(tab) ? tab : 'home' }
  }

  return { portal: 'login' }
}

export function pathForRoute(route: RouteState): string {
  switch (route.portal) {
    case 'login':
      return '/'
    case 'otp':
      return '/otp'
    case 'signup':
      return '/signup'
    case 'apply':
      return '/apply'
    case 'terms':
    case 'privacy':
    case 'returns':
      return `/${route.portal}`
    case 'customer': {
      if (route.profile) return '/customer/profile'
      if (route.vendorId) return `/customer/vendors/${encodeURIComponent(route.vendorId)}`
      if (route.tab === 'games') return '/customer'
      return `/customer/${route.tab}`
    }
    case 'vendor': {
      if (route.profile) return '/vendor/profile'
      if (route.tab === 'home') return '/vendor'
      return `/vendor/${route.tab}`
    }
    case 'admin': {
      if (route.tab === 'overview') return '/admin'
      return `/admin/${route.tab}`
    }
    case 'distributor': {
      if (route.tab === 'home') return '/distributor'
      return `/distributor/${route.tab}`
    }
    default:
      return '/'
  }
}

const TITLE_BRAND = 'TapStack'

export type DocumentTitleOptions = {
  vendorName?: string
}

/** Browser tab / meta title for the current route. */
export function titleForRoute(route: RouteState, opts: DocumentTitleOptions = {}): string {
  switch (route.portal) {
    case 'login':
      return `Log In · ${TITLE_BRAND}`
    case 'otp':
      return `Verify Code · ${TITLE_BRAND}`
    case 'signup':
      return `Sign Up · ${TITLE_BRAND}`
    case 'apply':
      return `Apply · ${TITLE_BRAND}`
    case 'terms':
      return `Terms of Service · ${TITLE_BRAND}`
    case 'privacy':
      return `Privacy Policy · ${TITLE_BRAND}`
    case 'returns':
      return `Return Policy · ${TITLE_BRAND}`
    case 'customer': {
      if (route.profile) return `Profile · Player · ${TITLE_BRAND}`
      if (route.vendorId) {
        const name = opts.vendorName?.trim()
        return name ? `${name} · Player · ${TITLE_BRAND}` : `Vendor · Player · ${TITLE_BRAND}`
      }
      switch (route.tab) {
        case 'games':
          return `Games · Player · ${TITLE_BRAND}`
        case 'earn':
          return `Earn · Player · ${TITLE_BRAND}`
        case 'giveaway':
          return `Tickets · Player · ${TITLE_BRAND}`
        case 'promos':
          return `Promos · Player · ${TITLE_BRAND}`
        case 'account':
          return `Account · Player · ${TITLE_BRAND}`
        default:
          return `Player · ${TITLE_BRAND}`
      }
    }
    case 'vendor': {
      if (route.profile) return `Profile · Vendor · ${TITLE_BRAND}`
      switch (route.tab) {
        case 'home':
          return `Home · Vendor · ${TITLE_BRAND}`
        case 'orders':
          return `Orders · Vendor · ${TITLE_BRAND}`
        case 'analytics':
          return `Analytics · Vendor · ${TITLE_BRAND}`
        case 'promos':
          return `Promos · Vendor · ${TITLE_BRAND}`
        case 'settings':
          return `Settings · Vendor · ${TITLE_BRAND}`
        default:
          return `Vendor · ${TITLE_BRAND}`
      }
    }
    case 'admin': {
      switch (route.tab) {
        case 'overview':
          return `Overview · Admin · ${TITLE_BRAND}`
        case 'vendors':
          return `Vendors · Admin · ${TITLE_BRAND}`
        case 'distributors':
          return `Distributors · Admin · ${TITLE_BRAND}`
        case 'signups':
          return `Signups · Admin · ${TITLE_BRAND}`
        case 'finance':
          return `Finance · Admin · ${TITLE_BRAND}`
        case 'settings':
          return `Settings · Admin · ${TITLE_BRAND}`
        default:
          return `Admin · ${TITLE_BRAND}`
      }
    }
    case 'distributor': {
      switch (route.tab) {
        case 'home':
          return `Home · Distributor · ${TITLE_BRAND}`
        case 'vendors':
          return `Vendors · Distributor · ${TITLE_BRAND}`
        case 'analytics':
          return `Analytics · Distributor · ${TITLE_BRAND}`
        case 'invoices':
          return `Invoices · Distributor · ${TITLE_BRAND}`
        case 'settings':
          return `Settings · Distributor · ${TITLE_BRAND}`
        default:
          return `Distributor · ${TITLE_BRAND}`
      }
    }
    default:
      return TITLE_BRAND
  }
}

export function applyDocumentTitle(route: RouteState, opts: DocumentTitleOptions = {}): void {
  document.title = titleForRoute(route, opts)
}

export function navigate(route: RouteState, mode: 'push' | 'replace' = 'push'): void {
  const next = pathForRoute(route)
  const current = cleanPath(window.location.pathname)
  applyDocumentTitle(route)
  if (current === cleanPath(next) && !window.location.hash) return
  if (mode === 'replace') {
    window.history.replaceState(null, '', next)
  } else {
    window.history.pushState(null, '', next)
  }
}

export function replaceUrl(route: RouteState): void {
  const next = pathForRoute(route)
  const current = `${cleanPath(window.location.pathname)}${window.location.hash}`
  applyDocumentTitle(route)
  if (current === next || cleanPath(window.location.pathname) === cleanPath(next)) {
    if (window.location.hash) {
      window.history.replaceState(null, '', next)
    }
    return
  }
  window.history.replaceState(null, '', next)
}

export function vendorPathId(vendor: { id?: number | string; code?: string; handle?: string }): string {
  if (vendor.id !== undefined && vendor.id !== null && vendor.id !== '') {
    return String(vendor.id)
  }
  if (vendor.code) return vendor.code
  if (vendor.handle) return vendor.handle
  return 'vendor'
}

export function matchVendorId(
  vendors: Array<{ id?: number | string; code?: string; handle?: string; name?: string }>,
  vendorId: string,
) {
  const needle = vendorId.toLowerCase()
  return (
    vendors.find((v) => String(v.id) === vendorId) ||
    vendors.find((v) => (v.code || '').toLowerCase() === needle) ||
    vendors.find((v) => (v.handle || '').toLowerCase() === needle) ||
    vendors.find((v) => (v.name || '').toLowerCase().replace(/\s+/g, '-') === needle) ||
    null
  )
}

export function matchVendorFromList<T extends { id?: number | string; code?: string; handle?: string; name?: string }>(
  vendors: T[],
  vendorId: string,
): T | null {
  return matchVendorId(vendors, vendorId) as T | null
}
