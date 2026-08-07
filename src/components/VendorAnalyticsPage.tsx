import { useState, type FormEvent } from 'react'
import './VendorAnalyticsPage.css'

type AnalyticsTab = 'customers' | 'financial' | 'games' | 'ai-insights'

type CustomerRow = {
  id: string
  name: string
  username: string
  meta: string
  initial: string
  inAmount: string
  outAmount: string
  visits: number
}

const ANALYTICS_TABS: { id: AnalyticsTab; label: string; icon: string }[] = [
  { id: 'customers', label: 'Customers', icon: '👥' },
  { id: 'financial', label: 'Financial', icon: '📈' },
  { id: 'games', label: 'Games', icon: '🎮' },
  { id: 'ai-insights', label: 'AI Insights', icon: '🤖' },
]

const CUSTOMERS: CustomerRow[] = [
  {
    id: '1',
    name: 'Jordan M.',
    username: '@jordanm',
    meta: 'Today · 9:50 AM',
    initial: 'J',
    inAmount: '$420',
    outAmount: '$380',
    visits: 14,
  },
  {
    id: '2',
    name: 'Riley K.',
    username: '@rileyk22',
    meta: 'Today · 9:30 AM',
    initial: 'R',
    inAmount: '$215',
    outAmount: '$180',
    visits: 7,
  },
  {
    id: '3',
    name: 'Alex P.',
    username: '@bigalex',
    meta: 'Today · 8:12 AM',
    initial: 'A',
    inAmount: '$890',
    outAmount: '$740',
    visits: 31,
  },
  {
    id: '4',
    name: 'Sam T.',
    username: '@samtee',
    meta: 'Jun 8 · Jun 8',
    initial: 'S',
    inAmount: '$120',
    outAmount: '$95',
    visits: 4,
  },
  {
    id: '5',
    name: 'Dana L.',
    username: '@dana_lux',
    meta: 'Jun 8 · Jun 8',
    initial: 'D',
    inAmount: '$60',
    outAmount: '$55',
    visits: 2,
  },
]

