import { useState } from 'react'
import LoginPage, { type UserType } from './components/LoginPage'
import OtpPage from './components/OtpPage'
import CustomerDashboard from './components/CustomerDashboard'
import './components/LoginPage.css'

type AppView = 'login' | 'otp' | 'dashboard'

function App() {
  const [view, setView] = useState<AppView>('login')
  const [userType, setUserType] = useState<UserType>('players')
  const [phone, setPhone] = useState('')

  const screenClass =
    view === 'dashboard'
      ? 'screen--dashboard'
      : view === 'otp'
        ? 'screen--otp'
        : userType === 'admin'
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
            />
          )}

          {view === 'otp' && (
            <OtpPage
              phone={phone}
              onVerify={() => setView('dashboard')}
              onBack={() => setView('login')}
            />
          )}

          {view === 'dashboard' && <CustomerDashboard />}
        </div>
      </div>
    </div>
  )
}

export default App
