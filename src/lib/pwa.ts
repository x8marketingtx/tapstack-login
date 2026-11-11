import { isApiConfigured, tapstackApi } from '../api/client'

const INSTALLED_KEY = 'tapstack_pwa_installed'
const PUSH_PROMPT_KEY = 'tapstack_pwa_push_prompt'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export type PwaMode = 'install' | 'ios' | 'push' | 'hidden'

type PwaListener = () => void

const listeners = new Set<PwaListener>()

let deferredPrompt: BeforeInstallPromptEvent | null = null
let registered = false

function notify(): void {
  listeners.forEach((fn) => fn())
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  if (nav.standalone) return true
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  if (window.matchMedia('(display-mode: minimal-ui)').matches) return true
  if (document.referrer.startsWith('android-app://')) return true
  return false
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/i.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

function readFlag(key: string): string {
  try {
    return localStorage.getItem(key) || ''
  } catch {
    return ''
  }
}

function writeFlag(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* ignore */
  }
}

export function markPwaInstalled(): void {
  writeFlag(INSTALLED_KEY, '1')
  notify()
}

export function markPushPrompt(value: 'granted' | 'denied' | 'skipped'): void {
  writeFlag(PUSH_PROMPT_KEY, value)
  notify()
}

export function getPwaMode(): PwaMode {
  if (typeof window === 'undefined') return 'hidden'
  if (isStandalone() || readFlag(INSTALLED_KEY) === '1') {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      return 'hidden'
    }
    const promptState = readFlag(PUSH_PROMPT_KEY)
    if (promptState === 'granted' || promptState === 'denied' || promptState === 'skipped') {
      return 'hidden'
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
      return 'hidden'
    }
    return 'push'
  }
  if (isIos()) return 'ios'
  return 'install'
}

export function subscribePwa(listener: PwaListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export async function registerTapstackServiceWorker(): Promise<void> {
  if (registered || typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  registered = true
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    markPwaInstalled()
  })
  const media = window.matchMedia('(display-mode: standalone)')
  const onDisplay = () => {
    if (isStandalone()) markPwaInstalled()
    notify()
  }
  if (typeof media.addEventListener === 'function') media.addEventListener('change', onDisplay)
  else media.addListener(onDisplay)
  if (isStandalone()) markPwaInstalled()
  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch {
    /* ignore offline / unsupported */
  }
}

export async function promptAddToHomeScreen(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable'
  const prompt = deferredPrompt
  deferredPrompt = null
  await prompt.prompt()
  const choice = await prompt.userChoice
  if (choice.outcome === 'accepted') markPwaInstalled()
  notify()
  return choice.outcome
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output
}

export async function enablePushNotifications(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return 'unsupported'
  }
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    markPushPrompt(permission === 'denied' ? 'denied' : 'skipped')
    return permission === 'denied' ? 'denied' : 'unsupported'
  }

  const registration = await navigator.serviceWorker.ready
  let vapid = ''
  if (isApiConfigured()) {
    try {
      const config = await tapstackApi.pwaConfig()
      vapid = typeof config.vapidPublicKey === 'string' ? config.vapidPublicKey : ''
    } catch {
      vapid = ''
    }
  }

  if (vapid && 'PushManager' in window) {
    try {
      const existing = await registration.pushManager.getSubscription()
      const subscription =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid),
        }))
      if (isApiConfigured()) {
        const json = subscription.toJSON()
        await tapstackApi.savePushSubscription({
          endpoint: json.endpoint || subscription.endpoint,
          keys: {
            p256dh: json.keys?.p256dh || '',
            auth: json.keys?.auth || '',
          },
        })
      }
    } catch {
      /* permission is still granted; local alerts still work */
    }
  }

  try {
    await registration.showNotification('TapStack alerts are on', {
      body: 'We will notify you about payouts, loads, and account updates.',
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
    })
  } catch {
    /* some browsers block showNotification until a push arrives */
  }

  markPushPrompt('granted')
  return 'granted'
}
