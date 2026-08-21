import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ApiError, isApiConfigured, tapstackApi, type VendorPromotion } from '../api/client'
import './VendorPromosPage.css'

type PromosTab = 'promotions' | 'codes' | 'email-blast'

const PROMOS_TABS: { id: PromosTab; label: string; icon: string }[] = [
  { id: 'promotions', label: 'Promotions', icon: '🎁' },
  { id: 'codes', label: 'Codes', icon: '🏷️' },
  { id: 'email-blast', label: 'Email Blast', icon: '✉️' },
]

type PromoStatus = 'active' | 'draft' | 'expired'

function PromotionCard({
  promo,
  busy,
  onToggle,
  onDelete,
}: {
  promo: VendorPromotion
  busy: boolean
  onToggle: (promo: VendorPromotion) => void
  onDelete: (promo: VendorPromotion) => void
}) {
  const status = (promo.status || 'active') as PromoStatus
  const statusLabels: Record<PromoStatus, string> = {
    active: 'Active',
    draft: 'Paused',
    expired: 'Expired',
  }
  const isPaused = status === 'draft'
  const canToggle = status === 'active' || status === 'draft'

  return (
    <article className="vendor-promo-list-card">
      <div className="vendor-promo-list-card-top">
        <div className="vendor-promo-list-card-info">
          <span className="vendor-promo-list-icon" aria-hidden="true">
            {promo.icon || '🎁'}
          </span>
          <div>
            <h3 className="vendor-promo-list-title">{promo.title}</h3>
            <p className="vendor-promo-list-meta">
              {promo.typeLabel} · {promo.endsLabel}
            </p>
          </div>
        </div>
        <span className={`vendor-promo-list-status vendor-promo-list-status--${status}`}>
          {statusLabels[status]}
        </span>
      </div>

      <div className="vendor-promo-list-card-bottom">
        <div className="vendor-promo-list-stats">
          <div className="vendor-promo-list-stat">
            <span className="vendor-promo-list-stat-label">Entries</span>
            <span className="vendor-promo-list-stat-value">{promo.entries}</span>
          </div>
          <div className="vendor-promo-list-stat">
            <span className="vendor-promo-list-stat-label">Value Given</span>
            <span className="vendor-promo-list-stat-value vendor-promo-list-stat-value--pink">
              {promo.valueGiven}
            </span>
          </div>
        </div>
        <div className="vendor-promo-list-actions">
          {canToggle ? (
            <button
              type="button"
              className="vendor-promo-list-action-btn"
              disabled={busy}
              onClick={() => onToggle(promo)}
            >
              {isPaused ? 'Enable' : 'Disable'}
            </button>
          ) : null}
          <button
            type="button"
            className="vendor-promo-list-action-btn vendor-promo-list-action-btn--danger"
            disabled={busy}
            onClick={() => onDelete(promo)}
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  )
}

