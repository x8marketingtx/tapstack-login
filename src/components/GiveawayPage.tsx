import { useEffect, useRef, useState } from 'react'
import {
  ApiError,
  isApiConfigured,
  tapstackApi,
  type GiveawayState,
  type GiveawayTicket,
  type TicketTier,
} from '../api/client'
import './GiveawayPage.css'

const CHIPS_PER_TICKET = 6
const ADS_PER_DAY = 6
const DEMO_STORAGE_KEY = 'tapstack_giveaway_demo_v1'
/** Bundled sample ad in /public — no WordPress upload needed for demo. */
const DEMO_AD_VIDEO_SRC = '/demo-ad.mp4'

const TIER_RATES: Record<TicketTier, { label: string; dollars: number; tickets: number }> = {
  bronze: { label: 'Bronze', dollars: 40, tickets: 1 },
  silver: { label: 'Silver', dollars: 30, tickets: 1 },
  gold: { label: 'Gold', dollars: 20, tickets: 1 },
  diamond: { label: 'Diamond', dollars: 20, tickets: 3 },
  platinum: { label: 'Platinum', dollars: 20, tickets: 6 },
}

type DemoStore = {
  chips: number
  tickets: GiveawayTicket[]
  tier: TicketTier
  adsDay: string
  adsCount: number
  purchaseSpend: number
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function loadDemo(): DemoStore {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DemoStore
      if (parsed.adsDay !== todayKey()) {
        parsed.adsDay = todayKey()
        parsed.adsCount = 0
      }
      return parsed
    }
  } catch {
    /* ignore */
  }
  return {
    chips: 2,
    tickets: [
      {
        id: 'demo-1',
        number: 482917,
        source: 'ad',
        createdAt: new Date().toISOString(),
      },
    ],
    tier: 'bronze',
    adsDay: todayKey(),
    adsCount: 0,
    purchaseSpend: 0,
  }
}

function saveDemo(store: DemoStore) {
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(store))
}

function mintDemoTicket(source: string): GiveawayTicket {
  return {
    id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    number: Math.floor(100000 + Math.random() * 900000),
    source,
    createdAt: new Date().toISOString(),
  }
}

function applyChips(store: DemoStore, count: number, source: string) {
  let chips = store.chips + count
  const newTickets: GiveawayTicket[] = []
  while (chips >= CHIPS_PER_TICKET) {
    chips -= CHIPS_PER_TICKET
    newTickets.push(mintDemoTicket(source))
  }
  return {
    store: { ...store, chips, tickets: [...newTickets, ...store.tickets] },
    newTickets,
  }
}

function endOfMonthDrawAt(): Date {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 20, 0, 0, 0)
  if (end.getTime() <= now.getTime()) {
    return new Date(now.getFullYear(), now.getMonth() + 2, 0, 20, 0, 0, 0)
  }
  return end
}

function formatDrawDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function deadlineFromDrawAt(drawAt: string | Date): { days: number; label: string } {
  const target = typeof drawAt === 'string' ? new Date(drawAt) : drawAt
  const ms = target.getTime() - Date.now()
  if (Number.isNaN(target.getTime()) || ms <= 0) {
    return { days: 0, label: 'Ended' }
  }
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  const mins = Math.max(1, Math.ceil((ms % (60 * 60 * 1000)) / (60 * 1000)))
  if (days >= 2) return { days, label: `${days} days` }
  if (days === 1) return { days: 1, label: '1 day' }
  if (hours >= 1) return { days: 0, label: `${hours}h` }
  return { days: 0, label: `${mins}m` }
}

