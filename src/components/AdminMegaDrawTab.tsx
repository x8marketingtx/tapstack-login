import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, tapstackApi, type AdminMegaDraw } from '../api/client'
import './AdminMegaDrawTab.css'

const DEFAULT_TITLE = 'MONTHLY MEGA DRAW'
const DEFAULT_PRIZE = 'WIN $10,000'

const DEMO_MEGA_DRAWS: AdminMegaDraw[] = [
  {
    id: 'draw-2025-09',
    title: DEFAULT_TITLE,
    prize: DEFAULT_PRIZE,
    drawAt: '2025-09-30T23:59:00.000Z',
    drawDateLabel: 'Sep 30, 2025',
    status: 'completed',
    participants: 2148,
    ticketCount: 8934,
    adsWatched: 5621,
    purchaseTickets: 2410,
    winnerUsername: 'player_jace',
    winnerTicketNumber: 482917,
  },
  {
    id: 'draw-2025-08',
    title: DEFAULT_TITLE,
    prize: DEFAULT_PRIZE,
    drawAt: '2025-08-31T23:59:00.000Z',
    drawDateLabel: 'Aug 31, 2025',
    status: 'completed',
    participants: 1982,
    ticketCount: 8102,
    adsWatched: 4980,
    purchaseTickets: 2211,
    winnerUsername: 'lucky_quinn',
    winnerTicketNumber: 771204,
  },
  {
    id: 'draw-2025-11',
    title: DEFAULT_TITLE,
    prize: DEFAULT_PRIZE,
    drawAt: '2025-11-30T23:59:00.000Z',
    drawDateLabel: 'Nov 30, 2025',
    status: 'scheduled',
    participants: 0,
    ticketCount: 0,
    adsWatched: 0,
    purchaseTickets: 0,
  },
]

function statusLabel(status: AdminMegaDraw['status']): string {
  if (status === 'live') return 'Live'
  if (status === 'scheduled') return 'Scheduled'
  return 'Completed'
}

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function defaultNextDrawLocal(): string {
  const end = new Date()
  end.setMonth(end.getMonth() + 1, 0)
  end.setHours(23, 59, 0, 0)
  return toDatetimeLocalValue(end.toISOString())
}

