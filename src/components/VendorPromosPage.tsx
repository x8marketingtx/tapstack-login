import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  ApiError,
  isApiConfigured,
  PLAYER_TAG_OPTIONS,
  tapstackApi,
  type EmailBlastAvailability,
  type EmailBlastItem,
  type EmailBlastSegment,
  type VendorCoupon,
  type VendorPromotion,
} from '../api/client'
import './VendorPromosPage.css'

type PromosTab = 'promotions' | 'codes' | 'email-blast'

const PROMOS_TABS: { id: PromosTab; label: string; icon: string }[] = [
  { id: 'promotions', label: 'Promotions', icon: '🎁' },
  { id: 'codes', label: 'Codes', icon: '🏷️' },
  { id: 'email-blast', label: 'Email Blast', icon: '✉️' },
]

type PromoStatus = 'active' | 'draft' | 'expired'

function splitDateTime(value?: string): { date: string; time: string } {
  if (!value) return { date: '', time: '' }
  const normalized = value.includes('T') ? value : value.replace(' ', 'T')
  const d = new Date(normalized)
  if (Number.isNaN(d.getTime())) {
    const [datePart, timePart = ''] = value.split(/[ T]/)
    return {
      date: (datePart || '').slice(0, 10),
      time: (timePart || '').slice(0, 5) || '00:00',
    }
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

function PromotionCard({
  promo,
  busy,
  onEdit,
  onToggle,
  onDelete,
}: {
  promo: VendorPromotion
  busy: boolean
  onEdit: (promo: VendorPromotion) => void
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
            <p className="vendor-promo-list-limits">
              {promo.limitsLabel || '1× / player'}
              {' · '}
              {promo.audienceLabel || 'All players'}
            </p>
            {(promo.playerTagLabels || []).length > 0 ? (
              <div className="vendor-promo-tag-row">
                {promo.playerTagLabels!.map((label) => (
                  <span key={label} className="vendor-promo-tag-chip">
                    {label}
                  </span>
                ))}
              </div>
            ) : null}
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
          {status !== 'expired' ? (
            <button
              type="button"
              className="vendor-promo-list-action-btn"
              disabled={busy}
              onClick={() => onEdit(promo)}
            >
              Edit
            </button>
          ) : null}
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
  const [editingId, setEditingId] = useState<string | null>(null)
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
  const [limitPerPlayer, setLimitPerPlayer] = useState('1')
  const [limitPerDay, setLimitPerDay] = useState('')
  const [limitTotal, setLimitTotal] = useState('')
  const [playerTags, setPlayerTags] = useState<string[]>([])

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

  function resetForm() {
    setEditingId(null)
    setTitle('')
    setPromoType('bonus-credit')
    setMinAmount('25')
    setRewardValue('5')
    setStartDate(new Date().toISOString().slice(0, 10))
    setStartTime('00:00')
    const end = new Date()
    end.setDate(end.getDate() + 14)
    setEndDate(end.toISOString().slice(0, 10))
    setEndTime('23:59')
    setSummary('')
    setLimitPerPlayer('1')
    setLimitPerDay('')
    setLimitTotal('')
    setPlayerTags([])
  }

  function beginEdit(promo: VendorPromotion) {
    const start = splitDateTime(promo.startsAt)
    const end = splitDateTime(promo.endsAt)
    setEditingId(promo.id)
    setTitle(promo.title || '')
    setPromoType(promo.type || 'bonus-credit')
    setMinAmount(String(promo.minAmount ?? 25))
    setRewardValue(String(promo.rewardValue ?? 5))
    setStartDate(start.date || new Date().toISOString().slice(0, 10))
    setStartTime(start.time || '00:00')
    setEndDate(end.date || '')
    setEndTime(end.time || '23:59')
    setSummary(promo.summary || '')
    const perPlayer = promo.limitPerPlayer ?? 1
    setLimitPerPlayer(perPlayer <= 0 ? 'unlimited' : String(perPlayer))
    setLimitPerDay(promo.limitPerDay && promo.limitPerDay > 0 ? String(promo.limitPerDay) : '')
    setLimitTotal(promo.limitTotal && promo.limitTotal > 0 ? String(promo.limitTotal) : '')
    setPlayerTags(promo.playerTags || [])
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isApiConfigured() || saving) return
    setError('')
    setSaving(true)
    const payload = {
      title: title.trim(),
      type: promoType,
      summary: summary.trim(),
      minAmount: Number(minAmount),
      rewardValue: Number(rewardValue),
      startDate,
      startTime,
      endDate,
      endTime,
      limitPerPlayer: limitPerPlayer === '' || limitPerPlayer === 'unlimited' ? 0 : Number(limitPerPlayer),
      limitPerDay: limitPerDay === '' ? 0 : Number(limitPerDay),
      limitTotal: limitTotal === '' ? 0 : Number(limitTotal),
      playerTags,
    }
    try {
      if (editingId) {
        const res = await tapstackApi.vendorPromoUpdate(editingId, payload)
        setList((prev) => prev.map((item) => (item.id === editingId ? res.promotion : item)))
        resetForm()
      } else {
        await tapstackApi.vendorPromoCreate(payload)
        resetForm()
        await load()
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : editingId
            ? 'Could not update promotion.'
            : 'Could not create promotion.',
      )
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
        <p className="vendor-promos-form-label">{editingId ? 'Edit Promotion' : 'New Promotion'}</p>

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
          <legend className="vendor-promos-field-legend">USAGE LIMITS</legend>
          <div className="vendor-promos-limits-grid">
            <label className="vendor-promos-limit-field">
              <span>Per player</span>
              <select
                className="vendor-promos-select"
                value={limitPerPlayer}
                onChange={(event) => setLimitPerPlayer(event.target.value)}
                aria-label="Limit times per player"
              >
                <option value="1">1 time</option>
                <option value="2">2 times</option>
                <option value="3">3 times</option>
                <option value="5">5 times</option>
                <option value="10">10 times</option>
                <option value="unlimited">Unlimited</option>
              </select>
            </label>
            <label className="vendor-promos-limit-field">
              <span>Per day</span>
              <input
                type="number"
                className="vendor-promos-input"
                min={1}
                step={1}
                placeholder="Unlimited"
                value={limitPerDay}
                onChange={(event) => setLimitPerDay(event.target.value)}
                aria-label="Limit uses per day"
              />
            </label>
            <label className="vendor-promos-limit-field">
              <span>Total uses</span>
              <input
                type="number"
                className="vendor-promos-input"
                min={1}
                step={1}
                placeholder="Unlimited"
                value={limitTotal}
                onChange={(event) => setLimitTotal(event.target.value)}
                aria-label="Limit total uses"
              />
            </label>
          </div>
          <p className="vendor-promos-hint">
            Leave per-day / total blank for no cap. Example: 1× per player, 50 / day, 500 total.
          </p>
        </fieldset>

        <fieldset className="vendor-promos-fieldset">
          <legend className="vendor-promos-field-legend">PLAYER TAGS</legend>
          <p className="vendor-promos-hint">
            Leave none selected to show for all players. Otherwise only tagged players can use it.
          </p>
          <div className="vendor-promos-tag-picks" role="group" aria-label="Player tags">
            {PLAYER_TAG_OPTIONS.map((tag) => {
              const active = playerTags.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  className={`vendor-promos-tag-pick ${active ? 'vendor-promos-tag-pick--active' : ''}`}
                  aria-pressed={active}
                  onClick={() =>
                    setPlayerTags((prev) =>
                      active ? prev.filter((id) => id !== tag.id) : [...prev, tag.id],
                    )
                  }
                >
                  {tag.label}
                </button>
              )
            })}
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

        <div className="vendor-promos-form-actions">
          {editingId ? (
            <button
              type="button"
              className="vendor-promos-cancel-btn"
              disabled={saving}
              onClick={() => {
                resetForm()
                setError('')
              }}
            >
              Cancel
            </button>
          ) : null}
          <button type="submit" className="vendor-promos-submit-btn" disabled={saving || !title.trim()}>
            {saving
              ? editingId
                ? 'Saving…'
                : 'Creating…'
              : editingId
                ? 'Save Changes'
                : 'Create Promotion'}
          </button>
        </div>
      </form>

      {loading ? <p className="vendor-promos-hint">Loading…</p> : null}
      <ul className="vendor-promo-list">
        {list.map((promo) => (
          <li key={promo.id}>
            <PromotionCard
              promo={promo}
              busy={actionId === promo.id || editingId === promo.id}
              onEdit={beginEdit}
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

function CouponCard({
  coupon,
  busy,
  onToggle,
  onDelete,
}: {
  coupon: VendorCoupon
  busy: boolean
  onToggle: (coupon: VendorCoupon) => void
  onDelete: (coupon: VendorCoupon) => void
}) {
  const status = coupon.status || 'active'
  const isPaused = status === 'draft'
  const canToggle = status === 'active' || status === 'draft'

  return (
    <article className="vendor-codes-card">
      <div className="vendor-codes-card-main">
        <div>
          <h3 className="vendor-codes-card-title">{coupon.code}</h3>
          <p className="vendor-codes-card-meta">{coupon.meta}</p>
          {coupon.limitsLabel ? (
            <p className="vendor-codes-card-limits">{coupon.limitsLabel}</p>
          ) : null}
        </div>
        <span
          className={`vendor-codes-card-status ${
            isPaused
              ? 'vendor-codes-card-status--paused'
              : status === 'expired'
                ? 'vendor-codes-card-status--expired'
                : ''
          }`}
        >
          {coupon.statusLabel || (isPaused ? 'Disabled' : 'Active')}
        </span>
      </div>
      <div className="vendor-codes-card-actions">
        {canToggle ? (
          <button
            type="button"
            className="vendor-promo-list-action-btn"
            disabled={busy}
            onClick={() => onToggle(coupon)}
          >
            {isPaused ? 'Enable' : 'Disable'}
          </button>
        ) : null}
        <button
          type="button"
          className="vendor-promo-list-action-btn vendor-promo-list-action-btn--danger"
          disabled={busy}
          onClick={() => onDelete(coupon)}
        >
          Delete
        </button>
      </div>
    </article>
  )
}

function CodesTab() {
  const [list, setList] = useState<VendorCoupon[]>([])
  const [loading, setLoading] = useState(isApiConfigured())
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [code, setCode] = useState('')
  const [bonusType, setBonusType] = useState('percent-bonus')
  const [bonusValue, setBonusValue] = useState('20')
  const [useLimit, setUseLimit] = useState('1')
  const [maxRedemptions, setMaxRedemptions] = useState('100')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState('00:00')
  const [expiresDate, setExpiresDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().slice(0, 10)
  })
  const [expiresTime, setExpiresTime] = useState('23:59')

  const load = useCallback(async () => {
    if (!isApiConfigured()) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await tapstackApi.vendorCoupons()
      setList(res.coupons || [])
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function handleAutoCode() {
    const generated = `SAVE${Math.floor(1000 + Math.random() * 9000)}`
    setCode(generated)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isApiConfigured() || saving) return
    setError('')
    setSaving(true)
    try {
      await tapstackApi.vendorCouponCreate({
        code: code.trim(),
        bonusType,
        bonusValue: Number(bonusValue),
        useLimit: useLimit === 'unlimited' ? 0 : Number(useLimit || 1),
        maxRedemptions: Number(maxRedemptions || 0),
        startDate,
        startTime,
        endDate: expiresDate,
        endTime: expiresTime,
      })
      setCode('')
      setBonusValue('20')
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create coupon code.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(coupon: VendorCoupon) {
    if (!isApiConfigured() || actionId) return
    const next = coupon.status === 'draft' ? 'active' : 'paused'
    setActionId(coupon.id)
    setError('')
    try {
      const res = await tapstackApi.vendorCouponSetStatus(coupon.id, next)
      setList((prev) => prev.map((item) => (item.id === coupon.id ? res.coupon : item)))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update coupon.')
    } finally {
      setActionId(null)
    }
  }

  async function handleDelete(coupon: VendorCoupon) {
    if (!isApiConfigured() || actionId) return
    if (!window.confirm(`Delete code “${coupon.code}”? This cannot be undone.`)) return
    setActionId(coupon.id)
    setError('')
    try {
      await tapstackApi.vendorCouponDelete(coupon.id)
      setList((prev) => prev.filter((item) => item.id !== coupon.id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete coupon.')
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="vendor-promos-content">
      <div className="vendor-promos-toolbar">
        <h2 className="vendor-promos-heading">Coupon Codes</h2>
      </div>

      <form className="vendor-promos-form-card" onSubmit={(event) => void handleSubmit(event)}>
        <p className="vendor-promos-form-label">Quick Create</p>

        <div className="vendor-codes-code-row">
          <input
            type="text"
            className="vendor-promos-input"
            placeholder="Code (e.g. SAVE20)"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            required
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
            type="number"
            className="vendor-promos-input"
            placeholder="Value (e.g. 20)"
            value={bonusValue}
            onChange={(event) => setBonusValue(event.target.value)}
            min={0.01}
            step="0.01"
            required
          />
        </div>

        <div className="vendor-promos-datetime-row">
          <div className="vendor-promos-select-wrap">
            <select
              className="vendor-promos-select"
              value={useLimit}
              onChange={(event) => setUseLimit(event.target.value)}
              aria-label="Use limit per customer"
            >
              <option value="1">1 use per customer</option>
              <option value="3">3 uses per customer</option>
              <option value="5">5 uses per customer</option>
              <option value="unlimited">Unlimited per customer</option>
            </select>
            <svg className="vendor-promos-select-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 6 L8 10 L12 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <input
            type="number"
            className="vendor-promos-input"
            placeholder="Max total uses"
            value={maxRedemptions}
            onChange={(event) => setMaxRedemptions(event.target.value)}
            min={0}
            step={1}
            aria-label="Max total redemptions"
          />
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

        {error ? <p className="vendor-promos-error">{error}</p> : null}

        <button type="submit" className="vendor-promos-submit-btn" disabled={saving || !code.trim()}>
          {saving ? 'Creating…' : 'Create Code'}
        </button>
      </form>

      {loading ? <p className="vendor-promos-hint">Loading…</p> : null}
      <ul className="vendor-codes-list">
        {list.map((coupon) => (
          <li key={coupon.id}>
            <CouponCard
              coupon={coupon}
              busy={actionId === coupon.id}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          </li>
        ))}
      </ul>
      {!loading && list.length === 0 ? (
        <p className="vendor-promos-hint">No coupon codes yet — create one above.</p>
      ) : null}
    </div>
  )
}

function EmailBlastTab() {
  const [audienceExpanded, setAudienceExpanded] = useState(true)
  const [selectedSegment, setSelectedSegment] = useState('all')
  const [audienceDraft, setAudienceDraft] = useState('')
  const [filterField, setFilterField] = useState('deposit-count')
  const [filterOperator, setFilterOperator] = useState('exactly')
  const [filterValue, setFilterValue] = useState('1')
  const [filterWindow, setFilterWindow] = useState('90-days')
  const [useCustomFilter, setUseCustomFilter] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [loading, setLoading] = useState(isApiConfigured())
  const [sending, setSending] = useState(false)
  const [finding, setFinding] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [segments, setSegments] = useState<EmailBlastSegment[]>([])
  const [recentBlasts, setRecentBlasts] = useState<EmailBlastItem[]>([])
  const [availability, setAvailability] = useState<EmailBlastAvailability>({
    available: true,
    nextAvailable: 'Now',
    blastsEnabled: true,
    message: 'Ready to send',
  })
  const [recipientCount, setRecipientCount] = useState(0)

  const aiSuggestions = [
    "Players who haven't visited in 3 weeks",
    'High rollers who spent over $500',
    'New sign-ups this month',
    'One-time depositors to win back',
  ]

  const filters = useCustomFilter
    ? {
        field: filterField,
        operator: filterOperator,
        value: filterValue,
        window: filterWindow,
      }
    : undefined

  const load = useCallback(async () => {
    if (!isApiConfigured()) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await tapstackApi.vendorEmailBlasts()
      setSegments(res.segments || [])
      setRecentBlasts(res.recent || [])
      if (res.availability) setAvailability(res.availability)
      const all = (res.segments || []).find((s) => s.id === 'all')
      if (all) setRecipientCount(all.count)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load email blasts.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const match = segments.find((s) => s.id === selectedSegment)
    if (match && !useCustomFilter) setRecipientCount(match.count)
  }, [selectedSegment, segments, useCustomFilter])

  async function refreshPreview(segment = selectedSegment) {
    if (!isApiConfigured()) return
    setFinding(true)
    setError('')
    try {
      const res = await tapstackApi.vendorEmailBlastPreview({
        segment,
        filters,
      })
      setRecipientCount(res.count || 0)
      setSelectedSegment(res.segment || segment)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not preview audience.')
    } finally {
      setFinding(false)
    }
  }

  async function handleAudienceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!audienceDraft.trim() || !isApiConfigured()) return
    setFinding(true)
    setError('')
    try {
      const res = await tapstackApi.vendorEmailBlastInterpret(audienceDraft.trim())
      setSelectedSegment(res.segment)
      setRecipientCount(res.count || 0)
      setUseCustomFilter(false)
      setAudienceDraft('')
      setSuccess(`Audience set to ${res.segmentLabel} (${res.count} players).`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not interpret audience.')
    } finally {
      setFinding(false)
    }
  }

  async function handleSend() {
    if (!isApiConfigured() || sending) return
    if (!subject.trim() || !message.trim()) {
      setError('Subject and message are required.')
      return
    }
    if (!availability.available) {
      setError(availability.message || 'Daily blast limit reached.')
      return
    }
    if (recipientCount <= 0) {
      setError('No players in this audience.')
      return
    }
    if (!window.confirm(`Send this email to ${recipientCount} players? You can only send 1 blast per day.`)) {
      return
    }
    setSending(true)
    setError('')
    setSuccess('')
    try {
      const res = await tapstackApi.vendorEmailBlastSend({
        subject: subject.trim(),
        message: message.trim(),
        segment: selectedSegment,
        filters,
      })
      setAvailability(res.availability)
      setSuccess(`Sent to ${res.sentCount} players${res.failedCount ? ` (${res.failedCount} failed)` : ''}.`)
      setSubject('')
      setMessage('')
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send email blast.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="vendor-promos-content vendor-email-blast-content">
      <div className="vendor-email-blast-intro">
        <h2 className="vendor-promos-heading">Email Blast</h2>
        <p className="vendor-email-blast-subtitle">Target specific player segments · 1 blast per day</p>
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

        {audienceExpanded ? (
          <div className="vendor-email-audience-body">
            <p className="vendor-email-segments-label">QUICK SEGMENTS</p>
            <div className="vendor-email-segments-grid">
              {(segments.length
                ? segments
                : [{ id: 'all', label: 'All players', count: 0 }]
              ).map((segment) => {
                const active = selectedSegment === segment.id && !useCustomFilter
                return (
                  <button
                    key={segment.id}
                    type="button"
                    className={`vendor-email-segment-btn ${active ? 'vendor-email-segment-btn--active' : ''}`}
                    onClick={() => {
                      setSelectedSegment(segment.id)
                      setUseCustomFilter(false)
                      setRecipientCount(segment.count)
                    }}
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
                Tell me who you want to reach and I&apos;ll pick the best segment.
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

              <form className="vendor-email-ai-input-row" onSubmit={(event) => void handleAudienceSubmit(event)}>
                <input
                  type="text"
                  value={audienceDraft}
                  onChange={(event) => setAudienceDraft(event.target.value)}
                  placeholder="Describe your audience..."
                  aria-label="Describe your audience"
                />
                <button type="submit" className="vendor-email-ai-send-btn" aria-label="Build audience" disabled={finding}>
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
        ) : null}
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
              <option value="last-visit">Days since visit</option>
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

        <button
          type="button"
          className="vendor-email-add-filter-btn"
          onClick={() => setUseCustomFilter(true)}
        >
          {useCustomFilter ? 'Custom filter active' : '+ Apply Filter'}
        </button>

        <button
          type="button"
          className="vendor-email-find-players-btn"
          disabled={finding}
          onClick={() => {
            setUseCustomFilter(true)
            void refreshPreview(selectedSegment)
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
            <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="M14 20c.4-2.2 2-4 4-4" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          {finding ? 'Finding…' : 'Find Players'}
        </button>
      </section>

      <article className={`vendor-email-plan-card ${availability.available ? '' : 'vendor-email-plan-card--blocked'}`}>
        <div>
          <p className="vendor-email-plan-title">Daily Blast Limit</p>
          <p className="vendor-email-plan-meta">
            Next available: {availability.nextAvailable} · {recipientCount} recipients
          </p>
          {!availability.available ? (
            <p className="vendor-email-plan-warning">{availability.message}</p>
          ) : null}
        </div>
        <span className={`vendor-email-plan-status ${availability.available ? '' : 'vendor-email-plan-status--blocked'}`}>
          {availability.available ? 'Available' : 'Used today'}
        </span>
      </article>

      <section className="vendor-email-compose">
        <label className="vendor-email-compose-field">
          <span className="vendor-email-compose-label">Subject</span>
          <input
            type="text"
            className="vendor-promos-input"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Weekend freeplay is live"
          />
        </label>

        <label className="vendor-email-compose-field">
          <span className="vendor-email-compose-label">Message</span>
          <textarea
            className="vendor-promos-textarea vendor-email-compose-textarea"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={5}
            placeholder="Write the email players will receive…"
          />
        </label>

        {error ? <p className="vendor-promos-error">{error}</p> : null}
        {success ? <p className="vendor-promos-save-ok">{success}</p> : null}

        <div className="vendor-email-compose-actions">
          <button
            type="button"
            className="vendor-email-preview-btn"
            onClick={() => setPreviewOpen(true)}
            disabled={!subject.trim() && !message.trim()}
          >
            Preview
          </button>
          <button
            type="button"
            className="vendor-email-send-btn"
            disabled={sending || loading || !availability.available || recipientCount <= 0}
            onClick={() => void handleSend()}
          >
            {sending ? 'Sending…' : `Send to ${recipientCount}`}
          </button>
        </div>
      </section>

      <section className="vendor-email-recent">
        <h3 className="vendor-email-recent-label">RECENT BLASTS</h3>
        {loading ? <p className="vendor-promos-hint">Loading…</p> : null}
        {!loading && recentBlasts.length === 0 ? (
          <p className="vendor-promos-hint">No blasts sent yet.</p>
        ) : null}
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

      {previewOpen ? (
        <div className="vendor-email-preview-overlay" role="presentation" onClick={() => setPreviewOpen(false)}>
          <div
            className="vendor-email-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Email preview"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="vendor-email-preview-head">
              <h3>Preview</h3>
              <button type="button" className="vendor-notif-close" onClick={() => setPreviewOpen(false)} aria-label="Close">
                ×
              </button>
            </div>
            <p className="vendor-email-preview-subject">
              <strong>Subject:</strong> {subject || '(no subject)'}
            </p>
            <pre className="vendor-email-preview-body">{message || '(no message)'}</pre>
            <p className="vendor-promos-hint">Sending to {recipientCount} players in “{selectedSegment}”.</p>
          </div>
        </div>
      ) : null}
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