function stateFromDemo(store: DemoStore): GiveawayState {
  const rate = TIER_RATES[store.tier]
  const adsRemaining = Math.max(0, ADS_PER_DAY - store.adsCount)
  const drawAtDate = endOfMonthDrawAt()
  const drawAt = drawAtDate.toISOString()
  const deadline = deadlineFromDrawAt(drawAtDate)
  return {
    chips: store.chips,
    chipsPerTicket: CHIPS_PER_TICKET,
    chipsNeeded: Math.max(0, CHIPS_PER_TICKET - store.chips),
    ticketCount: store.tickets.length,
    tickets: store.tickets,
    tier: store.tier,
    tierLabel: rate.label,
    tierRate: {
      dollars: rate.dollars,
      tickets: rate.tickets,
      summary: `$${rate.dollars} → ${rate.tickets} ticket${rate.tickets === 1 ? '' : 's'}`,
    },
    adsWatchedToday: store.adsCount,
    adsRemainingToday: adsRemaining,
    adsPerDay: ADS_PER_DAY,
    purchaseSpendTowardNext: store.purchaseSpend,
    purchaseSpendNeeded: Math.max(0, rate.dollars - store.purchaseSpend),
    title: 'MONTHLY MEGA DRAW',
    prize: '$25,000',
    drawDate: formatDrawDate(drawAtDate),
    drawAt,
    deadlineDays: deadline.days,
    deadlineLabel: deadline.label,
    howItWorks: [
      `Watch up to ${ADS_PER_DAY} videos a day — each completed video fills 1 chip.`,
      `${CHIPS_PER_TICKET} chips = 1 giveaway ticket with a random entry number.`,
      `Purchases also earn tickets by your ${rate.label} tier: $${rate.dollars} → ${rate.tickets} ticket${rate.tickets === 1 ? '' : 's'}.`,
      'Purchases of $25+ also grant 1 bonus chip.',
    ],
  }
}

function sourceLabel(source: string) {
  if (source === 'ad') return 'Video ad'
  if (source === 'topup') return 'Top-up'
  if (source === 'load') return 'Game load'
  if (source === 'purchase') return 'Purchase'
  return 'Bonus'
}

