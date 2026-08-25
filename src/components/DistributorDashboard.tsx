import VendorDashboard from './VendorDashboard'
import type { SessionRole } from '../api/client'

/** Distributors use the vendor portal UI with distributor auth + extras. */
export default function DistributorDashboard({
  onLogout,
  onRoleMismatch,
}: {
  onLogout?: () => void
  onRoleMismatch?: (role: SessionRole) => void
}) {
  return (
    <VendorDashboard onLogout={onLogout} onRoleMismatch={onRoleMismatch} portal="distributor" />
  )
}
