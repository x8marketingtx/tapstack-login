import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, isApiConfigured, tapstackApi, type PlayerPromo } from '../api/client'
import {
  isPromoHistoryEntry,
  isPromoLiveEntry,
  promoHistoryStatusLabel,
} from '../lib/playerPromos'
import ReportImageButton from './ReportImageButton'
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

export default function PromosPage({
  active = true,
  history = false,
  onOpenHistory,
  onCloseHistory,
  onOpenGameroom,
}: {
  active?: boolean
  history?: boolean
  onOpenHistory?: () => void
  onCloseHistory?: () => void
  /** Navigate to the vendor gameroom (player dashboard). Return false if the vendor could not be opened. */
  onOpenGameroom?: (vendorId: string) => boolean | void
}) {
  const [promos, setPromos] = useState<PlayerPromo[]>(() => promosCache ?? [])
  const [loading, setLoading] = useState(() => isApiConfigured() && !promosCache)
  const [filter, setFilter] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const loadedOnce = useRef(Boolean(promosCache))
  const viewedPromoIds = useRef(new Set<string>())

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

  const scopedPromos = useMemo(
    () => promos.filter((p) => (history ? isPromoHistoryEntry(p) : isPromoLiveEntry(p))),
    [promos, history],
  )

  const vendors = useMemo(() => {
    const map = new Map<string, { id: string; label: string; initials: string }>()
    for (const promo of scopedPromos) {
      if (!map.has(promo.vendorId)) {
        map.set(promo.vendorId, {
          id: promo.vendorId,
          label: promo.vendorName,
          initials: promo.vendorInitials || 'V',
        })
      }
    }
    return Array.from(map.values())
  }, [scopedPromos])

  const visible = useMemo(() => {
    const byVendor = filter === 'all' ? scopedPromos : scopedPromos.filter((p) => p.vendorId === filter)
    const q = query.trim().toLowerCase()
    if (!q) return byVendor
    return byVendor.filter((p) =>
      [p.title, p.headline, p.vendorName, p.description, p.category]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [scopedPromos, filter, query])

  useEffect(() => {
    if (!active || history || !isApiConfigured()) return
    for (const promo of visible) {
      if (viewedPromoIds.current.has(promo.id)) continue
      viewedPromoIds.current.add(promo.id)
      void tapstackApi.customerPromoView(promo.id).catch(() => undefined)
    }
  }, [active, history, visible])

  function canActOnPromo(promo: PlayerPromo): boolean {
    if (promo.claimStatus === 'available') return true
    if (promo.type !== 'giveaway' && promo.claimStatus === 'completed') return true
    return false
  }

  async function handlePrimaryAction(promo: PlayerPromo) {
    if (!isApiConfigured() || busyId || !canActOnPromo(promo)) return
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
        if (onOpenGameroom) {
          const opened = onOpenGameroom(promo.vendorId)
          if (opened === false) {
            setNote('Promo activated — open this gameroom from Games to load.')
          }
        } else {
          setNote('Promo activated — load to complete it.')
        }
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
    if (promo.type === 'giveaway') return 'Load to enter'
    if (promo.claimStatus === 'available') return 'Activate'
    if (promo.claimStatus === 'active') return 'In progress'
    if (promo.claimStatus === 'completed') return 'Claim reward'
    return 'Claimed'
  }

  return (
    <div className="promos-page">
      <div className="promos-intro">
        <div className="promos-intro-row">
          <h1 className="promos-title">
            {history ? 'Promo History' : 'Promos and Giveaways'}
          </h1>
          {history ? (
            onCloseHistory ? (
              <button type="button" className="promos-history-btn" onClick={onCloseHistory}>
                Back
              </button>
            ) : null
          ) : onOpenHistory ? (
            <button type="button" className="promos-history-btn" onClick={onOpenHistory}>
              Promo History
            </button>
          ) : null}
        </div>
        <p className="promos-subtitle">
          {history
            ? 'Past promos and giveaways that expired or were fully used.'
            : 'From your linked vendors — activate, complete a load, or enter a giveaway'}
        </p>
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
        <input
          type="search"
          className="promo-filter-search"
          placeholder="Search promos"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search promos"
        />
        {vendors.length > 4 ? (
          <select
            className="promo-filter-select"
            value={filter === 'all' ? 'all' : filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Select vendor"
          >
            <option value="all">All vendors</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.label}
              </option>
            ))}
          </select>
        ) : (
          vendors.map((vendor) => (
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
          ))
        )}
      </div>

      {note ? <p className="promo-toast">{note}</p> : null}

      {loading ? <p className="promo-empty">Loading promotions…</p> : null}

      {!loading && visible.length === 0 ? (
        <p className="promo-empty">
          {history
            ? 'No past promos or giveaways yet.'
            : 'No live promos yet. Link a vendor and ask them to publish a Bonus Credit, Deposit Bonus, or Giveaway.'}
        </p>
      ) : null}

      <div className="promo-list">
        {visible.map((promo) => {
          const pct =
            promo.goal > 0 ? Math.min(100, Math.round((promo.progress / promo.goal) * 100)) : 0
          const canAct = canActOnPromo(promo)
          const expanded = Boolean(expandedIds[promo.id])
          const heroImage = promo.vendorBannerUrl || promo.imageUrl
          const details =
            (promo.gameTitle ? `${promo.gameTitle} only. ` : '') +
            (promo.description ||
              (promo.type === 'giveaway'
                ? `$${promo.poolAmount || promo.rewardValue} giveaway · ${promo.winnerCount || 1} winner${(promo.winnerCount || 1) === 1 ? '' : 's'} · $${(promo.prizeEach || ((promo.poolAmount || promo.rewardValue) / Math.max(1, promo.winnerCount || 1))).toFixed(2)} each.`
                : promo.type === 'deposit-bonus'
                ? `Load $${promo.minAmount}+ and get ${promo.rewardValue}% bonus credit.`
                : `Load $${promo.minAmount}+ and get $${promo.rewardValue.toFixed(2)} credit.`))
          return (
            <article
              key={promo.id}
              className={`promo-card${expanded ? ' is-expanded' : ''}${history ? ' promo-card--history' : ''}`}
            >
              <div className="promo-card-hero" style={{ background: promo.heroGradient }}>
                {heroImage ? (
                  <img src={heroImage} alt="" className="promo-card-hero-img" />
                ) : null}
                <ReportImageButton
                  imageId={promo.vendorBannerId || promo.imageId}
                  context={promo.vendorBannerId ? 'vendor-banner' : 'promo'}
                />
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
                <p className={`promo-card-desc${expanded ? ' is-open' : ''}`}>
                  {details}
                </p>
                {expanded ? (
                  <ul className="promo-card-details">
                    <li>
                      <span>Vendor</span>
                      <strong>{promo.vendorName}</strong>
                    </li>
                    {promo.minAmount > 0 ? (
                      <li>
                        <span>Min load</span>
                        <strong>${promo.minAmount.toFixed(0)}</strong>
                      </li>
                    ) : null}
                    {promo.rewardValue > 0 ? (
                      <li>
                        <span>Reward</span>
                        <strong>
                          {promo.type === 'deposit-bonus'
                            ? `${promo.rewardValue}%`
                            : `$${promo.rewardValue.toFixed(2)}`}
                        </strong>
                      </li>
                    ) : null}
                    {promo.gameTitle ? (
                      <li>
                        <span>Game</span>
                        <strong>{promo.gameTitle}</strong>
                      </li>
                    ) : null}
                  </ul>
                ) : null}
                {promo.type === 'giveaway' ? (
                  <div className="promo-giveaway-stats">
                    <div>
                      <span>Giveaway amount</span>
                      <strong>${(promo.poolAmount || promo.rewardValue || 0).toFixed(0)}</strong>
                    </div>
                    <div>
                      <span>Winners</span>
                      <strong>{promo.winnerCount || 1}</strong>
                    </div>
                  </div>
                ) : null}

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
                  <div className="promo-card-footer-actions">
                    <button
                      type="button"
                      className="promo-learn-btn"
                      aria-expanded={expanded}
                      onClick={() =>
                        setExpandedIds((current) => ({ ...current, [promo.id]: !current[promo.id] }))
                      }
                    >
                      {expanded ? 'Show less' : 'Learn more'}
                    </button>
                    {history ? (
                      <span className="promo-history-status">{promoHistoryStatusLabel(promo)}</span>
                    ) : (
                      <button
                        type="button"
                        className={`promo-play-btn ${promo.claimStatus === 'completed' ? 'is-claim' : ''}`}
                        disabled={busyId === promo.id || !canAct}
                        onClick={() => void handlePrimaryAction(promo)}
                      >
                        {busyId === promo.id ? '…' : actionLabel(promo)}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
