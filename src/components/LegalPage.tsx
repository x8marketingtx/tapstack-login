import type { ReactNode } from 'react'
import { PRIVACY_POLICY_SECTIONS } from '../data/privacyPolicy'
import { RETURNS_POLICY_SECTIONS } from '../data/returnsPolicy'
import { TERMS_POLICY_SECTIONS } from '../data/termsPolicy'
import './LegalPage.css'

export type LegalDoc = 'terms' | 'privacy' | 'returns'

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
  onBack: () => void
  onOpenDoc: (doc: LegalDoc) => void
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

export default function LegalPage({ doc, onBack, onOpenDoc }: LegalPageProps) {
  const content = DOCS[doc]

  return (
    <div className="legal-page">
      <header className="legal-header">
        <button type="button" className="legal-back" onClick={onBack}>
          ← Back
        </button>
        <p className="legal-kicker">TapStack</p>
        <h1 className="legal-title">{content.title}</h1>
      </header>

      <div className="legal-scroll">
        {content.sections.map((section) => (
          <section key={section.heading} className="legal-section">
            <h2 className="legal-section-title">{section.heading}</h2>
            <SectionBody body={section.body} />
          </section>
        ))}

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

export function LegalLinks({ onOpen }: { onOpen: (doc: LegalDoc) => void }) {
  return (
    <nav className="legal-links" aria-label="Legal">
      <button type="button" className="legal-links-item" onClick={() => onOpen('terms')}>
        Terms and Conditions
      </button>
      <span className="legal-links-sep" aria-hidden="true">
        ·
      </span>
      <button type="button" className="legal-links-item" onClick={() => onOpen('privacy')}>
        Privacy Policy
      </button>
      <span className="legal-links-sep" aria-hidden="true">
        ·
      </span>
      <button type="button" className="legal-links-item" onClick={() => onOpen('returns')}>
        Refund & Returns Policy
      </button>
    </nav>
  )
}
