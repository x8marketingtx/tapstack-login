import type { MouseEvent, ReactNode } from 'react'
import { COMPANY } from '../data/company'
import { TapStackLogo } from './TapStackLogo'
import type { LegalDoc } from './LegalPage'
import './PublicCompanyPage.css'

export type PublicSitePage = 'about' | 'contact' | LegalDoc

const NAV: Array<{ id: PublicSitePage; label: string; href: string; shortLabel: string }> = [
  { id: 'about', label: 'About', shortLabel: 'About', href: '/about' },
  { id: 'contact', label: 'Contact', shortLabel: 'Contact', href: '/contact' },
  { id: 'privacy', label: 'Privacy Policy', shortLabel: 'Privacy', href: '/privacy' },
  { id: 'terms', label: 'Terms and Conditions', shortLabel: 'Terms', href: '/terms' },
]

type PublicCompanyPageProps = {
  page: PublicSitePage
  loggedIn: boolean
  onOpen: (page: PublicSitePage, section?: string) => void
  onHome: () => void
  onLogoClick: () => void
  children?: ReactNode
}

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0
}

function pageClick(onOpen: (page: PublicSitePage) => void, next: PublicSitePage) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (isModifiedClick(event)) return
    event.preventDefault()
    onOpen(next)
  }
}

export default function PublicCompanyPage({
  page,
  loggedIn,
  onOpen,
  onHome,
  onLogoClick,
  children,
}: PublicCompanyPageProps) {
  function follow(event: MouseEvent<HTMLAnchorElement>, next: PublicSitePage) {
    if (isModifiedClick(event)) return
    event.preventDefault()
    onOpen(next)
  }

  return (
    <div className="public-site">
      <header className="public-site-bar">
        <div className="public-site-bar-inner">
          <a
            className="public-site-brand"
            href="/"
            aria-label="TapStack log in"
            onClick={(event) => {
              if (isModifiedClick(event)) return
              event.preventDefault()
              onLogoClick()
            }}
          >
            <TapStackLogo height={32} />
          </a>
          <nav className="public-site-nav" aria-label="Company">
            {NAV.map((item) => (
              <a
                key={item.id}
                href={item.href}
                className={`public-site-nav-link${page === item.id ? ' is-active' : ''}`}
                aria-current={page === item.id ? 'page' : undefined}
                aria-label={item.label}
                onClick={(event) => follow(event, item.id)}
              >
                {item.shortLabel}
              </a>
            ))}
          </nav>
          <button type="button" className="public-site-home" onClick={onHome}>
            {loggedIn ? 'Open app' : 'Log in'}
          </button>
        </div>
      </header>

      <main className="public-site-main">
        {page === 'about' ? <AboutBody onOpen={onOpen} /> : null}
        {page === 'contact' ? <ContactBody onOpen={onOpen} /> : null}
        {children}
      </main>

      <footer className="public-site-footer">
        <div className="public-site-footer-inner">
          <p>
            {COMPANY.legalName}, d/b/a {COMPANY.dba}
            <br />
            {COMPANY.addressOneLine}
            {' · '}
            <a href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a>
          </p>
          <nav aria-label="Policies">
            {NAV.map((item) => (
              <a key={item.id} href={item.href} onClick={(event) => follow(event, item.id)}>
                {item.label}
              </a>
            ))}
            <a href="/returns" onClick={(event) => follow(event, 'returns')}>
              Refund & Returns
            </a>
          </nav>
        </div>
      </footer>
    </div>
  )
}

