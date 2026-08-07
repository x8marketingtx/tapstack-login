import { useState } from 'react'
import './PromosPage.css'

type PromoFilter = 'all' | 'lucky-strike' | 'nova-game' | 'golden'

const FILTERS: {
  id: PromoFilter
  label: string
  icon?: string
  iconBg?: string
}[] = [
  { id: 'all', label: 'All' },
  { id: 'lucky-strike', label: 'Lucky Strike', icon: 'L', iconBg: '#8b5cf6' },
  { id: 'nova-game', label: 'Nova Game', icon: 'N', iconBg: '#3b82f6' },
  { id: 'golden', label: 'Golden', icon: 'G', iconBg: '#10b981' },
]

const PROMOTIONS = [
  {
    id: 'lucky-strike-bonus',
    vendor: 'lucky-strike' as PromoFilter,
    vendorInitials: 'LS',
    vendorName: 'Lucky Strike Arcade',
    heroGradient: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
    badge: '+20%',
    headline: '+20% Bonus Credits',
    title: 'New Year Bonus',
    categoryIcon: '🎁',
    category: 'Bonus Credits',
    categoryClass: 'promo-tag--purple',
    description:
      'Get 20% bonus on any deposit over $20. Stack up your credits for a great start to 2025!',
    ends: 'Ends Jan 15',
  },
  {
    id: 'nova-freeplay',
    vendor: 'nova-game' as PromoFilter,
    vendorInitials: 'NG',
    vendorName: 'Nova Game Zone',
    heroGradient: 'linear-gradient(135deg, #38bdf8 0%, #06b6d4 100%)',
    badge: 'FREE',
    headline: 'Free Play Sat & Sun',
    title: 'VIP Weekend Freeplay',
    categoryIcon: '⚡',
    category: 'Freeplay',
    categoryClass: 'promo-tag--blue',
    description:
      'All registered customers get 30 free play minutes every weekend in January. No minimum deposit.',
    ends: 'Ends Jan 31',
  },
  {
    id: 'lucky-strike-loyalty',
    vendor: 'lucky-strike' as PromoFilter,
    vendorInitials: 'LS',
    vendorName: 'Lucky Strike Arcade',
    heroGradient: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
    badge: '$10',
    headline: '$10 Free Credit',
    title: 'Loyalty Reward Drop',
    categoryIcon: '🏆',
    category: 'Loyalty',
    categoryClass: 'promo-tag--gold',
    description: '$10 free credit added to your wallet on any single deposit of $100 or more.',
    ends: 'Ends Jan 31',
  },
  {
    id: 'galaxy-double-tokens',
    vendor: 'golden' as PromoFilter,
    vendorInitials: 'GT',
    vendorName: 'Galaxy Tokens',
    heroGradient: 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)',
    badge: '2x',
    headline: '2x Tokens All Weekend',
    title: 'Double Points Event',
    categoryIcon: '⚡',
    category: 'Bonus Tokens',
    categoryClass: 'promo-tag--green',
    description:
      'Earn double arcade tokens on every game Jan 6–7. Works on all machines across the venue.',
    ends: 'Ends Jan 6–7',
  },
]

export default function PromosPage() {
  const [activeFilter, setActiveFilter] = useState<PromoFilter>('all')

  const visiblePromos =
    activeFilter === 'all'
      ? PROMOTIONS
      : PROMOTIONS.filter((promo) => promo.vendor === activeFilter)

  return (
    <div className="promos-page">
      <div className="promos-intro">
        <h1 className="promos-title">Promotions</h1>
        <p className="promos-subtitle">From your saved vendors</p>
      </div>

      <div className="promo-filters" role="tablist" aria-label="Vendor filters">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            role="tab"
            aria-selected={activeFilter === filter.id}
            className={`promo-filter ${activeFilter === filter.id ? 'promo-filter--active' : ''}`}
            onClick={() => setActiveFilter(filter.id)}
          >
            {filter.icon ? (
              <span className="promo-filter-icon" style={{ background: filter.iconBg }}>
                {filter.icon}
              </span>
            ) : null}
            {filter.label}
          </button>
        ))}
      </div>

      <div className="promo-list">
        {visiblePromos.map((promo) => (
          <article key={promo.id} className="promo-card">
            <div className="promo-card-hero" style={{ background: promo.heroGradient }}>
              <span className="promo-card-badge">{promo.badge}</span>
              <div className="promo-card-vendor">
                <span className="promo-vendor-icon">{promo.vendorInitials}</span>
                {promo.vendorName}
              </div>
              <h2 className="promo-card-headline">{promo.headline}</h2>
            </div>

            <div className="promo-card-body">
              <div className="promo-card-title-row">
                <h3 className="promo-card-title">{promo.title}</h3>
                <span className={`promo-tag ${promo.categoryClass}`}>
                  <span aria-hidden="true">{promo.categoryIcon}</span>
                  {promo.category}
                </span>
              </div>
              <p className="promo-card-desc">{promo.description}</p>
              <div className="promo-card-footer">
                <span className="promo-card-ends">
                  <span aria-hidden="true">🕐</span> {promo.ends}
                </span>
                <button type="button" className="promo-play-btn">
                  Play Now &gt;
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