export default function GiveawayPage() {
  const useApi = isApiConfigured()
  const [state, setState] = useState<GiveawayState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [watching, setWatching] = useState(false)
  const [watchProgress, setWatchProgress] = useState(0)
  const [selectedTicket, setSelectedTicket] = useState<GiveawayTicket | null>(null)
  const [celebrating, setCelebrating] = useState<GiveawayTicket[] | null>(null)
  const [flashChips, setFlashChips] = useState<number | null>(null)
  const [completing, setCompleting] = useState(false)
  const [deadlineLabel, setDeadlineLabel] = useState('')
  const [adError, setAdError] = useState('')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const maxWatchedRef = useRef(0)
  const celebrateTimer = useRef<number | null>(null)
  const finishingRef = useRef(false)

  function applyAward(next: GiveawayState, newTickets: GiveawayTicket[], chipsBefore?: number) {
    if (celebrateTimer.current) {
      window.clearTimeout(celebrateTimer.current)
      celebrateTimer.current = null
    }

    if (newTickets.length > 0) {
      // Fill all 6 chips, sparkle gold, then explode into ticket(s).
      setFlashChips(CHIPS_PER_TICKET)
      setCompleting(true)
      celebrateTimer.current = window.setTimeout(() => {
        setCompleting(false)
        setFlashChips(null)
        setState(next)
        setCelebrating(newTickets)
        celebrateTimer.current = window.setTimeout(() => {
          setCelebrating(null)
          celebrateTimer.current = null
        }, 2600)
      }, 700)
      return
    }

    if (typeof chipsBefore === 'number') {
      setFlashChips(Math.min(CHIPS_PER_TICKET, chipsBefore + 1))
      window.setTimeout(() => setFlashChips(null), 500)
    }
    setState(next)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    if (!useApi) {
      const demo = loadDemo()
      saveDemo(demo)
      if (!cancelled) {
        setState(stateFromDemo(demo))
        setLoading(false)
      }
      return () => {
        cancelled = true
      }
    }

    void tapstackApi
      .customerGiveaway()
      .then((res) => {
        if (!cancelled) setState(res)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Could not load tickets')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      if (celebrateTimer.current) window.clearTimeout(celebrateTimer.current)
    }
  }, [useApi])

  useEffect(() => {
    if (!state?.drawAt) {
      setDeadlineLabel(state?.deadlineLabel || '')
      return
    }

    const tick = () => setDeadlineLabel(deadlineFromDrawAt(state.drawAt).label)
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [state?.drawAt, state?.deadlineLabel])

  useEffect(() => {
    if (!watching) return
    const video = videoRef.current
    if (!video) return

    finishingRef.current = false
    maxWatchedRef.current = 0
    setWatchProgress(0)
    setAdError('')
    video.muted = true
    video.currentTime = 0

    const playPromise = video.play()
    if (playPromise) {
      void playPromise.catch(() => {
        setAdError('Tap play to start the ad. Watch it all the way through to earn your chip.')
      })
    }
  }, [watching])

  async function finishWatchAd() {
    if (finishingRef.current) return
    finishingRef.current = true
    setWatching(false)
    setWatchProgress(0)
    setBusy(true)
    const chipsBefore = state?.chips ?? 0

    try {
      if (!useApi) {
        const demo = loadDemo()
        if (demo.adsCount >= ADS_PER_DAY) {
          setError(`You already watched ${ADS_PER_DAY} videos today.`)
          return
        }
        demo.adsCount += 1
        const result = applyChips(demo, 1, 'ad')
        saveDemo(result.store)
        applyAward(stateFromDemo(result.store), result.newTickets, chipsBefore)
        return
      }

      const res = await tapstackApi.customerWatchAd()
      applyAward(res.giveaway, res.newTickets || [], chipsBefore)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not credit ad chip')
    } finally {
      setBusy(false)
      finishingRef.current = false
    }
  }

  function cancelWatchAd() {
    const video = videoRef.current
    if (video) {
      video.pause()
      video.currentTime = 0
    }
    setWatching(false)
    setWatchProgress(0)
    setAdError('')
    maxWatchedRef.current = 0
  }

  function startWatchAd() {
    if (busy || watching || !state || state.adsRemainingToday <= 0) return
    setError('')
    setAdError('')
    setWatching(true)
    setWatchProgress(0)
  }

  function onAdTimeUpdate() {
    const video = videoRef.current
    if (!video || !video.duration) return
    maxWatchedRef.current = Math.max(maxWatchedRef.current, video.currentTime)
    setWatchProgress(Math.min(100, Math.round((video.currentTime / video.duration) * 100)))
  }

  function onAdSeeking() {
    const video = videoRef.current
    if (!video) return
    // Block skipping ahead — must watch the full ad.
    if (video.currentTime > maxWatchedRef.current + 0.35) {
      video.currentTime = maxWatchedRef.current
    }
  }

  function onAdEnded() {
    setWatchProgress(100)
    void finishWatchAd()
  }

  function demoPurchase(amount: number) {
    if (useApi || busy) return
    setBusy(true)
    setError('')
    const chipsBefore = state?.chips ?? 0
    try {
      const demo = loadDemo()
      const rate = TIER_RATES[demo.tier]
      let chips = 0
      if (amount >= 25) chips += 1
      let spend = demo.purchaseSpend + amount
      while (spend >= rate.dollars) {
        spend -= rate.dollars
        chips += rate.tickets * CHIPS_PER_TICKET
      }
      demo.purchaseSpend = spend
      const result = applyChips(demo, chips, 'purchase')
      saveDemo(result.store)
      applyAward(stateFromDemo(result.store), result.newTickets, chipsBefore)
    } finally {
      setBusy(false)
    }
  }

  function setDemoTier(tier: TicketTier) {
    if (useApi) return
    const demo = loadDemo()
    demo.tier = tier
    saveDemo(demo)
    setState(stateFromDemo(demo))
  }

  if (loading && !state) {
    return (
      <div className="giveaway-page" aria-busy="true">
        <div className="giveaway-skel" />
        <div className="giveaway-skel giveaway-skel--tall" />
      </div>
    )
  }

  if (!state) {
    return (
      <div className="giveaway-page">
        <p className="giveaway-error">{error || 'Tickets unavailable.'}</p>
      </div>
    )
  }

  const displayChips = flashChips ?? state.chips

  return (
    <div className="giveaway-page">
      <div className="giveaway-hero">
        <div className="giveaway-hero-text">
          <h1 className="giveaway-title">
            <span className="giveaway-title-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3.5 9.5A2.5 2.5 0 0 0 6 7h12a2.5 2.5 0 0 0 2.5 2.5V11a1.5 1.5 0 1 1 0 3v1.5A2.5 2.5 0 0 0 18 18H6a2.5 2.5 0 0 0-2.5-2.5V14a1.5 1.5 0 1 1 0-3V9.5Z"
                  fill="#d4af37"
                />
                <path
                  d="M9 8v8M15 8v8"
                  stroke="#fff7cc"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeDasharray="1.8 2.2"
                />
              </svg>
            </span>
            Tickets
          </h1>
          <p className="giveaway-subtitle">
            Collect chips · 6 chips = 1 giveaway entry · {state.tierLabel} tier
          </p>
        </div>
        <div className="giveaway-tickets-pill">
          {state.ticketCount} ticket{state.ticketCount === 1 ? '' : 's'}
        </div>
      </div>

      <section className="mega-draw-card">
        <div className="mega-draw-watermark" aria-hidden="true">
          ADMIT
          <br />
          ONE
        </div>
        <div className="mega-draw-label">
          <span className="mega-draw-label-icon" aria-hidden="true">
            🎰
          </span>
          {state.title}
        </div>
        <p className="mega-draw-prize">{state.prize}</p>
        <p className="mega-draw-desc">
          Each ticket is one entry with a unique number. More tickets, more chances.
        </p>
        <div className="mega-draw-meta">
          <div className="mega-draw-meta-box">
            <span className="mega-draw-meta-label">DRAWS</span>
            <span className="mega-draw-meta-value">{state.drawDate}</span>
          </div>
          <div className="mega-draw-meta-box">
            <span className="mega-draw-meta-label">DEADLINE IN</span>
            <span className="mega-draw-meta-value">{deadlineLabel || state.deadlineLabel}</span>
          </div>
        </div>
      </section>

      <section className="chips-card">
        <div className="chips-card-head">
          <h2 className="chips-card-title">Chip progress</h2>
          <span className="chips-card-count">
            {state.chips}/{state.chipsPerTicket}
          </span>
        </div>

        <div
          className={`chips-row${completing ? ' chips-row--completing' : ''}`}
          role="list"
          aria-label="Chip slots"
        >
          {Array.from({ length: state.chipsPerTicket }, (_, index) => {
            const filled = index < displayChips || completing
            return (
              <div
                key={index}
                role="listitem"
                className={`chip-slot${filled ? ' chip-slot--filled' : ' chip-slot--empty'}${
                  flashChips !== null && index === flashChips - 1 && !completing
                    ? ' chip-slot--pulse'
                    : ''
                }${completing ? ' chip-slot--sparkle' : ''}`}
                style={completing ? { animationDelay: `${index * 60}ms` } : undefined}
              >
                <span className="chip-face" aria-hidden="true">
                  {filled ? '●' : '○'}
                </span>
              </div>
            )
          })}
        </div>

        <p className="chips-needed">
          {state.chipsNeeded === 0
            ? 'Ready to convert into a ticket…'
            : state.chipsNeeded === 1
              ? '1 more chip needed for your next Giveaway Ticket Entry.'
              : `${state.chipsNeeded} more chips needed for your next Giveaway Ticket Entry.`}
        </p>

        <div className="chips-actions">
          <button
            type="button"
            className="chips-watch-btn"
            onClick={startWatchAd}
            disabled={busy || watching || state.adsRemainingToday <= 0}
          >
            {watching
              ? `Watching… ${watchProgress}%`
              : state.adsRemainingToday > 0
                ? `Watch video (+1 chip) · ${state.adsRemainingToday} left today`
                : 'Daily video limit reached'}
          </button>
        </div>

        {watching ? (
          <div className="ad-watch-modal" role="dialog" aria-modal="true" aria-label="Sponsored video">
            <button
              type="button"
              className="ad-watch-backdrop"
              aria-label="Close without earning"
              onClick={cancelWatchAd}
            />
            <div className="ad-watch-sheet">
              <div className="ad-watch-sheet-head">
                <span className="ad-watch-badge">Sponsored</span>
                <button type="button" className="ad-watch-close" onClick={cancelWatchAd}>
                  Close
                </button>
              </div>
              <p className="ad-watch-copy">
                Watch the full video to earn +1 chip. Skipping ahead is disabled.
              </p>
              <div className="ad-watch-player">
                <video
                  ref={videoRef}
                  className="ad-watch-video"
                  src={DEMO_AD_VIDEO_SRC}
                  playsInline
                  muted
                  controls
                  controlsList="nodownload noplaybackrate noremoteplayback"
                  disablePictureInPicture
                  preload="auto"
                  onTimeUpdate={onAdTimeUpdate}
                  onSeeking={onAdSeeking}
                  onEnded={onAdEnded}
                  onError={() =>
                    setAdError('Could not load the demo ad video. Refresh and try again.')
                  }
                />
              </div>
              <div className="ad-watch-bar" aria-hidden="true">
                <div className="ad-watch-fill" style={{ width: `${watchProgress}%` }} />
              </div>
              <p className="ad-watch-progress-label">
                {watchProgress < 100 ? `${watchProgress}% watched — keep watching` : 'Complete — awarding chip…'}
              </p>
              {adError ? <p className="ad-watch-error">{adError}</p> : null}
            </div>
          </div>
        ) : null}
      </section>

      <section className="tier-card">
        <div className="tier-card-main">
          <p className="tier-card-label">Your earn rate</p>
          <p className="tier-card-value">
            {state.tierLabel} · {state.tierRate.summary}
          </p>
          <p className="tier-card-sub">
            ${state.purchaseSpendTowardNext.toFixed(0)} toward next tier award · $
            {state.purchaseSpendNeeded.toFixed(0)} to go
          </p>
        </div>
        {!useApi ? (
          <div className="tier-demo-tools">
            <label className="tier-demo-label">
              Demo tier
              <select
                value={state.tier}
                onChange={(e) => setDemoTier(e.target.value as TicketTier)}
              >
                {(Object.keys(TIER_RATES) as TicketTier[]).map((tier) => (
                  <option key={tier} value={tier}>
                    {TIER_RATES[tier].label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="tier-demo-buy" onClick={() => demoPurchase(25)} disabled={busy}>
              Simulate $25 purchase
            </button>
            <button type="button" className="tier-demo-buy" onClick={() => demoPurchase(40)} disabled={busy}>
              Simulate $40 purchase
            </button>
          </div>
        ) : null}
      </section>

      <div className="giveaway-info-box">
        <span className="giveaway-info-icon" aria-hidden="true">
          🎟️
        </span>
        <ul className="giveaway-info-list">
          {state.howItWorks.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      {error ? <p className="giveaway-error">{error}</p> : null}

      <section className="your-tickets-section">
        <div className="your-numbers-header">
          <div>
            <h2 className="your-numbers-title">Your tickets</h2>
            <p className="your-numbers-subtitle">Tap a ticket to reveal its entry number</p>
          </div>
        </div>

        {state.tickets.length === 0 ? (
          <p className="tickets-empty">No tickets yet — watch a video or make a purchase to start filling chips.</p>
        ) : (
          <div className="tickets-grid">
            {state.tickets.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                className="ticket-card"
                onClick={() => setSelectedTicket(ticket)}
              >
                <span className="ticket-card-stub" aria-hidden="true" />
                <span className="ticket-card-body">
                  <span className="ticket-card-label">Giveaway entry</span>
                  <span className="ticket-card-masked">••••••</span>
                  <span className="ticket-card-source">{sourceLabel(ticket.source)}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedTicket ? (
        <div className="ticket-modal" role="dialog" aria-modal="true" aria-label="Ticket number">
          <button
            type="button"
            className="ticket-modal-backdrop"
            aria-label="Close"
            onClick={() => setSelectedTicket(null)}
          />
          <div className="ticket-modal-sheet">
            <p className="ticket-modal-kicker">Your entry number</p>
            <p className="ticket-modal-number">{selectedTicket.number}</p>
            <p className="ticket-modal-meta">
              Earned via {sourceLabel(selectedTicket.source)} ·{' '}
              {new Date(selectedTicket.createdAt).toLocaleString()}
            </p>
            <button type="button" className="ticket-modal-close" onClick={() => setSelectedTicket(null)}>
              Close
            </button>
          </div>
        </div>
      ) : null}

      {celebrating ? (
        <div className="chip-celebrate" aria-live="assertive">
          <div className="chip-celebrate-glow" aria-hidden="true" />
          <div className="chip-celebrate-burst" aria-hidden="true">
            {Array.from({ length: 24 }, (_, i) => (
              <span key={i} className={`chip-spark chip-spark--${i % 12}`} />
            ))}
          </div>
          <div className="chip-celebrate-ticket">
            <span className="chip-celebrate-shine" aria-hidden="true" />
            <span className="chip-celebrate-label">
              {celebrating.length === 1 ? 'Ticket unlocked!' : `${celebrating.length} tickets unlocked!`}
            </span>
            <span className="chip-celebrate-number">
              {celebrating.length === 1 ? celebrating[0].number : 'Tap tickets to view numbers'}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
