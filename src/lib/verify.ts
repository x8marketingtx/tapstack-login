import { ApiError, type TapstackUser } from '../api/client'

export const VERIFY_RETURN_KEY = 'tapstack_verify_return'
export const VERIFY_LINK_DAILY_LIMIT = 3

export type VerificationStatus =
  | 'disabled'
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'manual_review'
  | 'error'
  | 'block'

export type LocationStatus = 'unknown' | 'pending' | 'passed' | 'failed' | 'stale'

export type VerificationDocumentType = {
  id: string
  label: string
}

export type GeoBlockType =
  | 'vpn'
  | 'geolocation_state'
  | 'geolocation_country'
  | 'id_address'
  | 'billing_address'
  | 'location_verification'
  | string

export type VerificationState = {
  status: VerificationStatus
  identityVerified: boolean
  locationRequired: boolean
  locationStatus: LocationStatus
  locationLink?: string | null
  canSpend: boolean
  pluginReady: boolean
  blockedReason?: string | null
  geoBlocked?: boolean
  geoReason?: string | null
  geoType?: GeoBlockType | null
  verificationLink?: string | null
  documentTypes: VerificationDocumentType[]
  defaultDocumentType: string
  selfieRequired: boolean
  attemptsLeft?: number
  canRetry: boolean
  rateLimitReason?: string
  required: boolean
  message: string
}

const VERIFY_ERROR_CODES = new Set([
  'tapstack_verify_required',
  'tapstack_verify_pending',
  'tapstack_verify_review',
  'tapstack_verify_blocked',
  'tapstack_location_required',
  'tapstack_geo_blocked',
])

export function emptyVerification(overrides: Partial<VerificationState> = {}): VerificationState {
  return {
    status: 'disabled',
    identityVerified: false,
    locationRequired: false,
    locationStatus: 'unknown',
    locationLink: null,
    canSpend: true,
    pluginReady: false,
    blockedReason: null,
    geoBlocked: false,
    geoReason: null,
    geoType: null,
    verificationLink: null,
    documentTypes: [],
    defaultDocumentType: 'DriversLicense',
    selfieRequired: false,
    attemptsLeft: 0,
    canRetry: false,
    rateLimitReason: '',
    required: false,
    message: '',
    ...overrides,
  }
}

export function verificationFromUser(user?: TapstackUser | null): VerificationState {
  const raw = user?.verification
  if (!raw) return emptyVerification()
  return emptyVerification({
    status: raw.status || 'disabled',
    identityVerified: Boolean(raw.identityVerified),
    locationRequired: Boolean(raw.locationRequired),
    locationStatus: raw.locationStatus || 'unknown',
    canSpend: raw.canSpend !== false,
    pluginReady: Boolean(raw.pluginReady),
    required: typeof raw.required === 'boolean' ? raw.required : user.role === 'player',
    blockedReason: raw.blockedReason ?? null,
    geoBlocked: Boolean(raw.geoBlocked),
    geoReason: raw.geoReason ?? null,
    geoType: raw.geoType ?? null,
    message: raw.message || '',
  })
}

export function verificationEnabled(state: VerificationState): boolean {
  return state.pluginReady && state.status !== 'disabled'
}

/** This account's role is selected for KYC in TapStack settings. */
export function verificationApplies(state: VerificationState): boolean {
  return state.required !== false && verificationEnabled(state)
}

/** Money actions are locked until KYC and/or location rules pass. */
export function needsVerification(state: VerificationState): boolean {
  return state.pluginReady && !state.canSpend
}

export function isHardGeoBlock(state: VerificationState): boolean {
  if (!state.geoBlocked) return false
  return (
    state.geoType === 'id_address' ||
    state.geoType === 'billing_address' ||
    state.geoType === 'geolocation_state' ||
    state.geoType === 'geolocation_country'
  )
}

function geoBlockText(state: Pick<VerificationState, 'geoType' | 'geoReason' | 'message'>): string {
  return `${state.geoType || ''} ${state.geoReason || ''} ${state.message || ''}`.toLowerCase()
}

/** AssureLocate "distance / VPN usage" should use the same VPN page as IP VPN blocks. */
export function looksLikeVpnBlock(
  state: Pick<VerificationState, 'geoBlocked' | 'geoType' | 'geoReason' | 'message'>,
): boolean {
  if (!state.geoBlocked) return false
  if (state.geoType === 'vpn') return true
  return /vpn|proxy|\btor\b/.test(geoBlockText(state))
}

export function portalBlockType(
  state: Pick<VerificationState, 'geoBlocked' | 'geoType' | 'geoReason' | 'message'>,
): GeoBlockType | null {
  if (!state.geoBlocked) return null
  if (looksLikeVpnBlock(state)) return 'vpn'
  return state.geoType || 'location_verification'
}

/** Full-screen location lock instead of the identity stepper. */
export function isFullPageGeoBlock(state: VerificationState): boolean {
  if (!state.geoBlocked) return false
  const type = portalBlockType(state)
  return (
    type === 'vpn' ||
    type === 'location_verification' ||
    type === 'geolocation_country' ||
    type === 'geolocation_state'
  )
}

export function geoBlockTitle(state: VerificationState): string {
  switch (state.geoType) {
    case 'vpn':
      return 'VPN is not allowed'
    case 'geolocation_state':
      return 'This state is not allowed'
    case 'geolocation_country':
      return 'This country is not allowed'
    case 'id_address':
      return 'Your ID location is not allowed'
    case 'billing_address':
      return 'Your billing location is not allowed'
    case 'location_verification':
      return 'Location check did not pass'
    default:
      return 'Location not allowed'
  }
}

export function geoBlockHint(state: VerificationState): string {
  switch (state.geoType) {
    case 'vpn':
      return 'Turn off any VPN or proxy, then check again from your real connection.'
    case 'geolocation_state':
    case 'geolocation_country':
      return 'TapStack is not available from your current location.'
    case 'id_address':
      return 'The address on your ID is in a blocked area. Contact support if this looks wrong.'
    case 'billing_address':
      return 'The billing address on this account is in a blocked area. Contact support if this looks wrong.'
    case 'location_verification':
      return 'Confirm your location again from an allowed area, without a VPN.'
    default:
      return 'This location is not eligible for top-up, load, or redeem.'
  }
}

export function isVerifyApiError(err: unknown): boolean {
  return err instanceof ApiError && Boolean(err.code && VERIFY_ERROR_CODES.has(err.code))
}

export function rememberVerifyReturn(path = window.location.pathname): void {
  try {
    const isVerify =
      path === '/customer/verify' || path === '/vendor/verify' || path === '/distributor/verify'
    if (
      !isVerify &&
      (path.startsWith('/customer') || path.startsWith('/vendor') || path.startsWith('/distributor'))
    ) {
      sessionStorage.setItem(VERIFY_RETURN_KEY, path)
    }
  } catch {
    /* ignore */
  }
}

export function consumeVerifyReturn(): string | null {
  try {
    const value = sessionStorage.getItem(VERIFY_RETURN_KEY)
    if (value) sessionStorage.removeItem(VERIFY_RETURN_KEY)
    return value
  } catch {
    return null
  }
}

export function statusLabel(status: VerificationStatus, geoBlocked = false): string {
  if (geoBlocked) return 'Location blocked'
  switch (status) {
    case 'verified':
      return 'Verified'
    case 'pending':
      return 'In progress'
    case 'manual_review':
      return 'Under review'
    case 'error':
      return 'Unsuccessful'
    case 'block':
      return 'Blocked'
    case 'unverified':
      return 'Not verified'
    default:
      return 'Not required'
  }
}
