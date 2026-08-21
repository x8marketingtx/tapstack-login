import { useRef, useState } from 'react'
import {
  ApiError,
  applyAuthSession,
  isApiConfigured,
  normalizeSessionRole,
  setDemoSession,
  tapstackApi,
} from '../api/client'
import { TapStackLogo } from './TapStackLogo'
import './PlayerSignupPage.css'

const DEMO_OTP = '12345'

type PlayerSignupPageProps = {
  onComplete: () => void
  onBack: () => void
}

type Step = 'details' | 'otp'

export default function PlayerSignupPage({ onComplete: _onComplete, onBack }: PlayerSignupPageProps) {
  const [step, setStep] = useState<Step>('details')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [digits, setDigits] = useState(['', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  const code = digits.join('')
  const detailsReady =
    fullName.trim().length >= 2 &&
    email.trim().includes('@') &&
    phone.trim().length >= 7 &&
    !loading
  const otpReady = code.length === 5 && !loading

  async function handleDetailsSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!detailsReady) return
    setError('')

    if (isApiConfigured()) {
      try {
        setLoading(true)
        await tapstackApi.requestOtp(phone.trim(), 'signup')
        setStep('otp')
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not send code.')
      } finally {
        setLoading(false)
      }
      return
    }

    setStep('otp')
  }

  function updateDigit(index: number, value: string) {
    const next = value.replace(/\D/g, '').slice(-1)
    const updated = [...digits]
    updated[index] = next
    setDigits(updated)
    setError('')
    if (next && index < 4) inputsRef.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  function handlePaste(event: React.ClipboardEvent) {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 5)
    if (!pasted) return
    const updated = pasted.split('').concat(Array(5).fill('')).slice(0, 5)
    setDigits(updated)
    setError('')
    inputsRef.current[Math.min(pasted.length, 4)]?.focus()
  }

  async function handleOtpSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!otpReady) return
    setError('')

    if (isApiConfigured()) {
      try {
        setLoading(true)
        const res = await tapstackApi.verifyOtp(phone.trim(), code, {
          fullName: fullName.trim(),
          email: email.trim(),
        })
        const role = normalizeSessionRole(res.user.role) ?? 'player'
        if (role !== 'player') {
          throw new ApiError(
            'This phone is linked to a non-player account. Use Vendor/Admin login instead.',
            403,
            'tapstack_role_mismatch',
          )
        }
        applyAuthSession(res.token, { ...res.user, role: 'player' })
        window.location.replace('/customer')
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Verification failed.')
      } finally {
        setLoading(false)
      }
      return
    }

    if (code === DEMO_OTP) {
      setDemoSession('player', {
        displayName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        username: `@${fullName.trim().toLowerCase().replace(/\s+/g, '_')}`,
      })
      window.location.replace('/customer')
      return
    }

    setError('Incorrect code. Use 12345 for this demo.')
  }

  return (
    <div className="player-signup">
      <button
        type="button"
        className="player-signup-back"
        aria-label="Go back"
        onClick={() => {
          if (step === 'otp') {
            setStep('details')
            setDigits(['', '', '', '', ''])
            setError('')
            return
          }
          onBack()
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path
            d="M11.25 3.75 L6 9 L11.25 14.25"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className="player-signup-brand">
        <TapStackLogo height={64} />
        <h1 className="player-signup-title">
          {step === 'details' ? 'Create your account' : 'Verify your phone'}
        </h1>
        <p className="player-signup-subtitle">
          {step === 'details'
            ? 'Join TapStack in a minute — phone, email, and your name.'
            : (
              <>
                Enter the code we sent to <strong>+1 {phone}</strong>
              </>
            )}
        </p>
      </div>

      {step === 'details' ? (
        <form className="player-signup-form" onSubmit={handleDetailsSubmit}>
          <label className="player-signup-label" htmlFor="signup-name">
            Full name
          </label>
          <input
            id="signup-name"
            className="player-signup-input"
            type="text"
            autoComplete="name"
            placeholder="Marcus Rivera"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />

          <label className="player-signup-label" htmlFor="signup-email">
            Email address
          </label>
          <input
            id="signup-email"
            className="player-signup-input"
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <label className="player-signup-label" htmlFor="signup-phone">
            Phone number
          </label>
          <div className="player-signup-phone">
            <div className="player-signup-country">
              <span aria-hidden="true">🇺🇸</span>
              <span>+1</span>
            </div>
            <input
              id="signup-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="Phone number"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              aria-label="Phone number"
            />
          </div>

          {error ? <p className="player-signup-error">{error}</p> : null}

          <button type="submit" className="player-signup-submit" disabled={!detailsReady}>
            {loading ? 'Sending code…' : 'Continue'}
          </button>

          <p className="player-signup-footnote">
            Already have an account?{' '}
            <button type="button" className="player-signup-link" onClick={onBack}>
              Log in
            </button>
          </p>
        </form>
      ) : (
        <form className="player-signup-form player-signup-form--otp" onSubmit={handleOtpSubmit}>
          <div className="player-signup-otp" onPaste={handlePaste}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputsRef.current[index] = element
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                className="player-signup-digit"
                value={digit}
                aria-label={`Digit ${index + 1}`}
                onChange={(event) => updateDigit(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
              />
            ))}
          </div>

          <p className="player-signup-hint">Demo code: {DEMO_OTP}</p>
          {error ? <p className="player-signup-error">{error}</p> : null}

          <button type="submit" className="player-signup-submit" disabled={!otpReady}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      )}
    </div>
  )
}
