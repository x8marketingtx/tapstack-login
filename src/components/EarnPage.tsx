import { useEffect, useRef, useState } from 'react'
import {
  ApiError,
  isApiConfigured,
  tapstackApi,
  type EarnDailyMission,
  type EarnDepositMission,
  type EarnState,
} from '../api/client'
import './EarnPage.css'

type EarnPageProps = {
  onTopUp?: () => void
  pointsBalance?: number
  onWalletUpdate?: (wallet: { balance?: number; formatted?: string; points: number }) => void
}

const WHEEL_SEGMENTS = [
  { label: '50', points: 50, color: '#7c3aed' },
  { label: '100', points: 100, color: '#a78bfa' },
  { label: '25', points: 25, color: '#c4b5fd' },
  { label: '250', points: 250, color: '#6d28d9' },
  { label: '75', points: 75, color: '#8b5cf6' },
  { label: '150', points: 150, color: '#5b21b6' },
  { label: '10', points: 10, color: '#ddd6fe' },
  { label: '500', points: 500, color: '#4c1d95' },
] as const

const SEGMENT_COUNT = WHEEL_SEGMENTS.length
const SEGMENT_DEG = 360 / SEGMENT_COUNT

const DEMO_DEPOSIT_MISSIONS: EarnDepositMission[] = [
  {
    step: 1,
    title: 'First Deposit',
    depositTotal: '$10',
    target: 10,
    reward: '+100 pts',
    rewardPoints: 100,
    status: 'completed',
    statusNote: 'Claimed ✓',
  },
  {
    step: 2,
    title: 'Getting Started',
    depositTotal: '$25',
    target: 25,
    reward: '+300 pts',
    rewardPoints: 300,
    status: 'completed',
    statusNote: 'Claimed ✓',
  },
  {
    step: 3,
    title: 'Regular Player',
    depositTotal: '$50',
    target: 50,
    reward: '+750 pts',
    rewardPoints: 750,
    status: 'active',
    statusNote: 'In progress...',
  },
  {
    step: 4,
    title: 'High Roller',
    depositTotal: '$100',
    target: 100,
    reward: '+1,500 pts',
    rewardPoints: 1500,
    status: 'locked',
  },
  {
    step: 5,
    title: 'Power Depositor',
    depositTotal: '$250',
    target: 250,
    reward: '+5,000 pts',
    rewardPoints: 5000,
    status: 'locked',
  },
  {
    step: 6,
    title: 'VIP Unlocked',
    depositTotal: '$500',
    target: 500,
    reward: 'VIP + 15,000 pts',
    rewardPoints: 15000,
    rewardExtra: '💎',
    status: 'locked',
  },
]

function demoState(pointsBalance: number): EarnState {
  return {
    points: pointsBalance || 3400,
    cashBalance: 0,
    cashFormatted: '$0.00',
    spinsRemaining: 3,
    spinsTotal: 3,
    spinsUsed: 0,
    wheel: WHEEL_SEGMENTS.map((s) => ({ label: s.label, points: s.points })),
    dailyMissions: [
      {
        id: 'spin-once',
        title: 'Take a spin',
        detail: 'Use your daily prize wheel once',
        reward: 50,
        goal: 1,
        progress: 0,
        status: 'active',
      },
      {
        id: 'top-up',
        title: 'Top up wallet',
        detail: 'Add funds with Wert',
        reward: 120,
        goal: 1,
        progress: 0,
        status: 'active',
      },
      {
        id: 'load-any',
        title: 'Load any game',
        detail: 'Complete 1 load at a linked vendor',
        reward: 100,
        goal: 1,
        progress: 0,
        status: 'active',
      },
    ],
    mission: {
      step: 3,
      title: 'Regular Player',
      deposited: 35,
      target: 50,
      pct: 70,
      reward: 750,
    },
    missions: DEMO_DEPOSIT_MISSIONS,
    lifetimeDeposited: 35,
    redeemRate: { points: 100, cash: 1, minPoints: 100 },
  }
}

