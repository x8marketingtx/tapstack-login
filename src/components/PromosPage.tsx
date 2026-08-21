import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, isApiConfigured, tapstackApi, type PlayerPromo } from '../api/client'
import './PromosPage.css'

const CACHE_TTL_MS = 60_000

let promosCache: PlayerPromo[] | null = null
let promosCacheAt = 0
let promosInflight: Promise<PlayerPromo[]> | null = null

async function fetchPromos(force = false): Promise<PlayerPromo[]> {
  if (!isApiConfigured()) return []
  const fresh = promosCache && Date.now() - promosCacheAt < CACHE_TTL_MS
  if (!force && fresh && promosCache) return promosCache
  if (!force && promosInflight) return promosInflight

  promosInflight = tapstackApi
    .customerPromos()
    .then((res) => {
      promosCache = res.promos || []
      promosCacheAt = Date.now()
      return promosCache
    })
    .finally(() => {
      promosInflight = null
    })

  return promosInflight
}

export default function PromosPage({ active = true }: { active?: boolean }) {
  const [promos, setPromos] = useState<PlayerPromo[]>(() => promosCache ?? [])
  const [loading, setLoading] = useState(() => isApiConfigured() && !promosCache)
  const [filter, setFilter] = useState<string>('all')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const loadedOnce = useRef(Boolean(promosCache))

  const load = useCallback(async (force = false) => {
    if (!isApiConfigured()) {
      setLoading(false)
      return
    }
    const showSpinner = !promosCache && !loadedOnce.current
    if (showSpinner) setLoading(true)
    try {
      const next = await fetchPromos(force)
      setPromos(next)
      loadedOnce.current = true
    } catch {
      if (!promosCache) setPromos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!active) return
    void load(false)
  }, [active, load])

  const vendors = useMemo(() => {
    const map = new Map<string, { id: string; label: string; initials: string }>()
    for (const promo of promos) {
      if (!map.has(promo.vendorId)) {
        map.set(promo.vendorId, {
          id: promo.vendorId,
          label: promo.vendorName,
          initials: promo.vendorInitials || 'V',
        })
      }
    }
    return Array.from(map.values())
  }, [promos])

  const visible = filter === 'all' ? promos : promos.filter((p) => p.vendorId === filter)

  async function handleAction(promo: PlayerPromo) {
    if (!isApiConfigured() || busyId) return
    setBusyId(promo.id)
    setNote('')
    try {
      if (promo.claimStatus === 'available') {
        const res = await tapstackApi.customerPromoActivate(promo.id)
        setPromos((list) => {
          const next = list.map((p) => (p.id === promo.id ? res.promo : p))
          promosCache = next
          promosCacheAt = Date.now()
          return next
        })
        setNote('Promo activated — load to complete it.')
      } else if (promo.claimStatus === 'completed') {
        const res = await tapstackApi.customerPromoClaim(promo.id)
        setPromos((list) => {
          const next = list.map((p) => (p.id === promo.id ? res.promo : p))
          promosCache = next
          promosCacheAt = Date.now()
          return next
        })
        setNote(`Claimed ${res.promo.rewardAmount ? `$${res.promo.rewardAmount.toFixed(2)}` : 'reward'}!`)
      }
    } catch (err) {
      setNote(err instanceof ApiError ? err.message : 'Could not update promo.')
    } finally {
      setBusyId(null)
      window.setTimeout(() => setNote(''), 2500)
    }
  }

  function actionLabel(promo: PlayerPromo): string {
    if (promo.claimStatus === 'available') return 'Activate'
    if (promo.claimStatus === 'active') return 'In progress'
    if (promo.claimStatus === 'completed') return 'Claim reward'
    return 'Claimed'
  }

  return (
    <div className="promos-page">
      <div className="promos-intro">
        <h1 className="promos-title">Promotions</h1>
        <p className="promos-subtitle">From your linked vendors — activate, complete a load, claim</p>
      </div>

      <div className="promo-filters" role="tablist" aria-label="Vendor filters">
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'all'}
          className={`promo-filter ${filter === 'all' ? 'promo-filter--active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        {vendors.map((vendor) => (
          <button
            key={vendor.id}
            type="button"
            role="tab"
            aria-selected={filter === vendor.id}
            className={`promo-filter ${filter === vendor.id ? 'promo-filter--active' : ''}`}
            onClick={() => setFilter(vendor.id)}
          >
            <span className="promo-filter-icon" style={{ background: '#14532d' }}>
              {vendor.initials.slice(0, 1)}
            </span>
            {vendor.label}
          </button>
        ))}
      </div>

      {note ? <p className="promo-toast">{note}</p> : null}

      {loading ? <p className="promo-empty">Loading promotions…</p> : null}

      {!loading && visible.length === 0 ? (
        <p className="promo-empty">
          No live promos yet. Link a vendor and ask them to publish a Bonus Credit or Deposit Bonus.
        </p>
      ) : null}

      <div className="promo-list">
        {visible.map((promo) => {
          const pct =
            promo.goal > 0 ? Math.min(100, Math.round((promo.progress / promo.goal) * 100)) : 0
          const canAct =
            promo.claimStatus === 'available' || promo.claimStatus === 'completed'
          return (
            <article key={promo.id} className="promo-card">
              <div className="promo-card-hero" style={{ background: promo.heroGradient }}>
                <span className="promo-card-badge">{promo.badge || 'PROMO'}</span>
                <div className="promo-card-vendor">
                  <span className="promo-vendor-icon">{promo.vendorInitials}</span>
                  {promo.vendorName}
                </div>
                <h2 className="promo-card-headline">{promo.headline || promo.title}</h2>
              </div>

              <div className="promo-card-body">
                <div className="promo-card-title-row">
                  <h3 className="promo-card-title">{promo.title}</h3>
                  <span className={`promo-tag ${promo.categoryClass}`}>
                    <span aria-hidden="true">{promo.categoryIcon}</span>
                    {promo.category}
                  </span>
                </div>
                <p className="promo-card-desc">
                  {promo.description ||
                    (promo.type === 'deposit-bonus'
                      ? `Load $${promo.minAmount}+ and get ${promo.rewardValue}% bonus credit.`
                      : `Load $${promo.minAmount}+ and get $${promo.rewardValue.toFixed(2)} credit.`)}
                </p>

                {promo.claimStatus === 'active' || promo.claimStatus === 'completed' ? (
                  <div className="promo-progress">
                    <div className="promo-progress-track">
                      <div className="promo-progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span>
                      ${promo.progress.toFixed(0)} / ${promo.goal.toFixed(0)}
                      {promo.claimStatus === 'completed' && promo.rewardAmount
                        ? ` · reward $${promo.rewardAmount.toFixed(2)}`
                        : ''}
                    </span>
                  </div>
                ) : null}

                <div className="promo-card-footer">
                  <span className="promo-card-ends">
                    <span aria-hidden="true">🕐</span> {promo.ends}
                  </span>
                  <button
                    type="button"
                    className={`promo-play-btn ${promo.claimStatus === 'completed' ? 'is-claim' : ''}`}
                    disabled={busyId === promo.id || !canAct}
                    onClick={() => void handleAction(promo)}
                  >
                    {busyId === promo.id ? '…' : actionLabel(promo)}
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
