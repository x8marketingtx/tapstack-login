import { apiRequest, type SavedPaymentMethod, type VendorMembership } from './client'
import type { TopUpOwnerType } from './wert'

export type PaysioSessionResponse = {
  clickId: string
  sessionId: string
  slug: string
  url: string
  clientSecret: string
  publishableKey: string
  sandbox: boolean
  uiMode: 'embedded' | 'hosted'
  amount: number
  currency: string
  walletCurrency: string
}

export type PaysioChargeResponse = {
  ok?: boolean
  clickId: string
  chargeId?: string
  status?: string
  pending?: boolean
  wallet?: { balance: number; points: number; currency: string }
}

export type PaysioWalletPayment = {
  walletType?: string
  paysioWallet: Record<string, unknown>
  wallet?: Record<string, unknown>
  threeDS?: Record<string, unknown>
}

type CardInputsHandle = {
  unmount: () => void
}

type WalletElements = {
  mountWallets: (
    target: string | HTMLElement,
    opts: Record<string, unknown>,
  ) => void
  updateAmount: (amount: number) => void
  on: (event: string, fn: (data: PaysioWalletPayment) => unknown) => void
  unmount: () => void
}

type PaysioInstance = {
  mountCardInputs: (
    target:
      | string
      | HTMLElement
      | { cardNumber: string; cardExpiry: string; cardCvc?: string },
    opts?: Record<string, unknown>,
  ) => Promise<CardInputsHandle>
  createToken: (cardData?: {
    number?: string
    exp_month?: string
    exp_year?: string
    cvv?: string
  }) => Promise<{ token: string; card?: { last4?: string; brand?: string } }>
  threeDS: () => {
    authenticate: (opts: {
      amount: number
      token?: string
      paymentMethodId?: string
      email?: string
      iframeTarget?: string
    }) => Promise<Record<string, unknown>>
  }
  elements: () => WalletElements
  reset?: () => void
}

type PaysioGlobal = (key: string) => PaysioInstance

declare global {
  interface Window {
    Paysio?: PaysioGlobal
  }
}

let paysioScript: Promise<PaysioGlobal> | null = null
let paysioInstance: PaysioInstance | null = null
let paysioInstanceKey = ''

function loadPaysioJs(): Promise<PaysioGlobal> {
  if (window.Paysio) return Promise.resolve(window.Paysio)
  if (paysioScript) return paysioScript
  paysioScript = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-paysio-sdk]')
    if (existing && window.Paysio) {
      resolve(window.Paysio)
      return
    }
    const script = existing || document.createElement('script')
    script.src = 'https://paysio.com/paysio.js'
    script.async = true
    script.dataset.paysioSdk = '1'
    script.onload = () => {
      if (window.Paysio) resolve(window.Paysio)
      else reject(new Error('Paysio.js loaded without Paysio().'))
    }
    script.onerror = () => {
      paysioScript = null
      reject(new Error('Could not load Paysio checkout.'))
    }
    if (!existing) document.head.appendChild(script)
  })
  return paysioScript
}

export async function getPaysio(publishableKey: string): Promise<PaysioInstance> {
  const Paysio = await loadPaysioJs()
  if (paysioInstance && paysioInstanceKey === publishableKey) {
    return paysioInstance
  }
  paysioInstance = Paysio(publishableKey)
  paysioInstanceKey = publishableKey
  return paysioInstance
}

export async function createPaysioSession(payload: {
  amount: number
  ownerType?: TopUpOwnerType
  uiMode?: 'embedded' | 'hosted'
  origin?: string
  successUrl?: string
}): Promise<PaysioSessionResponse> {
  return apiRequest<PaysioSessionResponse>('/payments/paysio/session', {
    method: 'POST',
    body: payload,
  })
}

export async function confirmPaysioPayment(clickId: string): Promise<{
  ok?: boolean
  pending?: boolean
  status?: string
  wallet?: { balance: number; points: number; currency: string }
  membership?: VendorMembership
}> {
  return apiRequest('/payments/paysio/confirm', {
    method: 'POST',
    body: { clickId },
  })
}

