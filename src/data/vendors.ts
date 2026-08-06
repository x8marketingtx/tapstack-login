export type VendorGame = {
  name: string
  icon: string
  iconBg: string
  active: boolean
  mode: 'auto' | 'manual'
  balance: string
}

export type Vendor = {
  initials: string
  name: string
  handle: string
  color: string
  text: string
  games: VendorGame[]
}

const OCEAN_SLUGGERZ_GAMES: VendorGame[] = [
  { name: 'Golden Dragon', icon: '🐉', iconBg: '#dcfce7', active: true, mode: 'auto', balance: '$0.00' },
  { name: 'River Sweeps', icon: '🌊', iconBg: '#dbeafe', active: true, mode: 'auto', balance: '$0.00' },
  { name: 'Fire Kirin', icon: '🐟', iconBg: '#dbeafe', active: true, mode: 'manual', balance: '$12.50' },
  { name: 'Panda Master', icon: '🐼', iconBg: '#f3f4f6', active: false, mode: 'auto', balance: '$5.00' },
  { name: 'Ultra Monster', icon: '👾', iconBg: '#ede9fe', active: true, mode: 'manual', balance: '$0.00' },
]

function defaultGames(vendorName: string): VendorGame[] {
  return [
    { name: `${vendorName} Classic`, icon: '🎰', iconBg: '#fef3c7', active: true, mode: 'auto', balance: '$0.00' },
    { name: `${vendorName} Pro`, icon: '🎯', iconBg: '#dbeafe', active: true, mode: 'manual', balance: '$8.00' },
    { name: `${vendorName} Deluxe`, icon: '💎', iconBg: '#ede9fe', active: true, mode: 'auto', balance: '$0.00' },
  ]
}

export const VENDORS: Vendor[] = [
  { initials: 'OS', name: 'Ocean Sluggerz', handle: 'Oceansluggerz', color: '#dbeafe', text: '#2563eb', games: OCEAN_SLUGGERZ_GAMES },
  { initials: 'VV', name: 'Victory Valley', handle: 'Valley', color: '#dcfce7', text: '#16a34a', games: defaultGames('Victory Valley') },
  { initials: 'GD', name: 'Golden Dragon', handle: 'GoldenDragon', color: '#ffedd5', text: '#ea580c', games: defaultGames('Golden Dragon') },
  { initials: 'IG', name: 'Innercore Games', handle: 'Innercore', color: '#ede9fe', text: '#7c3aed', games: defaultGames('Innercore Games') },
  { initials: 'LC', name: 'Lucky Clover', handle: 'Luckyclover', color: '#d1fae5', text: '#059669', games: defaultGames('Lucky Clover') },
  { initials: 'DS', name: 'Dream Sweeps', handle: 'dreamsweeps', color: '#fce7f3', text: '#db2777', games: defaultGames('Dream Sweeps') },
  { initials: 'BD', name: 'Blue Dragon', handle: 'Bluedragon', color: '#dbeafe', text: '#0284c7', games: defaultGames('Blue Dragon') },
  { initials: 'FW', name: 'Fantasy World', handle: 'Fantasy', color: '#ffedd5', text: '#f97316', games: defaultGames('Fantasy World') },
  { initials: 'LB', name: 'Lucky Bucks', handle: '4luckybucks', color: '#fef9c3', text: '#ca8a04', games: defaultGames('Lucky Bucks') },
  { initials: 'RS', name: 'River Sweeps', handle: 'RiverSweeps', color: '#cffafe', text: '#0891b2', games: defaultGames('River Sweeps') },
]
