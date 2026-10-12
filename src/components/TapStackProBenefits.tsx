import './TapStackProBenefits.css'

export default function TapStackProBenefits({ title = 'What you get' }: { title?: string }) {
  return (
    <div className="tapstack-pro-benefits">
      <p className="tapstack-pro-benefits-title">{title}</p>
      <ul className="tapstack-pro-benefits-list">
        <li>Unlocking all automated features</li>
        <li>Players can automatically create gaming accounts</li>
        <li>Load and redeem players automatically</li>
        <li>Set parameters for auto loads and redeems to your liking</li>
      </ul>
    </div>
  )
}
