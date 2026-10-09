/** NitroPay publisher site for tapstack.io (panel Sites list). */
export const NITROPAY_SITE_ID = (import.meta.env.VITE_NITROPAY_SITE_ID || '2576').trim()
/** Must match the Placement Code Builder id / HTML element id. */
export const NITROPAY_TICKETS_PLACEMENT = (import.meta.env.VITE_NITROPAY_PLACEMENT_ID || 'tapstack-tickets').trim()

type NitroAdsApi = {
  createAd: (id: string, options: Record<string, unknown>) => unknown
  addUserToken?: (...args: unknown[]) => void
  queue?: unknown[]
  onNavigate?: () => void
}

declare global {
  interface Window {
    nitroAds?: NitroAdsApi
  }
}

function isTapstackHost(hostname: string): boolean {
  const host = hostname.replace(/^www\./, '').toLowerCase()
  return host === 'tapstack.io'
}

/** Real fill only on tapstack.io. Everywhere else use Nitro placeholder ads. */
export function nitropayDemoMode(): boolean {
  if (typeof window === 'undefined') return true
  if (new URLSearchParams(window.location.search).get('nitro_demo') === '1') return true
  return !isTapstackHost(window.location.hostname)
}

function ensureQueueStub(): void {
  if (window.nitroAds?.createAd) return
  window.nitroAds = {
    createAd() {
      return new Promise((resolve) => {
        window.nitroAds?.queue?.push(['createAd', arguments, resolve])
      })
    },
    addUserToken() {
      window.nitroAds?.queue?.push(['addUserToken', arguments])
    },
    queue: [],
  }
}

let scriptPromise: Promise<void> | null = null

export function loadNitropay(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('NitroPay is only available in the browser.'))
  }
  if (!NITROPAY_SITE_ID) {
    return Promise.reject(new Error('Missing NitroPay site ID.'))
  }
  if (scriptPromise) return scriptPromise

  ensureQueueStub()

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-nitropay-ads]')
    if (existing) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.dataset.nitropayAds = '1'
    script.dataset.cfasync = 'false'
    script.dataset.spa = 'auto'
    if (nitropayDemoMode()) script.dataset.demo = 'true'
    script.async = true
    script.src = `https://s.nitropay.com/ads-${NITROPAY_SITE_ID}.js`
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      script.remove()
      reject(new Error('Could not load the NitroPay ad script.'))
    }
    document.head.appendChild(script)
  })

  return scriptPromise
}

export function isNitropayBlocked(err: unknown): boolean {
  const text =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : ''
  return (
    /failed to fetch|networkerror|blocked|err_blocked|load floors|ads-video|ad blocker/i.test(text) ||
    (typeof err === 'object' && err !== null && (err as { name?: string }).name === 'TypeError')
  )
}

export function nitropayFailureMessage(err: unknown): string {
  if (isNitropayBlocked(err)) {
    return 'An ad blocker is stopping the video player. Pause it for this site, then try again.'
  }
  const text =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : ''
  return text.trim() || 'Could not load the sponsored video. Close and try again.'
}

export async function createTicketsVideoAd(): Promise<void> {
  await loadNitropay()
  if (!window.nitroAds?.createAd) {
    throw new Error('NitroPay is not ready.')
  }
  try {
    await Promise.resolve(
      window.nitroAds.createAd(NITROPAY_TICKETS_PLACEMENT, {
        format: 'video-nc',
        video: {
          hidePlaylist: true,
          initialDelay: 0,
          interval: 300,
        },
      }),
    )
  } catch (err) {
    throw new Error(nitropayFailureMessage(err))
  }
}

function visitPlayerDocs(root: ParentNode, visit: (doc: ParentNode) => void): void {
  visit(root)
  root.querySelectorAll('iframe').forEach((frame) => {
    try {
      const doc = frame.contentDocument
      if (doc) visit(doc)
    } catch {
      /* cross-origin player */
    }
  })
}

function pickMainVideo(videos: Iterable<HTMLVideoElement>): HTMLVideoElement | null {
  let best: HTMLVideoElement | null = null
  let bestDuration = 0
  for (const video of videos) {
    const duration = Number.isFinite(video.duration) ? video.duration : 0
    if (duration > bestDuration) {
      best = video
      bestDuration = duration
    }
  }
  return best
}

function watchedFullVideo(video: HTMLVideoElement, playedThrough: number): boolean {
  const duration = video.duration
  if (!Number.isFinite(duration) || duration <= 1) return false
  const played = Math.max(playedThrough, video.currentTime)
  return played >= duration * 0.99
}

/**
 * Credit only after the longest clip in the player is watched all the way through.
 * Preroll complete / Next-Stay are ignored unless that full clip actually ended.
 */
export function watchTicketsAdComplete(
  root: HTMLElement,
  onComplete: () => void,
  onProgress?: (pct: number) => void,
): () => void {
  let done = false
  const videoListeners = new Set<HTMLVideoElement>()
  const playedThrough = new WeakMap<HTMLVideoElement, number>()

  const playedOf = (video: HTMLVideoElement) =>
    Math.max(playedThrough.get(video) || 0, video.currentTime || 0)

  const fireIfFullWatch = () => {
    if (done) return
    const main = pickMainVideo(videoListeners)
    if (!main || !watchedFullVideo(main, playedOf(main))) return
    done = true
    onProgress?.(100)
    onComplete()
  }

  const reportProgress = () => {
    const main = pickMainVideo(videoListeners)
    if (!main || !Number.isFinite(main.duration) || main.duration <= 0) return
    const played = playedOf(main)
    playedThrough.set(main, played)
    const pct = Math.min(99, Math.max(0, Math.round((played / main.duration) * 100)))
    onProgress?.(pct)
    fireIfFullWatch()
  }

  const onSeeking = (event: Event) => {
    const video = event.target
    if (!(video instanceof HTMLVideoElement)) return
    const allowed = playedThrough.get(video) || 0
    if (video.currentTime > allowed + 0.35) {
      video.currentTime = allowed
    }
  }

  const onEnded = (event: Event) => {
    const video = event.target
    if (!(video instanceof HTMLVideoElement)) return
    window.setTimeout(() => {
      const main = pickMainVideo(videoListeners)
      if (main && main !== video && (main.duration || 0) > (video.duration || 0) + 0.5) return
      fireIfFullWatch()
    }, 1500)
  }

  const bindVideos = (node: ParentNode) => {
    visitPlayerDocs(node, (doc) => {
      doc.querySelectorAll('video').forEach((video) => {
        if (videoListeners.has(video)) return
        videoListeners.add(video)
        playedThrough.set(video, 0)
        video.controls = false
        video.removeAttribute('controls')
        video.addEventListener('ended', onEnded)
        video.addEventListener('timeupdate', reportProgress)
        video.addEventListener('seeking', onSeeking)
      })
    })
  }

  bindVideos(root)

  const observer = new MutationObserver(() => bindVideos(root))
  observer.observe(root, { childList: true, subtree: true })

  const retry = window.setInterval(() => {
    bindVideos(root)
    reportProgress()
  }, 400)

  return () => {
    done = true
    observer.disconnect()
    window.clearInterval(retry)
    videoListeners.forEach((video) => {
      video.removeEventListener('ended', onEnded)
      video.removeEventListener('timeupdate', reportProgress)
      video.removeEventListener('seeking', onSeeking)
    })
    videoListeners.clear()
  }
}
