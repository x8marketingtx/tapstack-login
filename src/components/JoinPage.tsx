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
  onNeedVendorLogin,
  onVendorJoined,
  onVendorApply,
  onInvalid,
}: {
  slug: string
  /** Logged-in player: affiliate links do nothing on the player side. */
  onPlayerNoop: () => void
  /** Logged out: continue as vendor login / apply. */
  onNeedVendorLogin: () => void
  /** Logged-in vendor joined the distributor network. */
  onVendorJoined: () => void
  /** No vendor store yet → open apply under this affiliate. */
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

        // Logged-in vendor with an existing store cannot become an affiliate.
        if (token && role === 'vendor') {
          if (isApiConfigured() && !token.startsWith('demo:')) {
            try {
              await tapstackApi.vendorJoinDistributor(joinSlug)
            } catch (err) {
              if (err instanceof ApiError && err.code === 'tapstack_existing_vendor') {
                setError(
                  err.message ||
                    'Existing vendors cannot join a distributor network. Affiliate links are for new vendor signups only.',
                )
                window.setTimeout(() => {
                  if (!cancelled) onVendorJoined()
                }, 2200)
                return
              }
              if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
                if (cancelled) return
                setPendingVendorJoin(joinSlug, distributorName)
                onVendorApply()
                return
              }
              throw err
            }
          }
          if (cancelled) return
          onVendorJoined()
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

        // Logged out (or admin): continue as vendor signup/login under this affiliate.
        setPendingVendorJoin(joinSlug, distributorName)
        setMessage(
          distributorName
            ? `Sign in or apply as a vendor to join ${distributorName}…`
            : 'Sign in or apply as a vendor to join this network…',
        )
        if (cancelled) return
        onNeedVendorLogin()
      } catch (err) {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'This invite link is invalid.')
        window.setTimeout(() => onInvalid(), 1800)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [slug, onPlayerNoop, onNeedVendorLogin, onVendorJoined, onVendorApply, onInvalid])

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
