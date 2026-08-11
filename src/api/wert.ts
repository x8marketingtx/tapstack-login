import WertWidget from '@wert-io/widget-initializer'
import { v4 as uuidv4 } from 'uuid'
import { apiRequest } from './client'

export type WertSessionResponse = {
  clickId: string
  sessionId: string
  partnerId: string
  origin: string
  amount: number
  currency: string
  commodity: string
  network: string
  walletAddress: string
  walletCurrency: string
  phone?: string | null
  email?: string
  fullName?: string
}

export type WertConfig = {
  configured: boolean
  partnerId: string
  sandbox: boolean
  origin: string
  commodity: string
  network: string
  minAmount: number
  presets: number[]
  webhookUrl: string
}

export type TopUpOwnerType = 'player' | 'vendor' | 'distributor' | 'platform'

export async function fetchWertConfig(): Promise<WertConfig> {
  return apiRequest<WertConfig>('/payments/wert/config', { auth: false })
}

export async function createWertSession(amount: number, ownerType?: TopUpOwnerType): Promise<WertSessionResponse> {
  return apiRequest<WertSessionResponse>('/payments/wert/session', {
    method: 'POST',
    body: { amount, ownerType },
  })
}

export async function confirmWertPayment(payload: {
  clickId: string
  status: string
  orderId?: string
  paymentId?: string
  txId?: string
}): Promise<{ ok: boolean; wallet?: { balance: number; points: number; currency: string } }> {
  return apiRequest('/payments/wert/confirm', {
    method: 'POST',
    body: payload,
  })
}

type OpenWertOptions = {
  amount: number
  ownerType?: TopUpOwnerType
  onSuccess?: (wallet?: { balance: number; points: number; currency: string }) => void
  onClose?: () => void
  onError?: (message: string) => void
}

/**
 * Creates a Wert onramp session via WordPress, then opens the official widget.
 * @see https://docs.wert.io/docs/llm-on-ramp.md
 */
export async function openWertTopUp({ amount, ownerType, onSuccess, onClose, onError }: OpenWertOptions): Promise<void> {
  const session = await createWertSession(amount, ownerType)

  const widget = new WertWidget({
    partner_id: session.partnerId,
    session_id: session.sessionId,
    click_id: session.clickId || uuidv4(),
    origin: session.origin,
    brand_color: '#059669',
    currencies: JSON.stringify(['USD']),
    commodities: JSON.stringify([
      {
        commodity: session.commodity,
        network: session.network,
      },
    ]),
    phone: session.phone || undefined,
    email: session.email,
    full_name: session.fullName && /\w+\s+\w+/.test(session.fullName) ? session.fullName : undefined,
    listeners: {
      close: () => {
        onClose?.()
      },
      error: (data) => {
        onError?.(data?.message || 'Wert widget error')
      },
      'payment-status': async (data) => {
        const status = data?.status || ''
        try {
          const result = await confirmWertPayment({
            clickId: session.clickId,
            status,
            orderId: data?.order_id,
            paymentId: data?.payment_id,
            txId: data?.tx_id,
          })
          if (status === 'success') {
            onSuccess?.(result.wallet)
          } else if (status === 'failed' || status === 'canceled') {
            onError?.(status === 'canceled' ? 'Payment cancelled.' : 'Payment failed.')
          }
        } catch (err) {
          onError?.(err instanceof Error ? err.message : 'Could not confirm payment.')
        }
      },
    },
  })

  widget.open()
}
