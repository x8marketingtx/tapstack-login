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
    title: 'Terms of Service',
    sections: [
      {
        heading: '1. Agreement',
        body: [
          'By creating an account or using TapStack (the “Service”), you agree to these Terms of Service. If you do not agree, do not use the Service.',
        ],
      },
      {
        heading: '2. Accounts',
        body: [
          'You are responsible for keeping your login credentials secure and for all activity under your account. Provide accurate information and notify us promptly of any unauthorized use.',
          'Vendor and admin accounts may require approval. We may suspend or terminate accounts that violate these terms or applicable law.',
        ],
      },
      {
        heading: '3. Wallets & transactions',
        body: [
          'Balances, points, deposits, and withdrawals are processed according to platform rules and any fees disclosed in the app. You are responsible for verifying transaction details before confirming.',
          'TapStack is not a bank. Availability of features may vary by role, region, and configuration.',
        ],
      },
      {
        heading: '4. Acceptable use',
        body: [
          'You may not misuse the Service, attempt unauthorized access, interfere with other users, or use TapStack for unlawful activity. We may investigate and take action on suspected abuse.',
        ],
      },
      {
        heading: '5. Changes',
        body: [
          'We may update these terms from time to time. Continued use after changes become effective constitutes acceptance of the updated terms.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    sections: [
      {
        heading: '1. Information we collect',
        body: [
          'We collect account details you provide (such as name, email, phone), usage data needed to operate wallets and dashboards, and technical information like device/browser type for security and performance.',
        ],
      },
      {
        heading: '2. How we use information',
        body: [
          'We use your information to provide the Service, process payments and account actions, communicate about your account, improve reliability and security, and comply with legal obligations.',
        ],
      },
      {
        heading: '3. Sharing',
        body: [
          'We do not sell your personal information. We may share data with service providers who help us operate TapStack (for example hosting or payment partners), or when required by law.',
        ],
      },
      {
        heading: '4. Retention & security',
        body: [
          'We retain information as long as needed for the purposes above or as required by law. We use reasonable administrative and technical safeguards, but no method of transmission is 100% secure.',
        ],
      },
      {
        heading: '5. Your choices',
        body: [
          'You may update profile information in the app where available, or contact support to request access, correction, or deletion subject to legal and operational limits.',
        ],
      },
    ],
  },
  returns: {
    title: 'Return Policy',
    sections: [
      {
        heading: '1. Digital services',
        body: [
          'TapStack provides digital wallet and account services. Completed deposits, transfers, and in-app purchases are generally final once processed.',
        ],
      },
      {
        heading: '2. Refunds',
        body: [
          'Refunds may be considered for duplicate charges, confirmed processing errors, or when required by applicable payment-network or consumer rules.',
          'Approved refunds are returned to the original payment method when possible, or credited to your TapStack balance at our discretion.',
        ],
      },
      {
        heading: '3. Withdrawals',
        body: [
          'Withdrawal requests are subject to identity checks, available balance, and platform fees. Processing times vary by method and review status.',
        ],
      },
      {
        heading: '4. How to request help',
        body: [
          'Contact support from your account profile or email the address listed in the app with your account email, transaction ID, and a short description of the issue.',
        ],
      },
      {
        heading: '5. Chargebacks',
        body: [
          'If you open a chargeback, we may pause related account features while the dispute is reviewed. Fraudulent disputes may result in account suspension.',
        ],
      },
    ],
  },
}

type LegalPageProps = {
  doc: LegalDoc
  onBack: () => void
  onOpenDoc: (doc: LegalDoc) => void
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
            {section.body.map((paragraph) => (
              <p key={paragraph.slice(0, 48)} className="legal-section-body">
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        <nav className="legal-related" aria-label="Related policies">
          {(
            [
              ['terms', 'Terms of Service'],
              ['privacy', 'Privacy Policy'],
              ['returns', 'Return Policy'],
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
        Terms of Service
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
        Return Policy
      </button>
    </nav>
  )
}
