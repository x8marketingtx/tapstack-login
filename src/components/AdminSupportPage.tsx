import { useState } from 'react'
import { AdminHeader } from './AdminHeader'
import HelpCenter, { type SupportSubmitterFilter } from './HelpCenter'
import './AdminSupportPage.css'

const ROLE_FILTERS: { id: SupportSubmitterFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'player', label: 'Players' },
  { id: 'vendor', label: 'Vendors' },
  { id: 'distributor', label: 'Distributors' },
]

export default function AdminSupportPage({
  onOpenCount,
}: {
  onOpenCount?: (count: number) => void
}) {
  const [roleFilter, setRoleFilter] = useState<SupportSubmitterFilter>('all')

  return (
    <div className="admin-support-page">
      <AdminHeader />

      <div className="admin-support-intro">
        <h1 className="admin-support-title">Support</h1>
        <p className="admin-support-subtitle">
          TapStack tickets from players, vendors, and distributors — reply, resolve, or close threads here.
        </p>
      </div>

      <div className="admin-support-filters" role="tablist" aria-label="Filter by submitter">
        {ROLE_FILTERS.map((item) => {
          const active = roleFilter === item.id
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`admin-support-filter${active ? ' admin-support-filter--active' : ''}`}
              onClick={() => setRoleFilter(item.id)}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <HelpCenter
        mode="inbox"
        embedded
        hideListBack
        platformOnly
        roleFilter={roleFilter}
        onOpenCount={onOpenCount}
        onBack={() => {}}
      />
    </div>
  )
}
