import { useEffect, useState } from 'react'
import LoginPage, { type UserType } from './components/LoginPage'
import OtpPage from './components/OtpPage'
import CustomerDashboard from './components/CustomerDashboard'
import VendorDashboard from './components/VendorDashboard'
import AdminDashboard from './components/AdminDashboard'
import DistributorDashboard from './components/DistributorDashboard'
import ApplyPage from './components/ApplyPage'
import './components/LoginPage.css'

type AppView = 'login' | 'otp' | 'customer' | 'vendor' | 'admin' | 'distributor' | 'apply'

function getViewFromHash(): AppView {
  const hash = window.location.hash.replace('#', '')
  if (hash === 'vendor') return 'vendor'
  if (hash === 'customer') return 'customer'
  if (hash === 'admin') return 'admin'
  if (hash === 'distributor') return 'distributor'
  if (hash === 'apply' || hash === 'signup') return 'apply'
  return 'login'
}

function App() {
  const [view, setView] = useState<AppView>(getViewFromHash)
  const [userType, setUserType] = useState<UserType>('players')
  const [phone, setPhone] = useState('')

  function goToApply(hash: 'signup' | 'apply') {
    window.location.hash = hash
    setView('apply')
  }

  function goToLogin() {
    window.location.hash = ''
    setView('login')
  }

  useEffect(() => {
    function handleHashChange() {
      setView(getViewFromHash())
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    const hash =
      view === 'vendor'
        ? '#vendor'
        : view === 'customer'
          ? '#customer'
          : view === 'admin'
            ? '#admin'
            : view === 'distributor'
              ? '#distributor'
              : view === 'apply'
                ? window.location.hash === '#signup'
                  ? '#signup'
                  : '#apply'
                : ''
    const nextUrl = hash || `${window.location.pathname}${window.location.search}`

    if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== nextUrl) {
      window.history.replaceState(null, '', nextUrl)
    }
  }, [view])

  const isPortalLogin = userType === 'admin' || userType === 'vendor' || userType === 'distributor'

  const screenClass =
    view === 'customer' || view === 'vendor' || view === 'admin' || view === 'distributor'
      ? 'screen--dashboard'
      : view === 'apply'
        ? 'screen--apply'
        : view === 'otp'
          ? 'screen--otp'
          : isPortalLogin
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
              onVendorLogin={() => setView('vendor')}
              onDistributorLogin={() => setView('distributor')}
              onAdminLogin={() => setView('admin')}
              onSignUp={() => goToApply('signup')}
              onApply={() => goToApply('apply')}
            />
          )}

          {view === 'otp' && (
            <OtpPage
              phone={phone}
              onVerify={() => setView('customer')}
              onBack={() => setView('login')}
            />
          )}

          {view === 'customer' && <CustomerDashboard />}
          {view === 'vendor' && <VendorDashboard />}
          {view === 'admin' && <AdminDashboard />}
          {view === 'distributor' && <DistributorDashboard />}

          {view === 'apply' && <ApplyPage onBack={goToLogin} />}
        </div>
      </div>
    </div>
  )
}

export default App
