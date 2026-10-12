import { useState } from 'react'
import { AdminHeader } from './AdminHeader'
import './X8SupportPage.css'

const X8_SUPPORT_RECIPIENTS = ['gilon@x8it.net', 'jay@x8it.net'] as const

const URGENCY_OPTIONS = [
  { id: 'low', label: 'Low', tag: 'LOW' },
  { id: 'normal', label: 'Normal', tag: 'NORMAL' },
  { id: 'high', label: 'High', tag: 'HIGH' },
  { id: 'critical', label: 'Critical', tag: 'CRITICAL' },
] as const

type UrgencyId = (typeof URGENCY_OPTIONS)[number]['id']

export default function X8SupportPage({ onBack }: { onBack: () => void }) {
  const [urgency, setUrgency] = useState<UrgencyId>('normal')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [note, setNote] = useState('')

  function openEmailClient() {
    const trimmedSubject = subject.trim()
    const trimmedMessage = message.trim()
    if (trimmedSubject.length < 3) {
      setNote('Add a subject (at least 3 characters).')
      return
    }
    if (trimmedMessage.length < 10) {
      setNote('Describe the issue (at least 10 characters).')
      return
    }

    const urgencyTag = URGENCY_OPTIONS.find((item) => item.id === urgency)?.tag ?? 'NORMAL'
    const emailSubject = `[X8 Support · ${urgencyTag}] ${trimmedSubject}`
    const emailBody = [
      `Urgency: ${urgencyTag}`,
      '',
      trimmedMessage,
      '',
      '—',
      'Sent from TapStack Admin · X8 Support',
    ].join('\n')

    const mailto = `mailto:${X8_SUPPORT_RECIPIENTS.join(',')}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
    setNote('Opening your email app…')
    window.location.href = mailto
  }

  return (
    <div className="x8-support-page">
      <AdminHeader />

      <header className="x8-support-head">
        <button type="button" className="x8-support-back" onClick={onBack} aria-label="Close X8 Support">
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
        <div>
          <h1 className="x8-support-title">X8 Support</h1>
          <p className="x8-support-sub">
            Email a ticket to {X8_SUPPORT_RECIPIENTS.join(' and ')}. Pick an urgency tag so the team knows
            how severe the request is.
          </p>
        </div>
      </header>

      <form
        className="x8-support-form"
        onSubmit={(event) => {
          event.preventDefault()
          openEmailClient()
        }}
      >
        <fieldset className="x8-support-urgency">
          <legend className="x8-support-label">Urgency</legend>
          <div className="x8-support-urgency-options" role="radiogroup" aria-label="Support urgency">
            {URGENCY_OPTIONS.map((item) => {
              const active = urgency === item.id
              return (
                <label
                  key={item.id}
                  className={`x8-support-urgency-pill x8-support-urgency-pill--${item.id}${active ? ' x8-support-urgency-pill--active' : ''}`}
                >
                  <input
                    type="radio"
                    name="x8-urgency"
                    value={item.id}
                    checked={active}
                    onChange={() => setUrgency(item.id)}
                  />
                  {item.label}
                </label>
              )
            })}
          </div>
        </fieldset>

        <label className="x8-support-field">
          <span className="x8-support-label">Subject</span>
          <input
            type="text"
            value={subject}
            onChange={(event) => {
              setSubject(event.target.value)
              setNote('')
            }}
            placeholder="Brief summary of the issue"
            autoComplete="off"
          />
        </label>

        <label className="x8-support-field">
          <span className="x8-support-label">Message</span>
          <textarea
            rows={6}
            value={message}
            onChange={(event) => {
              setMessage(event.target.value)
              setNote('')
            }}
            placeholder="What happened, who is affected, and any steps to reproduce…"
          />
        </label>

        {note ? <p className="x8-support-note">{note}</p> : null}

        <button type="submit" className="x8-support-submit">
          Open email to send ticket
        </button>
        <p className="x8-support-foot">
          Your mail app will address both recipients. The subject line includes the urgency tag you selected.
        </p>
      </form>
    </div>
  )
}
