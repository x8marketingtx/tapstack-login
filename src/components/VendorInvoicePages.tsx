import { useCallback, useEffect, useState } from 'react'
import { ApiError, tapstackApi, type VendorInvoice } from '../api/client'
import { consumePendingInvoiceToken } from '../lib/invoicePay'
import { shouldOpenVerifyFromApiError } from '../lib/verify'
import TopUpModal from './TopUpModal'
import './InvoicePay.css'

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  const letters = parts.map((part) => part[0]?.toUpperCase() || '').join('')
  return letters || 'TS'
}

export function VendorInvoiceList({
  invoices,
  loading,
  onOpen,
  onBack,
}: {
  invoices: VendorInvoice[]
  loading: boolean
  onOpen: (token: string) => void
  onBack: () => void
}) {
  const pending = invoices.filter((row) => row.status !== 'paid')
  const paid = invoices.filter((row) => row.status === 'paid')

  return (
    <div className="inv-pay inv-pay--portal">
      <button type="button" className="inv-pay-back" onClick={onBack}>
        ← Dashboard
      </button>
      <p className="inv-pay-kicker">Vendor portal</p>
      <h1 className="inv-pay-title">Invoices</h1>
      {loading ? <p className="inv-pay-empty">Loading…</p> : null}
      {!loading && !invoices.length ? <p className="inv-pay-empty">No invoices yet.</p> : null}
      {pending.length ? (
        <div className="inv-pay-list">
          {pending.map((row) => (
            <button key={row.token} type="button" className="inv-pay-item" onClick={() => onOpen(row.token)}>
              <span className="inv-from-avatar inv-from-avatar--sm" aria-hidden="true">
                {initialsFrom(row.distributor.name)}
              </span>
              <span>
                <strong>{row.distributor.name}</strong>
                <small>
                  {row.invoiceId}
                  {row.subject ? ` · ${row.subject}` : ''}
                </small>
              </span>
              <span className="inv-pay-item-amt">{row.amount}</span>
            </button>
          ))}
        </div>
      ) : null}
      {paid.length ? (
        <section className="inv-pay-card">
          <h3>Paid</h3>
          <div className="inv-pay-list">
            {paid.map((row) => (
              <button key={row.token} type="button" className="inv-pay-item" onClick={() => onOpen(row.token)}>
                <span className="inv-from-avatar inv-from-avatar--sm" aria-hidden="true">
                  {initialsFrom(row.distributor.name)}
                </span>
                <span>
                  <strong>{row.distributor.name}</strong>
                  <small>{row.invoiceId} · Paid</small>
                </span>
                <span className="inv-pay-item-amt">{row.amount}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

export function VendorInvoicePayPage({
  token,
  onBack,
  onPaid,
  onVerifyRequired,
}: {
  token: string
  onBack: () => void
  onPaid: (invoice: VendorInvoice) => void
  onVerifyRequired: () => void
}) {
  const [invoice, setInvoice] = useState<VendorInvoice | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [topUpOpen, setTopUpOpen] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState(0)

  const load = useCallback(async () => {
    const row = await tapstackApi.vendorInvoice(token)
    setInvoice(row)
    return row
  }, [token])

  useEffect(() => {
    consumePendingInvoiceToken()
    let cancelled = false
    setError('')
    void load().catch((err) => {
      if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load invoice.')
    })
    return () => {
      cancelled = true
    }
  }, [load])

  async function payNow() {
    if (!invoice || invoice.status === 'paid') return
    const needed = Number(invoice.shortfall || 0)
    if (needed > 0) {
      setTopUpAmount(Math.max(1, Math.ceil(needed)))
      setTopUpOpen(true)
      setError('Not enough balance. Top up, then this invoice will be paid.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const result = await tapstackApi.vendorPayInvoice(token)
      setInvoice(result.invoice)
      if (result.paid) onPaid(result.invoice)
    } catch (err) {
      if (shouldOpenVerifyFromApiError(err)) {
        onVerifyRequired()
        return
      }
      if (err instanceof ApiError && err.code === 'tapstack_insufficient') {
        const shortfall = Number(err.data?.shortfall || invoice.shortfall || 0)
        setTopUpAmount(Math.max(1, Math.ceil(shortfall || invoice.amountValue)))
        setTopUpOpen(true)
        setError('Not enough balance. Top up, then this invoice will be paid.')
        return
      }
      setError(err instanceof ApiError ? err.message : 'Could not pay invoice.')
    } finally {
      setBusy(false)
    }
  }

  async function afterTopUp() {
    setTopUpOpen(false)
    try {
      const fresh = await load()
      if ((fresh.shortfall || 0) > 0) {
        setError('Balance updated, but still short of this invoice. Top up the rest to finish.')
        return
      }
      const result = await tapstackApi.vendorPayInvoice(token)
      setInvoice(result.invoice)
      if (result.paid) onPaid(result.invoice)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not finish invoice after top up.')
    }
  }

  const paid = invoice?.status === 'paid'
  const short = invoice && !paid ? Number(invoice.shortfall || 0) : 0
  const fromName = invoice?.distributor.name || 'Distributor'
  const balanceLabel = invoice?.wallet?.formatted || '$0.00'
  const covered = invoice && !paid && short <= 0

  return (
    <div className="inv-pay inv-pay--portal">
      <button type="button" className="inv-pay-back" onClick={onBack}>
        ← Dashboard
      </button>
      {error ? <p className="inv-pay-error">{error}</p> : null}
      {invoice ? (
        <article className={`inv-sheet inv-sheet--portal${paid ? ' is-paid' : ''}`}>
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
                <p className="inv-from-label">Pay to</p>
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
              <div>
                <dt>Your balance</dt>
                <dd>{balanceLabel}</dd>
              </div>
              {short > 0 ? (
                <div>
                  <dt>Need to top up</dt>
                  <dd>${short.toFixed(2)}</dd>
                </div>
              ) : null}
            </dl>
            {covered ? (
              <p className="inv-pay-notice">Your vendor balance covers this invoice.</p>
            ) : null}
          </section>

          <aside className="inv-sheet-side">
            <div className="inv-qr-frame">
              {invoice.qrUrl ? <img src={invoice.qrUrl} alt="Invoice payment QR code" /> : null}
              <p>Keep this private pay link for your records.</p>
            </div>
            {paid ? (
              <p className="inv-pay-notice">Paid from your vendor balance.</p>
            ) : (
              <div className="inv-pay-actions">
                <button type="button" className="inv-pay-btn" disabled={busy} onClick={() => void payNow()}>
                  {busy ? 'Paying…' : short > 0 ? `Top up $${short.toFixed(2)} and pay` : `Pay ${invoice.amount}`}
                </button>
              </div>
            )}
          </aside>
        </article>
      ) : !error ? (
        <p className="inv-pay-empty">Loading invoice…</p>
      ) : null}

      <TopUpModal
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        ownerType="vendor"
        title="Top up to pay invoice"
        initialAmount={topUpAmount}
        onVerifyRequired={onVerifyRequired}
        onSuccess={() => {
          void afterTopUp()
        }}
      />
    </div>
  )
}
