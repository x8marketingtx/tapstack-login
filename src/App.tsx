import { useEffect, useState } from 'react'
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
  canAccessView,
  clearSession,
  getSessionRole,
  getToken,
  homeViewForRole,
  isApiConfigured,
  setSession,
  tapstackApi,
  type SessionRole,
} from './api/client'
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

function legalPathForDoc(doc: LegalDoc): string {
  return doc === 'returns' ? '/returns' : `/${doc}`
}

function getViewFromLocation(): AppView {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'

  // Path-based legal pages: /privacy, /terms, /returns
  if (path === '/terms') return 'terms'
  if (path === '/privacy') return 'privacy'
  if (path === '/returns' || path === '/return-policy') return 'returns'

  const hash = window.location.hash.replace(/^#/, '')
  if (hash === 'vendor') return 'vendor'
  if (hash === 'customer') return 'customer'
  if (hash === 'admin') return 'admin'
  if (hash === 'distributor') return 'distributor'
  if (hash === 'signup' || hash === 'player-signup') return 'player-signup'
  if (hash === 'apply') return 'apply'
  // Legacy hash legal links → treat as legal views (synced to path below)
  if (hash === 'terms') return 'terms'
  if (hash === 'privacy') return 'privacy'
  if (hash === 'returns' || hash === 'return-policy') return 'returns'
  return 'login'
}

function resolveView(requested: AppView, role: SessionRole | null): AppView {
  if (isDashboardView(requested)) {
    if (!role) return 'login'
    if (!canAccessView(requested, role)) return homeViewForRole(role)
    return requested
  }

  // Already signed in — keep them in their portal instead of login/signup.
  if (role && (requested === 'login' || requested === 'otp' || requested === 'player-signup')) {
    return homeViewForRole(role)
  }

  return requested
}

function urlForView(view: AppView): string {
  if (isLegalView(view)) return legalPathForDoc(view)
  if (view === 'vendor') return '/#vendor'
  if (view === 'customer') return '/#customer'
  if (view === 'admin') return '/#admin'
  if (view === 'distributor') return '/#distributor'
  if (view === 'player-signup') return '/#signup'
  if (view === 'apply') return '/#apply'
  return '/'
}

function App() {
  const [sessionRole, setSessionRole] = useState<SessionRole | null>(() => getSessionRole())
  const [view, setView] = useState<AppView>(() => resolveView(getViewFromLocation(), getSessionRole()))
  const [userType, setUserType] = useState<UserType>('players')
  const [phone, setPhone] = useState('')

  function enterSession(role: SessionRole, nextView?: DashboardView) {
    setSessionRole(role)
    setView(nextView || homeViewForRole(role))
  }

  function goToApply() {
    window.history.pushState(null, '', '/#apply')
    setView('apply')
  }

  function goToLegal(doc: LegalDoc) {
    window.history.pushState(null, '', legalPathForDoc(doc))
    setView(doc)
  }

  function backFromLegal() {
    window.history.pushState(null, '', '/')
    setView('login')
  }

  function goToPlayerSignup() {
    if (sessionRole) {
      setView(homeViewForRole(sessionRole))
      return
    }
    window.history.pushState(null, '', '/#signup')
    setView('player-signup')
  }

  function goToLogin() {
    clearSession()
    setSessionRole(null)
    window.history.pushState(null, '', '/')
    setView('login')
  }

  useEffect(() => {
    function syncFromLocation() {
      const role = getSessionRole()
      setSessionRole(role)
      setView(resolveView(getViewFromLocation(), role))
    }

    window.addEventListener('hashchange', syncFromLocation)
    window.addEventListener('popstate', syncFromLocation)
    return () => {
      window.removeEventListener('hashchange', syncFromLocation)
      window.removeEventListener('popstate', syncFromLocation)
    }
  }, [])

  // Restore role for older tokens that only stored tapstack_token.
  useEffect(() => {
    const token = getToken()
    const role = getSessionRole()
    if (!token || role || !isApiConfigured() || token.startsWith('demo:')) return

    let cancelled = false
    ;(async () => {
      try {
        const me = await tapstackApi.me()
        if (cancelled) return
        const nextRole = me.user.role as SessionRole
        setSession({ token, role: nextRole, user: me.user })
        setSessionRole(nextRole)
        setView(resolveView(getViewFromLocation(), nextRole))
      } catch {
        if (cancelled) return
        clearSession()
        setSessionRole(null)
        setView('login')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const nextUrl = urlForView(view)
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
    if (current !== nextUrl) {
      window.history.replaceState(null, '', nextUrl)
    }
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
                setPhone(submittedPhone)
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
              onBack={() => setView('login')}
            />
          )}

          {view === 'player-signup' && (
            <PlayerSignupPage
              onComplete={() => enterSession('player')}
              onBack={goToLogin}
            />
          )}

          {view === 'customer' && sessionRole === 'player' && (
            <CustomerDashboard onLogout={goToLogin} />
          )}
          {view === 'vendor' && sessionRole === 'vendor' && (
            <VendorDashboard onLogout={goToLogin} />
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