function missionIcon(id: string): string {
  switch (id) {
    case 'spin-once':
      return '🎡'
    case 'top-up':
      return '💳'
    case 'visit-vendor':
      return '🏪'
    case 'manual-load':
      return '✋'
    case 'two-loads':
      return '🎯'
    case 'load-any':
    default:
      return '🎮'
  }
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function segmentPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polar(cx, cy, r, endDeg)
  const end = polar(cx, cy, r, startDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y} Z`
}

/** Degrees to rotate so segment index sits under the top pointer. */
function rotationForPrize(index: number, currentRotation: number) {
  const center = index * SEGMENT_DEG + SEGMENT_DEG / 2
  const target = (360 - center) % 360
  const normalized = ((currentRotation % 360) + 360) % 360
  let delta = target - normalized
  if (delta <= 0) delta += 360
  return currentRotation + delta + 360 * 5
}

export default function EarnPage({ onTopUp, pointsBalance = 0, onWalletUpdate }: EarnPageProps) {
  const useApi = isApiConfigured()
  const [earn, setEarn] = useState<EarnState | null>(useApi ? null : demoState(pointsBalance))
  const [loading, setLoading] = useState(useApi)
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [lastWin, setLastWin] = useState<number | null>(null)
  const [toast, setToast] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const pendingSpinRef = useRef<{
    pointsWon: number
    earn?: EarnState
    wallet?: { balance: number; points: number; formatted?: string }
    demo?: boolean
  } | null>(null)

  const points = earn?.points ?? pointsBalance
  const spinsLeft = earn?.spinsRemaining ?? 0
  const dailyMissions: EarnDailyMission[] = earn?.dailyMissions ?? []
  const depositMissions: EarnDepositMission[] = earn?.missions ?? DEMO_DEPOSIT_MISSIONS
  const currentMission = earn?.mission

  useEffect(() => {
    if (!useApi) return
    let cancelled = false
    setLoading(true)
    tapstackApi
      .customerEarn()
      .then((res) => {
        if (cancelled) return
        setEarn(res)
        onWalletUpdate?.({ points: res.points, balance: res.cashBalance, formatted: res.cashFormatted })
      })
      .catch(() => {
        if (!cancelled) setError('Could not load earn data')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // Intentionally omit onWalletUpdate — parent passes an inline callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useApi])

  useEffect(() => {
    if (!useApi && pointsBalance > 0) {
      setEarn((s) => (s ? { ...s, points: pointsBalance } : demoState(pointsBalance)))
    }
  }, [pointsBalance, useApi])

  function flash(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2200)
  }

  function applyWallet(wallet?: { balance?: number; points: number; formatted?: string }) {
    if (!wallet) return
    onWalletUpdate?.(wallet)
    setEarn((s) => (s ? { ...s, points: wallet.points } : s))
  }

  async function spinWheel() {
    if (spinning || spinsLeft <= 0 || !earn) return
    setLastWin(null)
    setError('')
    setSpinning(true)

    try {
      if (useApi) {
        const res = await tapstackApi.customerEarnSpin()
        pendingSpinRef.current = {
          pointsWon: res.pointsWon,
          earn: res.earn,
          wallet: res.wallet,
        }
        setRotation((current) => rotationForPrize(res.segmentIndex, current))
        return
      }

      const index = Math.floor(Math.random() * SEGMENT_COUNT)
      const segment = WHEEL_SEGMENTS[index]
      pendingSpinRef.current = { pointsWon: segment.points, demo: true }
      setRotation((current) => rotationForPrize(index, current))
    } catch (err) {
      setSpinning(false)
      setError(err instanceof ApiError ? err.message : 'Spin failed')
    }
  }

  function handleSpinEnd() {
    if (!spinning) return
    setSpinning(false)
    const pending = pendingSpinRef.current
    pendingSpinRef.current = null
    if (!pending) return

    setLastWin(pending.pointsWon)
    if (pending.earn) {
      setEarn(pending.earn)
      applyWallet(pending.wallet)
    } else if (pending.demo) {
      setEarn((s) =>
        s
          ? {
              ...s,
              points: s.points + pending.pointsWon,
              spinsRemaining: Math.max(0, s.spinsRemaining - 1),
              spinsUsed: s.spinsUsed + 1,
              dailyMissions: s.dailyMissions.map((m) =>
                m.id === 'spin-once' && m.status === 'active'
                  ? { ...m, progress: m.goal, status: 'claim' as const }
                  : m,
              ),
            }
          : s,
      )
    }
    flash(`You won +${pending.pointsWon} pts!`)
  }

  async function claimMission(id: string) {
    if (!earn || busyId) return
    const mission = earn.dailyMissions.find((m) => m.id === id)
    if (!mission || mission.status !== 'claim') return
    setBusyId(id)
    setError('')
    try {
      if (useApi) {
        const res = await tapstackApi.customerEarnClaimMission(id)
        setEarn(res.earn)
        applyWallet(res.wallet)
        flash(`Claimed +${res.reward} pts`)
      } else {
        setEarn((s) =>
          s
            ? {
                ...s,
                points: s.points + mission.reward,
                dailyMissions: s.dailyMissions.map((m) =>
                  m.id === id ? { ...m, status: 'done' as const } : m,
                ),
              }
            : s,
        )
        flash(`Claimed +${mission.reward} pts`)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Claim failed')
    } finally {
      setBusyId(null)
    }
  }

  async function claimDeposit(step: number) {
    if (!earn || busyId) return
    setBusyId(`deposit-${step}`)
    setError('')
    try {
      if (useApi) {
        const res = await tapstackApi.customerEarnClaimDeposit(step)
        setEarn(res.earn)
        applyWallet(res.wallet)
        flash(`Claimed +${res.reward} pts`)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Claim failed')
    } finally {
      setBusyId(null)
    }
  }

  if (loading && !earn) {
    return (
      <div className="earn-page">
        <div className="dash-skeleton dash-skeleton--card" />
        <div className="dash-skeleton dash-skeleton--card" />
      </div>
    )
  }

  const spinsTotal = earn?.spinsTotal ?? 3
  const claimableDaily = dailyMissions.filter((m) => m.status === 'claim').length

  return (
    <div className="earn-page">
      <section className="earn-wallet" aria-label="Points wallet">
        <div className="earn-wallet-glow" aria-hidden="true" />
        <div className="earn-wallet-top">
          <div>
            <p className="earn-wallet-label">POINTS WALLET</p>
            <p className="earn-wallet-balance">{points.toLocaleString()}</p>
            <p className="earn-wallet-unit">pts available</p>
          </div>
          <div className="earn-wallet-badge" aria-hidden="true">
            ⚡
          </div>
        </div>
        <div className="earn-wallet-stats">
          <div className="earn-wallet-stat">
            <span className="earn-wallet-stat-value">{spinsLeft}</span>
            <span className="earn-wallet-stat-label">Spins left</span>
          </div>
          <div className="earn-wallet-stat-divider" aria-hidden="true" />
          <div className="earn-wallet-stat">
            <span className="earn-wallet-stat-value">{claimableDaily}</span>
            <span className="earn-wallet-stat-label">Ready to claim</span>
          </div>
          <div className="earn-wallet-stat-divider" aria-hidden="true" />
          <div className="earn-wallet-stat">
            <span className="earn-wallet-stat-value">100:1</span>
            <span className="earn-wallet-stat-label">pts → $</span>
          </div>
        </div>
      </section>

      {toast ? <p className="earn-toast">{toast}</p> : null}
      {error ? <p className="earn-toast earn-toast--error">{error}</p> : null}

      <section className="earn-section earn-wheel-section">
        <header className="earn-section-head">
          <div>
            <h2 className="earn-section-title">Prize Wheel</h2>
            <p className="earn-section-sub">Daily spins for instant TapStack points</p>
          </div>
          <div className="earn-spin-dots" aria-label={`${spinsLeft} of ${spinsTotal} spins remaining`}>
            {Array.from({ length: spinsTotal }, (_, i) => (
              <span key={i} className={`earn-spin-dot ${i < spinsLeft ? 'is-on' : ''}`} />
            ))}
          </div>
        </header>

        <div className={`earn-wheel-card ${lastWin !== null && !spinning ? 'is-won' : ''} ${spinning ? 'is-spinning' : ''}`}>
          <div className="earn-wheel-stage">
            <div className="earn-wheel-pointer" aria-hidden="true" />
            <div
              className={`earn-wheel-disc ${spinning ? 'is-spinning' : ''}`}
              style={{ transform: `rotate(${rotation}deg)` }}
              onTransitionEnd={(event) => {
                if (event.propertyName !== 'transform') return
                if (event.target !== event.currentTarget) return
                handleSpinEnd()
              }}
            >
              <svg className="earn-wheel-svg" viewBox="0 0 200 200" role="img" aria-label="Prize wheel">
                <circle cx="100" cy="100" r="98" fill="#5b21b6" />
                {WHEEL_SEGMENTS.map((seg, i) => {
                  const start = i * SEGMENT_DEG
                  const end = start + SEGMENT_DEG
                  const mid = start + SEGMENT_DEG / 2
                  const label = polar(100, 100, 62, mid)
                  const light = seg.points < 150
                  return (
                    <g key={seg.label + i}>
                      <path
                        d={segmentPath(100, 100, 94, start, end)}
                        fill={seg.color}
                        stroke="rgba(255,255,255,0.55)"
                        strokeWidth="1.2"
                      />
                      <text
                        x={label.x}
                        y={label.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={light ? '#4c1d95' : '#ffffff'}
                        fontSize="15"
                        fontWeight="800"
                        transform={`rotate(${mid}, ${label.x}, ${label.y})`}
                      >
                        {seg.label}
                      </text>
                    </g>
                  )
                })}
                <circle cx="100" cy="100" r="28" fill="#f5f3ff" />
              </svg>
            </div>
            <button
              type="button"
              className="earn-wheel-center-btn"
              onClick={() => void spinWheel()}
              disabled={spinning || spinsLeft <= 0}
              aria-label="Spin the prize wheel"
            >
              <strong>{spinning ? '…' : 'SPIN'}</strong>
              <small>{spinsLeft} left</small>
            </button>
          </div>

          <div className="earn-wheel-meta">
            {lastWin !== null && !spinning ? (
              <p className="earn-wheel-win">
                You won <span>+{lastWin}</span> pts
              </p>
            ) : (
              <p className="earn-wheel-hint">
                {spinsLeft > 0
                  ? `${spinsLeft} free spin${spinsLeft === 1 ? '' : 's'} left today`
                  : 'No spins left today — come back tomorrow'}
              </p>
            )}
            <button
              type="button"
              className="earn-wheel-spin-btn"
              onClick={() => void spinWheel()}
              disabled={spinning || spinsLeft <= 0}
            >
              {spinning ? 'Spinning…' : lastWin !== null ? 'Spin again' : 'Spin for Points'}
            </button>
          </div>
        </div>
      </section>

      <section className="earn-section earn-daily-missions">
        <header className="earn-section-head">
          <div>
            <h2 className="earn-section-title">Daily Missions</h2>
            <p className="earn-section-sub">Fresh quests each day — claim when ready</p>
          </div>
        </header>

        <ul className="earn-mission-cards">
          {dailyMissions.map((mission) => {
            const pct = Math.min(100, Math.round((mission.progress / mission.goal) * 100))
            return (
              <li key={mission.id} className={`earn-mission-card earn-mission-card--${mission.status}`}>
                <div className="earn-mission-icon" aria-hidden="true">
                  {missionIcon(mission.id)}
                </div>
                <div className="earn-mission-main">
                  <div className="earn-mission-top">
                    <strong>{mission.title}</strong>
                    <span className="earn-mission-reward">+{mission.reward}</span>
                  </div>
                  <p>{mission.detail}</p>
                  {mission.status !== 'done' ? (
                    <div className="earn-mission-bar" aria-hidden="true">
                      <div style={{ width: `${pct}%` }} />
                    </div>
                  ) : (
                    <span className="earn-mission-done">Completed</span>
                  )}
                </div>
                {mission.status === 'claim' ? (
                  <button
                    type="button"
                    className="earn-mission-claim"
                    onClick={() => void claimMission(mission.id)}
                    disabled={busyId === mission.id}
                  >
                    {busyId === mission.id ? '…' : 'Claim'}
                  </button>
                ) : mission.status === 'active' && mission.id === 'top-up' ? (
                  <button type="button" className="earn-mission-go" onClick={onTopUp}>
                    Top Up
                  </button>
                ) : (
                  <span className="earn-mission-status">
                    {mission.status === 'done' ? '✓' : `${mission.progress}/${mission.goal}`}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section className="earn-section missions-section">
        <header className="earn-section-head">
          <div>
            <h2 className="earn-section-title">Deposit Path</h2>
            <p className="earn-section-sub">Hit milestones to unlock bonus points</p>
          </div>
        </header>

        {currentMission ? (
          <div className="current-mission-card">
            <div className="current-mission-header">
              <span className="mission-label">CURRENT</span>
              <span className="mission-reward">+{currentMission.reward.toLocaleString()} pts</span>
            </div>
            <h3 className="current-mission-name">{currentMission.title}</h3>
            <div className="current-mission-progress-row">
              <span className="current-mission-deposited">
                <strong>${currentMission.deposited.toFixed(0)}</strong>
                <span> / ${currentMission.target.toFixed(0)} deposited</span>
              </span>
              <span className="current-mission-percent">{currentMission.pct}%</span>
            </div>
            <div className="current-mission-bar">
              <div className="current-mission-fill" style={{ width: `${currentMission.pct}%` }} />
            </div>
            <button type="button" className="current-mission-btn" onClick={onTopUp}>
              Top Up to Progress
            </button>
          </div>
        ) : null}

        <ol className="mission-timeline">
          {depositMissions.map((mission, index) => (
            <li
              key={mission.step}
              className={`timeline-item timeline-item--${mission.status || 'locked'} ${index === depositMissions.length - 1 ? 'timeline-item--last' : ''}`}
            >
              <div className="timeline-track">
                <div className={`timeline-marker timeline-marker--${mission.status || 'locked'}`}>
                  {mission.status === 'completed' && '✓'}
                  {(mission.status === 'active' || mission.status === 'claim') && '▶'}
                  {mission.status === 'locked' && mission.step}
                </div>
                {index < depositMissions.length - 1 ? (
                  <span className="timeline-line" aria-hidden="true" />
                ) : null}
              </div>

              <div className={`timeline-card timeline-card--${mission.status || 'locked'}`}>
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
                  <span className="timeline-card-deposit">{mission.depositTotal} lifetime</span>
                  {mission.status === 'claim' ? (
                    <button
                      type="button"
                      className="earn-mission-claim"
                      onClick={() => void claimDeposit(mission.step)}
                      disabled={busyId === `deposit-${mission.step}`}
                    >
                      {busyId === `deposit-${mission.step}` ? '…' : 'Claim'}
                    </button>
                  ) : mission.statusNote ? (
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
