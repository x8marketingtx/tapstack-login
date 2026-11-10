import { useCallback, useEffect, useState } from 'react'
import { ApiError, tapstackApi, type VendorInvoice } from '../api/client'
import { consumePendingInvoiceToken } from '../lib/invoicePay'
import { shouldOpenVerifyFromApiError } from '../lib/verify'
import { ImageAgreementCheckbox } from './ImageUploadAgreement'
import TopUpModal from './TopUpModal'
import './InvoicePay.css'

type PayMethod = 'wallet' | 'paysio' | 'custom'

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
                  {row.status === 'review' ? ' · Waiting on distributor' : row.subject ? ` · ${row.subject}` : ''}
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
  const [payMethod, setPayMethod] = useState<PayMethod>('wallet')
  const [cardOpen, setCardOpen] = useState(false)
  const [cardAmount, setCardAmount] = useState(0)
  const [cardMix, setCardMix] = useState(false)
  const [claimNote, setClaimNote] = useState('')
  const [claimFile, setClaimFile] = useState<File | null>(null)
  const [claimAgreed, setClaimAgreed] = useState(false)

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

  function openCard(amount: number, mix: boolean) {
    setCardAmount(Math.max(1, Math.round(amount * 100) / 100))
    setCardMix(mix)
    setCardOpen(true)
  }

  async function payNow() {
    if (!invoice || invoice.status === 'paid' || invoice.status === 'review') return
    if (payMethod === 'custom') {
      if (!claimNote.trim() || !claimFile || !claimAgreed) {
        setError('Add how you paid, attach a screenshot, and confirm the image agreement.')
        return
      }
      setBusy(true)
      setError('')
      try {
        const result = await tapstackApi.vendorClaimInvoice(token, {
          note: claimNote.trim(),
          file: claimFile,
          agreed: true,
        })
        setInvoice(result.invoice)
        onPaid(result.invoice)
      } catch (err) {
        if (shouldOpenVerifyFromApiError(err)) {
          onVerifyRequired()
          return
        }
        setError(err instanceof ApiError ? err.message : 'Could not submit payment proof.')
      } finally {
        setBusy(false)
      }
      return
    }

    if (payMethod === 'paysio') {
      openCard(invoice.amountValue, false)
      return
    }

    const cardDue = Number(invoice.cardDue || invoice.shortfall || 0)
    if (cardDue > 0.009) {
      openCard(cardDue, true)
      return
    }

    setBusy(true)
    setError('')
    try {
      const result = await tapstackApi.vendorPayInvoice(token, 'wallet')
      setInvoice(result.invoice)
      if (result.paid) onPaid(result.invoice)
    } catch (err) {
      if (shouldOpenVerifyFromApiError(err)) {
        onVerifyRequired()
        return
      }
      if (err instanceof ApiError && err.code === 'tapstack_insufficient') {
        const due = Number(err.data?.cardDue || err.data?.shortfall || invoice.cardDue || 0)
        openCard(due || invoice.amountValue, true)
        return
      }
      setError(err instanceof ApiError ? err.message : 'Could not pay invoice.')
    } finally {
      setBusy(false)
    }
  }

  async function afterCardPay() {
    setCardOpen(false)
    try {
      const fresh = await load()
      setInvoice(fresh)
      if (fresh.status === 'paid') onPaid(fresh)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Card charged, but the invoice did not finish. Refresh and try again.')
    }
  }

  const paid = invoice?.status === 'paid'
  const reviewing = invoice?.status === 'review'
  const short = invoice && !paid && !reviewing ? Number(invoice.shortfall || invoice.cardDue || 0) : 0
  const fromName = invoice?.distributor.name || 'Distributor'
  const balanceLabel = invoice?.wallet?.formatted || '$0.00'
  const covered = invoice && !paid && !reviewing && short <= 0
  const payLabel =
    payMethod === 'custom'
      ? 'Submit payment proof'
      : payMethod === 'paysio'
        ? `Pay ${invoice?.amount || ''} by card`
        : short > 0
          ? `Pay ${balanceLabel} + $${short.toFixed(2)} card`
          : `Pay ${invoice?.amount || ''} from balance`

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
              <span className={`inv-status inv-status--${paid ? 'paid' : reviewing ? 'review' : 'due'}`}>
                {paid ? 'Paid' : reviewing ? 'Waiting on confirmation' : 'Awaiting payment'}
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
              {short > 0 && payMethod === 'wallet' ? (
                <div>
                  <dt>Card remainder</dt>
                  <dd>${short.toFixed(2)}</dd>
                </div>
              ) : null}
            </dl>
            {invoice.claimRejected && !paid && !reviewing ? (
              <p className="inv-pay-error">{invoice.claimRejected}</p>
            ) : null}
            {covered ? (
              <p className="inv-pay-notice">Your TapStack balance covers this invoice.</p>
            ) : null}
          </section>

          <aside className="inv-sheet-side">
            <div className="inv-qr-frame">
              {invoice.qrUrl ? <img src={invoice.qrUrl} alt="Invoice payment QR code" /> : null}
              <p>Keep this private pay link for your records.</p>
            </div>
            {paid ? (
              <p className="inv-pay-notice">
                {invoice.payRail === 'custom'
                  ? 'Distributor confirmed your off-platform payment.'
                  : invoice.payRail === 'paysio'
                    ? 'Paid by card.'
                    : invoice.payRail === 'split'
                      ? 'Paid from TapStack balance plus card.'
                      : 'Paid from your TapStack balance.'}
              </p>
            ) : reviewing ? (
              <div className="inv-claim-wait">
                <p className="inv-pay-notice">Submitted. Waiting for the distributor to confirm.</p>
                {invoice.claimNote ? <p className="inv-claim-note">{invoice.claimNote}</p> : null}
                {invoice.claimSlipUrl ? (
                  <a className="inv-claim-slip" href={invoice.claimSlipUrl} target="_blank" rel="noreferrer">
                    View attached slip
                  </a>
                ) : null}
              </div>
            ) : (
              <div className="inv-pay-actions">
                <div className="inv-pay-methods" role="radiogroup" aria-label="Payment method">
                  <button
                    type="button"
                    className={`inv-pay-method${payMethod === 'wallet' ? ' is-active' : ''}`}
                    onClick={() => setPayMethod('wallet')}
                  >
                    <strong>TapStack balance</strong>
                    <small>
                      {short > 0
                        ? `${balanceLabel} now, $${short.toFixed(2)} by card`
                        : `Use ${balanceLabel}`}
                    </small>
                  </button>
                  <button
                    type="button"
                    className={`inv-pay-method${payMethod === 'paysio' ? ' is-active' : ''}`}
                    onClick={() => setPayMethod('paysio')}
                  >
                    <strong>Pay by card</strong>
                    <small>Charge the full {invoice.amount} with Paysio</small>
                  </button>
                  <button
                    type="button"
                    className={`inv-pay-method${payMethod === 'custom' ? ' is-active' : ''}`}
                    onClick={() => setPayMethod('custom')}
                  >
                    <strong>Venmo, PayPal, other</strong>
                    <small>Send proof for the distributor to confirm</small>
                  </button>
                </div>
                {payMethod === 'custom' ? (
                  <div className="inv-claim-form">
                    <label className="inv-claim-label" htmlFor="inv-claim-note">
                      How did you pay?
                    </label>
                    <textarea
                      id="inv-claim-note"
                      className="inv-claim-input"
                      rows={3}
                      maxLength={280}
                      placeholder="I paid $135 on Venmo to @distributor"
                      value={claimNote}
                      onChange={(event) => setClaimNote(event.target.value)}
                    />
                    <label className="inv-claim-label" htmlFor="inv-claim-file">
                      Screenshot or slip
                    </label>
                    <input
                      id="inv-claim-file"
                      className="inv-claim-file"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={(event) => setClaimFile(event.target.files?.[0] || null)}
                    />
                    {claimFile ? <p className="inv-claim-file-name">{claimFile.name}</p> : null}
                    <ImageAgreementCheckbox checked={claimAgreed} onChange={setClaimAgreed} />
                  </div>
                ) : null}
                <button type="button" className="inv-pay-btn" disabled={busy} onClick={() => void payNow()}>
                  {busy ? (payMethod === 'custom' ? 'Submitting…' : 'Paying…') : payLabel}
                </button>
              </div>
            )}
          </aside>
        </article>
      ) : !error ? (
        <p className="inv-pay-empty">Loading invoice…</p>
      ) : null}

      <TopUpModal
        open={cardOpen}
        onClose={() => setCardOpen(false)}
        ownerType="vendor"
        title={cardMix ? 'Pay the remainder' : 'Pay invoice'}
        initialAmount={cardAmount}
        lockAmount
        startOnPay
        hideCrypto
        purpose="invoice"
        invoiceToken={token}
        invoiceMix={cardMix}
        copy={
          cardMix
            ? `We'll take ${balanceLabel} from your TapStack balance and charge $${cardAmount.toFixed(2)} on this card.`
            : `Charge ${invoice?.amount || ''} on this card. Your TapStack balance stays as-is.`
        }
        submitLabel={`Pay $${cardAmount.toFixed(2)}`}
        onVerifyRequired={onVerifyRequired}
        onSuccess={() => {
          void afterCardPay()
        }}
      />
    </div>
  )
}