export async function waitForPaysioCredit(
  clickId: string,
  timeoutMs = 90_000,
): Promise<PaysioChargeResponse> {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const result = await confirmPaysioPayment(clickId)
    if (result.wallet) {
      return {
        ok: true,
        clickId,
        status: result.status,
        pending: false,
        wallet: result.wallet,
      }
    }
    if (!result.pending) {
      throw new Error('Card payment failed.')
    }
    await new Promise((resolve) => window.setTimeout(resolve, 1500))
  }
  throw new Error('Payment is confirming. Portfolio updates after the success webhook.')
}

export async function listPaysioMethods(
  purpose: 'topup' | 'withdraw' | 'all' = 'topup',
): Promise<SavedPaymentMethod[]> {
  const res = await apiRequest<{ methods?: SavedPaymentMethod[] }>(
    `/payments/paysio/methods?purpose=${encodeURIComponent(purpose)}`,
  )
  return Array.isArray(res.methods) ? res.methods : []
}

export async function chargePaysioPayment(payload: {
  amount: number
  ownerType?: TopUpOwnerType
  paymentToken?: string
  paymentMethodId?: string
  paysioWallet?: Record<string, unknown>
  wallet?: Record<string, unknown>
  threeDs?: Record<string, unknown>
  postalCode?: string
  purpose?: 'topup' | 'invoice'
  invoiceToken?: string
  invoiceMix?: boolean
}): Promise<PaysioChargeResponse> {
  const charged = await apiRequest<PaysioChargeResponse>('/payments/paysio/charge', {
    method: 'POST',
    body: payload,
  })
  if (!charged.clickId) {
    throw new Error('Paysio did not return a payment id.')
  }
  return charged
}

const CARD_APPEARANCE = {
  variables: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '15px',
    fontWeight: '600',
    colorText: '#111827',
    colorTextPlaceholder: '#9ca3af',
    colorBackground: '#f9fafb',
    colorBorder: '#e5e7eb',
    colorBorderFocus: '#059669',
    colorBorderInvalid: '#dc2626',
    colorTextInvalid: '#dc2626',
    colorIcon: '#9ca3af',
    caretColor: '#059669',
    borderRadius: '12px',
    borderWidth: '1px',
    inputHeight: '46px',
    inputPaddingX: '12px',
    boxShadow: 'none',
    boxShadowFocus: '0 0 0 1px #059669',
    rowGap: '8px',
    showLockIcon: false,
  },
}

export async function mountPaysioCardForm(
  publishableKey: string,
  fields: { cardNumber: string; cardExpiry: string; cardCvc: string },
  onChange?: (state: { complete: boolean; error?: string }) => void,
  opts?: { reset?: boolean },
): Promise<CardInputsHandle> {
  if (opts?.reset && paysioInstance) {
    try {
      paysioInstance.reset?.()
    } catch {
      /* ignore a stale SDK instance */
    }
    paysioInstance = null
    paysioInstanceKey = ''
  }
  const paysio = await getPaysio(publishableKey)
  return paysio.mountCardInputs(fields, {
    appearance: CARD_APPEARANCE,
    placeholders: {
      number: 'Card number',
      expiry: 'MM / YY',
      cvc: 'Security code',
    },
    onChange,
  })
}

export async function mountPaysioWallets(
  publishableKey: string,
  target: string | HTMLElement,
  amount: number,
  onWalletPay: (data: PaysioWalletPayment) => Promise<boolean>,
): Promise<WalletElements> {
  const paysio = await getPaysio(publishableKey)
  const elements = paysio.elements()
  elements.mountWallets(target, {
    amount,
    currency: 'USD',
    country: 'US',
    collectShipping: false,
    buttonHeight: 44,
    gap: 8,
    direction: 'column',
    applePay: {
      buttonStyle: 'black',
      buttonType: 'top-up',
      borderRadius: 12,
    },
    googlePay: {
      buttonColor: 'black',
      buttonType: 'pay',
      buttonRadius: 12,
      buttonSizeMode: 'fill',
    },
  })
  elements.on('walletPayment', (data) => onWalletPay(data))
  return elements
}

