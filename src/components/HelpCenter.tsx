import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ApiError,
  applyAuthSession,
  getSessionRole,
  getSessionUser,
  getToken,
  isApiConfigured,
  tapstackApi,
  type SupportCategory,
  type SupportTicket,
  type SupportTicketStatus,
} from '../api/client'
import { ImageAgreementCheckbox } from './ImageUploadAgreement'
import './HelpCenter.css'

const CHAT_IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'

type ChatAttachment = {
  file: File
  previewUrl: string
  imageId?: number
  imageUrl?: string
}

function PaperclipIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.2-9.2a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function HelpChatComposer({
  value,
  onChange,
  busy,
  disabled,
  placeholder,
  rows,
  submitLabel,
  minTextLength = 0,
  attachment,
  onAttachmentChange,
  attachAgreed,
  onAttachAgreedChange,
  attachError,
  extraActions,
}: {
  value: string
  onChange: (next: string) => void
  busy: boolean
  disabled?: boolean
  placeholder: string
  rows: number
  submitLabel: string
  minTextLength?: number
  attachment: ChatAttachment | null
  onAttachmentChange: (next: ChatAttachment | null) => void
  attachAgreed: boolean
  onAttachAgreedChange: (agreed: boolean) => void
  attachError?: string
  extraActions?: ReactNode
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasText = value.trim().length >= minTextLength
  const hasContent = hasText || Boolean(attachment)
  const canSend = !busy && !disabled && hasContent && (!attachment || attachAgreed)

  function pickFile(file: File | null) {
    if (!file) return
    onAttachmentChange({
      file,
      previewUrl: URL.createObjectURL(file),
    })
  }

  function clearAttachment() {
    if (attachment?.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(attachment.previewUrl)
    }
    onAttachmentChange(null)
  }

  return (
    <>
      {attachment ? (
        <div className="help-attach-preview">
          <img src={attachment.previewUrl} alt="" />
          <button
            type="button"
            className="help-attach-preview-remove"
            aria-label="Remove image"
            disabled={busy}
            onClick={clearAttachment}
          >
            ×
          </button>
        </div>
      ) : null}
      {attachError ? <p className="help-attach-error">{attachError}</p> : null}
      <div className="help-reply-row">
        <button
          type="button"
          className="help-attach-btn"
          aria-label="Attach image"
          disabled={busy || disabled}
          onClick={() => fileInputRef.current?.click()}
        >
          <PaperclipIcon />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={CHAT_IMAGE_ACCEPT}
          className="help-attach-input"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            pickFile(event.target.files?.[0] || null)
            event.target.value = ''
          }}
        />
        <textarea
          className="help-input help-textarea help-textarea--inline"
          rows={rows}
          value={value}
          placeholder={placeholder}
          disabled={busy || disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {extraActions}
      {attachment ? (
        <div className="help-attach-agreement">
          <ImageAgreementCheckbox checked={attachAgreed} onChange={onAttachAgreedChange} />
        </div>
      ) : null}
      <button type="submit" className="help-primary" disabled={!canSend}>
        {busy ? 'Sending…' : submitLabel}
      </button>
    </>
  )
}

function renderBubbleContent(body: string, imageUrl?: string) {
  return (
    <>
      {imageUrl ? (
        <a className="help-bubble-image-link" href={imageUrl} target="_blank" rel="noopener noreferrer">
          <img src={imageUrl} alt="Attached image" className="help-bubble-image" />
        </a>
      ) : null}
      {body ? <p>{body}</p> : null}
    </>
  )
}

type HelpView = 'list' | 'compose' | 'detail' | 'chat-start'

const DIRECT_CHAT_SUBJECT = 'Support Chat'
export type HelpMode = 'submitter' | 'inbox' | 'store' | 'store-inbox'

