/** NitroPay publisher site for tapstack.io (panel Sites list). */
export const NITROPAY_SITE_ID = (import.meta.env.VITE_NITROPAY_SITE_ID || '2576').trim()
/** Must match the Placement Code Builder id / HTML element id. */
export const NITROPAY_TICKETS_PLACEMENT = (import.meta.env.VITE_NITROPAY_PLACEMENT_ID || 'tapstack-tickets').trim()

type NitroAdHandle = {
  videoConfig?: (cfg: Record<string, unknown>) => void
  onNavigate?: (href?: string) => void
}

type NitroAdsApi = {
  createAd: (id: string, options: Record<string, unknown>) => unknown
  addUserToken?: (...args: unknown[]) => void
  queue?: unknown[]
  onNavigate?: () => void
}

/** Aniview keys via NitroAd.videoConfig — CSS cannot stop Auto Skip / autoContinue. */
const PLAYER_NO_AUTONEXT = {
  autoContinue: false,
  loop: false,
  skip: false,
  performance: { autoContinue: false, loop: false },
  controls: {
    skip: false,
    showNextButton: false,
    showPrevButton: false,
    showBigPrevNext: false,
    showBigPrevNextOnPause: false,
  },
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

function applyNoAutonext(ad: NitroAdHandle | null | undefined): void {
  try {
    ad?.videoConfig?.(PLAYER_NO_AUTONEXT)
  } catch {
    /* player not initialized yet */
  }
}

export async function createTicketsVideoAd(): Promise<void> {
  await loadNitropay()
  if (!window.nitroAds?.createAd) {
    throw new Error('NitroPay is not ready.')
  }
  try {
    const ad = (await Promise.resolve(
      window.nitroAds.createAd(NITROPAY_TICKETS_PLACEMENT, {
        format: 'video-nc',
        video: {
          hidePlaylist: true,
          float: 'never',
          initialDelay: 0,
          interval: 300,
        },
      }),
    )) as NitroAdHandle | undefined
    applyNoAutonext(ad)
    window.setTimeout(() => applyNoAutonext(ad), 400)
    window.setTimeout(() => applyNoAutonext(ad), 2000)
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

function watchedFullVideo(video: HTMLVideoElement, playedThrough: number): boolean {
  const duration = video.duration
  if (!Number.isFinite(duration) || duration <= 1) return false
  const played = Math.max(playedThrough, video.currentTime)
  return played >= duration * 0.99
}

function elementLabel(el: Element): string {
  return `${el.getAttribute('aria-label') || ''} ${el.textContent || ''}`
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function isStayControl(el: Element): boolean {
  const label = elementLabel(el)
  return label === 'stay' || label.startsWith('stay ')
}

function isNextControl(el: Element): boolean {
  const label = elementLabel(el)
  return label === 'next' || /^next(\s|$)/.test(label)
}

function collectOverlayControls(root: ParentNode): { stay: HTMLElement[]; next: HTMLElement[] } {
  const stay: HTMLElement[] = []
  const next: HTMLElement[] = []
  visitPlayerDocs(root, (doc) => {
    doc.querySelectorAll('button, [role="button"], a, span, div').forEach((el) => {
      if (!(el instanceof HTMLElement)) return
      if ((el.textContent || '').trim().length > 24) return
      if (isStayControl(el)) stay.push(el)
      else if (isNextControl(el)) next.push(el)
    })
  })
  return { stay, next }
}

/**
 * Credit only after the locked content clip is watched all the way through.
 * Aniview Auto Skip / playlist Next still fire with CSS-hidden buttons — Stay is clicked
 * in JS, later clips are paused, and the yellow bar only tracks the locked clip.
 */
export function watchTicketsAdComplete(
  root: HTMLElement,
  onComplete: () => void,
  onProgress?: (pct: number) => void,
): () => void {
  let done = false
  let locked: HTMLVideoElement | null = null
  let maxPct = 0
  let lastStayClick = 0
  const videoListeners = new Set<HTMLVideoElement>()
  const playedThrough = new WeakMap<HTMLVideoElement, number>()
  const srcOf = new WeakMap<HTMLVideoElement, string>()

  const playedOf = (video: HTMLVideoElement) =>
    Math.max(playedThrough.get(video) || 0, video.currentTime || 0)

  const pauseIfNotLocked = (video: HTMLVideoElement) => {
    if (done || !locked || video === locked) return
    const lockedDur = locked.duration || 0
    const nextDur = Number.isFinite(video.duration) ? video.duration : 0
    if (nextDur > lockedDur + 2 && (playedOf(locked) >= lockedDur * 0.9 || lockedDur < 15)) {
      return
    }
    video.pause()
  }

  const keepCurrentClip = () => {
    const { stay, next } = collectOverlayControls(root)
    if (!stay.length || !next.length) return
    const now = Date.now()
    if (now - lastStayClick < 700) return
    lastStayClick = now
    stay[0]?.click()
  }

  const considerLock = (video: HTMLVideoElement) => {
    const duration = video.duration
    if (!Number.isFinite(duration) || duration <= 1) return
    if (!locked) {
      locked = video
      maxPct = 0
      return
    }
    if (locked === video) return
    const lockedDur = locked.duration || 0
    if (duration > lockedDur + 2 && (playedOf(locked) >= lockedDur * 0.9 || lockedDur < 15)) {
      locked = video
      maxPct = 0
      onProgress?.(0)
      return
    }
    pauseIfNotLocked(video)
  }

  const fireIfFullWatch = () => {
    if (done || !locked) return
    if (!watchedFullVideo(locked, playedOf(locked))) return
    const longerWaiting = [...videoListeners].some(
      (video) => video !== locked && (video.duration || 0) > (locked?.duration || 0) + 2,
    )
    if (longerWaiting) return
    done = true
    onProgress?.(100)
    onComplete()
  }

  const reportProgress = () => {
    keepCurrentClip()
    if (!locked || !Number.isFinite(locked.duration) || locked.duration <= 0) return
    const src = locked.currentSrc || locked.src || ''
    const prevSrc = srcOf.get(locked) || ''
    if (src) srcOf.set(locked, src)
    if (prevSrc && src && src !== prevSrc && playedOf(locked) < locked.duration * 0.99) {
      locked.pause()
      return
    }
    const allowed = playedThrough.get(locked) || 0
    if (locked.currentTime + 1.25 < allowed && allowed > 1) {
      try {
        locked.currentTime = allowed
      } catch {
        /* playlist already replaced the buffer */
      }
      keepCurrentClip()
      return
    }
    const played = Math.max(allowed, locked.currentTime || 0)
    playedThrough.set(locked, played)
    const pct = Math.min(99, Math.max(0, Math.round((played / locked.duration) * 100)))
    if (pct > maxPct) {
      maxPct = pct
      onProgress?.(pct)
    }
    fireIfFullWatch()
  }

  const onSeeking = (event: Event) => {
    const video = event.target
    if (!(video instanceof HTMLVideoElement)) return
    considerLock(video)
    if (locked && video !== locked) {
      pauseIfNotLocked(video)
      return
    }
    const allowed = playedThrough.get(video) || 0
    if (video.currentTime > allowed + 0.35) {
      video.currentTime = allowed
    }
  }

  const onPlay = (event: Event) => {
    const video = event.target
    if (!(video instanceof HTMLVideoElement)) return
    considerLock(video)
    pauseIfNotLocked(video)
  }

  const onEnded = (event: Event) => {
    const video = event.target
    if (!(video instanceof HTMLVideoElement)) return
    window.setTimeout(() => {
      if (locked && video !== locked && (locked.duration || 0) > (video.duration || 0) + 0.5) return
      fireIfFullWatch()
    }, 1500)
  }

  const onTimeUpdate = (event: Event) => {
    const video = event.target
    if (!(video instanceof HTMLVideoElement)) return
    considerLock(video)
    if (video !== locked) {
      pauseIfNotLocked(video)
      return
    }
    reportProgress()
  }

  const bindVideos = (node: ParentNode) => {
    visitPlayerDocs(node, (doc) => {
      doc.querySelectorAll('video').forEach((video) => {
        if (videoListeners.has(video)) {
          considerLock(video)
          pauseIfNotLocked(video)
          return
        }
        videoListeners.add(video)
        playedThrough.set(video, 0)
        video.controls = false
        video.removeAttribute('controls')
        video.addEventListener('ended', onEnded)
        video.addEventListener('timeupdate', onTimeUpdate)
        video.addEventListener('seeking', onSeeking)
        video.addEventListener('play', onPlay)
        considerLock(video)
        pauseIfNotLocked(video)
      })
    })
  }

  const onCaptureClick = (event: Event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const hit = target.closest('button, [role="button"], a, span, div')
    if (!hit || !isNextControl(hit)) return
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    keepCurrentClip()
  }

  bindVideos(root)
  root.addEventListener('click', onCaptureClick, true)

  const observer = new MutationObserver(() => {
    bindVideos(root)
    keepCurrentClip()
  })
  observer.observe(root, { childList: true, subtree: true })

  const retry = window.setInterval(() => {
    bindVideos(root)
    reportProgress()
  }, 250)

  return () => {
    done = true
    observer.disconnect()
    window.clearInterval(retry)
    root.removeEventListener('click', onCaptureClick, true)
    videoListeners.forEach((video) => {
      video.removeEventListener('ended', onEnded)
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('seeking', onSeeking)
      video.removeEventListener('play', onPlay)
    })
    videoListeners.clear()
  }
}
