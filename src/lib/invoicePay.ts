const PENDING_INVOICE_KEY = 'tapstack_pending_invoice'

export function setPendingInvoiceToken(token: string): void {
  const clean = token.trim()
  if (!clean) return
  try {
    localStorage.setItem(PENDING_INVOICE_KEY, clean)
  } catch {
    /* ignore */
  }
}

export function peekPendingInvoiceToken(): string {
  try {
    return (localStorage.getItem(PENDING_INVOICE_KEY) || '').trim()
  } catch {
    return ''
  }
}

export function consumePendingInvoiceToken(): string {
  const token = peekPendingInvoiceToken()
  try {
    localStorage.removeItem(PENDING_INVOICE_KEY)
  } catch {
    /* ignore */
  }
  return token
}

export function payPathForToken(token: string): string {
  return `/vendor/invoices/${encodeURIComponent(token.trim())}`
}
