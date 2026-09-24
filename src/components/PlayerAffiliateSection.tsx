import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ApiError,
  getToken,
  isApiConfigured,
  tapstackApi,
  type VendorAffiliate,
} from '../api/client'
import { forgetSeenPlayerAffiliate } from '../lib/affiliate'
import './PlayerAffiliateSection.css'

function demoPlayerAffiliates(): VendorAffiliate[] {
  return [
    {
      enabled: true,
      rateType: 'percent',
      rate: 5,
      basis: 'deposit',
      cadence: 'weekly',
      code: 'DEMO',
      shortlinkPath: '/customer?a=DEMO',
      pendingAmount: 0,
      lifetimeAmount: 0,
      vendorId: 1,
      vendorName: 'Lucky Strike Arcade',
    },
  ]
}

export default function PlayerAffiliateSection({
  hideWhenEmpty = false,
  showPayouts = false,
}: {
  hideWhenEmpty?: boolean
  showPayouts?: boolean
}) {
  const [affiliates, setAffiliates] = useState<VendorAffiliate[]>([])
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState<VendorAffiliate | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = getToken()
    const demo = !isApiConfigured() || Boolean(token?.startsWith('demo:'))
    if (demo) {
      setAffiliates(demoPlayerAffiliates())
      setLoading(false)
      return
    }

    let cancelled = false
    tapstackApi
      .customerAffiliates()
      .then((res) => {
        if (!cancelled) {
          const rows = Array.isArray(res.affiliates) ? res.affiliates : []
          setAffiliates(rows.filter((row) => row.enabled !== false))
        }
      })
      .catch(() => {
        if (!cancelled) setAffiliates([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function leaveConfirmed() {
    const vendorId = confirm?.vendorId
    if (!vendorId) return
    setLeaving(true)
    setError('')
    try {
      const token = getToken()
      const demo = !isApiConfigured() || Boolean(token?.startsWith('demo:'))
      if (!demo) {
        const res = await tapstackApi.customerLeaveAffiliate(vendorId)
        setAffiliates(
          Array.isArray(res.affiliates)
            ? res.affiliates.filter((row) => row.enabled !== false)
            : affiliates.filter((row) => Number(row.vendorId) !== Number(vendorId)),
        )
      } else {
        setAffiliates(affiliates.filter((row) => Number(row.vendorId) !== Number(vendorId)))
      }
      forgetSeenPlayerAffiliate(Number(vendorId))
      setConfirm(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not leave this affiliate program.')
      setConfirm(null)
    } finally {
      setLeaving(false)
    }
  }

  if (hideWhenEmpty && (loading || affiliates.length === 0)) return null

  return (
    <>
      <section className="player-affiliate-card">
        <p className="player-affiliate-kicker">AFFILIATE OF</p>
        {loading ? <p className="player-affiliate-help">Loading…</p> : null}
        {!loading && affiliates.length === 0 ? (
          <p className="player-affiliate-help">
            You&apos;re not an affiliate of any gameroom yet. When a store makes you an affiliate, it
            will show here.
          </p>
        ) : null}
        <ul className="player-affiliate-list">
          {affiliates.map((row) => {
            const name = row.vendorName || 'Gameroom'
            return (
              <li key={String(row.vendorId || row.code)} className="player-affiliate-row">
                <div className="player-affiliate-row-copy">
                  <span className="player-affiliate-store">{name}</span>
                  <span className="player-affiliate-meta">
                    {row.rateType === 'fixed' ? `$${row.rate.toFixed(2)}` : `${row.rate}%`} per{' '}
                    {row.basis}
                    {showPayouts
                      ? ` · pending $${Number(row.pendingAmount || 0).toFixed(2)}`
                      : ''}
                  </span>
                </div>
                <button
                  type="button"
                  className="player-affiliate-leave"
                  aria-label={`Leave ${name}'s affiliate program`}
                  onClick={() => {
                    setError('')
                    setConfirm(row)
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M4 7h16M9 7V5.6A1.6 1.6 0 0 1 10.6 4h2.8A1.6 1.6 0 0 1 15 5.6V7M6.5 7l.8 12.2A1.6 1.6 0 0 0 8.9 21h6.2a1.6 1.6 0 0 0 1.6-1.8L17.5 7"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </li>
            )
          })}
        </ul>
        {!loading && affiliates.length > 0 ? (
          <p className="player-affiliate-help">
            You earn affiliate payouts from{' '}
            {affiliates.length === 1 ? 'this gameroom' : 'these gamerooms'}. Remove the connection
            anytime.
          </p>
        ) : null}
        {error ? <p className="player-affiliate-error">{error}</p> : null}
      </section>

      {confirm
        ? createPortal(
            <div
              className="ts-leave-overlay"
              role="presentation"
              onClick={() => {
                if (!leaving) setConfirm(null)
              }}
            >
              <div
                className="ts-leave-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="player-leave-aff-title"
                onClick={(event) => event.stopPropagation()}
              >
                <span className="ts-leave-icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 7h16M9 7V5.6A1.6 1.6 0 0 1 10.6 4h2.8A1.6 1.6 0 0 1 15 5.6V7M6.5 7l.8 12.2A1.6 1.6 0 0 0 8.9 21h6.2a1.6 1.6 0 0 0 1.6-1.8L17.5 7"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <h2 id="player-leave-aff-title" className="ts-leave-title">
                  Leave {confirm.vendorName || 'this program'}?
                </h2>
                <p className="ts-leave-copy">
                  You&apos;ll stop earning affiliate payouts from this gameroom. Your player account
                  stays active.
                </p>
                <div className="ts-leave-actions">
                  <button
                    type="button"
                    className="ts-leave-btn ts-leave-btn--ghost"
                    disabled={leaving}
                    onClick={() => setConfirm(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="ts-leave-btn ts-leave-btn--danger"
                    disabled={leaving}
                    onClick={() => void leaveConfirmed()}
                  >
                    {leaving ? 'Leaving…' : 'Leave'}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
