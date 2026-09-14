import { useEffect, useRef, type ReactNode } from 'react'
import { PRIVACY_POLICY_SECTIONS } from '../data/privacyPolicy'
import { RETURNS_POLICY_SECTIONS } from '../data/returnsPolicy'
import { TERMS_POLICY_SECTIONS } from '../data/termsPolicy'
import {
  PRIMARY_LEGAL_LINKS,
  SECTION_LINKS_BY_DOC,
  legalSectionId,
  type LegalDoc,
} from '../lib/legalSections'
import './LegalPage.css'

export type { LegalDoc }

const DOCS: Record<
  LegalDoc,
  {
    title: string
    sections: { heading: string; body: string[] }[]
  }
> = {
  terms: {
    title: 'Terms and Conditions',
    sections: TERMS_POLICY_SECTIONS,
  },
  privacy: {
    title: 'Privacy Policy',
    sections: PRIVACY_POLICY_SECTIONS,
  },
  returns: {
    title: 'Refund & Returns Policy',
    sections: RETURNS_POLICY_SECTIONS,
  },
}

type LegalPageProps = {
  doc: LegalDoc
  /** Section id to scroll to (e.g. "16", "6-1"). */
  section?: string
  onBack: () => void
  onOpenDoc: (doc: LegalDoc, section?: string) => void
}

function SectionBody({ body }: { body: string[] }) {
  const nodes: ReactNode[] = []
  let bullets: string[] = []

  function flushBullets(key: string) {
    if (!bullets.length) return
    nodes.push(
      <ul key={key} className="legal-section-list">
        {bullets.map((item, index) => (
          <li key={index} className="legal-section-bullet">
            {item}
          </li>
        ))}
      </ul>,
    )
    bullets = []
  }

  body.forEach((line, index) => {
    if (line.startsWith('• ')) {
      bullets.push(line.slice(2))
      return
    }
    flushBullets(`list-${index}`)
    nodes.push(
      <p key={index} className="legal-section-body">
        {line}
      </p>,
    )
  })
  flushBullets('list-end')

  return <>{nodes}</>
}

function PolicySectionJump({
  currentDoc,
  currentSection,
  onOpenDoc,
}: {
  currentDoc: LegalDoc
  currentSection?: string
  onOpenDoc: (doc: LegalDoc, section?: string) => void
}) {
  const links = SECTION_LINKS_BY_DOC[currentDoc]
  if (!links.length) return null

  const selectedKey =
    currentSection && links.some((link) => link.section === currentSection)
      ? currentSection
      : ''

  return (
    <label className="legal-section-jump">
      <span className="legal-section-jump-label">Jump to section</span>
      <select
        className="legal-section-jump-select"
        value={selectedKey}
        aria-label="Jump to policy section"
        onChange={(event) => {
          const value = event.target.value
          if (!value) return
          const link = links.find((item) => item.section === value)
          if (!link) return
          onOpenDoc(link.doc, link.section)
        }}
      >
        <option value="">Select a policy section…</option>
        {links.map((link) => (
          <option key={link.section} value={link.section}>
            {link.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function LegalPage({ doc, section, onBack, onOpenDoc }: LegalPageProps) {
  const content = DOCS[doc]
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!section) return
    const root = scrollRef.current
    if (!root) return

    const scrollToTarget = () => {
      const target = root.querySelector<HTMLElement>(`#legal-section-${CSS.escape(section)}`)
      if (!target) return false
      const rootRect = root.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      const nextTop = root.scrollTop + (targetRect.top - rootRect.top) - 12
      root.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' })
      return true
    }

    // Layout may not be ready on the first frame after route change.
    let tries = 0
    let timer = 0
    const attempt = () => {
      if (scrollToTarget() || tries >= 8) return
      tries += 1
      timer = window.setTimeout(attempt, 50)
    }
    const raf = window.requestAnimationFrame(attempt)
    return () => {
      window.cancelAnimationFrame(raf)
      window.clearTimeout(timer)
    }
  }, [doc, section])

  return (
    <div className="legal-page">
      <header className="legal-header">
        <button type="button" className="legal-back" onClick={onBack}>
          ← Back
        </button>
        <p className="legal-kicker">TapStack</p>
        <h1 className="legal-title">{content.title}</h1>
        <PolicySectionJump currentDoc={doc} currentSection={section} onOpenDoc={onOpenDoc} />
      </header>

      <div className="legal-scroll" ref={scrollRef}>
        {content.sections.map((item) => {
          const id = legalSectionId(item.heading)
          return (
            <section
              key={item.heading}
              id={`legal-section-${id}`}
              className={`legal-section${section === id ? ' legal-section--target' : ''}${
                id === 'mobile-information-sharing' ? ' legal-section--featured' : ''
              }`}
            >
              <h2 className="legal-section-title">{item.heading}</h2>
              <SectionBody body={item.body} />
            </section>
          )
        })}

        <nav className="legal-related" aria-label="Related policies">
          {(
            [
              ['terms', 'Terms and Conditions'],
              ['privacy', 'Privacy Policy'],
              ['returns', 'Refund & Returns Policy'],
            ] as const
          )
            .filter(([id]) => id !== doc)
            .map(([id, label]) => (
              <button key={id} type="button" className="legal-related-link" onClick={() => onOpenDoc(id)}>
                {label}
              </button>
            ))}
        </nav>
      </div>
    </div>
  )
}

export function LegalLinks({
  onOpen,
}: {
  onOpen: (doc: LegalDoc, section?: string) => void
}) {
  return (
    <nav className="legal-links" aria-label="Legal">
      {PRIMARY_LEGAL_LINKS.map((link, index) => (
        <span key={link.doc} className="legal-links-chunk">
          {index > 0 ? (
            <span className="legal-links-sep" aria-hidden="true">
              ·
            </span>
          ) : null}
          <button type="button" className="legal-links-item" onClick={() => onOpen(link.doc)}>
            {link.label}
          </button>
        </span>
      ))}
    </nav>
  )
}
