import { useRef, useState } from 'react'
import { TapStackLogo } from './TapStackLogo'
import './OtpPage.css'

const DEMO_OTP = '12345'

type OtpPageProps = {
  phone: string
  onVerify: () => void
  onBack: () => void
}

export default function OtpPage({ phone, onVerify, onBack }: OtpPageProps) {
  const [digits, setDigits] = useState(['', '', '', '', ''])
  const [error, setError] = useState('')
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  const code = digits.join('')
  const canSubmit = code.length === 5

  function updateDigit(index: number, value: string) {
    const next = value.replace(/\D/g, '').slice(-1)
    const updated = [...digits]
    updated[index] = next
    setDigits(updated)
    setError('')

    if (next && index < 4) {
      inputsRef.current[index + 1]?.focus()
    }
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

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return

    if (code === DEMO_OTP) {
      onVerify()
      return
    }

    setError('Incorrect code. Use 12345 for this demo.')
  }

  return (
    <div className="otp-page">
      <button type="button" className="otp-back" onClick={onBack}>
        ← Back
      </button>

      <div className="otp-brand">
        <TapStackLogo height={72} />
        <h1 className="otp-title">Enter verification code</h1>
        <p className="otp-subtitle">
          We sent a code to <strong>+1 {phone}</strong>
        </p>
      </div>

      <form className="otp-form" onSubmit={handleSubmit}>
        <div className="otp-inputs" onPaste={handlePaste}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputsRef.current[index] = element
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              className="otp-digit"
              value={digit}
              aria-label={`Digit ${index + 1}`}
              onChange={(event) => updateDigit(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
            />
          ))}
        </div>

        <p className="otp-hint">Demo code: {DEMO_OTP}</p>

        {error ? <p className="otp-error">{error}</p> : null}

        <button type="submit" className="otp-button" disabled={!canSubmit}>
          Verify
        </button>
      </form>
    </div>
  )
}