function PromotionsTab() {
  const [list, setList] = useState<VendorPromotion[]>([])
  const [loading, setLoading] = useState(isApiConfigured())
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [promoType, setPromoType] = useState('bonus-credit')
  const [minAmount, setMinAmount] = useState('25')
  const [rewardValue, setRewardValue] = useState('5')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState('00:00')
  const [endDate, setEndDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().slice(0, 10)
  })
  const [endTime, setEndTime] = useState('23:59')
  const [summary, setSummary] = useState('')

  const rewardHint =
    promoType === 'deposit-bonus'
      ? 'Bonus % (e.g. 20 for +20%)'
      : 'Reward $ (e.g. 5 for $5 credit)'

  const load = useCallback(async () => {
    if (!isApiConfigured()) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await tapstackApi.vendorPromos()
      setList(res.promotions || [])
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isApiConfigured() || saving) return
    setError('')
    setSaving(true)
    try {
      await tapstackApi.vendorPromoCreate({
        title: title.trim(),
        type: promoType,
        summary: summary.trim(),
        minAmount: Number(minAmount),
        rewardValue: Number(rewardValue),
        startDate,
        startTime,
        endDate,
        endTime,
      })
      setTitle('')
      setSummary('')
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create promotion.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(promo: VendorPromotion) {
    if (!isApiConfigured() || actionId) return
    const next = promo.status === 'draft' ? 'active' : 'paused'
    setActionId(promo.id)
    setError('')
    try {
      const res = await tapstackApi.vendorPromoSetStatus(promo.id, next)
      setList((prev) => prev.map((item) => (item.id === promo.id ? res.promotion : item)))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update promotion.')
    } finally {
      setActionId(null)
    }
  }

  async function handleDelete(promo: VendorPromotion) {
    if (!isApiConfigured() || actionId) return
    if (!window.confirm(`Delete “${promo.title}”? This cannot be undone.`)) return
    setActionId(promo.id)
    setError('')
    try {
      await tapstackApi.vendorPromoDelete(promo.id)
      setList((prev) => prev.filter((item) => item.id !== promo.id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete promotion.')
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="vendor-promos-content">
      <div className="vendor-promos-toolbar">
        <h2 className="vendor-promos-heading">Promotions</h2>
      </div>

      <form className="vendor-promos-form-card" onSubmit={handleSubmit}>
        <p className="vendor-promos-form-label">New Promotion</p>

        <input
          type="text"
          className="vendor-promos-input"
          placeholder="Title (e.g. Weekend Freeplay)"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />

        <div className="vendor-promos-select-wrap">
          <select
            className="vendor-promos-select"
            value={promoType}
            onChange={(event) => setPromoType(event.target.value)}
            aria-label="Promotion type"
          >
            <option value="bonus-credit">Bonus Credit ($ flat)</option>
            <option value="deposit-bonus">Deposit Bonus (% match)</option>
            <option value="freeplay">Freeplay ($ credit)</option>
            <option value="load-redeem">Load &amp; Redeem ($ flat)</option>
          </select>
          <svg className="vendor-promos-select-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 6 L8 10 L12 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="vendor-promos-datetime-row">
          <input
            type="number"
            className="vendor-promos-input"
            min={1}
            step="1"
            placeholder="Min load $"
            value={minAmount}
            onChange={(event) => setMinAmount(event.target.value)}
            required
            aria-label="Minimum load amount"
          />
          <input
            type="number"
            className="vendor-promos-input"
            min={0.01}
            step="0.01"
            placeholder={rewardHint}
            value={rewardValue}
            onChange={(event) => setRewardValue(event.target.value)}
            required
            aria-label="Reward value"
          />
        </div>
        <p className="vendor-promos-hint">
          Player activates → loads ≥ ${minAmount || '—'} at your shop → claims{' '}
          {promoType === 'deposit-bonus' ? `${rewardValue || '—'}% match` : `$${rewardValue || '—'} credit`}.
        </p>

        <fieldset className="vendor-promos-fieldset">
          <legend className="vendor-promos-field-legend">STARTS</legend>
          <div className="vendor-promos-datetime-row">
            <input
              type="date"
              className="vendor-promos-input vendor-promos-input--date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              aria-label="Start date"
            />
            <input
              type="time"
              className="vendor-promos-input vendor-promos-input--time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              aria-label="Start time"
            />
          </div>
        </fieldset>

        <fieldset className="vendor-promos-fieldset">
          <legend className="vendor-promos-field-legend">ENDS</legend>
          <div className="vendor-promos-datetime-row">
            <input
              type="date"
              className="vendor-promos-input vendor-promos-input--date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              aria-label="End date"
            />
            <input
              type="time"
              className="vendor-promos-input vendor-promos-input--time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              aria-label="End time"
            />
          </div>
        </fieldset>

        <fieldset className="vendor-promos-fieldset">
          <legend className="vendor-promos-field-legend">SUMMARY</legend>
          <textarea
            className="vendor-promos-textarea"
            placeholder="Write a 1-2 sentence summary of this promotion..."
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            rows={3}
          />
        </fieldset>

        {error ? <p className="vendor-promos-error">{error}</p> : null}

        <button type="submit" className="vendor-promos-submit-btn" disabled={saving || !title.trim()}>
          {saving ? 'Creating…' : 'Create Promotion'}
        </button>
      </form>

      {loading ? <p className="vendor-promos-hint">Loading…</p> : null}
      <ul className="vendor-promo-list">
        {list.map((promo) => (
          <li key={promo.id}>
            <PromotionCard
              promo={promo}
              busy={actionId === promo.id}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          </li>
        ))}
      </ul>
      {!loading && list.length === 0 ? (
        <p className="vendor-promos-hint">No promotions yet — create one above.</p>
      ) : null}
    </div>
  )
}

function CodesTab() {
  const [code, setCode] = useState('')
  const [bonusType, setBonusType] = useState('percent-bonus')
  const [bonusValue, setBonusValue] = useState('')
  const [useLimit, setUseLimit] = useState('')
  const [startDate, setStartDate] = useState('2026-01-01')
  const [startTime, setStartTime] = useState('00:00')
  const [expiresDate, setExpiresDate] = useState('2026-01-31')
  const [expiresTime, setExpiresTime] = useState('23:59')

  function handleAutoCode() {
    const generated = `SAVE${Math.floor(1000 + Math.random() * 9000)}`
    setCode(generated)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  return (
    <div className="vendor-promos-content">
      <div className="vendor-promos-toolbar">
        <h2 className="vendor-promos-heading">Coupon Codes</h2>
        <button type="button" className="vendor-promos-new-btn">
          + New Code
        </button>
      </div>

      <form className="vendor-promos-form-card" onSubmit={handleSubmit}>
        <p className="vendor-promos-form-label">Quick Create</p>

        <div className="vendor-codes-code-row">
          <input
            type="text"
            className="vendor-promos-input"
            placeholder="Code (e.g. SAVE20)"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
          />
          <button type="button" className="vendor-codes-auto-btn" onClick={handleAutoCode}>
            Auto
          </button>
        </div>

        <div className="vendor-promos-datetime-row">
          <div className="vendor-promos-select-wrap">
            <select
              className="vendor-promos-select"
              value={bonusType}
              onChange={(event) => setBonusType(event.target.value)}
              aria-label="Bonus type"
            >
              <option value="percent-bonus">% Bonus</option>
              <option value="dollar-credit">$ Credit</option>
              <option value="freeplay">Freeplay</option>
            </select>
            <svg className="vendor-promos-select-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 6 L8 10 L12 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <input
            type="text"
            className="vendor-promos-input"
            placeholder="Value (e.g. 20)"
            value={bonusValue}
            onChange={(event) => setBonusValue(event.target.value)}
          />
        </div>

        <div className="vendor-promos-select-wrap">
          <select
            className="vendor-promos-select"
            value={useLimit}
            onChange={(event) => setUseLimit(event.target.value)}
            aria-label="Use limit per customer"
          >
            <option value="">Use limit per customer</option>
            <option value="1">1 use per customer</option>
            <option value="3">3 uses per customer</option>
            <option value="5">5 uses per customer</option>
            <option value="unlimited">Unlimited per customer</option>
          </select>
          <svg className="vendor-promos-select-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 6 L8 10 L12 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <fieldset className="vendor-promos-fieldset">
          <legend className="vendor-promos-field-legend">STARTS</legend>
          <div className="vendor-promos-datetime-row">
            <input
              type="date"
              className="vendor-promos-input vendor-promos-input--date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              aria-label="Start date"
            />
            <input
              type="time"
              className="vendor-promos-input vendor-promos-input--time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              aria-label="Start time"
            />
          </div>
        </fieldset>

        <fieldset className="vendor-promos-fieldset">
          <legend className="vendor-promos-field-legend">EXPIRES</legend>
          <div className="vendor-promos-datetime-row">
            <input
              type="date"
              className="vendor-promos-input vendor-promos-input--date"
              value={expiresDate}
              onChange={(event) => setExpiresDate(event.target.value)}
              aria-label="Expires date"
            />
            <input
              type="time"
              className="vendor-promos-input vendor-promos-input--time"
              value={expiresTime}
              onChange={(event) => setExpiresTime(event.target.value)}
              aria-label="Expires time"
            />
          </div>
        </fieldset>

        <button type="submit" className="vendor-promos-submit-btn">
          Create Code
        </button>
      </form>

      <ul className="vendor-codes-list">
        <li>
          <article className="vendor-codes-card">
            <div>
              <h3 className="vendor-codes-card-title">LUCKY20</h3>
              <p className="vendor-codes-card-meta">20% bonus · 12/50 used · exp Jan 15</p>
            </div>
            <span className="vendor-codes-card-status">Active</span>
          </article>
        </li>
        <li>
          <article className="vendor-codes-card">
            <div>
              <h3 className="vendor-codes-card-title">FREESPIN</h3>
              <p className="vendor-codes-card-meta">$5 credit · 0/100 used · exp Jan 31</p>
            </div>
            <span className="vendor-codes-card-status">Active</span>
          </article>
        </li>
      </ul>
    </div>
  )
}

function EmailBlastTab() {
  const [audienceExpanded, setAudienceExpanded] = useState(true)
  const [selectedSegment, setSelectedSegment] = useState('one-time-depositors')
  const [audienceDraft, setAudienceDraft] = useState('')
  const [filterField, setFilterField] = useState('deposit-count')
  const [filterOperator, setFilterOperator] = useState('exactly')
  const [filterValue, setFilterValue] = useState('1')
  const [filterWindow, setFilterWindow] = useState('90-days')
  const [subject, setSubject] = useState("New Year's special offer inside! 🎉")
  const [message, setMessage] = useState(
    "Hey! We noticed you tried us out — come back this week and get 20% bonus credits on your next deposit. Use code LUCKY20. See you on the floor!",
  )

  const recipientCount = 247

  const recentBlasts = [
    {
      id: 'weekend-freeplay',
      title: 'Weekend Freeplay Event!',
      meta: 'Dec 27 · 231 sent · All players',
      openRate: '64%',
    },
    {
      id: 'come-back',
      title: 'Come back — we miss you!',
      meta: 'Dec 20 · 74 sent · Inactive 30d+',
      openRate: '58%',
    },
    {
      id: 'christmas-special',
      title: 'Christmas Special Offer',
      meta: 'Dec 24 · 219 sent · All players',
      openRate: '71%',
    },
  ]

  const quickSegments = [
    { id: 'one-time-depositors', label: 'One-time depositors', count: 38 },
    { id: 'inactive-30', label: 'Inactive 30+ days', count: 74 },
    { id: 'high-value', label: 'High-value players', count: 21 },
    { id: 'new-month', label: 'New this month', count: 19 },
  ]

  const aiSuggestions = [
    "Players who haven't visited in 3 weeks",
    'High rollers who spent over $500',
    'New sign-ups this month',
    'One-time depositors to win back',
  ]

  function handleAudienceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAudienceDraft('')
  }

  return (
    <div className="vendor-promos-content vendor-email-blast-content">
      <div className="vendor-email-blast-intro">
        <h2 className="vendor-promos-heading">Email Blast</h2>
        <p className="vendor-email-blast-subtitle">Target specific player segments</p>
      </div>

      <section className="vendor-email-audience-card">
        <button
          type="button"
          className="vendor-email-audience-header"
          aria-expanded={audienceExpanded}
          onClick={() => setAudienceExpanded((expanded) => !expanded)}
        >
          <span className="vendor-email-audience-header-left">
            <span className="vendor-email-audience-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 6h16M7 12h10M10 18h4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            Audience
          </span>
          <svg
            className={`vendor-email-audience-chevron ${audienceExpanded ? 'vendor-email-audience-chevron--open' : ''}`}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {audienceExpanded && (
          <div className="vendor-email-audience-body">
            <p className="vendor-email-segments-label">QUICK SEGMENTS</p>
            <div className="vendor-email-segments-grid">
              {quickSegments.map((segment) => {
                const active = selectedSegment === segment.id
                return (
                  <button
                    key={segment.id}
                    type="button"
                    className={`vendor-email-segment-btn ${active ? 'vendor-email-segment-btn--active' : ''}`}
                    onClick={() => setSelectedSegment(segment.id)}
                  >
                    <span className="vendor-email-segment-label">{segment.label}</span>
                    <span className="vendor-email-segment-count">({segment.count} players)</span>
                  </button>
                )
              })}
            </div>

            <div className="vendor-email-ai-panel">
              <div className="vendor-email-ai-header">
                <span className="vendor-email-ai-icon" aria-hidden="true">
                  ✨
                </span>
                Build with AI
              </div>

              <div className="vendor-email-ai-prompt">
                Tell me who you want to reach and I&apos;ll build the filters. e.g. &apos;players who
                deposited over $200 but haven&apos;t been back in a month&apos;.
              </div>

              <div className="vendor-email-ai-suggestions">
                {aiSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="vendor-email-ai-suggestion"
                    onClick={() => setAudienceDraft(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              <form className="vendor-email-ai-input-row" onSubmit={handleAudienceSubmit}>
                <input
                  type="text"
                  value={audienceDraft}
                  onChange={(event) => setAudienceDraft(event.target.value)}
                  placeholder="Describe your audience..."
                  aria-label="Describe your audience"
                />
                <button type="submit" className="vendor-email-ai-send-btn" aria-label="Send message">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M22 2 11 13M22 2 15 22 11 13 2 9 22 2"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        )}
      </section>

      <section className="vendor-email-filters-card">
        <p className="vendor-email-segments-label">CUSTOM FILTERS</p>

        <div className="vendor-email-filter-row">
          <div className="vendor-email-filter-select-wrap">
            <select
              className="vendor-email-filter-select"
              value={filterField}
              onChange={(event) => setFilterField(event.target.value)}
              aria-label="Filter field"
            >
              <option value="deposit-count">Deposit Count</option>
              <option value="total-spent">Total Spent</option>
              <option value="last-visit">Last Visit</option>
            </select>
          </div>
          <div className="vendor-email-filter-select-wrap">
            <select
              className="vendor-email-filter-select"
              value={filterOperator}
              onChange={(event) => setFilterOperator(event.target.value)}
              aria-label="Filter operator"
            >
              <option value="exactly">exactly</option>
              <option value="at-least">at least</option>
              <option value="at-most">at most</option>
            </select>
          </div>
          <input
            type="number"
            className="vendor-email-filter-value"
            value={filterValue}
            onChange={(event) => setFilterValue(event.target.value)}
            aria-label="Filter value"
            min="0"
          />
          <div className="vendor-email-filter-select-wrap">
            <select
              className="vendor-email-filter-select"
              value={filterWindow}
              onChange={(event) => setFilterWindow(event.target.value)}
              aria-label="Filter time window"
            >
              <option value="90-days">Last 90 days</option>
              <option value="30-days">Last 30 days</option>
              <option value="7-days">Last 7 days</option>
            </select>
          </div>
        </div>

        <button type="button" className="vendor-email-add-filter-btn">
          + Add Filter
        </button>

        <button type="button" className="vendor-email-find-players-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
            <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="M14 20c.4-2.2 2-4 4-4" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          Find Players
        </button>
      </section>

      <article className="vendor-email-plan-card">
        <div>
          <p className="vendor-email-plan-title">Pro Plan · Daily Blast</p>
          <p className="vendor-email-plan-meta">
            Next available: Now · {recipientCount} recipients
          </p>
        </div>
        <span className="vendor-email-plan-status">Available</span>
      </article>

      <section className="vendor-email-compose">
        <label className="vendor-email-compose-field">
          <span className="vendor-email-compose-label">Subject</span>
          <input
            type="text"
            className="vendor-promos-input"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
        </label>

        <label className="vendor-email-compose-field">
          <span className="vendor-email-compose-label">Message</span>
          <textarea
            className="vendor-promos-textarea vendor-email-compose-textarea"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={5}
          />
        </label>

        <div className="vendor-email-compose-actions">
          <button type="button" className="vendor-email-preview-btn">
            Preview
          </button>
          <button type="button" className="vendor-email-send-btn">
            Send to {recipientCount}
          </button>
        </div>
      </section>

      <section className="vendor-email-recent">
        <h3 className="vendor-email-recent-label">RECENT BLASTS</h3>
        <ul className="vendor-email-recent-list">
          {recentBlasts.map((blast) => (
            <li key={blast.id}>
              <article className="vendor-email-recent-card">
                <div className="vendor-email-recent-info">
                  <p className="vendor-email-recent-title">{blast.title}</p>
                  <p className="vendor-email-recent-meta">{blast.meta}</p>
                </div>
                <div className="vendor-email-recent-rate">
                  <span className="vendor-email-recent-rate-value">{blast.openRate}</span>
                  <span className="vendor-email-recent-rate-label">open rate</span>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export default function VendorPromosPage() {
  const [activeTab, setActiveTab] = useState<PromosTab>('promotions')

  return (
    <div className="vendor-promos-page">
      <div className="vendor-promos-tabs" role="tablist" aria-label="Promos sections">
        {PROMOS_TABS.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`vendor-promos-tab ${active ? 'vendor-promos-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="vendor-promos-tab-icon" aria-hidden="true">
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {activeTab === 'promotions' && <PromotionsTab />}
      {activeTab === 'codes' && <CodesTab />}
      {activeTab === 'email-blast' && <EmailBlastTab />}
    </div>
  )
}