export async function tokenizePaysioCard(
  publishableKey: string,
  opts?: { requireCvc?: boolean },
): Promise<{ token: string; last4: string }> {
  const paysio = await getPaysio(publishableKey)
  const result = await paysio.createToken()
  const token = result.token || ''
  if (!token.startsWith('ptok_')) {
    throw new Error(
      opts?.requireCvc === false
        ? 'Could not secure the card. Check the number and expiry.'
        : 'Could not secure the card. Check the number, expiry, and CVC.',
    )
  }
  return { token, last4: result.card?.last4 || '' }
}

export async function tokenizeAndChargeCard(opts: {
  publishableKey: string
  amount: number
  ownerType?: TopUpOwnerType
  email?: string
  postalCode?: string
  threeDsTarget?: string
  purpose?: 'topup' | 'invoice'
  invoiceToken?: string
  invoiceMix?: boolean
}): Promise<PaysioChargeResponse> {
  const paysio = await getPaysio(opts.publishableKey)
  const { token } = await paysio.createToken()
  let threeDs: Record<string, unknown> | undefined
  try {
    threeDs = await paysio.threeDS().authenticate({
      amount: opts.amount,
      token,
      email: opts.email,
      iframeTarget: opts.threeDsTarget,
    })
  } catch {
    threeDs = undefined
  }
  return chargePaysioPayment({
    amount: opts.amount,
    ownerType: opts.ownerType,
    paymentToken: token,
    threeDs,
    postalCode: opts.postalCode,
    purpose: opts.purpose,
    invoiceToken: opts.invoiceToken,
    invoiceMix: opts.invoiceMix,
  })
}

export async function chargeSavedPaysioCard(opts: {
  publishableKey: string
  amount: number
  paymentMethodId: string
  ownerType?: TopUpOwnerType
  email?: string
  postalCode?: string
  threeDsTarget?: string
  purpose?: 'topup' | 'invoice'
  invoiceToken?: string
  invoiceMix?: boolean
}): Promise<PaysioChargeResponse> {
  const paysio = await getPaysio(opts.publishableKey)
  let threeDs: Record<string, unknown> | undefined
  try {
    threeDs = await paysio.threeDS().authenticate({
      amount: opts.amount,
      paymentMethodId: opts.paymentMethodId,
      email: opts.email,
      iframeTarget: opts.threeDsTarget,
    })
  } catch {
    threeDs = undefined
  }
  return chargePaysioPayment({
    amount: opts.amount,
    ownerType: opts.ownerType,
    paymentMethodId: opts.paymentMethodId,
    threeDs,
    postalCode: opts.postalCode,
    purpose: opts.purpose,
    invoiceToken: opts.invoiceToken,
    invoiceMix: opts.invoiceMix,
  })
}

export async function openPaysioHostedCheckout(
  session: PaysioSessionResponse,
  handlers: {
    onComplete?: (wallet?: { balance: number; points: number; currency: string }) => void
    onError?: (message: string) => void
    onClose?: () => void
  },
): Promise<void> {
  if (!session.url) {
    throw new Error('Paysio did not return a checkout URL.')
  }
  const popup = window.open(session.url, 'tapstack-paysio', 'width=480,height=720')
  const started = Date.now()

  await new Promise<void>((resolve) => {
    const timer = window.setInterval(() => {
      void (async () => {
        if (Date.now() - started > 15 * 60 * 1000) {
          window.clearInterval(timer)
          handlers.onError?.('Payment timed out.')
          resolve()
          return
        }
        try {
          const result = await confirmPaysioPayment(session.clickId)
          if (result.pending) return
          window.clearInterval(timer)
          try {
            popup?.close()
          } catch {
            /* ignore */
          }
          if (!result.wallet) {
            handlers.onError?.('Card payment failed.')
            resolve()
            return
          }
          handlers.onComplete?.(result.wallet)
          resolve()
        } catch {
          if (popup && popup.closed) {
            window.clearInterval(timer)
            handlers.onClose?.()
            resolve()
          }
        }
      })()
    }, 2500)
  })
}
