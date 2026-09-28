import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react'
import { IMAGE_UPLOAD_AGREEMENT } from '../lib/imageUploadAgreement'
import './ImageUploadAgreement.css'

export function ImageAgreementCheckbox({
  id,
  checked,
  onChange,
}: {
  id?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const generatedId = useId()
  const inputId = id || generatedId
  return (
    <label className="image-agree" htmlFor={inputId}>
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{IMAGE_UPLOAD_AGREEMENT}</span>
    </label>
  )
}

export type PendingImageUploadHandle = {
  hasPendingFile: () => boolean
  flush: () => Promise<void>
}

type PendingImageUploadProps = {
  accept?: string
  disabled?: boolean
  currentUrl?: string
  currentName?: string
  onClearCurrent?: () => void
  onUpload: (file: File) => Promise<void>
  pickLabel?: string
}

export const PendingImageUpload = forwardRef<PendingImageUploadHandle, PendingImageUploadProps>(
  function PendingImageUpload(
    {
      accept = 'image/png,image/jpeg,image/webp,image/gif',
      disabled = false,
      currentUrl = '',
      currentName = '',
      onClearCurrent,
      onUpload,
      pickLabel = 'Choose an image',
    },
    ref,
  ) {
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState('')
    const [agreed, setAgreed] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const inflightRef = useRef<Promise<void> | null>(null)

    useEffect(() => {
      if (!file) {
        setPreview('')
        return
      }
      const url = URL.createObjectURL(file)
      setPreview(url)
      return () => URL.revokeObjectURL(url)
    }, [file])

    function clearPending() {
      setFile(null)
      setAgreed(false)
      setError('')
    }

    async function uploadFile(forceAgreed = agreed) {
      if (inflightRef.current) return inflightRef.current
      if (!file) return
      if (!forceAgreed) {
        const message = 'Confirm that this image is not offensive and that you have the rights to upload it.'
        setError(message)
        throw new Error(message)
      }
      const run = (async () => {
        setBusy(true)
        setError('')
        try {
          await onUpload(file)
          clearPending()
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Could not upload image.'
          setError(message)
          throw err instanceof Error ? err : new Error(message)
        } finally {
          setBusy(false)
          inflightRef.current = null
        }
      })()
      inflightRef.current = run
      return run
    }

    useImperativeHandle(
      ref,
      () => ({
        hasPendingFile: () => Boolean(file) || Boolean(inflightRef.current),
        flush: () => {
          if (inflightRef.current) return inflightRef.current
          return uploadFile()
        },
      }),
      [file, agreed, onUpload],
    )

    const shownUrl = preview || currentUrl
    const shownName = file?.name || currentName || (currentUrl ? 'Image selected' : 'No image selected')

    return (
      <div className="pending-image-upload">
        {shownUrl ? (
          <div className="pending-image-preview">
            <img src={shownUrl} alt="" />
          </div>
        ) : null}
        <label className="pending-image-pick">
          <input
            type="file"
            accept={accept}
            disabled={disabled || busy}
            onChange={(event) => {
              const next = event.target.files?.[0] || null
              event.target.value = ''
              setFile(next)
              setAgreed(false)
              setError('')
            }}
          />
          <span className="pending-image-pick-name">
            {busy ? 'Uploading…' : file ? file.name : shownName}
          </span>
          <span className="pending-image-pick-action">{file || currentUrl ? 'Change' : pickLabel}</span>
        </label>
        {file ? (
          <>
            <ImageAgreementCheckbox
              checked={agreed}
              onChange={(checked) => {
                setAgreed(checked)
                if (checked && file) void uploadFile(true).catch(() => {})
              }}
            />
            <button
              type="button"
              className="pending-image-upload-btn"
              disabled={!agreed || busy || disabled}
              onClick={() => void uploadFile().catch(() => {})}
            >
              {busy ? 'Uploading…' : 'Upload image'}
            </button>
          </>
        ) : currentUrl && onClearCurrent ? (
          <button type="button" className="pending-image-clear-btn" onClick={onClearCurrent}>
            Remove image
          </button>
        ) : null}
        {error ? <p className="pending-image-error">{error}</p> : null}
      </div>
    )
  },
)

PendingImageUpload.displayName = 'PendingImageUpload'
