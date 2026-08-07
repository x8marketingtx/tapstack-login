import tapstackLogo from '../assets/tapstack-logo.png'

type TapStackLogoProps = {
  height?: number
}

export function TapStackLogo({ height = 96 }: TapStackLogoProps) {
  return (
    <img
      src={tapstackLogo}
      alt="TapStack"
      className="logo tapstack-logo"
      style={{ height, width: 'auto' }}
    />
  )
}

export function TapStackWordmark() {
  return <TapStackLogo height={40} />
}
