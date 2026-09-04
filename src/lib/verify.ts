import { ApiError, type TapstackUser } from '../api/client'

export const VERIFY_RETURN_KEY = 'tapstack_verify_return'

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

export function needsVerification(state: VerificationState): boolean {
  return verificationApplies(state) && !state.canSpend
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

export function statusLabel(status: VerificationStatus): string {
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
