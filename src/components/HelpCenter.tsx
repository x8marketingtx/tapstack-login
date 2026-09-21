import { useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  getSessionRole,
  getSessionUser,
  getToken,
  isApiConfigured,
  tapstackApi,
  type SupportCategory,
  type SupportTicket,
  type SupportTicketStatus,
} from '../api/client'
import './HelpCenter.css'

type HelpView = 'list' | 'compose' | 'detail'
export type HelpMode = 'submitter' | 'inbox' | 'store' | 'store-inbox'

const CATEGORIES: SupportCategory[] = [
  { id: 'account', label: 'Account' },
  { id: 'billing', label: 'Billing & payouts' },
  { id: 'orders', label: 'Orders' },
  { id: 'games', label: 'Games' },
  { id: 'promos', label: 'Promos' },
  { id: 'technical', label: 'Technical' },
  { id: 'other', label: 'Other' },
]

function statusLabelFor(status: SupportTicketStatus, mode: HelpMode): string {
  if (status === 'resolved') return 'Resolved'
  if (status === 'closed') return 'Closed'
  const staffView = mode === 'inbox' || mode === 'store-inbox'
  if (status === 'pending') {
    if (mode === 'store-inbox') return 'Waiting on player'
    if (mode === 'inbox') return 'Waiting on them'
    return 'Waiting on you'
  }
  if (staffView) return 'Waiting on you'
  if (mode === 'store') return 'Waiting on store'
  return 'Open'
}

function useDemoMode() {
  const token = getToken()
  return !isApiConfigured() || Boolean(token?.startsWith('demo:'))
}

function demoKey(mode: HelpMode, vendorId?: string | number) {
  if (mode === 'inbox') return 'tapstack_support_tickets:inbox'
  if (mode === 'store' || mode === 'store-inbox') {
    return `tapstack_store_tickets:${mode}:${vendorId || 'demo'}`
  }
  const role = getSessionRole() || 'vendor'
  return `tapstack_support_tickets:submitter:${role}`
}

function readDemo(mode: HelpMode, vendorId?: string | number): SupportTicket[] {
  try {
    const raw = localStorage.getItem(demoKey(mode, vendorId))
    if (!raw) return mode === 'inbox' ? seedInbox() : mode === 'store-inbox' ? seedStoreInbox() : []
    return JSON.parse(raw) as SupportTicket[]
  } catch {
    return []
  }
}

function writeDemo(mode: HelpMode, tickets: SupportTicket[], vendorId?: string | number) {
  localStorage.setItem(demoKey(mode, vendorId), JSON.stringify(tickets))
}

function seedInbox(): SupportTicket[] {
  return [
    {
      id: 1042,
      subject: 'Payout still pending',
      category: 'billing',
      categoryLabel: 'Billing & payouts',
      status: 'open',
      statusLabel: 'Open',
      role: 'vendor',
      authorName: 'Lucky Strike Arcade',
      authorEmail: 'vendor@tapstack.demo',
      message: 'Our weekly payout has not arrived. Can you check the transfer?',
      createdAt: new Date(Date.now() - 3600_000 * 6).toISOString(),
      updatedAt: new Date(Date.now() - 3600_000 * 6).toISOString(),
      replies: [],
    },
  ]
}

function seedStoreInbox(): SupportTicket[] {
  return [
    {
      id: 2108,
      vendorId: 1,
      vendorName: 'Lucky Strike Arcade',
      channel: 'store',
      subject: 'Load didn’t credit',
      category: 'orders',
      categoryLabel: 'Orders',
      status: 'open',
      statusLabel: 'Open',
      role: 'player',
      authorName: 'Alex Rivera',
      authorEmail: 'alex@tapstack.demo',
      message: 'I loaded $50 on Fire Kirin and the balance still hasn’t shown up.',
      createdAt: new Date(Date.now() - 3600_000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 3600_000 * 3).toISOString(),
      replies: [],
    },
  ]
}