const CATEGORIES: SupportCategory[] = [
  { id: 'account', label: 'Account' },
  { id: 'billing', label: 'Billing & payouts' },
  { id: 'orders', label: 'Orders' },
  { id: 'games', label: 'Games' },
  { id: 'promos', label: 'Promos and Giveaways' },
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
      channel: 'platform',
      authorName: 'Lucky Strike Arcade',
      authorEmail: 'vendor@tapstack.demo',
      message: 'Our weekly payout has not arrived. Can you check the transfer?',
      createdAt: new Date(Date.now() - 3600_000 * 6).toISOString(),
      updatedAt: new Date(Date.now() - 3600_000 * 6).toISOString(),
      replies: [],
    },
    {
      id: 1043,
      subject: 'New vendor onboarding',
      category: 'account',
      categoryLabel: 'Account',
      status: 'pending',
      statusLabel: 'Pending',
      role: 'distributor',
      channel: 'platform',
      authorName: 'Pacific Gaming Partners',
      authorEmail: 'ops@pacificgaming.demo',
      message: 'We added two vendors this week — can you confirm their reserve wallets are linked?',
      createdAt: new Date(Date.now() - 3600_000 * 20).toISOString(),
      updatedAt: new Date(Date.now() - 3600_000 * 2).toISOString(),
      replies: [],
    },
    {
      id: 1044,
      subject: 'Cannot link vendor code',
      category: 'technical',
      categoryLabel: 'Technical',
      status: 'open',
      statusLabel: 'Open',
      role: 'player',
      channel: 'platform',
      authorName: 'Alex Rivera',
      authorEmail: 'alex@tapstack.demo',
      message: 'The Add Vendor code from my friend says invalid on the Games tab.',
      createdAt: new Date(Date.now() - 3600_000 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 3600_000 * 4).toISOString(),
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

function formatRole(role: string) {
  if (role === 'player') return 'Player'
  if (role === 'vendor') return 'Vendor'
  if (role === 'distributor') return 'Distributor'
  if (role === 'admin') return 'TapStack'
  return role
}

export type SupportSubmitterFilter = 'all' | 'player' | 'vendor' | 'distributor'

export default function HelpCenter({
  mode,
  onBack,
  vendorId,
  vendorName,
  embedded = false,
  directChat = false,
  hideListBack = false,
  platformOnly = false,
  roleFilter = 'all',
  onOpenCount,
}: {
  mode: HelpMode
  onBack: () => void
  vendorId?: string | number
  vendorName?: string
  embedded?: boolean
  /** Player ↔ store: open a single messenger thread (no ticket list / compose form). */
  directChat?: boolean
  /** Hide back control on the ticket list (embedded admin Support tab). */
  hideListBack?: boolean
  /** Admin inbox: hide store-direct tickets. */
  platformOnly?: boolean
  roleFilter?: SupportSubmitterFilter
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
  const storeDirectChat = directChat && mode === 'store'
  const directChatBooted = useRef(false)
  const [gptConnected, setGptConnected] = useState(() => Boolean(getSessionUser()?.openaiConnected))
  const [gptKey, setGptKey] = useState('')
  const [gptBusy, setGptBusy] = useState(false)
  const [gptPrompt, setGptPrompt] = useState('')
  const [gptReply, setGptReply] = useState('')
  const [chatAttachment, setChatAttachmentState] = useState<ChatAttachment | null>(null)
  const [attachAgreed, setAttachAgreed] = useState(false)
  const [attachError, setAttachError] = useState('')

  function clearChatAttachment() {
    setChatAttachmentState((current) => {
      if (current?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(current.previewUrl)
      return null
    })
    setAttachAgreed(false)
    setAttachError('')
  }

  function updateChatAttachment(next: ChatAttachment | null) {
    setChatAttachmentState((current) => {
      if (next?.file !== current?.file) setAttachAgreed(false)
      return next
    })
    setAttachError('')
  }

  function requireAttachAgreement(): boolean {
    if (!chatAttachment || attachAgreed) return true
    setAttachError(
      'Confirm that this image is not offensive and that you have the rights to upload it.',
    )
    return false
  }

  async function resolveChatAttachment(): Promise<{ imageId?: number; imageUrl?: string }> {
    if (!chatAttachment) return {}
    if (chatAttachment.imageId) {
      return { imageId: chatAttachment.imageId, imageUrl: chatAttachment.imageUrl }
    }
    if (demo) {
      return {
        imageId: Date.now(),
        imageUrl: chatAttachment.previewUrl,
      }
    }
    const uploaded =
      mode === 'store' && vendorId
        ? await tapstackApi.uploadCustomerVendorSupportImage(vendorId, chatAttachment.file)
        : await tapstackApi.uploadSupportImage(chatAttachment.file)
    return { imageId: uploaded.imageId, imageUrl: uploaded.imageUrl }
  }

  const visibleTickets = useMemo(() => {
    let list = tickets
    if (platformOnly) {
      list = list.filter((ticket) => ticket.channel !== 'store')
    }
    if (roleFilter !== 'all') {
      list = list.filter((ticket) => ticket.role === roleFilter)
    }
    return list
  }, [tickets, platformOnly, roleFilter])

  const openCount = useMemo(
    () =>
      visibleTickets.filter((ticket) => ticket.status === 'open' || ticket.status === 'pending').length,
    [visibleTickets],
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
      const reportedOpen =
        'openCount' in next && typeof next.openCount === 'number' ? next.openCount : undefined
      onOpenCount?.(
        reportedOpen ??
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

  useEffect(() => {
    onOpenCount?.(openCount)
  }, [openCount, onOpenCount])

  useEffect(() => {
    directChatBooted.current = false
  }, [mode, vendorId, directChat])

  useEffect(() => {
    if (!storeDirectChat || loading || directChatBooted.current) return
    directChatBooted.current = true
    const sorted = [...tickets].sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.updatedAt || a.createdAt || 0).getTime(),
    )
    const active = sorted.find(
      (ticket) => ticket.status === 'open' || ticket.status === 'pending',
    )
    const thread = active || sorted[0]
    if (thread && thread.status !== 'closed' && thread.status !== 'resolved') {
      void openTicket(thread)
      return
    }
    setView('chat-start')
    setSelected(null)
  }, [storeDirectChat, loading, tickets])

  async function openTicket(ticket: SupportTicket) {
    setError('')
    setReply('')
    clearChatAttachment()
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

  async function submitTicket(initialMessage?: string) {
    if (busy) return
    const body = (initialMessage ?? message).trim()
    const ticketSubject = storeDirectChat ? DIRECT_CHAT_SUBJECT : subject.trim()
    const ticketCategory = storeDirectChat ? 'other' : category
    if (storeDirectChat) {
      if (body.length < 1 && !chatAttachment) return
    } else if (ticketSubject.length < 3 || body.length < 10) {
      return
    }
    if (!requireAttachAgreement()) return
    setBusy(true)
    setError('')
    setAttachError('')
    try {
      let imageId: number | undefined
      let imageUrl: string | undefined
      if (chatAttachment) {
        const resolved = await resolveChatAttachment()
        imageId = resolved.imageId
        imageUrl = resolved.imageUrl
      }
      if (demo) {
        const user = getSessionUser()
        const created: SupportTicket = {
          id: Date.now(),
          vendorId: vendorId ? Number(vendorId) || undefined : undefined,
          vendorName: vendorName,
          channel: store ? 'store' : 'platform',
          subject: ticketSubject,
          category: ticketCategory,
          categoryLabel: categories.find((item) => item.id === ticketCategory)?.label || 'Other',
          status: 'open',
          statusLabel: 'Open',
          role: store ? 'player' : user?.role || 'vendor',
          authorName: user?.displayName || 'You',
          authorEmail: user?.email || '',
          message: body || (imageUrl ? 'Photo' : ''),
          imageId,
          imageUrl,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          replies: [],
        }
        const next = [created, ...readDemo(mode, vendorId)]
        writeDemo(mode, next, vendorId)
        setTickets(next)
        setSubject('')
        setMessage('')
        clearChatAttachment()
        setSelected(created)
        setView('detail')
        onOpenCount?.(
          next.filter((ticket) => ticket.status === 'open' || ticket.status === 'pending').length,
        )
        return
      }
      const next =
        mode === 'store' && vendorId
          ? await tapstackApi.customerVendorCreateSupport(vendorId, {
              subject: ticketSubject,
              message: body || 'Photo',
              category: ticketCategory,
              ...(imageId ? { imageId } : {}),
            })
          : await tapstackApi.supportCreateTicket({
              subject: ticketSubject,
              message: body || 'Photo',
              category: ticketCategory,
              ...(imageId ? { imageId } : {}),
            })
      setSubject('')
      setMessage('')
      clearChatAttachment()
      setSelected(next.ticket)
      setView('detail')
      await loadList()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not send ticket.'
      if (chatAttachment && storeDirectChat) setAttachError(message)
      else setError(message)
    } finally {
      setBusy(false)
    }
  }

  async function sendReply() {
    if (!selected || busy) return
    const text = reply.trim()
    if (!text && !chatAttachment) return
    if (!requireAttachAgreement()) return
    setBusy(true)
    setError('')
    setAttachError('')
    try {
      let imageId: number | undefined
      let imageUrl: string | undefined
      if (chatAttachment) {
        const resolved = await resolveChatAttachment()
        imageId = resolved.imageId
        imageUrl = resolved.imageUrl
      }
      if (demo) {
        const nextReply = {
          id: Date.now(),
          ticketId: selected.id,
          authorRole: storeInbox ? 'vendor' : inbox ? 'admin' : store ? 'player' : selected.role,
          body: text || (imageUrl ? 'Photo' : ''),
          imageId,
          imageUrl,
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
        clearChatAttachment()
        return
      }
      const outgoing = text || 'Photo'
      const next =
        mode === 'store' && vendorId
          ? await tapstackApi.customerVendorSupportReply(vendorId, selected.id, outgoing, imageId)
          : mode === 'store-inbox'
            ? await tapstackApi.vendorStoreSupportReply(selected.id, outgoing)
            : inbox
              ? await tapstackApi.adminSupportReply(selected.id, outgoing)
              : await tapstackApi.supportReplyTicket(selected.id, outgoing, imageId)
      setSelected(next.ticket)
      setReply('')
      clearChatAttachment()
      await loadList()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not send reply.'
      if (chatAttachment && storeDirectChat) setAttachError(message)
      else setError(message)
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

  const canSubmit = storeDirectChat
    ? (message.trim().length >= 1 || Boolean(chatAttachment)) &&
      (!chatAttachment || attachAgreed) &&
      !busy
    : subject.trim().length >= 3 && message.trim().length >= 10 && !busy
  const title =
    view === 'compose'
      ? 'New ticket'
      : view === 'chat-start'
        ? 'Support Chat'
      : view === 'detail'
        ? selected?.subject || 'Ticket'
        : storeInbox
          ? 'Player tickets'
          : store
            ? `${partnerName} support`
            : inbox
              ? 'Support inbox'
              : 'Help'

  async function connectChatgpt(event: React.FormEvent) {
    event.preventDefault()
    if (!gptKey.trim() || gptBusy) return
    setGptBusy(true)
    setError('')
    try {
      await tapstackApi.saveVendorSettings({ profile: { openaiKey: gptKey.trim() } })
      const token = getToken()
      const me = await tapstackApi.me().catch(() => null)
      if (token && me?.user) applyAuthSession(token, me.user)
      setGptConnected(true)
      setGptKey('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not connect ChatGPT.')
    } finally {
      setGptBusy(false)
    }
  }

  async function askChatgpt(prompt: string, fillReply = false) {
    if (!prompt.trim() || gptBusy) return
    setGptBusy(true)
    setError('')
    try {
      const res = await tapstackApi.vendorChatgptComplete([
        { role: 'system', content: 'You are a concise gameroom support assistant for this vendor.' },
        { role: 'user', content: prompt.trim() },
      ])
      setGptReply(res.reply || '')
      if (fillReply && res.reply) setReply(res.reply)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ChatGPT could not reply. Connect your OpenAI key in Settings.')
    } finally {
      setGptBusy(false)
    }
  }

  function isMine(authorRole: string) {
    if (storeInbox) return authorRole === 'vendor'
    if (mode === 'inbox') return authorRole === 'admin'
    if (mode === 'store') return authorRole === 'player'
    return authorRole !== 'admin'
  }

  const showListBack = !(hideListBack && view === 'list')

  return (
    <div
      className={`help-center${embedded ? ' help-center--embedded' : ''}${storeDirectChat ? ' help-center--direct-chat' : ''}`}
    >
      {!(embedded && storeDirectChat) ? (
      <header className="help-head">
        {showListBack ? (
          <button
            type="button"
            className="help-back"
            onClick={() => {
              if (view === 'list' || (storeDirectChat && view === 'chat-start')) onBack()
              else if (storeDirectChat) {
                setView('chat-start')
                setSelected(null)
                setError('')
              } else {
                setView('list')
                setSelected(null)
                setError('')
              }
            }}
            aria-label={
              view === 'list' || (storeDirectChat && !selected)
                ? 'Close help'
                : 'Back to tickets'
            }
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
        ) : (
          <span className="help-head-spacer help-back-spacer" aria-hidden="true" />
        )}
        <div className="help-head-copy">
          <h1 className="help-title">{title}</h1>
          {view === 'list' ? (
            <p className="help-sub">
              {storeInbox
                ? `${openCount} open player ticket${openCount === 1 ? '' : 's'}`
                : store
                  ? `Message ${partnerName} about loads, redeems, or your account.`
                  : inbox
                    ? platformOnly
                      ? `${openCount} open TapStack ticket${openCount === 1 ? '' : 's'} from players, vendors, and distributors`
                      : `${openCount} open ticket${openCount === 1 ? '' : 's'}`
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
      ) : null}

      {error ? <p className="help-error">{error}</p> : null}

      {storeInbox && !gptConnected && !demo ? (
        <form className="help-body help-chatgpt-connect" onSubmit={(event) => void connectChatgpt(event)}>
          <div className="help-empty-card">
            <p className="help-empty-title">Connect your ChatGPT account</p>
            <p className="help-empty-copy">
              Vendor chat uses your own OpenAI API key. Paste a key from platform.openai.com to
              unlock player chat and ChatGPT drafts.
            </p>
            <label className="help-label">
              OpenAI API key
              <input
                className="help-input"
                type="password"
                autoComplete="off"
                value={gptKey}
                placeholder="sk-..."
                onChange={(event) => setGptKey(event.target.value)}
              />
            </label>
            <button type="submit" className="help-primary" disabled={gptBusy || gptKey.trim().length < 8}>
              {gptBusy ? 'Connecting…' : 'Connect ChatGPT'}
            </button>
          </div>
        </form>
      ) : null}

      {view === 'list' && !storeDirectChat && (!storeInbox || gptConnected || demo) ? (
        <div className="help-body">
          {loading ? <p className="help-empty">Loading tickets…</p> : null}
          {!loading && visibleTickets.length === 0 ? (
            <div className="help-empty-card">
              <p className="help-empty-title">
                {inbox && tickets.length > 0 ? 'No tickets in this filter' : inbox ? 'No tickets yet' : 'Need a hand?'}
              </p>
              <p className="help-empty-copy">
                {storeInbox
                  ? 'Players who message this store will show up here.'
                  : store
                    ? `Send ${partnerName} a ticket and they will reply in this thread.`
                    : inbox
                      ? tickets.length > 0
                        ? 'Try another submitter filter to see more TapStack tickets.'
                        : platformOnly
                          ? 'Tickets from players, vendors, and distributors appear here when they contact TapStack.'
                          : 'Vendor and distributor tickets will show up here.'
                      : 'Send TapStack a ticket and we will follow up in this thread.'}
              </p>
              {!inbox ? (
                <button type="button" className="help-primary" onClick={() => setView('compose')}>
                  {store ? `Contact ${partnerName}` : 'Contact TapStack'}
                </button>
              ) : null}
            </div>
          ) : null}
          {!loading && visibleTickets.length > 0 ? (
            <ul className="help-list">
              {visibleTickets.map((ticket) => (
                <li key={ticket.id}>
                  <button type="button" className="help-row" onClick={() => void openTicket(ticket)}>
                    <span className={`help-status help-status--${ticket.status}`}>
                      {statusLabelFor(ticket.status, mode)}
                    </span>
                    <span className="help-row-copy">
                      <strong>{ticket.subject}</strong>
                      <span>
                        {inbox ? `${ticket.authorName} · ${formatRole(ticket.role)} · ` : ''}
                        {ticket.categoryLabel} · {formatWhen(ticket.updatedAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {storeInbox && gptConnected ? (
            <form
              className="help-chatgpt"
              onSubmit={(event) => {
                event.preventDefault()
                void askChatgpt(gptPrompt)
              }}
            >
              <p className="help-empty-title">ChatGPT</p>
              <textarea
                className="help-input help-textarea"
                rows={3}
                value={gptPrompt}
                placeholder="Ask ChatGPT for a player reply, policy wording, or load troubleshooting…"
                onChange={(event) => setGptPrompt(event.target.value)}
              />
              <button type="submit" className="help-ghost" disabled={gptBusy || !gptPrompt.trim()}>
                {gptBusy ? 'Thinking…' : 'Ask ChatGPT'}
              </button>
              {gptReply ? <p className="help-chatgpt-reply">{gptReply}</p> : null}
            </form>
          ) : null}
        </div>
      ) : null}

      {view === 'chat-start' ? (
        <div className="help-body help-chat-start">
          {loading ? (
            <p className="help-empty">Loading chat…</p>
          ) : (
            <>
              <p className="help-chat-intro">
                Message {partnerName} about loads, redeems, or your account. Replies show up here
                in real time.
              </p>
              <form
                className="help-reply help-reply--chat-start"
                onSubmit={(event) => {
                  event.preventDefault()
                  void submitTicket()
                }}
              >
                <HelpChatComposer
                  value={message}
                  onChange={setMessage}
                  busy={busy}
                  placeholder={`Say hi to ${partnerName}…`}
                  rows={4}
                  submitLabel="Send message"
                  minTextLength={1}
                  attachment={chatAttachment}
                  onAttachmentChange={updateChatAttachment}
                  attachAgreed={attachAgreed}
                  onAttachAgreedChange={(agreed) => {
                    setAttachAgreed(agreed)
                    if (agreed) setAttachError('')
                  }}
                  attachError={attachError}
                />
              </form>
            </>
          )}
        </div>
      ) : null}

      {view === 'compose' && !storeDirectChat && (!storeInbox || gptConnected || demo) ? (
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

      {view === 'detail' && selected && (!storeInbox || gptConnected || demo) ? (
        <div className="help-body help-detail">
          {!storeDirectChat ? (
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
          ) : null}

          <div className="help-thread">
            <article className={`help-bubble ${inbox ? 'help-bubble--them' : 'help-bubble--mine'}`}>
              {renderBubbleContent(selected.message, selected.imageUrl)}
              <time>{formatWhen(selected.createdAt)}</time>
            </article>
            {(selected.replies || []).map((item) => (
              <article
                key={item.id}
                className={`help-bubble ${isMine(item.authorRole) ? 'help-bubble--mine' : 'help-bubble--them'}`}
              >
                {renderBubbleContent(item.body, item.imageUrl)}
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

          {selected.status === 'closed' && !inbox && !storeDirectChat ? (
            <p className="help-empty">This ticket is closed. Start a new one if you still need help.</p>
          ) : selected.status === 'closed' && storeDirectChat ? (
            <form
              className="help-reply"
              onSubmit={(event) => {
                event.preventDefault()
                const text = reply.trim()
                if (!text && !chatAttachment) return
                setReply('')
                void submitTicket(text)
              }}
            >
              <HelpChatComposer
                value={reply}
                onChange={setReply}
                busy={busy}
                placeholder={`Message ${partnerName}…`}
                rows={2}
                submitLabel="Send"
                minTextLength={1}
                attachment={chatAttachment}
                onAttachmentChange={updateChatAttachment}
                attachAgreed={attachAgreed}
                onAttachAgreedChange={(agreed) => {
                  setAttachAgreed(agreed)
                  if (agreed) setAttachError('')
                }}
                attachError={attachError}
              />
            </form>
          ) : storeDirectChat ? (
            <form
              className="help-reply"
              onSubmit={(event) => {
                event.preventDefault()
                void sendReply()
              }}
            >
              <HelpChatComposer
                value={reply}
                onChange={setReply}
                busy={busy}
                placeholder={`Message ${partnerName}…`}
                rows={2}
                submitLabel="Send"
                minTextLength={1}
                attachment={chatAttachment}
                onAttachmentChange={updateChatAttachment}
                attachAgreed={attachAgreed}
                onAttachAgreedChange={(agreed) => {
                  setAttachAgreed(agreed)
                  if (agreed) setAttachError('')
                }}
                attachError={attachError}
              />
            </form>
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
                placeholder={
                  storeInbox
                    ? 'Reply to this player…'
                    : inbox
                      ? 'Reply to this partner…'
                      : 'Add more detail…'
                }
                onChange={(event) => setReply(event.target.value)}
              />
              {storeInbox && gptConnected ? (
                <button
                  type="button"
                  className="help-ghost"
                  disabled={gptBusy}
                  onClick={() =>
                    void askChatgpt(
                      `Draft a short, professional reply to this player ticket.\nSubject: ${selected.subject}\nMessage: ${selected.message}`,
                      true,
                    )
                  }
                >
                  {gptBusy ? 'Drafting…' : 'Draft with ChatGPT'}
                </button>
              ) : null}
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