function AboutBody({ onOpen }: { onOpen: (page: PublicSitePage) => void }) {
  return (
    <article className="public-doc" itemScope itemType="https://schema.org/Organization">
      <header className="public-intro">
        <h1 className="public-title">About TapStack</h1>
        <p className="public-lead">
          {COMPANY.brand} provides technology and promotional infrastructure for Operators, and a
          consumer marketplace with free sweepstakes, giveaways, and rewards where we offer them in
          our own name.
        </p>
      </header>

      <section className="public-section">
        <h2>Legal identity</h2>
        <dl className="public-facts">
          <div>
            <dt>Legal business name</dt>
            <dd itemProp="legalName">{COMPANY.legalName}</dd>
          </div>
          <div>
            <dt>Doing business as (DBA)</dt>
            <dd itemProp="alternateName">{COMPANY.dba}</dd>
          </div>
        </dl>
        <meta itemProp="name" content={COMPANY.legalName} />
      </section>

      <section className="public-section" itemProp="address" itemScope itemType="https://schema.org/PostalAddress">
        <h2>Contact details</h2>
        <dl className="public-facts">
          <div>
            <dt>Physical location</dt>
            <dd>
              <span itemProp="streetAddress">{COMPANY.addressLines[0]}</span>
              {', '}
              <span itemProp="addressLocality">Frisco</span>,{' '}
              <span itemProp="addressRegion">TX</span>{' '}
              <span itemProp="postalCode">75033</span>
              {', '}
              <span itemProp="addressCountry">United States</span>
            </dd>
          </div>
          <div>
            <dt>Support email</dt>
            <dd>
              <a itemProp="email" href={`mailto:${COMPANY.supportEmail}`}>
                {COMPANY.supportEmail}
              </a>
            </dd>
          </div>
          <div>
            <dt>Support phone</dt>
            <dd>Support is available by email. We do not publish a general support phone number.</dd>
          </div>
          <div>
            <dt>Website</dt>
            <dd>
              <a itemProp="url" href={COMPANY.websiteUrl}>
                {COMPANY.websiteLabel}
              </a>
            </dd>
          </div>
        </dl>
        <p className="public-note">
          For mailing and legal notices, see{' '}
          <a href="/contact" onClick={pageClick(onOpen, 'contact')}>
            Contact us
          </a>
          .
        </p>
      </section>

      <section className="public-section">
        <h2>Products and services</h2>
        <ul className="public-services">
          {COMPANY.products.map((item) => (
            <li key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="public-section">
        <h2>Policies</h2>
        <p className="public-policy-links">
          <a href="/about" onClick={pageClick(onOpen, 'about')}>
            About us
          </a>
          <a href="/contact" onClick={pageClick(onOpen, 'contact')}>
            Contact us
          </a>
          <a href="/privacy" onClick={pageClick(onOpen, 'privacy')}>
            Privacy Policy
          </a>
          <a href="/terms" onClick={pageClick(onOpen, 'terms')}>
            Terms and Conditions
          </a>
        </p>
      </section>
    </article>
  )
}

function ContactBody({ onOpen }: { onOpen: (page: PublicSitePage) => void }) {
  return (
    <article className="public-doc">
      <header className="public-intro">
        <h1 className="public-title">Contact us</h1>
        <p className="public-lead">
          Email is the fastest way to reach us for support, privacy requests, and legal notices.
        </p>
      </header>

      <section className="public-section">
        <h2>Customer support</h2>
        <dl className="public-facts">
          <div>
            <dt>Email</dt>
            <dd>
              <a href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a>
            </dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>Customer support is handled by email. We do not publish a general support phone number.</dd>
          </div>
          <div>
            <dt>Website</dt>
            <dd>
              <a href={COMPANY.websiteUrl}>{COMPANY.websiteLabel}</a>
            </dd>
          </div>
        </dl>
      </section>

      <section className="public-section">
        <h2>Physical location</h2>
        <address className="public-address">
          {COMPANY.legalName}
          <br />
          d/b/a {COMPANY.dba}
          <br />
          {COMPANY.addressLines.map((line) => (
            <span key={line}>
              {line}
              <br />
            </span>
          ))}
        </address>
      </section>

      <section className="public-section">
        <h2>Legal notices</h2>
        <p>
          Written legal or dispute notices may be sent to {COMPANY.brand}, Attn: Legal — Dispute
          Notice, {COMPANY.addressOneLine}, or emailed to{' '}
          <a href={`mailto:${COMPANY.supportEmail}?subject=Dispute%20Notice`}>{COMPANY.supportEmail}</a>{' '}
          with “Dispute Notice” in the subject line.
        </p>
        <p>
          Privacy requests may be sent to the same email with the subject line “Privacy Request.” See
          our{' '}
          <a href="/privacy" onClick={pageClick(onOpen, 'privacy')}>
            Privacy Policy
          </a>{' '}
          and{' '}
          <a href="/terms" onClick={pageClick(onOpen, 'terms')}>
            Terms and Conditions
          </a>
          .
        </p>
      </section>

      <section className="public-section">
        <h2>Responsible play</h2>
        <p>
          If you or someone you know needs help with gambling-related harm, contact{' '}
          {COMPANY.responsiblePlayHelpline.name} at{' '}
          <a href={COMPANY.responsiblePlayHelpline.tel}>{COMPANY.responsiblePlayHelpline.phone}</a>.{' '}
          {COMPANY.responsiblePlayHelpline.note}
        </p>
      </section>
    </article>
  )
}
