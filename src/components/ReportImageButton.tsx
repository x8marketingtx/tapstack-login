import { useState } from 'react'
import { ApiError, isApiConfigured, tapstackApi } from '../api/client'
import './ReportImageButton.css'

type ReportImageButtonProps = {
  imageId?: number | null
  context?: string
  className?: string
}

export default function ReportImageButton({
  imageId,
  context = 'image',
  className = '',
}: ReportImageButtonProps) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  if (!imageId || imageId <= 0 || !isApiConfigured()) return null

  async function submit() {
    if (!imageId || busy) return
    setBusy(true)
    setError('')
    try {
      await tapstackApi.reportImage({ imageId, context })
      setDone(true)
      setOpen(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not report this image.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className={`report-image-btn${done ? ' report-image-btn--done' : ''}${className ? ` ${className}` : ''}`}
        aria-label={done ? 'Image reported' : 'Report this image'}
        disabled={busy || done}
        onClick={(event) => {
          event.stopPropagation()
          if (!done) setOpen((prev) => !prev)
        }}
      >
        {done ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M5 12.5 9.5 17 19 7.5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M5 4v16M5 5h11.5a1 1 0 0 1 .8 1.6L15 10l2.3 3.4a1 1 0 0 1-.8 1.6H5"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
      {open && !done ? (
        <div className="report-image-confirm" role="dialog" aria-label="Report image">
          <p>
            Report this image as offensive, unlawful, or otherwise in violation of TapStack policies?
            An admin will review it and can remove it.
          </p>
          {error ? <p>{error}</p> : null}
          <div className="report-image-confirm-actions">
            <button type="button" className="report-image-confirm-cancel" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="report-image-confirm-send"
              disabled={busy}
              onClick={() => void submit()}
            >
              {busy ? '…' : 'Report'}
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
