import './EarnPage.css'

const MINI_GAMES = [
  { name: 'Spin Wheel', icon: '🎡', reward: '+50–500 pts', bg: '#ffedd5', tap: true },
  { name: 'Scratch Card', icon: '🎫', reward: '+10–200 pts', bg: '#dcfce7', tap: true },
  { name: 'Coin Flip', icon: '🪙', reward: 'Double or 0', bg: '#dbeafe', tap: true },
  { name: 'Dice Roll', icon: '🎲', reward: '+20–300 pts', bg: '#ede9fe', tap: true },
  { name: 'Slot Machine', icon: '🎰', reward: '+5–1,000 pts', bg: '#fce7f3', tap: true },
  { name: 'Card Draw', icon: '🃏', reward: '+15–250 pts', bg: '#fef3c7', tap: true },
] as const

type MissionStatus = 'completed' | 'active' | 'locked'

const DEPOSIT_MISSIONS: {
  step: number
  title: string
  depositTotal: string
  reward: string
  rewardExtra?: string
  status: MissionStatus
  statusNote?: string
}[] = [
  {
    step: 1,
    title: 'First Deposit',
    depositTotal: '$10',
    reward: '+100 pts',
    status: 'completed',
    statusNote: 'Claimed ✓',
  },
  {
    step: 2,
    title: 'Getting Started',
    depositTotal: '$25',
    reward: '+300 pts',
    status: 'completed',
    statusNote: 'Claimed ✓',
  },
  {
    step: 3,
    title: 'Regular Player',
    depositTotal: '$50',
    reward: '+750 pts',
    status: 'active',
    statusNote: 'In progress...',
  },
  {
    step: 4,
    title: 'High Roller',
    depositTotal: '$100',
    reward: '+1,500 pts',
    status: 'locked',
  },
  {
    step: 5,
    title: 'Power Depositor',
    depositTotal: '$250',
    reward: '+5,000 pts',
    status: 'locked',
  },
  {
    step: 6,
    title: 'VIP Unlocked',
    depositTotal: '$500',
    reward: 'VIP + 15,000 pts',
    rewardExtra: '💎',
    status: 'locked',
  },
]

export default function EarnPage() {
  return (
    <div className="earn-page">
      <div className="earn-hero">
        <div className="earn-hero-text">
          <h1 className="earn-title">
            <span className="earn-title-icon" aria-hidden="true">
              ⚡
            </span>
            Earn Points
          </h1>
          <p className="earn-subtitle">Play games &amp; complete missions</p>
        </div>
        <div className="earn-hero-actions">
          <div className="earn-points-pill">3,400 pts</div>
          <button type="button" className="earn-redeem-btn">
            Redeem $
          </button>
        </div>
      </div>

      <section className="watch-win-card">
        <div className="watch-win-header">
          <div className="watch-win-title">
            <span className="watch-win-icon" aria-hidden="true">
              🎬
            </span>
            Watch &amp; Win
          </div>
          <span className="watch-win-badge">3/3 left</span>
        </div>
        <p className="watch-win-desc">
          Watch a short video to unlock a free spin on the prize wheel &amp; earn bonus points
        </p>
        <div className="watch-win-progress" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <button type="button" className="watch-win-btn">
          <span className="watch-win-btn-icon" aria-hidden="true">
            ▶
          </span>
          Watch Video to Spin
        </button>
      </section>

      <section className="mini-games-section">
        <h2 className="section-title">Mini-Games</h2>
        <p className="section-subtitle">Spin, scratch &amp; flip to earn instant points</p>

        <div className="mini-games-grid">
          {MINI_GAMES.map((game) => (
            <button key={game.name} type="button" className="mini-game-card" style={{ background: game.bg }}>
              {game.tap ? <span className="mini-game-tap">TAP</span> : null}
              <span className="mini-game-icon" aria-hidden="true">
                {game.icon}
              </span>
              <span className="mini-game-name">{game.name}</span>
              <span className="mini-game-reward">{game.reward}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="missions-section">
        <h2 className="section-title">Deposit Missions</h2>
        <p className="section-subtitle">Reach deposit milestones to unlock bonus points</p>

        <div className="current-mission-card">
          <div className="current-mission-header">
            <span className="mission-label">CURRENT MISSION</span>
            <span className="mission-reward">+750 pts</span>
          </div>
          <h3 className="current-mission-name">Regular Player</h3>
          <div className="current-mission-progress-row">
            <span className="current-mission-deposited">
              Deposited: <strong>$35</strong> of <strong>$50</strong>
            </span>
            <span className="current-mission-percent">70%</span>
          </div>
          <div className="current-mission-bar">
            <div className="current-mission-fill" style={{ width: '70%' }} />
          </div>
          <button type="button" className="current-mission-btn">
            + Top Up to Progress
          </button>
        </div>

        <ol className="mission-timeline">
          {DEPOSIT_MISSIONS.map((mission, index) => (
            <li
              key={mission.step}
              className={`timeline-item timeline-item--${mission.status} ${index === DEPOSIT_MISSIONS.length - 1 ? 'timeline-item--last' : ''}`}
            >
              <div className="timeline-track">
                <div className={`timeline-marker timeline-marker--${mission.status}`}>
                  {mission.status === 'completed' && '✓'}
                  {mission.status === 'active' && '▶'}
                  {mission.status === 'locked' && mission.step}
                </div>
                {index < DEPOSIT_MISSIONS.length - 1 ? <span className="timeline-line" aria-hidden="true" /> : null}
              </div>

              <div className={`timeline-card timeline-card--${mission.status}`}>
                <div className="timeline-card-top">
                  <span className="timeline-card-title">
                    {mission.status === 'locked' ? (
                      <>
                        <span className="timeline-lock" aria-hidden="true">
                          🔒
                        </span>
                        {mission.title}
                      </>
                    ) : (
                      mission.title
                    )}
                  </span>
                  <span className="timeline-card-reward">
                    {mission.rewardExtra ? (
                      <>
                        <span aria-hidden="true">{mission.rewardExtra}</span> {mission.reward}
                      </>
                    ) : (
                      mission.reward
                    )}
                  </span>
                </div>
                <div className="timeline-card-bottom">
                  <span className="timeline-card-deposit">Deposit total: {mission.depositTotal}</span>
                  {mission.statusNote ? (
                    <span className={`timeline-card-note timeline-card-note--${mission.status}`}>
                      {mission.statusNote}
                    </span>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
