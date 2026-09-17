import tapstackLogo from '../assets/tapstack-logo.png'
import './TapStackLogo.css'

type TapStackLogoProps = {
  height?: number
  onClick?: () => void
}

export function TapStackLogo({ height = 96, onClick }: TapStackLogoProps) {
  const img = (
    <img
      src={tapstackLogo}
      alt="TapStack"
      className="logo tapstack-logo"
      style={{ height, width: 'auto' }}
    />
  )

  if (!onClick) return img

  return (
    <button type="button" className="tapstack-logo-button" onClick={onClick} aria-label="TapStack home">
      {img}
    </button>
  )
}

export function TapStackWordmark() {
  return <TapStackLogo height={40} />
}
