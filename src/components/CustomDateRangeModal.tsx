import { useEffect, useState } from 'react'
import './CustomDateRangeModal.css'

type CustomDateRangeModalProps = {
  open: boolean
  from: string
  to: string
  onClose: () => void
  onApply: (from: string, to: string) => string | null
}

export default function CustomDateRangeModal({
  open,
  from,
  to,
  onClose,
  onApply,
}: CustomDateRangeModalProps) {
  const [draftFrom, setDraftFrom] = useState(from)
  const [draftTo, setDraftTo] = useState(to)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setDraftFrom(from)
    setDraftTo(to)
    setError('')
  }, [open, from, to])

  if (!open) return null

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const message = onApply(draftFrom, draftTo)
    if (message) {
      setError(message)
      return
    }
    setError('')
  }

  return (
    <div className="custom-range-overlay" role="presentation" onClick={onClose}>
      <div
        className="custom-range-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-range-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="custom-range-header">
          <h2 id="custom-range-title">Custom date range</h2>
          <button type="button" className="custom-range-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <form className="custom-range-form" onSubmit={handleSubmit}>
          <p className="custom-range-hint">Choose a start and end date for this report.</p>
          <div className="custom-range-fields">
            <label className="custom-range-field">
              <span>From</span>
              <input
                type="date"
                value={draftFrom}
                onChange={(event) => {
                  setDraftFrom(event.target.value)
                  setError('')
                }}
                required
              />
            </label>
            <label className="custom-range-field">
              <span>Till</span>
              <input
                type="date"
                value={draftTo}
                onChange={(event) => {
                  setDraftTo(event.target.value)
                  setError('')
                }}
                required
              />
            </label>
          </div>
          {error ? <p className="custom-range-error">{error}</p> : null}
          <div className="custom-range-actions">
            <button type="button" className="custom-range-btn custom-range-btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="custom-range-btn custom-range-btn--primary">
              Apply range
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
