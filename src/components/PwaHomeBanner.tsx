import { useEffect, useState } from 'react'
import {
  canWebShare,
  enablePushNotifications,
  getPwaMode,
  isLikelyInAppBrowser,
  markPushPrompt,
  promptAddToHomeScreen,
  shareForHomeScreen,
  subscribePwa,
  type PwaMode,
} from '../lib/pwa'
import { isPlayEmbed } from '../lib/affiliate'
import './PwaHomeBanner.css'

export default function PwaHomeBanner() {
  const [mode, setMode] = useState<PwaMode>(() => getPwaMode())
  const [iosOpen, setIosOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [shareNote, setShareNote] = useState('')

  useEffect(() => subscribePwa(() => setMode(getPwaMode())), [])

  if (isPlayEmbed() || mode === 'hidden') return null

  async function handleInstall() {
    if (mode === 'ios') {
      if (canWebShare()) {
        setBusy(true)
        setShareNote('')
        const result = await shareForHomeScreen()
        setBusy(false)
        if (result === 'unavailable') setIosOpen(true)
        return
      }
      setIosOpen(true)
      return
    }
    setBusy(true)
    const result = await promptAddToHomeScreen()
    setBusy(false)
    if (result === 'unavailable') setIosOpen(true)
  }

  async function handleIosShare() {
    setShareNote('')
    setBusy(true)
    const result = await shareForHomeScreen()
    setBusy(false)
    if (result === 'unavailable') {
      setShareNote(
        isLikelyInAppBrowser()
          ? 'Open this page in Safari (⋯ menu → Open in Browser), then tap Share.'
          : 'Share is not available in this browser. Use Safari and tap the Share icon in the toolbar.',
      )
    } else if (result === 'cancelled') {
      setShareNote('Choose Add to Home Screen in the share menu when you are ready.')
    } else {
      setShareNote('In the share menu, tap Add to Home Screen, then Add.')
    }
  }

  async function handlePush() {
    setBusy(true)
    await enablePushNotifications()
    setBusy(false)
    setMode(getPwaMode())
  }

  const isPush = mode === 'push'

  return (
    <>
      <div className={`pwa-home-banner ${isPush ? 'pwa-home-banner--push' : ''}`}>
        <img src="/pwa-192.png" alt="" className="pwa-home-banner-icon" width={40} height={40} />
        <div className="pwa-home-banner-copy">
          <p className="pwa-home-banner-kicker">{isPush ? 'You are in the app' : 'Play faster'}</p>
          <p className="pwa-home-banner-title">
            {isPush ? 'Turn on push notifications' : 'Add TapStack to your home screen'}
          </p>
        </div>
        <div className="pwa-home-banner-actions">
          {isPush ? (
            <>
              <button type="button" className="pwa-home-banner-action" disabled={busy} onClick={() => void handlePush()}>
                {busy ? '…' : 'Allow'}
              </button>
              <button
                type="button"
                className="pwa-home-banner-skip"
                onClick={() => {
                  markPushPrompt('skipped')
                  setMode('hidden')
                }}
              >
                Not now
              </button>
            </>
          ) : (
            <button type="button" className="pwa-home-banner-action" disabled={busy} onClick={() => void handleInstall()}>
              {busy ? '…' : 'Add'}
            </button>
          )}
        </div>
      </div>

      {iosOpen ? (
        <div className="pwa-ios-overlay" role="presentation" onClick={() => setIosOpen(false)}>
          <div
            className="pwa-ios-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-ios-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="pwa-ios-handle" />
            <img src="/pwa-192.png" alt="" className="pwa-ios-icon" width={64} height={64} />
            <h2 id="pwa-ios-title">Add to Home Screen</h2>
            {isLikelyInAppBrowser() ? (
              <p className="pwa-ios-note pwa-ios-note--warn">
                You are in an in-app browser. Open TapStack in <strong>Safari</strong> first (⋯ → Open in Browser),
                then use Share → Add to Home Screen.
              </p>
            ) : null}
            {canWebShare() ? (
              <button
                type="button"
                className="pwa-home-banner-action pwa-ios-share-btn"
                disabled={busy}
                onClick={() => void handleIosShare()}
              >
                {busy ? '…' : 'Share TapStack'}
              </button>
            ) : null}
            <ol className="pwa-ios-steps">
              <li>
                {canWebShare() ? (
                  <button
                    type="button"
                    className="pwa-ios-step-btn"
                    disabled={busy}
                    onClick={() => void handleIosShare()}
                  >
                    <span>
                      Tap <strong>Share</strong>
                    </span>
                    <span className="pwa-ios-share" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 16V4M12 4l-4 4M12 4l4 4"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M6 14v5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  </button>
                ) : (
                  <>
                    <span>
                      Tap the <strong>Share</strong> button in Safari&apos;s toolbar
                    </span>
                    <span className="pwa-ios-share" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 16V4M12 4l-4 4M12 4l4 4"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M6 14v5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  </>
                )}
              </li>
              <li>
                <span>
                  Choose <strong>Add to Home Screen</strong>
                </span>
              </li>
              <li>
                <span>
                  Tap <strong>Add</strong>
                </span>
              </li>
            </ol>
            {shareNote ? <p className="pwa-ios-note">{shareNote}</p> : null}
            <p className="pwa-ios-note">After it is on your home screen, open TapStack from there to turn on alerts.</p>
            <button type="button" className="pwa-home-banner-action pwa-ios-done" onClick={() => setIosOpen(false)}>
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
