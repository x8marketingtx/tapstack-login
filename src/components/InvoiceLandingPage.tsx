import { useEffect, useState } from 'react'
import { ApiError, tapstackApi, type PublicInvoice } from '../api/client'
import { setPendingInvoiceToken } from '../lib/invoicePay'
import { TapStackLogo } from './TapStackLogo'
import './InvoicePay.css'

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  const letters = parts.map((part) => part[0]?.toUpperCase() || '').join('')
  return letters || 'TS'
}

export default function InvoiceLandingPage({
  token,
  onLogin,
  onApply,
}: {
  token: string
  onLogin: () => void
  onApply: () => void
}) {
  const [invoice, setInvoice] = useState<PublicInvoice | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!token) return
    setPendingInvoiceToken(token)
    let cancelled = false
    void tapstackApi
      .publicInvoice(token)
      .then((row) => {
        if (!cancelled) setInvoice(row)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Invoice not found.')
      })
    return () => {
      cancelled = true
    }
  }, [token])

  async function copyLink() {
    const url = invoice?.payUrl || window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      /* ignore */
    }
  }

  const paid = invoice?.status === 'paid'
  const fromName = invoice?.distributor.name || 'TapStack distributor'

  return (
    <div className="inv-page">
      <header className="inv-page-bar">
        <div className="inv-page-bar-inner">
          <TapStackLogo height={32} />
          <p className="inv-page-secure">Private pay link</p>
        </div>
      </header>
      <main className="inv-page-body">
        {error && !invoice ? (
          <div className="inv-sheet inv-sheet--solo">
            <p className="inv-pay-kicker">TapStack invoice</p>
            <h1 className="inv-pay-title">Invoice unavailable</h1>
            <p className="inv-pay-error">{error}</p>
          </div>
        ) : null}

        {!invoice && !error ? (
          <div className="inv-sheet inv-sheet--solo">
            <p className="inv-pay-empty">Loading invoice…</p>
          </div>
        ) : null}

        {invoice ? (
          <article className={`inv-sheet${paid ? ' is-paid' : ''}`}>
            <section className="inv-sheet-main">
              <div className="inv-sheet-top">
                <p className="inv-pay-kicker">Amount due</p>
                <span className={`inv-status inv-status--${paid ? 'paid' : 'due'}`}>
                  {paid ? 'Paid' : 'Awaiting payment'}
                </span>
              </div>
              <p className="inv-hero-amount">{invoice.amount}</p>
              {invoice.subject ? <p className="inv-hero-subject">{invoice.subject}</p> : null}

              <div className="inv-from">
                <span className="inv-from-avatar" aria-hidden="true">
                  {initialsFrom(fromName)}
                </span>
                <div>
                  <p className="inv-from-label">From</p>
                  <p className="inv-from-name">{fromName}</p>
                  {invoice.distributor.email ? (
                    <p className="inv-from-email">{invoice.distributor.email}</p>
                  ) : null}
                </div>
              </div>

              <dl className="inv-meta">
                <div>
                  <dt>Invoice</dt>
                  <dd>{invoice.invoiceId}</dd>
                </div>
                {invoice.email ? (
                  <div>
                    <dt>Billed to</dt>
                    <dd>{invoice.email}</dd>
                  </div>
                ) : null}
                {invoice.dueDate ? (
                  <div>
                    <dt>Due</dt>
                    <dd>{invoice.dueDate}</dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <aside className="inv-sheet-side">
              <div className="inv-qr-frame">
                {invoice.qrUrl ? <img src={invoice.qrUrl} alt="Scan to open this invoice" /> : null}
                <p>Scan with your phone, then log in as a vendor to pay.</p>
              </div>
              {paid ? (
                <p className="inv-pay-notice">This invoice is already paid.</p>
              ) : (
                <div className="inv-pay-actions">
                  <button type="button" className="inv-pay-btn" onClick={onLogin}>
                    Log in to pay
                  </button>
                  <button type="button" className="inv-pay-btn inv-pay-btn--ghost" onClick={onApply}>
                    Apply for a vendor account
                  </button>
                  <button type="button" className="inv-pay-link" onClick={() => void copyLink()}>
                    {copied ? 'Link copied' : 'Copy pay link'}
                  </button>
                </div>
              )}
            </aside>
          </article>
        ) : null}
      </main>
    </div>
  )
}
