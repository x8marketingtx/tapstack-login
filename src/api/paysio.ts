import { apiRequest } from './client'
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

type PaysioGlobal = (key: string) => {
  mountCheckout: (
    target: string | HTMLElement,
    opts: {
      clientSecret: string
      appearance?: Record<string, unknown>
      onComplete?: (result: { transactionId?: string; orderLabel?: string }) => void
      onError?: (error: { message?: string }) => void
    },
  ) => Promise<{ unmount: () => void }>
}

declare global {
  interface Window {
    Paysio?: PaysioGlobal
  }
}

let paysioScript: Promise<PaysioGlobal> | null = null

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
}> {
  return apiRequest('/payments/paysio/confirm', {
    method: 'POST',
    body: { clickId },
  })
}

const TAPSTACK_APPEARANCE = {
  variables: {
    colorPrimary: '#059669',
    colorBackground: '#ffffff',
    colorText: '#111827',
    colorTextMuted: '#6b7280',
    colorBorder: '#e5e7eb',
    borderRadius: '12px',
    buttonBorderRadius: '12px',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '15px',
  },
}

export async function mountPaysioCheckout(
  target: string | HTMLElement,
  session: PaysioSessionResponse,
  handlers: {
    onComplete?: (wallet?: { balance: number; points: number; currency: string }) => void
    onError?: (message: string) => void
  },
): Promise<() => void> {
  const Paysio = await loadPaysioJs()
  const paysio = Paysio(session.publishableKey)
  let finished = false

  const checkout = await paysio.mountCheckout(target, {
    clientSecret: session.clientSecret,
    appearance: TAPSTACK_APPEARANCE,
    onComplete: () => {
      void (async () => {
        try {
          const result = await confirmPaysioPayment(session.clickId)
          if (result.pending) {
            handlers.onError?.('Payment is still confirming. Wait a moment and keep this window open.')
            return
          }
          finished = true
          handlers.onComplete?.(result.wallet)
        } catch (err) {
          handlers.onError?.(err instanceof Error ? err.message : 'Could not confirm payment.')
        }
      })()
    },
    onError: (error) => {
      if (finished) return
      handlers.onError?.(error?.message || 'Paysio checkout error')
    },
  })

  return () => {
    checkout.unmount()
  }
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
