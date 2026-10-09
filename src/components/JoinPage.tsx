import { useEffect, useState } from 'react'
import {
  ApiError,
  getSessionRole,
  getToken,
  isApiConfigured,
  tapstackApi,
} from '../api/client'
import { setPendingVendorJoin } from '../lib/affiliate'
import { TapStackLogo } from './TapStackLogo'
import './ApplyPage.css'

export default function JoinPage({
  slug,
  onPlayerNoop,
  onVendorJoined,
  onVendorApply,
  onInvalid,
}: {
  slug: string
  /** Logged-in player: affiliate links do nothing on the player side. */
  onPlayerNoop: () => void
  /** Unused: affiliate links go to the signup form, not login. */
  onNeedVendorLogin?: () => void
  /** Logged-in vendor cannot join; return them to the vendor portal. */
  onVendorJoined: () => void
  /** New vendor → open apply under this affiliate. */
  onVendorApply: () => void
  onInvalid: () => void
}) {
  const [message, setMessage] = useState('Opening invite…')
  const [error, setError] = useState('')

  useEffect(() => {
    const clean = slug.trim().toLowerCase()
    if (!clean) {
      onInvalid()
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        let distributorName = ''
        const joinSlug = clean
        if (isApiConfigured()) {
          const res = await tapstackApi.resolveJoin(clean)
          if (cancelled) return
          distributorName = res.distributorName || ''
        }

        const token = getToken()
        const role = getSessionRole()

        // Players: nothing happens — this invite is for vendors only.
        if (token && role === 'player') {
          setMessage(
            distributorName
              ? `This invite is for vendors joining ${distributorName}. Nothing was added to your player account.`
              : 'This invite is for vendors. Nothing was added to your player account.',
          )
          window.setTimeout(() => {
            if (!cancelled) onPlayerNoop()
          }, 1600)
          return
        }

        // Existing vendors cannot become affiliates of any distributor.
        if (token && role === 'vendor') {
          setError(
            'Existing vendors cannot join a distributor network. Affiliate links are for new vendor signups only.',
          )
          window.setTimeout(() => {
            if (!cancelled) onVendorJoined()
          }, 2200)
          return
        }

        // Distributor opening their own (or another) link — stay in portal.
        if (token && role === 'distributor') {
          setMessage(
            distributorName
              ? `This is a vendor invite for ${distributorName}.`
              : 'This is a vendor invite link.',
          )
          window.setTimeout(() => {
            if (!cancelled) onPlayerNoop()
          }, 1400)
          return
        }

        // New vendors must complete the signup form under this affiliate.
        setPendingVendorJoin(joinSlug, distributorName)
        setMessage(
          distributorName
            ? `Complete the vendor signup form to join ${distributorName}…`
            : 'Complete the vendor signup form to join this network…',
        )
        if (cancelled) return
        onVendorApply()
      } catch (err) {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'This invite link is invalid.')
        window.setTimeout(() => onInvalid(), 1800)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [slug, onPlayerNoop, onVendorJoined, onVendorApply, onInvalid])

  return (
    <div className="apply-page">
      <div className="apply-page-scroll">
        <header className="apply-header">
          <div className="apply-header-logo-btn" aria-hidden="true">
            <TapStackLogo height={40} />
          </div>
        </header>
        <section className="apply-intro">
          <h1 className="apply-title">Vendor invite</h1>
          <p className="apply-subtitle">{error || message}</p>
        </section>
      </div>
    </div>
  )
}
