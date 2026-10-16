import nft1 from '../assets/topup-nft/nft-1.svg'
import nft5 from '../assets/topup-nft/nft-5.svg'
import nft10 from '../assets/topup-nft/nft-10.svg'
import nft25 from '../assets/topup-nft/nft-25.svg'
import nft50 from '../assets/topup-nft/nft-50.svg'
import nft100 from '../assets/topup-nft/nft-100.svg'
import './TopUpPresetGrid.css'

export const TOPUP_PRESET_TILES = [
  { amount: 1, art: nft1, icon: 'copper-coin' },
  { amount: 5, art: nft5, icon: 'emerald-gem' },
  { amount: 10, art: nft10, icon: 'silver-shield' },
  { amount: 25, art: nft25, icon: 'gold-crown' },
  { amount: 50, art: nft50, icon: 'cosmic-orb' },
  { amount: 100, art: nft100, icon: 'prism-card' },
] as const

type TopUpPresetGridProps = {
  onAdd: (amount: number) => void
}

export default function TopUpPresetGrid({ onAdd }: TopUpPresetGridProps) {
  return (
    <div className="topup-presets">
      {TOPUP_PRESET_TILES.map((preset) => (
        <button
          key={preset.amount}
          type="button"
          className={`topup-preset topup-preset--${preset.icon}`}
          aria-label={`Add $${preset.amount}`}
          onClick={() => onAdd(preset.amount)}
        >
          <span className="topup-preset-bg" aria-hidden="true" />
          <img
            className="topup-preset-icon"
            src={preset.art}
            alt=""
            draggable={false}
          />
          <span className="topup-preset-label">${preset.amount}</span>
        </button>
      ))}
    </div>
  )
}
