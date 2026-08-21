import { useCallback, useEffect, useState } from 'react'
import LoginPage, { type UserType } from './components/LoginPage'
import OtpPage from './components/OtpPage'
import PlayerSignupPage from './components/PlayerSignupPage'
import CustomerDashboard from './components/CustomerDashboard'
import VendorDashboard from './components/VendorDashboard'
import AdminDashboard from './components/AdminDashboard'
import DistributorDashboard from './components/DistributorDashboard'
import ApplyPage from './components/ApplyPage'
import LegalPage, { type LegalDoc } from './components/LegalPage'
import {
  applyAuthSession,
  canAccessView,
  clearSession,
  getSessionEpoch,
  getSessionRole,
  getToken,
  homeViewForRole,
  isApiConfigured,
  isMeForCurrentSession,
  tapstackApi,
  type SessionRole,
} from './api/client'
import { clearVendorGamesCache } from './components/VendorSettingsPage'
import {
  applyDocumentTitle,
  migrateLegacyHash,
  navigate,
  parseLocation,
  replaceUrl,
  type RouteState,
} from './lib/routing'
import './components/LoginPage.css'

type AppView =
  | 'login'
  | 'otp'
  | 'player-signup'
  | 'customer'
  | 'vendor'
  | 'admin'
  | 'distributor'
  | 'apply'
  | 'terms'
  | 'privacy'
  | 'returns'

type DashboardView = 'customer' | 'vendor' | 'admin' | 'distributor'

function isDashboardView(view: AppView): view is DashboardView {
  return view === 'customer' || view === 'vendor' || view === 'admin' || view === 'distributor'
}

function isLegalView(view: AppView): view is LegalDoc {
  return view === 'terms' || view === 'privacy' || view === 'returns'
}

function viewFromRoute(route: RouteState): AppView {
  if (route.portal === 'signup') return 'player-signup'
  if (route.portal === 'otp') return 'otp'
  if (route.portal === 'apply') return 'apply'
  if (route.portal === 'terms' || route.portal === 'privacy' || route.portal === 'returns') {
    return route.portal
  }
  if (route.portal === 'customer') return 'customer'
  if (route.portal === 'vendor') return 'vendor'
  if (route.portal === 'admin') return 'admin'
  if (route.portal === 'distributor') return 'distributor'
  return 'login'
}

function routeForView(view: AppView): RouteState {
  if (view === 'player-signup') return { portal: 'signup' }
  if (view === 'otp') return { portal: 'otp' }
  if (view === 'apply') return { portal: 'apply' }
  if (view === 'terms' || view === 'privacy' || view === 'returns') return { portal: view }
  if (view === 'customer') return { portal: 'customer', tab: 'games' }
  if (view === 'vendor') return { portal: 'vendor', tab: 'home' }
  if (view === 'admin') return { portal: 'admin', tab: 'overview' }
  if (view === 'distributor') return { portal: 'distributor', tab: 'home' }
  return { portal: 'login' }
}

function getViewFromLocation(): AppView {
  return viewFromRoute(parseLocation())
}

function resolveView(requested: AppView, role: SessionRole | null): AppView {
  if (isDashboardView(requested)) {
    if (!role) return 'login'
    if (!canAccessView(requested, role)) return homeViewForRole(role)
    return requested
  }

  if (role && (requested === 'login' || requested === 'otp' || requested === 'player-signup')) {
    return homeViewForRole(role)
  }

  return requested
}

