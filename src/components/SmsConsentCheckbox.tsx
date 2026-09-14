import type { LegalDoc } from './LegalPage'
import './SmsConsentCheckbox.css'

const SMS_SHARE_COPY =
  'No mobile information or SMS opt-in data will be shared with third parties/affiliates for marketing or promotional purposes. All the above categories exclude text messaging originator opt-in data and consent; this information will not be shared with any third parties.'

export default function SmsConsentCheckbox({
  checked,
  onChange,
  onOpenLegal,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  onOpenLegal: (doc: LegalDoc) => void
}) {
  return (
    <label className="sms-consent">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        By providing your phone number, you agree to receive automated security verification and
        one-time password (OTP) text messages from TapStack Inc to verify your identity. Message and
        data rates may apply. Message frequency depends on user login activity. You can reply STOP at
        any time to opt-out of these security texts. View our{' '}
        <button
          type="button"
          className="sms-consent-link"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onOpenLegal('privacy')
          }}
        >
          Privacy Policy
        </button>{' '}
        and{' '}
        <button
          type="button"
          className="sms-consent-link"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onOpenLegal('terms')
          }}
        >
          Terms of Service
        </button>
        .
      </span>
    </label>
  )
}

export function SmsShareNote() {
  return (
    <p className="sms-share-note" role="note">
      <span className="sms-share-note-icon" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path
            d="M8 1.6 2.8 3.6v4c0 3.1 2.1 5.9 5.2 6.8 3.1-.9 5.2-3.7 5.2-6.8v-4L8 1.6Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M6.2 8.1 7.4 9.3 9.9 6.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span>{SMS_SHARE_COPY}</span>
    </p>
  )
}
