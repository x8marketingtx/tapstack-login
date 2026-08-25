import { useEffect, useState } from 'react'
import {
  ApiError,
  getSessionRole,
  getToken,
  isApiConfigured,
  tapstackApi,
} from '../api/client'
import { setAffiliateSlug, setPendingPlayerJoin } from '../lib/affiliate'
import { TapStackLogo } from './TapStackLogo'
import './ApplyPage.css'

export default function JoinPage({
  slug,
  onPlayerJoined,
  onNeedLogin,
  onVendorApply,
  onInvalid,
}: {
  slug: string
  onPlayerJoined: () => void
  onNeedLogin: () => void
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

    setAffiliateSlug(clean)

    let cancelled = false
    ;(async () => {
      try {
        let distributorName = ''
        if (isApiConfigured()) {
          const res = await tapstackApi.resolveJoin(clean)
          if (cancelled) return
          distributorName = res.distributorName || ''
          setAffiliateSlug(res.slug || clean)
        }

        const token = getToken()
        const role = getSessionRole()
        const isPlayer = Boolean(token) && role === 'player'

        if (isPlayer) {
          setMessage(
            distributorName
              ? `Adding ${distributorName} to your vendors…`
              : 'Adding distributor to your vendors…',
          )
          if (isApiConfigured() && token && !token.startsWith('demo:')) {
            await tapstackApi.joinDistributor(clean)
          }
          if (cancelled) return
          onPlayerJoined()
          return
        }

        if (!token || !role) {
          // Logged-out visitors who are players: after login, auto-link this distributor.
          setPendingPlayerJoin(clean)
          setMessage(
            distributorName
              ? `Sign in to add ${distributorName} to your vendors…`
              : 'Sign in to add this distributor…',
          )
          if (cancelled) return
          onNeedLogin()
          return
        }

        // Vendor / distributor / admin already signed in → vendor apply under this affiliate.
        setMessage(
          distributorName ? `Opening vendor signup for ${distributorName}…` : 'Opening vendor signup…',
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
  }, [slug, onPlayerJoined, onNeedLogin, onVendorApply, onInvalid])

  return (
    <div className="apply-page">
      <div className="apply-page-scroll">
        <header className="apply-header">
          <div className="apply-header-logo-btn" aria-hidden="true">
            <TapStackLogo height={40} />
          </div>
        </header>
        <section className="apply-intro">
          <h1 className="apply-title">Join TapStack</h1>
          <p className="apply-subtitle">{error || message}</p>
        </section>
      </div>
    </div>
  )
}
