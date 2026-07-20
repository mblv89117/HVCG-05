import { usePortal } from '../state/PortalContext'

function moneyOrPending(amount: number | null) {
  if (amount === null) return 'Awaiting verified data'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function InvoicesPage() {
  const { invoices, activeClient } = usePortal()
  const openBalance = invoices
    .filter((invoice) => invoice.status === 'Open' || invoice.status === 'Overdue')
    .reduce((total, invoice) => total + (invoice.amount ?? 0), 0)
  const hasVerifiedAmounts = invoices.some((invoice) => invoice.amount !== null)

  return (
    <div>
      <div className="page-head">
        <h2>Invoices</h2>
        <p>
          Billing view for {activeClient.name}. No accounting system or payment processor is connected. Unverified
          amounts are not displayed as currency.
        </p>
      </div>

      <div className="grid cols-3" style={{ marginBottom: '1rem' }}>
        <div className="card stat">
          <span className="label">Open balance</span>
          <span className="value" style={{ fontSize: '1.1rem' }}>
            {hasVerifiedAmounts ? moneyOrPending(openBalance) : 'Awaiting verified data'}
          </span>
        </div>
        <div className="card stat">
          <span className="label">Paid invoices</span>
          <span className="value">{invoices.filter((invoice) => invoice.status === 'Paid').length}</span>
        </div>
        <div className="card stat">
          <span className="label">Past due</span>
          <span className="value">{invoices.filter((invoice) => invoice.status === 'Overdue').length}</span>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Description</th>
              <th>Issued</th>
              <th>Due</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Availability</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.invoiceNumber}</td>
                <td>{invoice.description}</td>
                <td>{invoice.issuedDate}</td>
                <td>{invoice.dueDate}</td>
                <td>
                  <strong>{moneyOrPending(invoice.amount)}</strong>
                </td>
                <td>
                  <span
                    className={`badge ${invoice.status === 'Paid' ? 'ok' : invoice.status === 'Overdue' ? 'danger' : 'warn'}`}
                  >
                    {invoice.status}
                  </span>
                </td>
                <td className="muted">{invoice.availability}</td>
                <td>
                  <button className="btn ghost" type="button" disabled={!invoice.downloadUrl} title="Mock invoice PDF">
                    {invoice.downloadUrl ? 'View PDF (mock)' : 'Not issued'}
                  </button>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={8} className="muted">
                  No invoices available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