function App() {
  const [sessionRole, setSessionRole] = useState<SessionRole | null>(() => getSessionRole())
  const [view, setView] = useState<AppView>(() => {
    migrateLegacyHash()
    return resolveView(getViewFromLocation(), getSessionRole())
  })
  const [userType, setUserType] = useState<UserType>('players')
  const [phone, setPhone] = useState('')

  function enterSession(role: SessionRole, nextView?: DashboardView) {
    setSessionRole(role)
    const target = nextView || homeViewForRole(role)
    setView(target)
    navigate(routeForView(target), 'replace')
  }

  /** Token belongs to a different portal than the one currently mounted. */
  const handleRoleMismatch = useCallback((role: SessionRole) => {
    setSessionRole(role)
    const home = homeViewForRole(role)
    setView(home)
    navigate(routeForView(home), 'replace')
  }, [])

  function goToApply() {
    navigate({ portal: 'apply' })
    setView('apply')
  }

  function goToLegal(doc: LegalDoc) {
    navigate({ portal: doc })
    setView(doc)
  }

  function backFromLegal() {
    navigate({ portal: 'login' }, 'replace')
    setView('login')
  }

  function goToPlayerSignup() {
    if (sessionRole) {
      const home = homeViewForRole(sessionRole)
      setView(home)
      navigate(routeForView(home), 'replace')
      return
    }
    navigate({ portal: 'signup' })
    setView('player-signup')
  }

  function goToLogin() {
    clearSession()
    clearVendorGamesCache()
    setSessionRole(null)
    navigate({ portal: 'login' }, 'replace')
    setView('login')
  }

  useEffect(() => {
    migrateLegacyHash()
    applyDocumentTitle(parseLocation())

    function syncFromLocation() {
      const role = getSessionRole()
      setSessionRole(role)
      const requested = getViewFromLocation()
      const resolved = resolveView(requested, role)
      setView(resolved)

      // If auth bounced them (e.g. /vendor while logged in as player), fix the URL.
      if (resolved !== requested) {
        replaceUrl(routeForView(resolved))
      } else {
        applyDocumentTitle(parseLocation())
      }
    }

    window.addEventListener('popstate', syncFromLocation)
    return () => {
      window.removeEventListener('popstate', syncFromLocation)
    }
  }, [])

  // Always re-validate the Bearer token against /auth/me so localStorage role
  // cannot drift from the account (e.g. vendor token labeled as player).
  // Ignore stale responses if the user logged out / switched accounts mid-flight.
  useEffect(() => {
    const token = getToken()
    if (!token || !isApiConfigured() || token.startsWith('demo:')) return

    const epoch = getSessionEpoch()
    let cancelled = false
    ;(async () => {
      try {
        const me = await tapstackApi.me()
        if (cancelled) return
        // User may have logged out or logged into a different account while waiting.
        if (getToken() !== token || getSessionEpoch() !== epoch) return
        // Ignore proxy-cached /auth/me bodies that belong to someone else.
        if (!isMeForCurrentSession(me.user)) return
        const nextRole = applyAuthSession(token, me.user)
        setSessionRole(nextRole)
        const resolved = resolveView(getViewFromLocation(), nextRole)
        setView(resolved)
        replaceUrl(routeForView(resolved))
      } catch {
        if (cancelled) return
        // Don't wipe a newer login/OTP session if this request was for an old token.
        if (getToken() !== token || getSessionEpoch() !== epoch) return
        clearSession()
        setSessionRole(null)
        setView('login')
        replaceUrl({ portal: 'login' })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  // Keep top-level portal URL in sync when view changes from in-app actions.
  useEffect(() => {
    const route = parseLocation()
    const routeView = viewFromRoute(route)
    if (routeView === view) return

    // Don't clobber deep links like /customer/vendors/20 while staying on customer portal.
    if (isDashboardView(view) && route.portal === view) return

    replaceUrl(routeForView(view))
  }, [view])

  const isPortalLogin = userType === 'admin' || userType === 'vendor'

  const screenClass =
    view === 'customer' || view === 'vendor' || view === 'admin' || view === 'distributor'
      ? 'screen--dashboard'
      : view === 'apply'
        ? 'screen--apply'
        : view === 'otp' || view === 'player-signup' || isLegalView(view)
          ? 'screen--otp'
          : view === 'login' && isPortalLogin
            ? 'screen--admin'
            : ''

  return (
    <div className="page">
      <div className="phone-frame">
        <div className={`screen ${screenClass}`}>
          {view === 'login' && (
            <LoginPage
              userType={userType}
              onUserTypeChange={setUserType}
              onPlayersPhoneSubmit={(submittedPhone) => {
                setSessionRole(null)
                setPhone(submittedPhone)
                navigate({ portal: 'otp' })
                setView('otp')
              }}
              onVendorLogin={() => enterSession('vendor')}
              onAdminLogin={() => enterSession('admin')}
              onSignUp={goToPlayerSignup}
              onApply={goToApply}
              onOpenLegal={goToLegal}
            />
          )}

          {view === 'otp' && (
            <OtpPage
              phone={phone}
              onVerify={() => enterSession('player')}
              onBack={() => {
                navigate({ portal: 'login' }, 'replace')
                setView('login')
              }}
            />
          )}

          {view === 'player-signup' && (
            <PlayerSignupPage
              onComplete={() => enterSession('player')}
              onBack={goToLogin}
            />
          )}

          {view === 'customer' && sessionRole === 'player' && (
            <CustomerDashboard onLogout={goToLogin} onRoleMismatch={handleRoleMismatch} />
          )}
          {view === 'vendor' && sessionRole === 'vendor' && (
            <VendorDashboard onLogout={goToLogin} onRoleMismatch={handleRoleMismatch} />
          )}
          {view === 'admin' && sessionRole === 'admin' && (
            <AdminDashboard onLogout={goToLogin} />
          )}
          {view === 'distributor' && sessionRole === 'distributor' && (
            <DistributorDashboard onLogout={goToLogin} />
          )}

          {view === 'apply' && <ApplyPage onBack={goToLogin} />}

          {isLegalView(view) && (
            <LegalPage doc={view} onBack={backFromLegal} onOpenDoc={goToLegal} />
          )}
        </div>
      </div>
    </div>
  )
}

export default App
