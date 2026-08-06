export function TapStackLogo({ size = 72 }: { size?: number }) {
  return (
    <svg
      className="logo"
      width={size}
      height={size}
      viewBox="0 0 72 72"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 48 L36 60 L60 48 L36 36 Z"
        fill="#2d8f5f"
        fillOpacity="0.45"
      />
      <path
        d="M12 36 L36 48 L60 36 L36 24 Z"
        fill="#34a36b"
        fillOpacity="0.65"
      />
      <path d="M12 24 L36 36 L60 24 L36 12 Z" fill="#3fbf78" />
      <text
        x="36"
        y="30"
        textAnchor="middle"
        fill="#c9a227"
        fontSize="18"
        fontWeight="700"
        fontFamily="Inter, sans-serif"
      >
        T
      </text>
    </svg>
  )
}

export function TapStackWordmark() {
  return (
    <span className="wordmark">
      <span className="wordmark-tap">Tap</span>
      <span className="wordmark-stack">Stack</span>
    </span>
  )
}
