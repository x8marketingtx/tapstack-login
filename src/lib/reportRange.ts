export type CustomDateRange = {
  from: string
  to: string
}

export function isoDateLocal(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function defaultCustomDateRange(): CustomDateRange {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 6)
  return { from: isoDateLocal(from), to: isoDateLocal(to) }
}

export function validateCustomDateRange(from: string, to: string): string | null {
  if (!from || !to) return 'Choose both a start date and an end date.'
  if (from > to) return 'Start date must be on or before the end date.'
  return null
}

export function formatCustomDateRangeLabel(from: string, to: string): string {
  const fmt = (iso: string) => {
    const parsed = new Date(`${iso}T12:00:00`)
    if (Number.isNaN(parsed.getTime())) return iso
    return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }
  return `${fmt(from)} – ${fmt(to)}`
}

export function buildReportRangeQuery(range: string, custom?: CustomDateRange | null): string {
  const params = new URLSearchParams()
  if (range === 'custom' && custom?.from && custom?.to) {
    params.set('range', 'custom')
    params.set('from', custom.from)
    params.set('to', custom.to)
  } else {
    params.set('range', range)
  }
  return params.toString()
}

export function timestampInCustomRange(ts: number, custom: CustomDateRange): boolean {
  const start = new Date(`${custom.from}T00:00:00`).getTime()
  const end = new Date(`${custom.to}T23:59:59.999`).getTime()
  return ts >= start && ts <= end
}