function formatDrawDateLabel(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

type ScheduleForm = {
  title: string
  prize: string
  drawAtLocal: string
}

const EMPTY_SCHEDULE: ScheduleForm = {
  title: DEFAULT_TITLE,
  prize: DEFAULT_PRIZE,
  drawAtLocal: defaultNextDrawLocal(),
}

export default function AdminMegaDrawTab({ useApi }: { useApi: boolean }) {
  const [draws, setDraws] = useState<AdminMegaDraw[]>(() => (useApi ? [] : DEMO_MEGA_DRAWS))
  const [loading, setLoading] = useState(useApi)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [form, setForm] = useState<ScheduleForm>(EMPTY_SCHEDULE)

  const load = useCallback(async () => {
    if (!useApi) {
      setDraws(DEMO_MEGA_DRAWS)
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await tapstackApi.adminMegaDraws()
      const history = res.history || []
      const current = res.current
      const merged = current
        ? [current, ...history.filter((row) => row.id !== current.id)]
        : history
      setDraws(merged)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load mega draw history.')
      setDraws([])
    } finally {
      setLoading(false)
    }
  }, [useApi])

  useEffect(() => {
    void load()
  }, [load])

  const { upcoming, history } = useMemo(() => {
    const scheduled = draws.filter((row) => row.status === 'scheduled' || row.status === 'live')
    const past = draws.filter((row) => row.status === 'completed')
    scheduled.sort((a, b) => new Date(a.drawAt).getTime() - new Date(b.drawAt).getTime())
    past.sort((a, b) => new Date(b.drawAt).getTime() - new Date(a.drawAt).getTime())
    return { upcoming: scheduled, history: past }
  }, [draws])

  async function handleSchedule(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    const title = form.title.trim()
    const prize = form.prize.trim()
    const drawAt = form.drawAtLocal ? new Date(form.drawAtLocal).toISOString() : ''
    if (!title || !prize || !drawAt || Number.isNaN(new Date(drawAt).getTime())) {
      setError('Enter a title, prize, and valid draw date.')
      return
    }

    setBusy(true)
    setError('')
    setNote('')
    try {
      if (useApi) {
        const res = await tapstackApi.adminScheduleMegaDraw({ title, prize, drawAt })
        setNote('Mega draw scheduled. Players will see it on the Tickets page.')
        setScheduleOpen(false)
        setForm({ ...EMPTY_SCHEDULE, drawAtLocal: defaultNextDrawLocal() })
        await load()
        if (res.draw) {
          setDraws((list) => [res.draw, ...list.filter((row) => row.id !== res.draw.id)])
        }
      } else {
        const id = `draw-demo-${Date.now()}`
        const next: AdminMegaDraw = {
          id,
          title,
          prize,
          drawAt,
          drawDateLabel: formatDrawDateLabel(drawAt),
          status: 'scheduled',
          participants: 0,
          ticketCount: 0,
          adsWatched: 0,
          purchaseTickets: 0,
        }
        setDraws((list) => [next, ...list])
        setNote('Mega draw scheduled (demo). Matches the Monthly Mega Draw card on the player Tickets tab.')
        setScheduleOpen(false)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not schedule the draw.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-mega-draw">
      <div className="admin-mega-draw-intro">
        <div>
          <h1 className="admin-mega-draw-title">Mega Draw</h1>
          <p className="admin-mega-draw-subtitle">
            Manage the platform{' '}
            <strong>Monthly Mega Draw</strong> shown at the top of the player{' '}
            <strong>Tickets</strong> tab (Tapstack Entry Ticket page).
          </p>
        </div>
        <button
          type="button"
          className="admin-mega-draw-schedule-btn"
          onClick={() => {
            setScheduleOpen((open) => !open)
            setError('')
          }}
        >
          {scheduleOpen ? 'Close' : '+ Schedule draw'}
        </button>
      </div>

      {scheduleOpen ? (
        <section className="admin-mega-draw-schedule-card" aria-labelledby="admin-mega-draw-schedule-title">
          <h2 id="admin-mega-draw-schedule-title">Schedule new draw</h2>
          <p className="admin-mega-draw-schedule-help">
            Sets prize copy and draw date for the mega draw card, chip progress, and ticket entries on the player
            dashboard.
          </p>
          <form className="admin-mega-draw-schedule-form" onSubmit={(event) => void handleSchedule(event)}>
            <label>
              <span>Title</span>
              <input
                type="text"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder={DEFAULT_TITLE}
              />
            </label>
            <label>
              <span>Prize label</span>
              <input
                type="text"
                value={form.prize}
                onChange={(event) => setForm((prev) => ({ ...prev, prize: event.target.value }))}
                placeholder={DEFAULT_PRIZE}
              />
            </label>
            <label>
              <span>Draw date &amp; time</span>
              <input
                type="datetime-local"
                value={form.drawAtLocal}
                onChange={(event) => setForm((prev) => ({ ...prev, drawAtLocal: event.target.value }))}
              />
            </label>
            <button type="submit" className="admin-mega-draw-submit" disabled={busy}>
              {busy ? 'Saving…' : 'Schedule mega draw'}
            </button>
          </form>
        </section>
      ) : null}

      {error ? <p className="admin-api-error">{error}</p> : null}
      {note ? <p className="admin-mega-draw-note">{note}</p> : null}

      {loading ? (
        <div className="admin-mega-draw-loading" aria-busy="true">
          <div className="admin-skel admin-skel--block-lg" />
          <div className="admin-skel admin-skel--block" style={{ marginTop: 10 }} />
        </div>
      ) : (
        <>
          {upcoming.length > 0 ? (
            <section className="admin-mega-draw-section" aria-label="Upcoming mega draws">
              <h2 className="admin-mega-draw-section-title">Upcoming</h2>
              <div className="admin-mega-draw-cards">
                {upcoming.map((draw) => (
                  <MegaDrawCard key={draw.id} draw={draw} />
                ))}
              </div>
            </section>
          ) : null}

          <section className="admin-mega-draw-section" aria-label="Mega draw history">
            <h2 className="admin-mega-draw-section-title">Draw history</h2>
            {history.length === 0 && upcoming.length === 0 ? (
              <p className="admin-empty-hint">No mega draws yet. Schedule the first draw above.</p>
            ) : history.length === 0 ? (
              <p className="admin-empty-hint">No completed draws yet.</p>
            ) : (
              <div className="admin-mega-draw-cards">
                {history.map((draw) => (
                  <MegaDrawCard key={draw.id} draw={draw} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function MegaDrawCard({ draw }: { draw: AdminMegaDraw }) {
  const status = draw.status || 'completed'
  return (
    <article className={`admin-mega-draw-card admin-mega-draw-card--${status}`}>
      <div className="admin-mega-draw-card-head">
        <div>
          <p className="admin-mega-draw-card-eyebrow">{draw.title || DEFAULT_TITLE}</p>
          <h3 className="admin-mega-draw-card-prize">{draw.prize || DEFAULT_PRIZE}</h3>
          <p className="admin-mega-draw-card-date">
            Draw · {draw.drawDateLabel || formatDrawDateLabel(draw.drawAt)}
          </p>
        </div>
        <span className={`admin-mega-draw-status admin-mega-draw-status--${status}`}>
          {statusLabel(status)}
        </span>
      </div>

      <dl className="admin-mega-draw-stats">
        <div>
          <dt>Participants</dt>
          <dd>{(draw.participants ?? 0).toLocaleString()}</dd>
        </div>
        <div>
          <dt>Tickets issued</dt>
          <dd>{(draw.ticketCount ?? 0).toLocaleString()}</dd>
        </div>
        <div>
          <dt>Video ad watches</dt>
          <dd>{(draw.adsWatched ?? 0).toLocaleString()}</dd>
        </div>
        <div>
          <dt>Tickets from purchases</dt>
          <dd>{(draw.purchaseTickets ?? 0).toLocaleString()}</dd>
        </div>
      </dl>

      {status === 'completed' && (draw.winnerUsername || draw.winnerTicketNumber) ? (
        <div className="admin-mega-draw-winner">
          <span className="admin-mega-draw-winner-label">Winner</span>
          <span className="admin-mega-draw-winner-value">
            {draw.winnerUsername ? `@${draw.winnerUsername}` : '—'}
            {draw.winnerTicketNumber != null ? ` · Ticket #${draw.winnerTicketNumber.toLocaleString()}` : ''}
          </span>
        </div>
      ) : null}

      {status === 'scheduled' ? (
        <p className="admin-mega-draw-card-foot">
          Live stats update as players earn chips and tickets on the Tickets page.
        </p>
      ) : null}
    </article>
  )
}
