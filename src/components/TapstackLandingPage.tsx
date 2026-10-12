import type { MouseEvent } from 'react'
import tapstackHeroIcon from '../assets/tapstack-hero-icon.png'
import tapstackWordmark from '../assets/tapstack-wordmark.png'
import { TapStackLogo } from './TapStackLogo'
import './TapstackLandingPage.css'

type TapstackLandingPageProps = {
  onLogin: () => void
  onOpenPrivacy: () => void
  onOpenTerms: () => void
  onOpenSecurity?: () => void
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function TapstackLandingPage({
  onLogin,
  onOpenPrivacy,
  onOpenTerms,
  onOpenSecurity,
}: TapstackLandingPageProps) {
  function follow(event: MouseEvent<HTMLAnchorElement>, action: () => void) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    action()
  }

  return (
    <div className="tapstack-landing">
      <header className="tapstack-landing-header">
        <div className="tapstack-landing-header-inner">
          <a
            className="tapstack-landing-brand"
            href="/"
            aria-label="TapStack home"
            onClick={(event) => follow(event, () => scrollToId('top'))}
          >
            <img
              className="tapstack-landing-brand-logo"
              src={tapstackWordmark}
              alt="TapStack"
              width={204}
              height={51}
              decoding="async"
            />
          </a>
          <nav className="tapstack-landing-nav" aria-label="Landing">
            <a href="#how-it-works" onClick={(event) => follow(event, () => scrollToId('how-it-works'))}>
              How it works
            </a>
            <a
              href="#security"
              onClick={(event) =>
                follow(event, () => (onOpenSecurity ? onOpenSecurity() : scrollToId('security')))
              }
            >
              Security
            </a>
            <a href="/privacy" onClick={(event) => follow(event, onOpenPrivacy)}>
              Privacy
            </a>
            <button type="button" className="tapstack-landing-nav-login" onClick={onLogin}>
              Log in
            </button>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="tapstack-landing-hero" aria-labelledby="landing-hero-title">
          <div className="tapstack-landing-hero-grid">
            <div className="tapstack-landing-hero-copy">
              <p className="tapstack-landing-eyebrow">
                <span className="tapstack-landing-eyebrow-line" aria-hidden="true" />
                A secure way to get in
                <span className="tapstack-landing-eyebrow-line" aria-hidden="true" />
              </p>
              <h1 id="landing-hero-title" className="tapstack-landing-hero-title">
                Your wallet.
                <br />
                Your play.
                <br />
                <span className="tapstack-landing-hero-title-accent">One clear path.</span>
              </h1>
              <p className="tapstack-landing-hero-lead">
                TapStack helps players access their wallet and account activity through supported partners—with a
                straightforward security check when it&apos;s time to log in.
              </p>
              <div className="tapstack-landing-hero-actions">
                <button
                  type="button"
                  className="tapstack-landing-btn tapstack-landing-btn--primary"
                  onClick={() => scrollToId('how-it-works')}
                >
                  See how it works
                  <span aria-hidden="true">→</span>
                </button>
                <button type="button" className="tapstack-landing-btn tapstack-landing-btn--text" onClick={onLogin}>
                  Log in <span aria-hidden="true">→</span>
                </button>
              </div>
              <p className="tapstack-landing-hero-note">
                <span className="tapstack-landing-check" aria-hidden="true">
                  ✓
                </span>
                Verification is for account access—not promotions.
              </p>
            </div>

            <div className="tapstack-landing-hero-visual" aria-hidden="true">
              <div className="tapstack-landing-rings" />
              <div className="tapstack-landing-stack">
                <img
                  className="tapstack-landing-stack-icon"
                  src={tapstackHeroIcon}
                  alt=""
                  width={280}
                  height={301}
                  decoding="async"
                />
              </div>
              <div className="tapstack-landing-float tapstack-landing-float--shield">
                <span className="tapstack-landing-float-icon">🛡</span>
                <div>
                  <strong>Account protected</strong>
                  <small>Login verification</small>
                </div>
              </div>
              <div className="tapstack-landing-float tapstack-landing-float--wallet">
                <span className="tapstack-landing-float-icon">✉</span>
                <div>
                  <strong>Player wallet</strong>
                  <small>Access through partners</small>
                </div>
              </div>
              <div className="tapstack-landing-float tapstack-landing-float--lock">🔒</div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="tapstack-landing-section tapstack-landing-flow">
          <div className="tapstack-landing-section-head tapstack-landing-section-head--split">
            <div>
              <p className="tapstack-landing-eyebrow tapstack-landing-eyebrow--gold">
                <span className="tapstack-landing-eyebrow-line" aria-hidden="true" />A familiar flow
              </p>
              <h2 className="tapstack-landing-section-title">Access, without the guesswork.</h2>
            </div>
            <p className="tapstack-landing-section-intro">
              Securely sign in to TapStack, choose a supported partner, and manage your wallet—all in one place.
            </p>
          </div>
          <div className="tapstack-landing-steps">
            <article className="tapstack-landing-step">
              <p className="tapstack-landing-step-label">01 / Sign in</p>
              <h3>Sign in securely</h3>
              <p>Use your phone number and a one-time verification code to access TapStack.</p>
            </article>
            <article className="tapstack-landing-step">
              <p className="tapstack-landing-step-label">02 / Connect</p>
              <h3>Choose a partner</h3>
              <p>Access your favorite supported partners from your TapStack account.</p>
            </article>
            <article className="tapstack-landing-step">
              <p className="tapstack-landing-step-label">03 / Continue</p>
              <h3>Manage your wallet</h3>
              <p>Fund your account, view your balance, and keep track of transactions and activity.</p>
            </article>
          </div>
        </section>

        <section id="security" className="tapstack-landing-section tapstack-landing-security">
          <div className="tapstack-landing-security-grid">
            <div>
              <p className="tapstack-landing-eyebrow tapstack-landing-eyebrow--light">
                <span className="tapstack-landing-eyebrow-line" aria-hidden="true" />
                Security, in plain language
              </p>
              <h2 className="tapstack-landing-section-title tapstack-landing-section-title--light">
                A code for your login. Nothing more.
              </h2>
              <p className="tapstack-landing-security-lead">
                TapStack SMS messages are transactional security verification messages and one-time passwords,
                triggered by account login activity. They are not marketing messages.
              </p>
              <p className="tapstack-landing-security-meta">
                Message frequency varies with login activity. Message and data rates may apply. Reply STOP to opt out
                or HELP for help.
              </p>
            </div>
            <div className="tapstack-landing-sms-panel" aria-label="Example security message">
              <div className="tapstack-landing-sms-panel-head">
                <span>TapStack security</span>
                <span>
                  <span className="tapstack-landing-sms-dot" aria-hidden="true" />
                  Login activity
                </span>
              </div>
              <div className="tapstack-landing-sms-card">
                <p className="tapstack-landing-sms-card-label">One-time verification</p>
                <p className="tapstack-landing-sms-card-body">
                  TapStack: Your one-time verification code is 123456. Never share this code. Reply STOP to opt out
                  or HELP for help.
                </p>
              </div>
              <p className="tapstack-landing-sms-foot">
                Illustrative message only. The example code is not valid for account access.
              </p>
            </div>
          </div>
        </section>

        <section id="privacy-boundaries" className="tapstack-landing-section tapstack-landing-boundaries">
          <div className="tapstack-landing-section-head tapstack-landing-section-head--split">
            <div>
              <p className="tapstack-landing-eyebrow tapstack-landing-eyebrow--gold">
                <span className="tapstack-landing-eyebrow-line" aria-hidden="true" />
                Built around account access
              </p>
              <h2 className="tapstack-landing-section-title">Clear boundaries matter.</h2>
            </div>
            <p className="tapstack-landing-section-intro">
              Know what to expect from verification—and what it is never used for.
            </p>
          </div>
          <div className="tapstack-landing-boundary-grid">
            <article>
              <span className="tapstack-landing-boundary-icon" aria-hidden="true">
                🛡
              </span>
              <h3>Only when you log in</h3>
              <p>Security verification texts are triggered by account login activity, not by promotional campaigns.</p>
            </article>
            <article>
              <span className="tapstack-landing-boundary-icon" aria-hidden="true">
                📱
              </span>
              <h3>Your choice to opt out</h3>
              <p>Reply STOP to opt out of security verification texts. Reply HELP for help.</p>
            </article>
            <article>
              <span className="tapstack-landing-boundary-icon" aria-hidden="true">
                📄
              </span>
              <h3>Consent stays distinct</h3>
              <p>SMS opt-in and consent data is not shared with third parties for marketing or promotion.</p>
            </article>
          </div>
        </section>

        <section className="tapstack-landing-closing" aria-labelledby="landing-closing-title">
          <p className="tapstack-landing-closing-label">TapStack</p>
          <h2 id="landing-closing-title" className="tapstack-landing-closing-title">
            Access your player wallet with confidence.
          </h2>
          <p className="tapstack-landing-closing-lead">
            Connect with supported partners and keep your wallet and account activity in one place.
          </p>
          <button type="button" className="tapstack-landing-btn tapstack-landing-btn--primary" onClick={onLogin}>
            Log in <span aria-hidden="true">→</span>
          </button>
        </section>
      </main>

      <footer className="tapstack-landing-footer">
        <div className="tapstack-landing-footer-inner">
          <a className="tapstack-landing-footer-brand" href="/" aria-label="TapStack home">
            <TapStackLogo height={28} />
          </a>
          <nav className="tapstack-landing-footer-nav" aria-label="Legal">
            <a href="/privacy" onClick={(event) => follow(event, onOpenPrivacy)}>
              Privacy
            </a>
            <a href="/terms" onClick={(event) => follow(event, onOpenTerms)}>
              Terms
            </a>
            <a href="#security" onClick={(event) => follow(event, () => scrollToId('security'))}>
              Security
            </a>
          </nav>
          <p className="tapstack-landing-footer-copy">© {new Date().getFullYear()} TapStack</p>
        </div>
      </footer>
    </div>
  )
}