function CustomersTab() {
  const [query, setQuery] = useState('')

  const filteredCustomers = CUSTOMERS.filter((customer) => {
    const haystack = `${customer.name} ${customer.username}`.toLowerCase()
    return haystack.includes(query.trim().toLowerCase())
  })

  return (
    <div className="vendor-analytics-content">
      <div className="vendor-analytics-toolbar">
        <h2 className="vendor-analytics-heading">Customers · 1,240</h2>
        <button type="button" className="vendor-analytics-csv-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 3v12M7 10l5 5 5-5M5 21h14"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          CSV
        </button>
      </div>

      <label className="vendor-analytics-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          placeholder="Search by name or username..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <div className="vendor-analytics-table-head" aria-hidden="true">
        <span>PLAYER</span>
        <span>IN</span>
        <span>OUT</span>
        <span>VISITS</span>
      </div>

      <ul className="vendor-analytics-list">
        {filteredCustomers.map((customer) => (
          <li key={customer.id} className="vendor-analytics-row">
            <div className="vendor-analytics-player">
              <div className="vendor-analytics-avatar">{customer.initial}</div>
              <div className="vendor-analytics-player-info">
                <p className="vendor-analytics-player-name">{customer.name}</p>
                <p className="vendor-analytics-player-meta">
                  {customer.username} · {customer.meta}
                </p>
              </div>
            </div>
            <span className="vendor-analytics-in">{customer.inAmount}</span>
            <span className="vendor-analytics-out">{customer.outAmount}</span>
            <span className="vendor-analytics-visits">{customer.visits}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  text: string
}

const AI_INSIGHTS_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    text: "Hi! I'm your analytics assistant. Ask me anything about your venue's performance.",
  },
  {
    id: 'user-question',
    role: 'user',
    text: 'Which game is driving the most revenue this week?',
  },
  {
    id: 'assistant-answer',
    role: 'assistant',
    text: "Lucky 7s is your top performer this week with $4,200 in deposits from 38 active players — that's 41% of your total volume. Gold Rush is second at $3,100. I'd recommend running a bonus promotion on Lucky 7s to capitalize on momentum.",
  },
]

function AiInsightsTab() {
  const [draft, setDraft] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setDraft('')
  }

  return (
    <div className="vendor-analytics-content vendor-ai-content">
      <div className="vendor-ai-header">
        <span className="vendor-ai-header-icon" aria-hidden="true">
          🤖
        </span>
        <div>
          <p className="vendor-ai-header-title">Analytics AI</p>
          <p className="vendor-ai-header-subtitle">Powered by GPT-4o</p>
        </div>
      </div>

      <div className="vendor-ai-chat" role="log" aria-live="polite" aria-label="Analytics AI conversation">
        {AI_INSIGHTS_MESSAGES.map((message) => (
          <div
            key={message.id}
            className={`vendor-ai-message vendor-ai-message--${message.role}`}
          >
            <p>{message.text}</p>
          </div>
        ))}
      </div>

      <form className="vendor-ai-composer" onSubmit={handleSubmit}>
        <div className="vendor-ai-input-row">
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask about your analytics..."
            aria-label="Ask about your analytics"
          />
          <button type="submit" className="vendor-ai-send-btn" aria-label="Send message">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M22 2 11 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M22 2 15 22 11 13 2 9 22 2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}

type GamesRange = 'today' | '7d' | '30d' | 'custom'

const GAMES_RANGES: { id: GamesRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: 'custom', label: 'Custom' },
]

type GamePerformanceItem = {
  id: string
  title: string
  players: number
  inAmount: string
  outAmount: string
  netAmount: string
}

const GAME_PERFORMANCE: GamePerformanceItem[] = [
  {
    id: 'lucky-7s',
    title: 'Lucky 7s',
    players: 38,
    inAmount: '$4,200',
    outAmount: '$3,180',
    netAmount: '$1,020',
  },
  {
    id: 'gold-rush',
    title: 'Gold Rush',
    players: 24,
    inAmount: '$3,100',
    outAmount: '$2,420',
    netAmount: '$680',
  },
  {
    id: 'neon-spinner',
    title: 'Neon Spinner',
    players: 19,
    inAmount: '$1,800',
    outAmount: '$1,290',
    netAmount: '$510',
  },
  {
    id: 'cash-carnival',
    title: 'Cash Carnival',
    players: 9,
    inAmount: '$920',
    outAmount: '$640',
    netAmount: '$280',
  },
]

function GamesTab() {
  const [range, setRange] = useState<GamesRange>('7d')

  return (
    <div className="vendor-analytics-content vendor-games-content">
      <div className="vendor-analytics-toolbar">
        <h2 className="vendor-analytics-heading">Per-Game Performance</h2>
        <button type="button" className="vendor-analytics-csv-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 3v12M7 10l5 5 5-5M5 21h14"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          CSV
        </button>
      </div>

      <div className="vendor-games-filter-pills" role="tablist" aria-label="Time range">
        {GAMES_RANGES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={range === item.id}
            className={`vendor-games-filter-btn ${range === item.id ? 'vendor-games-filter-btn--active' : ''}`}
            onClick={() => setRange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <ul className="vendor-games-list">
        {GAME_PERFORMANCE.map((game) => (
          <li key={game.id}>
            <button type="button" className="vendor-games-card">
              <div className="vendor-games-card-top">
                <div className="vendor-games-card-info">
                  <span className="vendor-games-card-icon" aria-hidden="true">
                    🎮
                  </span>
                  <div>
                    <p className="vendor-games-card-title">{game.title}</p>
                    <p className="vendor-games-card-meta">{game.players} players</p>
                  </div>
                </div>
                <svg
                  className="vendor-games-card-chevron"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M9 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div className="vendor-games-card-metrics">
                <div className="vendor-games-metric">
                  <span className="vendor-games-metric-label">IN</span>
                  <span className="vendor-games-metric-value vendor-games-metric-value--in">{game.inAmount}</span>
                </div>
                <div className="vendor-games-metric">
                  <span className="vendor-games-metric-label">OUT</span>
                  <span className="vendor-games-metric-value vendor-games-metric-value--out">{game.outAmount}</span>
                </div>
                <div className="vendor-games-metric vendor-games-metric--net">
                  <span className="vendor-games-metric-label">NET</span>
                  <span className="vendor-games-metric-value vendor-games-metric-value--net">{game.netAmount}</span>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

type FinancialRange = 'today' | '7d' | '30d' | 'custom'

const FINANCIAL_RANGES: { id: FinancialRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
  { id: 'custom', label: 'Custom' },
]

type DailyBreakdown = {
  day: string
  inAmount: number
  outAmount: number
  netProfit: number
  netLabel: string
}

const WEEKLY_BREAKDOWN: DailyBreakdown[] = [
  { day: 'Mon', inAmount: 4200, outAmount: 3340, netProfit: 860, netLabel: '$860' },
  { day: 'Tue', inAmount: 5100, outAmount: 4000, netProfit: 1100, netLabel: '$1.1k' },
  { day: 'Wed', inAmount: 3600, outAmount: 2940, netProfit: 660, netLabel: '$660' },
  { day: 'Thu', inAmount: 5400, outAmount: 4200, netProfit: 1200, netLabel: '$1.2k' },
  { day: 'Fri', inAmount: 5800, outAmount: 4500, netProfit: 1300, netLabel: '$1.3k' },
  { day: 'Sat', inAmount: 6200, outAmount: 4700, netProfit: 1500, netLabel: '$1.5k' },
  { day: 'Sun', inAmount: 4900, outAmount: 3800, netProfit: 1100, netLabel: '$1.1k' },
]

const RANGE_SUMMARIES: Record<
  FinancialRange,
  {
    periodLabel: string
    breakdownTitle: string
    netProfit: string
    deposits: string
    redeems: string
    platformFees: string
    distributorCut: string
  }
> = {
  today: {
    periodLabel: 'Today',
    breakdownTitle: 'Daily breakdown — today',
    netProfit: '$1,240',
    deposits: '$3,820',
    redeems: '$2,580',
    platformFees: '$191',
    distributorCut: '$96',
  },
  '7d': {
    periodLabel: 'This week',
    breakdownTitle: 'Daily breakdown — this week',
    netProfit: '$7,698',
    deposits: '$26,578',
    redeems: '$18,880',
    platformFees: '$1,329',
    distributorCut: '$664',
  },
  '30d': {
    periodLabel: 'Last 30 days',
    breakdownTitle: 'Daily breakdown — last 30 days',
    netProfit: '$28,420',
    deposits: '$98,640',
    redeems: '$70,220',
    platformFees: '$4,932',
    distributorCut: '$2,466',
  },
  custom: {
    periodLabel: 'Custom range',
    breakdownTitle: 'Daily breakdown — custom',
    netProfit: '$7,698',
    deposits: '$26,578',
    redeems: '$18,880',
    platformFees: '$1,329',
    distributorCut: '$664',
  },
}

type PromoBadge = {
  label: string
  tone: 'deposit' | 'freeplay' | 'load-redeem'
  icon: string
}

type PromotionItem = {
  id: string
  title: string
  badge: PromoBadge
  status?: 'live'
  meta: string
  bonusLoaded: string
  bonusRedeemed: string
  depositsIn: string
  spentAmount: number
  receivedAmount: number
  spentLabel: string
  receivedLabel: string
  returnMultiple: string
  netReturn: string
}

const PROMO_SUMMARY = {
  bonusSpent: 4240,
  bonusSpentLabel: '$4,240',
  depositsDuringPromos: 18980,
  depositsDuringPromosLabel: '$18,980',
  returnMultiple: '4.5x',
  netReturn: '$14,740 net',
}

const PROMOTIONS: PromotionItem[] = [
  {
    id: 'new-year',
    title: 'New Year Deposit Match',
    badge: { label: 'Deposit Bonus', tone: 'deposit', icon: '🎁' },
    status: 'live',
    meta: 'Dec 29 – Jan 1 · 62 players',
    bonusLoaded: '$1,240',
    bonusRedeemed: '$680',
    depositsIn: '$8,420',
    spentAmount: 1920,
    receivedAmount: 8420,
    spentLabel: '$1,920',
    receivedLabel: '$8,420',
    returnMultiple: '4.4x',
    netReturn: '$6,500 net',
  },
  {
    id: 'weekend-freeplay',
    title: 'Weekend Freeplay Blast',
    badge: { label: 'Freeplay', tone: 'freeplay', icon: '⚡' },
    meta: 'Dec 20 – Dec 22 · 41 players',
    bonusLoaded: '$540',
    bonusRedeemed: '—',
    depositsIn: '$3,180',
    spentAmount: 540,
    receivedAmount: 3180,
    spentLabel: '$540',
    receivedLabel: '$3,180',
    returnMultiple: '5.9x',
    netReturn: '$2,640 net',
  },
  {
    id: 'lucky-7s',
    title: 'Lucky 7s Load & Redeem',
    badge: { label: 'Load & Redeem', tone: 'load-redeem', icon: '🎁' },
    meta: 'Dec 14 – Dec 16 · 38 players',
    bonusLoaded: '$820',
    bonusRedeemed: '$410',
    depositsIn: '$5,240',
    spentAmount: 1230,
    receivedAmount: 5240,
    spentLabel: '$1,230',
    receivedLabel: '$5,240',
    returnMultiple: '4.3x',
    netReturn: '$4,010 net',
  },
  {
    id: 'double-up-tuesday',
    title: 'Double-Up Tuesday',
    badge: { label: 'Deposit Bonus', tone: 'deposit', icon: '🎁' },
    meta: 'Dec 9 – Dec 10 · 27 players',
    bonusLoaded: '$360',
    bonusRedeemed: '$190',
    depositsIn: '$2,140',
    spentAmount: 550,
    receivedAmount: 2140,
    spentLabel: '$550',
    receivedLabel: '$2,140',
    returnMultiple: '3.9x',
    netReturn: '$1,590 net',
  },
]

function PromoProgressBar({
  label,
  amount,
  maxAmount,
  tone,
}: {
  label: string
  amount: number
  maxAmount: number
  tone: 'spent' | 'received'
}) {
  const width = maxAmount > 0 ? Math.max(6, (amount / maxAmount) * 100) : 0

  return (
    <div className="vendor-financial-promo-bar-row">
      <span className="vendor-financial-promo-bar-label">{label}</span>
      <div className="vendor-financial-promo-bar-track">
        <span
          className={`vendor-financial-promo-bar-fill vendor-financial-promo-bar-fill--${tone}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}

function PromotionCard({ promo }: { promo: PromotionItem }) {
  const maxAmount = Math.max(promo.spentAmount, promo.receivedAmount)

  return (
    <article className="vendor-financial-promo-card">
      <div className="vendor-financial-promo-card-head">
        <div className="vendor-financial-promo-card-title-wrap">
          <h4 className="vendor-financial-promo-card-title">{promo.title}</h4>
          {promo.status === 'live' && <span className="vendor-financial-promo-live">LIVE</span>}
        </div>
        <span className={`vendor-financial-promo-badge vendor-financial-promo-badge--${promo.badge.tone}`}>
          <span aria-hidden="true">{promo.badge.icon}</span>
          {promo.badge.label}
        </span>
      </div>

      <p className="vendor-financial-promo-meta">{promo.meta}</p>

      <div className="vendor-financial-promo-stats">
        <div className="vendor-financial-promo-stat">
          <span className="vendor-financial-promo-stat-label">Bonus Loaded</span>
          <span className="vendor-financial-promo-stat-value vendor-financial-promo-stat-value--purple">
            {promo.bonusLoaded}
          </span>
        </div>
        <div className="vendor-financial-promo-stat">
          <span className="vendor-financial-promo-stat-label">Bonus Redeemed</span>
          <span className="vendor-financial-promo-stat-value vendor-financial-promo-stat-value--orange">
            {promo.bonusRedeemed}
          </span>
        </div>
        <div className="vendor-financial-promo-stat">
          <span className="vendor-financial-promo-stat-label">Deposits In</span>
          <span className="vendor-financial-promo-stat-value vendor-financial-promo-stat-value--green">
            {promo.depositsIn}
          </span>
        </div>
      </div>

      <div className="vendor-financial-promo-bars">
        <div className="vendor-financial-promo-bar-group">
          <PromoProgressBar label="Spent" amount={promo.spentAmount} maxAmount={maxAmount} tone="spent" />
          <span className="vendor-financial-promo-bar-amount vendor-financial-promo-bar-amount--purple">
            {promo.spentLabel}
          </span>
        </div>
        <div className="vendor-financial-promo-bar-group">
          <PromoProgressBar label="Received" amount={promo.receivedAmount} maxAmount={maxAmount} tone="received" />
          <span className="vendor-financial-promo-bar-amount vendor-financial-promo-bar-amount--green">
            {promo.receivedLabel}
          </span>
        </div>
      </div>

      <div className="vendor-financial-promo-footer">
        <span className="vendor-financial-promo-footer-label">Return on spend</span>
        <span className="vendor-financial-promo-footer-value">
          {promo.returnMultiple} · {promo.netReturn}
        </span>
      </div>
    </article>
  )
}

function PromotionsBonusesSection() {
  const maxSummaryAmount = Math.max(PROMO_SUMMARY.bonusSpent, PROMO_SUMMARY.depositsDuringPromos)

  return (
    <section className="vendor-financial-promos" aria-label="Promotions and bonuses">
      <h3 className="vendor-financial-promos-heading">
        <span className="vendor-financial-promos-icon" aria-hidden="true">
          🎁
        </span>
        Promotions &amp; Bonuses
      </h3>

      <article className="vendor-financial-promo-summary">
        <p className="vendor-financial-promo-summary-title">
          Bonus spend vs. deposits received during promotions
        </p>

        <div className="vendor-financial-promo-summary-metrics">
          <div className="vendor-financial-promo-summary-metric">
            <span className="vendor-financial-promo-summary-label">Total Bonus Spent</span>
            <span className="vendor-financial-promo-summary-value vendor-financial-promo-summary-value--purple">
              {PROMO_SUMMARY.bonusSpentLabel}
            </span>
            <span className="vendor-financial-promo-summary-sub">bonus loads + redeems</span>
          </div>
          <div className="vendor-financial-promo-summary-metric">
            <span className="vendor-financial-promo-summary-label">Deposits During Promos</span>
            <span className="vendor-financial-promo-summary-value vendor-financial-promo-summary-value--green">
              {PROMO_SUMMARY.depositsDuringPromosLabel}
            </span>
            <span className="vendor-financial-promo-summary-sub">real player deposits</span>
          </div>
        </div>

        <div className="vendor-financial-promo-bars vendor-financial-promo-bars--summary">
          <PromoProgressBar
            label="Spent"
            amount={PROMO_SUMMARY.bonusSpent}
            maxAmount={maxSummaryAmount}
            tone="spent"
          />
          <PromoProgressBar
            label="Received"
            amount={PROMO_SUMMARY.depositsDuringPromos}
            maxAmount={maxSummaryAmount}
            tone="received"
          />
        </div>

        <div className="vendor-financial-promo-footer">
          <span className="vendor-financial-promo-footer-label">Return on bonus spend</span>
          <span className="vendor-financial-promo-footer-value">
            {PROMO_SUMMARY.returnMultiple} · {PROMO_SUMMARY.netReturn}
          </span>
        </div>
      </article>

      {PROMOTIONS.map((promo) => (
        <PromotionCard key={promo.id} promo={promo} />
      ))}
    </section>
  )
}

type GameBonusItem = {
  id: string
  icon: string
  title: string
  bonusBadge: string
  bonusPercent: string
  bonusCost: number
  bonusCostLabel: string
  deposits: number
  depositsLabel: string
  players: number
  costPerDollar: string
}

const GAME_BONUS_SUMMARY = {
  bonusCost: 884,
  bonusCostLabel: '$884',
  deposits: 9100,
  depositsLabel: '$9,100',
  avgCostPerDollar: '$0.097',
}

const GAME_BONUSES: GameBonusItem[] = [
  {
    id: 'lucky-7s',
    icon: '🎰',
    title: 'Lucky 7s',
    bonusBadge: '+10% bonus',
    bonusPercent: '10%',
    bonusCost: 420,
    bonusCostLabel: '$420',
    deposits: 4200,
    depositsLabel: '$4,200',
    players: 38,
    costPerDollar: '$0.100',
  },
  {
    id: 'gold-rush',
    icon: '⛏️',
    title: 'Gold Rush',
    bonusBadge: '+8% bonus',
    bonusPercent: '8%',
    bonusCost: 248,
    bonusCostLabel: '$248',
    deposits: 3100,
    depositsLabel: '$3,100',
    players: 24,
    costPerDollar: '$0.080',
  },
  {
    id: 'neon-spinner',
    icon: '🌀',
    title: 'Neon Spinner',
    bonusBadge: '+12% bonus',
    bonusPercent: '12%',
    bonusCost: 216,
    bonusCostLabel: '$216',
    deposits: 1800,
    depositsLabel: '$1,800',
    players: 19,
    costPerDollar: '$0.120',
  },
]

function GameBonusProgressBar({
  label,
  amount,
  maxAmount,
  tone,
}: {
  label: string
  amount: number
  maxAmount: number
  tone: 'cost' | 'deposits'
}) {
  const width = maxAmount > 0 ? Math.max(6, (amount / maxAmount) * 100) : 0

  return (
    <div className="vendor-financial-game-bar-row">
      <span className="vendor-financial-game-bar-label">{label}</span>
      <div className="vendor-financial-game-bar-track">
        <span
          className={`vendor-financial-game-bar-fill vendor-financial-game-bar-fill--${tone}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}

function GameBonusCard({ game }: { game: GameBonusItem }) {
  const maxAmount = Math.max(game.bonusCost, game.deposits)

  return (
    <article className="vendor-financial-game-card">
      <div className="vendor-financial-game-card-head">
        <div className="vendor-financial-game-card-title-wrap">
          <span className="vendor-financial-game-icon" aria-hidden="true">
            {game.icon}
          </span>
          <h4 className="vendor-financial-game-card-title">{game.title}</h4>
        </div>
        <span className="vendor-financial-game-badge">{game.bonusBadge}</span>
      </div>

      <div className="vendor-financial-game-stats">
        <div className="vendor-financial-game-stat">
          <span className="vendor-financial-game-stat-label">Bonus %</span>
          <span className="vendor-financial-game-stat-value vendor-financial-game-stat-value--blue">
            {game.bonusPercent}
          </span>
        </div>
        <div className="vendor-financial-game-stat">
          <span className="vendor-financial-game-stat-label">Bonus Cost</span>
          <span className="vendor-financial-game-stat-value vendor-financial-game-stat-value--purple">
            {game.bonusCostLabel}
          </span>
        </div>
        <div className="vendor-financial-game-stat">
          <span className="vendor-financial-game-stat-label">Deposits In</span>
          <span className="vendor-financial-game-stat-value vendor-financial-game-stat-value--green">
            {game.depositsLabel}
          </span>
        </div>
      </div>

      <div className="vendor-financial-game-bars">
        <div className="vendor-financial-game-bar-group">
          <GameBonusProgressBar label="Cost" amount={game.bonusCost} maxAmount={maxAmount} tone="cost" />
          <span className="vendor-financial-game-bar-amount vendor-financial-game-bar-amount--blue">
            {game.bonusCostLabel}
          </span>
        </div>
        <div className="vendor-financial-game-bar-group">
          <GameBonusProgressBar label="Deposits" amount={game.deposits} maxAmount={maxAmount} tone="deposits" />
          <span className="vendor-financial-game-bar-amount vendor-financial-game-bar-amount--green">
            {game.depositsLabel}
          </span>
        </div>
      </div>

      <div className="vendor-financial-game-footer">
        <span className="vendor-financial-game-footer-label">
          {game.players} players · cost per $1 deposited
        </span>
        <span className="vendor-financial-game-footer-value">{game.costPerDollar}</span>
      </div>
    </article>
  )
}

function PerGameDepositBonusSection() {
  const maxSummaryAmount = Math.max(GAME_BONUS_SUMMARY.bonusCost, GAME_BONUS_SUMMARY.deposits)

  return (
    <section className="vendor-financial-games" aria-label="Per-game deposit bonus">
      <div className="vendor-financial-games-intro">
        <h3 className="vendor-financial-games-heading">
          <span className="vendor-financial-games-icon" aria-hidden="true">
            🎮
          </span>
          Per-Game Deposit Bonus
        </h3>
        <p className="vendor-financial-games-description">
          Ongoing deposit bonus % set per game in Settings → Games. Tracked separately from campaign
          promotions.
        </p>
      </div>

      <article className="vendor-financial-game-summary">
        <p className="vendor-financial-game-summary-title">
          Total bonus cost vs. deposits while bonus active
        </p>

        <div className="vendor-financial-game-summary-metrics">
          <div className="vendor-financial-game-summary-metric">
            <span className="vendor-financial-game-summary-label">Bonus Credits Given</span>
            <span className="vendor-financial-game-summary-value vendor-financial-game-summary-value--blue">
              {GAME_BONUS_SUMMARY.bonusCostLabel}
            </span>
            <span className="vendor-financial-game-summary-sub">your cost</span>
          </div>
          <div className="vendor-financial-game-summary-metric">
            <span className="vendor-financial-game-summary-label">Deposits (bonus active)</span>
            <span className="vendor-financial-game-summary-value vendor-financial-game-summary-value--green">
              {GAME_BONUS_SUMMARY.depositsLabel}
            </span>
            <span className="vendor-financial-game-summary-sub">player deposits</span>
          </div>
        </div>

        <div className="vendor-financial-game-bars vendor-financial-game-bars--summary">
          <GameBonusProgressBar
            label="Cost"
            amount={GAME_BONUS_SUMMARY.bonusCost}
            maxAmount={maxSummaryAmount}
            tone="cost"
          />
          <GameBonusProgressBar
            label="Deposits"
            amount={GAME_BONUS_SUMMARY.deposits}
            maxAmount={maxSummaryAmount}
            tone="deposits"
          />
        </div>

        <div className="vendor-financial-game-footer">
          <span className="vendor-financial-game-footer-label">Avg. cost per $1 deposited</span>
          <span className="vendor-financial-game-footer-value">{GAME_BONUS_SUMMARY.avgCostPerDollar}</span>
        </div>
      </article>

      {GAME_BONUSES.map((game) => (
        <GameBonusCard key={game.id} game={game} />
      ))}

      <button type="button" className="vendor-financial-export-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3v12M7 10l5 5 5-5M5 21h14"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Export Transaction Ledger (CSV)
      </button>
    </section>
  )
}

function FinancialTab() {
  const [range, setRange] = useState<FinancialRange>('7d')
  const summary = RANGE_SUMMARIES[range]
  const maxBarValue = Math.max(...WEEKLY_BREAKDOWN.flatMap((day) => [day.inAmount, day.outAmount]))

  return (
    <div className="vendor-analytics-content vendor-financial-content">
      <div className="vendor-financial-toolbar">
        <h2 className="vendor-analytics-heading">Volume &amp; Profit</h2>
        <div className="vendor-financial-range-pills" role="tablist" aria-label="Time range">
          {FINANCIAL_RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={range === item.id}
              className={`vendor-financial-range-btn ${range === item.id ? 'vendor-financial-range-btn--active' : ''}`}
              onClick={() => setRange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <section className="vendor-financial-hero" aria-label="Net profit summary">
        <p className="vendor-financial-hero-label">Net Profit · {summary.periodLabel}</p>
        <p className="vendor-financial-hero-value">{summary.netProfit}</p>
        <p className="vendor-financial-hero-subtitle">Deposits minus redeems</p>
      </section>

      <div className="vendor-financial-stats">
        <article className="vendor-financial-stat-card">
          <div className="vendor-financial-stat-head">
            <span className="vendor-financial-stat-icon vendor-financial-stat-icon--up" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 16l6-8 6 8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="vendor-financial-stat-label">Deposits</span>
          </div>
          <p className="vendor-financial-stat-value vendor-financial-stat-value--green">{summary.deposits}</p>
        </article>

        <article className="vendor-financial-stat-card">
          <div className="vendor-financial-stat-head">
            <span className="vendor-financial-stat-icon vendor-financial-stat-icon--down" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 8l6 8 6-8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="vendor-financial-stat-label">Redeems</span>
          </div>
          <p className="vendor-financial-stat-value vendor-financial-stat-value--orange">{summary.redeems}</p>
        </article>

        <article className="vendor-financial-stat-card">
          <span className="vendor-financial-stat-label">Platform Fees</span>
          <p className="vendor-financial-stat-value vendor-financial-stat-value--red">{summary.platformFees}</p>
        </article>

        <article className="vendor-financial-stat-card">
          <span className="vendor-financial-stat-label">Distributor Cut</span>
          <p className="vendor-financial-stat-value vendor-financial-stat-value--purple">{summary.distributorCut}</p>
        </article>
      </div>

      <section className="vendor-financial-chart-card" aria-label="Daily breakdown chart">
        <div className="vendor-financial-chart-header">
          <h3 className="vendor-financial-chart-title">{summary.breakdownTitle}</h3>
          <div className="vendor-financial-chart-legend">
            <span className="vendor-financial-legend-item">
              <span className="vendor-financial-legend-dot vendor-financial-legend-dot--in" aria-hidden="true" />
              In
            </span>
            <span className="vendor-financial-legend-item">
              <span className="vendor-financial-legend-dot vendor-financial-legend-dot--out" aria-hidden="true" />
              Out
            </span>
          </div>
        </div>

        <div className="vendor-financial-chart">
          {WEEKLY_BREAKDOWN.map((day) => (
            <div key={day.day} className="vendor-financial-chart-day">
              <div className="vendor-financial-chart-bars" aria-hidden="true">
                <span
                  className="vendor-financial-chart-bar vendor-financial-chart-bar--in"
                  style={{ height: `${(day.inAmount / maxBarValue) * 100}%` }}
                />
                <span
                  className="vendor-financial-chart-bar vendor-financial-chart-bar--out"
                  style={{ height: `${(day.outAmount / maxBarValue) * 100}%` }}
                />
              </div>
              <span className="vendor-financial-chart-day-label">{day.day}</span>
            </div>
          ))}
        </div>

        <div className="vendor-financial-net-row">
          <span className="vendor-financial-net-row-label">Daily net profit</span>
          <div className="vendor-financial-net-row-values">
            {WEEKLY_BREAKDOWN.map((day) => (
              <span key={day.day} className="vendor-financial-net-row-value">
                {day.netLabel}
              </span>
            ))}
          </div>
        </div>
      </section>

      <PromotionsBonusesSection />
      <PerGameDepositBonusSection />
    </div>
  )
}

export default function VendorAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('customers')

  return (
    <div className="vendor-analytics-page">
      <div className="vendor-analytics-tabs" role="tablist" aria-label="Analytics sections">
        {ANALYTICS_TABS.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`vendor-analytics-tab ${active ? 'vendor-analytics-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="vendor-analytics-tab-icon" aria-hidden="true">
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {activeTab === 'customers' && <CustomersTab />}
      {activeTab === 'financial' && <FinancialTab />}
      {activeTab === 'games' && <GamesTab />}
      {activeTab === 'ai-insights' && <AiInsightsTab />}
    </div>
  )
}
