/** Stable HTML id for a policy section heading like "16. Responsible Social Play". */
export function legalSectionId(heading: string): string {
  const match = heading.trim().match(/^(\d+(?:\.\d+)*)/)
  if (match) {
    return match[1].replace(/\./g, '-')
  }
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export type LegalDoc = 'terms' | 'privacy' | 'returns'

export type LegalPolicyLink = {
  label: string
  doc: LegalDoc
  /** Section id from legalSectionId (e.g. "16", "6-1", "9"). */
  section: string
}

/** Primary policy docs always shown on login. */
export const PRIMARY_LEGAL_LINKS: Array<{ label: string; doc: LegalDoc }> = [
  { label: 'Terms and Conditions', doc: 'terms' },
  { label: 'Privacy Policy', doc: 'privacy' },
  { label: 'Refund & Returns Policy', doc: 'returns' },
]

/** Jump-to-section options for Terms and Conditions. */
export const TERMS_SECTION_LINKS: LegalPolicyLink[] = [
  { label: 'Responsible Social Play', doc: 'terms', section: '16' },
  { label: 'Jurisdiction Restrictions', doc: 'terms', section: '6-1' },
  { label: 'KYC Disclosure', doc: 'terms', section: '7-2' },
  { label: 'AML Disclosure', doc: 'terms', section: '18' },
  { label: 'Game Fairness & RNG Certification', doc: 'terms', section: '13-3' },
  { label: 'Deposit & Withdrawal Policy', doc: 'terms', section: '3-4' },
  { label: 'Bonus', doc: 'terms', section: '11' },
  { label: 'Promotion & Sweepstakes Rules', doc: 'terms', section: '13' },
  { label: 'Contact Information', doc: 'terms', section: '34' },
]

/** Jump-to-section options for Privacy Policy. */
export const PRIVACY_SECTION_LINKS: LegalPolicyLink[] = [
  { label: 'Mobile Information Sharing', doc: 'privacy', section: '7-1' },
  { label: 'Security & Data Protection Statement', doc: 'privacy', section: '9' },
  { label: 'Cookie Policy', doc: 'privacy', section: '10' },
]

/** Jump-to-section options for Refund & Returns Policy. */
export const RETURNS_SECTION_LINKS: LegalPolicyLink[] = [
  { label: 'All Sales Final; No Returns', doc: 'returns', section: '4' },
  { label: 'When You Are Entitled to a Refund', doc: 'returns', section: '6' },
  { label: 'Unused Wallet Balances', doc: 'returns', section: '9' },
  { label: 'How to Request a Refund', doc: 'returns', section: '13' },
  { label: 'Chargebacks and Payment Disputes', doc: 'returns', section: '15' },
  { label: 'Contact Information', doc: 'returns', section: '22' },
]

export const SECTION_LINKS_BY_DOC: Record<LegalDoc, LegalPolicyLink[]> = {
  terms: TERMS_SECTION_LINKS,
  privacy: PRIVACY_SECTION_LINKS,
  returns: RETURNS_SECTION_LINKS,
}