function formatWhen(iso?: string) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function HelpCenter({
  mode,
  onBack,
  vendorId,
  vendorName,
  embedded = false,
  onOpenCount,
}: {
  mode: HelpMode
  onBack: () => void
  vendorId?: string | number
  vendorName?: string
  embedded?: boolean
  onOpenCount?: (count: number) => void
}) {
  const demo = useDemoMode()
  const [view, setView] = useState<HelpView>('list')
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [categories, setCategories] = useState<SupportCategory[]>(CATEGORIES)
  const [selected, setSelected] = useState<SupportTicket | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('account')
  const [message, setMessage] = useState('')
  const [reply, setReply] = useState('')
  const inbox = mode === 'inbox' || mode === 'store-inbox'
  const store = mode === 'store' || mode === 'store-inbox'
  const storeInbox = mode === 'store-inbox'
  const partnerName = vendorName || 'this store'

  const openCount = useMemo(
    () => tickets.filter((ticket) => ticket.status === 'open' || ticket.status === 'pending').length,
    [tickets],
  )

  async function loadList() {
    setLoading(true)
    setError('')
    try {
      if (demo) {
        const next = readDemo(mode, vendorId)
        setTickets(next)
        setCategories(CATEGORIES)
        onOpenCount?.(next.filter((ticket) => ticket.status === 'open' || ticket.status === 'pending').length)
        return
      }
      const next =
        mode === 'store' && vendorId
          ? await tapstackApi.customerVendorSupport(vendorId)
          : mode === 'store-inbox'
            ? await tapstackApi.vendorStoreSupport()
            : inbox
              ? await tapstackApi.adminSupportTickets()
              : await tapstackApi.supportTickets()
      const listed = next.tickets || []
      setTickets(listed)
      onOpenCount?.(
        listed.filter((ticket) => ticket.status === 'open' || ticket.status === 'pending').length,
      )
      if (next.categories?.length) setCategories(next.categories)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load tickets.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadList()
  }, [mode, demo, inbox, vendorId])

  async function openTicket(ticket: SupportTicket) {
    setError('')
    setReply('')
    if (demo) {
      const full = readDemo(mode, vendorId).find((item) => item.id === ticket.id) || ticket
      setSelected({ ...full, replies: full.replies || [] })
      setView('detail')
      return
    }
    try {
      const next =
        mode === 'store' && vendorId
          ? await tapstackApi.customerVendorSupportTicket(vendorId, ticket.id)
          : mode === 'store-inbox'
            ? await tapstackApi.vendorStoreSupportTicket(ticket.id)
            : inbox
              ? await tapstackApi.adminSupportTicket(ticket.id)
              : await tapstackApi.supportTicket(ticket.id)
      setSelected(next.ticket)
      setView('detail')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not open ticket.')
    }
  }

  async function submitTicket() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      if (demo) {
        const user = getSessionUser()
        const created: SupportTicket = {
          id: Date.now(),
          vendorId: vendorId ? Number(vendorId) || undefined : undefined,
          vendorName: vendorName,
          channel: store ? 'store' : 'platform',
          subject: subject.trim(),
          category,
          categoryLabel: categories.find((item) => item.id === category)?.label || 'Other',
          status: 'open',
          statusLabel: 'Open',
          role: store ? 'player' : user?.role || 'vendor',
          authorName: user?.displayName || 'You',
          authorEmail: user?.email || '',
          message: message.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          replies: [],
        }
        const next = [created, ...readDemo(mode, vendorId)]
        writeDemo(mode, next, vendorId)
        setTickets(next)
        setSubject('')
        setMessage('')
        setSelected(created)
        setView('detail')
        return
      }
      const next =
        mode === 'store' && vendorId
          ? await tapstackApi.customerVendorCreateSupport(vendorId, {
              subject: subject.trim(),
              message: message.trim(),
              category,
            })
          : await tapstackApi.supportCreateTicket({
              subject: subject.trim(),
              message: message.trim(),
              category,
            })
      setSubject('')
      setMessage('')
      setSelected(next.ticket)
      setView('detail')
      await loadList()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send ticket.')
    } finally {
      setBusy(false)
    }
  }

  async function sendReply() {
    if (!selected || busy || !reply.trim()) return
    setBusy(true)
    setError('')
    try {
      if (demo) {
        const nextReply = {
          id: Date.now(),
          ticketId: selected.id,
          authorRole: storeInbox ? 'vendor' : inbox ? 'admin' : store ? 'player' : selected.role,
          body: reply.trim(),
          createdAt: new Date().toISOString(),
        }
        const status: SupportTicketStatus = inbox ? 'pending' : 'open'
        const updated: SupportTicket = {
          ...selected,
          status,
          statusLabel: statusLabelFor(status, mode),
          updatedAt: nextReply.createdAt,
          replies: [...(selected.replies || []), nextReply],
        }
        const next = readDemo(mode, vendorId).map((item) => (item.id === selected.id ? updated : item))
        writeDemo(mode, next, vendorId)
        setTickets(next)
        setSelected(updated)
        setReply('')
        return
      }
      const next =
        mode === 'store' && vendorId
          ? await tapstackApi.customerVendorSupportReply(vendorId, selected.id, reply.trim())
          : mode === 'store-inbox'
            ? await tapstackApi.vendorStoreSupportReply(selected.id, reply.trim())
            : inbox
              ? await tapstackApi.adminSupportReply(selected.id, reply.trim())
              : await tapstackApi.supportReplyTicket(selected.id, reply.trim())
      setSelected(next.ticket)
      setReply('')
      await loadList()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send reply.')
    } finally {
      setBusy(false)
    }
  }

  async function setStatus(status: SupportTicketStatus) {
    if (!selected || !inbox || busy) return
    setBusy(true)
    setError('')
    try {
      if (demo) {
        const updated = {
          ...selected,
          status,
          statusLabel: statusLabelFor(status, mode),
          updatedAt: new Date().toISOString(),
        }
        const next = readDemo(mode, vendorId).map((item) => (item.id === selected.id ? updated : item))
        writeDemo(mode, next, vendorId)
        setTickets(next)
        setSelected(updated)
        return
      }
      const next = storeInbox
        ? await tapstackApi.vendorStoreSupportUpdate(selected.id, status)
        : await tapstackApi.adminSupportUpdate(selected.id, status)
      setSelected(next.ticket)
      await loadList()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update ticket.')
    } finally {
      setBusy(false)
    }
  }

  const canSubmit = subject.trim().length >= 3 && message.trim().length >= 10 && !busy
  const title =
    view === 'compose'
      ? 'New ticket'
      : view === 'detail'
        ? selected?.subject || 'Ticket'
        : storeInbox
          ? 'Player tickets'
          : store
            ? `${partnerName} support`
            : inbox
              ? 'Support inbox'
              : 'Help'

  function isMine(authorRole: string) {
    if (storeInbox) return authorRole === 'vendor'
    if (mode === 'inbox') return authorRole === 'admin'
    if (mode === 'store') return authorRole === 'player'
    return authorRole !== 'admin'
  }

  return (
    <div className={`help-center${embedded ? ' help-center--embedded' : ''}`}>
      <header className="help-head">
        <button
          type="button"
          className="help-back"
          onClick={() => {
            if (view === 'list') onBack()
            else {
              setView('list')
              setSelected(null)
              setError('')
            }
          }}
          aria-label={view === 'list' ? 'Close help' : 'Back to tickets'}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M11.25 3.75 L6 9 L11.25 14.25"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="help-head-copy">
          <h1 className="help-title">{title}</h1>
          {view === 'list' ? (
            <p className="help-sub">
              {storeInbox
                ? `${openCount} open player ticket${openCount === 1 ? '' : 's'}`
                : store
                  ? `Message ${partnerName} about loads, redeems, or your account.`
                  : inbox
                    ? `${openCount} open ticket${openCount === 1 ? '' : 's'}`
                    : 'Message TapStack about your account, payouts, or the portal.'}
            </p>
          ) : null}
        </div>
        {view === 'list' && !inbox ? (
          <button type="button" className="help-new" onClick={() => setView('compose')}>
            New
          </button>
        ) : (
          <span className="help-head-spacer" />
        )}
      </header>

      {error ? <p className="help-error">{error}</p> : null}

      {view === 'list' ? (
        <div className="help-body">
          {loading ? <p className="help-empty">Loading tickets…</p> : null}
          {!loading && tickets.length === 0 ? (
            <div className="help-empty-card">
              <p className="help-empty-title">{inbox ? 'No tickets yet' : 'Need a hand?'}</p>
              <p className="help-empty-copy">
                {storeInbox
                  ? 'Players who message this store will show up here.'
                  : store
                    ? `Send ${partnerName} a ticket and they will reply in this thread.`
                    : inbox
                      ? 'Vendor and distributor tickets will show up here.'
                      : 'Send TapStack a ticket and we will follow up in this thread.'}
              </p>
              {!inbox ? (
                <button type="button" className="help-primary" onClick={() => setView('compose')}>
                  {store ? `Contact ${partnerName}` : 'Contact TapStack'}
                </button>
              ) : null}
            </div>
          ) : null}
          {!loading && tickets.length > 0 ? (
            <ul className="help-list">
              {tickets.map((ticket) => (
                <li key={ticket.id}>
                  <button type="button" className="help-row" onClick={() => void openTicket(ticket)}>
                    <span className={`help-status help-status--${ticket.status}`}>
                      {statusLabelFor(ticket.status, mode)}
                    </span>
                    <span className="help-row-copy">
                      <strong>{ticket.subject}</strong>
                      <span>
                        {inbox ? `${ticket.authorName} · ` : ''}
                        {ticket.categoryLabel} · {formatWhen(ticket.updatedAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {!store ? (
            <a className="help-mail" href="mailto:support@tapstack.io">
              Or email support@tapstack.io
            </a>
          ) : null}
        </div>
      ) : null}

      {view === 'compose' ? (
        <form
          className="help-body help-form"
          onSubmit={(event) => {
            event.preventDefault()
            void submitTicket()
          }}
        >
          <label className="help-label">
            Topic
            <select className="help-input" value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="help-label">
            Subject
            <input
              className="help-input"
              value={subject}
              maxLength={120}
              placeholder="Short summary"
              onChange={(event) => setSubject(event.target.value)}
            />
          </label>
          <label className="help-label">
            Message
            <textarea
              className="help-input help-textarea"
              value={message}
              maxLength={4000}
              rows={7}
              placeholder={store ? 'What can this store help with?' : 'What do you need help with?'}
              onChange={(event) => setMessage(event.target.value)}
            />
          </label>
          <button type="submit" className="help-primary" disabled={!canSubmit}>
            {busy ? 'Sending…' : 'Send ticket'}
          </button>
        </form>
      ) : null}

      {view === 'detail' && selected ? (
        <div className="help-body help-detail">
          <div className="help-detail-meta">
            <span className={`help-status help-status--${selected.status}`}>
              {statusLabelFor(selected.status, mode)}
            </span>
            <span>
              {selected.categoryLabel}
              {inbox ? ` · ${selected.role}` : ''} · {formatWhen(selected.createdAt)}
            </span>
            {inbox ? (
              <p className="help-author">
                {selected.authorName}
                {selected.authorEmail ? ` · ${selected.authorEmail}` : ''}
              </p>
            ) : null}
          </div>

          <div className="help-thread">
            <article className={`help-bubble ${inbox ? 'help-bubble--them' : 'help-bubble--mine'}`}>
              <p>{selected.message}</p>
              <time>{formatWhen(selected.createdAt)}</time>
            </article>
            {(selected.replies || []).map((item) => (
              <article
                key={item.id}
                className={`help-bubble ${isMine(item.authorRole) ? 'help-bubble--mine' : 'help-bubble--them'}`}
              >
                <p>{item.body}</p>
                <time>
                  {isMine(item.authorRole)
                    ? 'You'
                    : item.authorRole === 'admin'
                      ? 'TapStack'
                      : item.authorRole === 'vendor'
                        ? partnerName
                        : selected.authorName}{' '}
                  · {formatWhen(item.createdAt)}
                </time>
              </article>
            ))}
          </div>

          {inbox ? (
            <div className="help-status-actions">
              {selected.status !== 'resolved' ? (
                <button type="button" className="help-ghost" disabled={busy} onClick={() => void setStatus('resolved')}>
                  Mark resolved
                </button>
              ) : null}
              {selected.status !== 'closed' ? (
                <button type="button" className="help-ghost" disabled={busy} onClick={() => void setStatus('closed')}>
                  Close
                </button>
              ) : (
                <button type="button" className="help-ghost" disabled={busy} onClick={() => void setStatus('open')}>
                  Reopen
                </button>
              )}
            </div>
          ) : null}

          {selected.status === 'closed' && !inbox ? (
            <p className="help-empty">This ticket is closed. Start a new one if you still need help.</p>
          ) : (
            <form
              className="help-reply"
              onSubmit={(event) => {
                event.preventDefault()
                void sendReply()
              }}
            >
              <textarea
                className="help-input help-textarea"
                rows={3}
                value={reply}
                placeholder={storeInbox ? 'Reply to this player…' : inbox ? 'Reply to this partner…' : 'Add more detail…'}
                onChange={(event) => setReply(event.target.value)}
              />
              <button type="submit" className="help-primary" disabled={busy || reply.trim().length < 2}>
                {busy ? 'Sending…' : 'Send reply'}
              </button>
            </form>
          )}
        </div>
      ) : null}
    </div>
  )
}
