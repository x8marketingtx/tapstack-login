/** Public company identity used on About, Contact, and related pages. */

export const COMPANY = {
  legalName: 'TapStack Inc',
  dba: 'TapStack',
  brand: 'TapStack',
  addressLines: ['3365 Fulmar Circle', 'Frisco, TX 75033', 'United States'],
  addressOneLine: '3365 Fulmar Circle, Frisco, TX 75033',
  supportEmail: 'support@tapstack.io',
  websiteUrl: 'https://tapstack.io',
  websiteLabel: 'tapstack.io',
  /** No general customer-support phone is published. Helpline is responsible-play only. */
  supportPhone: null as string | null,
  responsiblePlayHelpline: {
    name: 'National Problem Gambling Helpline',
    phone: '1-800-GAMBLER',
    tel: 'tel:18004262537',
    note: 'Available 24/7. This is an independent help resource, not TapStack customer support.',
  },
  products: [
    {
      title: 'Payment facilitation',
      body: 'TapStack helps Operators accept and settle customer payments under agreements with acquiring and sponsor banks, in accordance with payment-network rules.',
    },
    {
      title: 'Operator technology',
      body: 'We provide technology, compliance tooling, and promotional infrastructure that business clients use to run their own consumer-facing platforms.',
    },
    {
      title: 'Player wallet and marketplace',
      body: 'Players can load a wallet to purchase digital items and Gold Coin entertainment packages on the TapStack Direct Platform and at participating Operator stores.',
    },
    {
      title: 'Sweepstakes, giveaways, and rewards',
      body: 'TapStack offers free promotional sweepstakes entries, giveaways, and rewards points. No purchase is necessary to enter or earn, and a purchase does not improve the chances of winning.',
    },
    {
      title: 'Vendor and distributor portals',
      body: 'Approved vendors and distributors use TapStack to manage stores, orders, promotions, affiliates, invoices, and player support.',
    },
    {
      title: 'Identity and compliance tools',
      body: 'The platform includes identity verification, location eligibility checks, and related controls required to operate the Services lawfully.',
    },
  ],
} as const
