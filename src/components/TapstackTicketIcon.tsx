import { useId } from 'react'

const VIEW_W = 54
const VIEW_H = 36

type TapstackTicketIconProps = {
  size?: number
  className?: string
}

/** Mini ticket with ruffled perf edges — matches `ticket-card` on the Tickets page. */
export function TapstackTicketIcon({ size = 22, className = '' }: TapstackTicketIconProps) {
  const uid = useId().replace(/:/g, '')
  const gradId = `tapstack-ticket-grad-${uid}`
  const leftMaskId = `tapstack-ticket-left-${uid}`
  const rightMaskId = `tapstack-ticket-right-${uid}`
  const height = (size * VIEW_H) / VIEW_W
  const perfY = [6, 14, 22, 30]

  return (
    <svg
      className={className}
      width={size}
      height={height}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="27" y1="0" x2="27" y2={VIEW_H} gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff7cc" />
          <stop offset="0.55" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
        <mask id={leftMaskId}>
          <rect x="0" y="0" width="9" height={VIEW_H} fill="#fff" />
          {perfY.map((cy) => (
            <circle key={`l-${cy}`} cx="9" cy={cy} r="5.2" fill="#000" />
          ))}
        </mask>
        <mask id={rightMaskId}>
          <rect x={VIEW_W - 9} y="0" width="9" height={VIEW_H} fill="#fff" />
          {perfY.map((cy) => (
            <circle key={`r-${cy}`} cx={VIEW_W - 9} cy={cy} r="5.2" fill="#000" />
          ))}
        </mask>
      </defs>
      <rect x="9" y="0" width="36" height={VIEW_H} fill={`url(#${gradId})`} />
      <rect x="9" y="0" width="36" height="1" fill="#b45309" opacity="0.85" />
      <rect x="9" y={VIEW_H - 1} width="36" height="1" fill="#b45309" opacity="0.85" />
      <rect x="0" y="0" width="9" height={VIEW_H} fill="#f59e0b" mask={`url(#${leftMaskId})`} />
      <rect x={VIEW_W - 9} y="0" width="9" height={VIEW_H} fill="#f59e0b" mask={`url(#${rightMaskId})`} />
    </svg>
  )
}

export default TapstackTicketIcon
