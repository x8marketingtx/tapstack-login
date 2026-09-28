import { ACTIVITY_PAGE_SIZE, pageCount } from '../lib/refresh'
import './ActivityPager.css'

export default function ActivityPager({
  page,
  total,
  onPage,
  size = ACTIVITY_PAGE_SIZE,
}: {
  page: number
  total: number
  onPage: (page: number) => void
  size?: number
}) {
  const pages = pageCount(total, size)
  if (total <= size) return null
  return (
    <div className="activity-pager">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <span>
        {page} / {pages}
      </span>
      <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </div>
  )
}
