import './GiveawayPage.css'

const BASE_NUMBER_ENTRIES = [
  [1, 2, 6, 18, 32, 44],
  [3, 7, 14, 20, 38, 42],
  [5, 7, 14, 20, 38, 42],
  [4, 9, 26, 29, 42, 44],
  [4, 12, 13, 20, 22, 46],
  [3, 8, 12, 29, 30, 32],
  [8, 10, 14, 22, 32, 46],
  [2, 11, 15, 24, 33, 41],
  [6, 9, 17, 21, 35, 40],
  [1, 13, 19, 27, 31, 45],
] as const

const NUMBER_ENTRIES = Array.from({ length: 30 }, (_, index) => {
  const base = BASE_NUMBER_ENTRIES[index % BASE_NUMBER_ENTRIES.length]
  const offset = Math.floor(index / BASE_NUMBER_ENTRIES.length) * 5

  return base.map((num) => ((num + offset - 1) % 48) + 1)
})

export default function GiveawayPage() {
  return (
    <div className="giveaway-page">
      <div className="giveaway-hero">
        <div className="giveaway-hero-text">
          <h1 className="giveaway-title">
            <span className="giveaway-title-icon" aria-hidden="true">
              🎟️
            </span>
            TapStack Giveaway
          </h1>
          <p className="giveaway-subtitle">Your monthly mega draw entries</p>
        </div>
        <div className="giveaway-tickets-pill">214 tickets</div>
      </div>

      <section className="mega-draw-card">
        <div className="mega-draw-watermark" aria-hidden="true">
          ADMIT
          <br />
          ONE
        </div>

        <div className="mega-draw-label">
          <span className="mega-draw-label-icon" aria-hidden="true">
            🎰
          </span>
          MONTHLY MEGA DRAW
        </div>

        <p className="mega-draw-prize">$25,000</p>
        <p className="mega-draw-desc">
          Match all 6 drawn numbers to win the giveaway. More tickets, more chances.
        </p>

        <div className="mega-draw-meta">
          <div className="mega-draw-meta-box">
            <span className="mega-draw-meta-label">DRAWS</span>
            <span className="mega-draw-meta-value">Aug 31</span>
          </div>
          <div className="mega-draw-meta-box">
            <span className="mega-draw-meta-label">DEADLINE IN</span>
            <span className="mega-draw-meta-value">25 days</span>
          </div>
        </div>
      </section>

      <div className="giveaway-info-box">
        <span className="giveaway-info-icon" aria-hidden="true">
          🎟️
        </span>
        <p className="giveaway-info-text">
          Collect <strong>free numbers</strong> from every purchase, your{' '}
          <strong>daily check-in</strong>, and by <strong>watching video ads</strong> (up to 10/day).
          Higher tiers earn bonus numbers.
        </p>
      </div>

      <section className="your-numbers-section">
        <div className="your-numbers-header">
          <div>
            <h2 className="your-numbers-title">Your Numbers</h2>
            <p className="your-numbers-subtitle">Sorted by first number</p>
          </div>
          <button type="button" className="highlight-draw-btn">
            Highlight draw
          </button>
        </div>

        <div className="numbers-grid">
          {NUMBER_ENTRIES.map((entry, index) => (
            <div key={index} className="number-entry">
              {entry.map((num, numIndex) => (
                <span key={`${index}-${numIndex}`} className="number-ball">
                  {num}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
