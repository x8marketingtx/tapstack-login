import { useEffect, useState } from 'react'
import {
  enablePushNotifications,
  getPwaMode,
  hasDeferredInstallPrompt,
  isIos,
  isLikelyInAppBrowser,
  markPushPrompt,
  promptAddToHomeScreen,
  subscribePwa,
  type PwaMode,
} from '../lib/pwa'
import { isPlayEmbed } from '../lib/affiliate'
import './PwaHomeBanner.css'

type InstallHelp = 'ios' | 'android'

export default function PwaHomeBanner() {
  const [mode, setMode] = useState<PwaMode>(() => getPwaMode())
  const [canInstall, setCanInstall] = useState(() => hasDeferredInstallPrompt())
  const [installHelp, setInstallHelp] = useState<InstallHelp | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(
    () =>
      subscribePwa(() => {
        setMode(getPwaMode())
        setCanInstall(hasDeferredInstallPrompt())
      }),
    [],
  )

  if (isPlayEmbed() || mode === 'hidden') return null

  async function handleInstall() {
    setBusy(true)
    if (hasDeferredInstallPrompt()) {
      const result = await promptAddToHomeScreen()
      setBusy(false)
      setCanInstall(hasDeferredInstallPrompt())
      if (result !== 'unavailable') return
    } else {
      setBusy(false)
    }
    setInstallHelp(isIos() ? 'ios' : 'android')
  }

  async function handlePush() {
    setBusy(true)
    await enablePushNotifications()
    setBusy(false)
    setMode(getPwaMode())
  }

  const isPush = mode === 'push'
  const addLabel = canInstall ? 'Install app' : 'Add to home'

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
              {busy ? '…' : addLabel}
            </button>
          )}
        </div>
      </div>

      {installHelp ? (
        <div className="pwa-ios-overlay" role="presentation" onClick={() => setInstallHelp(null)}>
          <div
            className="pwa-ios-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="pwa-ios-handle" />
            <img src="/pwa-192.png" alt="" className="pwa-ios-icon" width={64} height={64} />
            <h2 id="pwa-install-title">Install TapStack on your home screen</h2>
            <p className="pwa-ios-note pwa-ios-note--lead">
              This adds a <strong>TapStack app icon</strong> on your phone—not a share link. Tap the icon to open
              TapStack full screen like an app.
            </p>
            {isLikelyInAppBrowser() ? (
              <p className="pwa-ios-note pwa-ios-note--warn">
                Open this page in <strong>Safari</strong> or <strong>Chrome</strong> first (⋯ → Open in Browser), then
                follow the steps below.
              </p>
            ) : null}
            {installHelp === 'ios' ? (
              <ol className="pwa-ios-steps">
                <li>
                  <span>
                    In <strong>Safari</strong>, tap <strong>Share</strong> in the toolbar (square with arrow up)
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
                </li>
                <li>
                  <span>
                    Scroll the menu and tap <strong>Add to Home Screen</strong>
                  </span>
                </li>
                <li>
                  <span>
                    Tap <strong>Add</strong> — TapStack appears on your home screen
                  </span>
                </li>
              </ol>
            ) : (
              <ol className="pwa-ios-steps">
                <li>
                  <span>
                    In <strong>Chrome</strong>, tap the <strong>menu</strong> (⋮) in the top corner
                  </span>
                </li>
                <li>
                  <span>
                    Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>
                  </span>
                </li>
                <li>
                  <span>
                    Tap <strong>Install</strong> — TapStack appears on your home screen
                  </span>
                </li>
              </ol>
            )}
            <p className="pwa-ios-note">Open TapStack from that icon (not a browser tab) for the best experience.</p>
            <button type="button" className="pwa-home-banner-action pwa-ios-done" onClick={() => setInstallHelp(null)}>
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
