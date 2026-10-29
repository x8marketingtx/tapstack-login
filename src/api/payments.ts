import { apiRequest } from './client'
import {
  chargePaysioPayment,
  createPaysioSession,
  openPaysioHostedCheckout,
} from './paysio'
import { openWertTopUp, type TopUpOwnerType } from './wert'

export type CardProcessor = 'wert' | 'paysio'

export type PaymentsConfig = {
  processor: CardProcessor
  wert: { configured: boolean; sandbox: boolean; minAmount: number }
  paysio: {
    configured: boolean
    sandbox: boolean
    publishableKey: string
    minAmount: number
    webhookUrl: string
  }
}

export type CardTopUpHandlers = {
  amount: number
  ownerType?: TopUpOwnerType
  onSuccess?: (wallet?: { balance: number; points: number; currency: string }) => void
  onClose?: () => void
  onError?: (message: string) => void
}

export async function fetchPaymentsConfig(): Promise<PaymentsConfig> {
  return apiRequest<PaymentsConfig>('/payments/config', { auth: false })
}

export function cardProcessorLabel(processor: CardProcessor): string {
  return processor === 'paysio' ? 'Paysio' : 'Wert'
}

export async function startHostedCardTopUp(opts: CardTopUpHandlers): Promise<void> {
  const config = await fetchPaymentsConfig()
  if (config.processor !== 'paysio') {
    await openWertTopUp(opts)
    return
  }
  if (!config.paysio.configured) {
    throw new Error('Paysio is not configured. Add keys in TapStack settings.')
  }
  const session = await createPaysioSession({
    amount: opts.amount,
    ownerType: opts.ownerType,
    uiMode: 'hosted',
    origin: window.location.origin,
    successUrl: window.location.origin + window.location.pathname,
  })
  await openPaysioHostedCheckout(session, {
    onComplete: opts.onSuccess,
    onError: opts.onError,
    onClose: opts.onClose,
  })
}

export { chargePaysioPayment }
