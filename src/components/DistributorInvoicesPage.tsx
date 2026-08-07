import { useMemo, useState } from 'react'
import { TapStackLogo } from './TapStackLogo'
import './DistributorDashboard.css'

type InvoiceFilter = 'all' | 'draft' | 'sent' | 'paid' | 'overdue'
type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue'

const INVOICE_FILTERS: { id: InvoiceFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'sent', label: 'Sent' },
  { id: 'paid', label: 'Paid' },
  { id: 'overdue', label: 'Overdue' },
]

type DistributorInvoice = {
  id: string
  invoiceId: string
  vendor: string
  status: InvoiceStatus
  description: string
  amount: string
  dueDate: string
  attachments?: number
}

const INVOICES: DistributorInvoice[] = [
  {
    id: 'inv-001',
    invoiceId: 'INV-001',
    vendor: 'Lucky Strike Arcade',
    status: 'sent',
    description: 'Dec Management Fee',
    amount: '$450.00',
    dueDate: 'Due Jan 15',
    attachments: 2,
  },
  {
    id: 'inv-002',
    invoiceId: 'INV-002',
    vendor: 'Pixel Palace Arcade',
    status: 'overdue',
    description: 'Q4 Platform Services',
    amount: '$820.00',
    dueDate: 'Due Jan 10',
  },
  {
    id: 'inv-003',
    invoiceId: 'INV-003',
    vendor: 'Nova Game Zone',
    status: 'paid',
    description: 'Nov Management Fee',
    amount: '$380.00',
    dueDate: 'Due Dec 31',
    attachments: 1,
  },
  {
    id: 'inv-004',
    invoiceId: 'INV-004',
    vendor: 'Galaxy Tokens',
    status: 'draft',
    description: 'Dec Management Fee',
    amount: '$200.00',
    dueDate: 'Due Jan 20',
  },
]

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
}

function DistributorInvoicesHeader() {
  return (
    <header className="distributor-dash-header">
      <div className="distributor-dash-header-row">
        <TapStackLogo height={40} />
        <button type="button" className="distributor-dash-avatar" aria-label="Distributor profile">
          PG
        </button>
      </div>
    </header>
  )
}

function InvoiceCard({ invoice }: { invoice: DistributorInvoice }) {
  return (
    <article className="distributor-invoice-card">
      <div className="distributor-invoice-top">
        <div className="distributor-invoice-id-block">
          <span className="distributor-invoice-doc-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path d="M14 2v6h6M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </span>
          <div>
            <p className="distributor-invoice-id">{invoice.invoiceId}</p>
            <p className="distributor-invoice-vendor">{invoice.vendor}</p>
          </div>
        </div>
        <span className={`distributor-invoice-status distributor-invoice-status--${invoice.status}`}>
          {STATUS_LABELS[invoice.status]}
        </span>
      </div>

      <div className="distributor-invoice-body">
        <div className="distributor-invoice-desc-row">
          <p className="distributor-invoice-desc">{invoice.description}</p>
          {invoice.attachments ? (
            <span className="distributor-invoice-attach" aria-label={`${invoice.attachments} attachments`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {invoice.attachments}
            </span>
          ) : null}
        </div>

        <div className="distributor-invoice-amount-block">
          <p className="distributor-invoice-amount">{invoice.amount}</p>
          <p className="distributor-invoice-due">{invoice.dueDate}</p>
        </div>
      </div>
    </article>
  )
}

export default function DistributorInvoicesPage() {
  const [filter, setFilter] = useState<InvoiceFilter>('all')

  const filteredInvoices = useMemo(() => {
    if (filter === 'all') return INVOICES
    return INVOICES.filter((invoice) => invoice.status === filter)
  }, [filter])

  return (
    <div className="distributor-invoices-page">
      <DistributorInvoicesHeader />

      <section className="distributor-invoices-toolbar">
        <div>
          <h1 className="distributor-invoices-title">Invoices</h1>
          <p className="distributor-invoices-subtitle">Bill vendors · track payments</p>
        </div>
        <button type="button" className="distributor-invoices-create-btn">
          + Create
        </button>
      </section>

      <div className="distributor-invoices-filters" role="tablist" aria-label="Invoice filters">
        {INVOICE_FILTERS.map((item) => {
          const active = filter === item.id
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`distributor-invoices-filter ${active ? 'distributor-invoices-filter--active' : ''}`}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <div className="distributor-invoices-list">
        {filteredInvoices.map((invoice) => (
          <InvoiceCard key={invoice.id} invoice={invoice} />
        ))}
      </div>
    </div>
  )
}
