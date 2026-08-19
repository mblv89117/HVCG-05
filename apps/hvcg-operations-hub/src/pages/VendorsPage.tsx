import { PageHeader, Section, StatusPill } from '../components/Ui'
import { useOps } from '../state/OpsContext'

export function VendorsPage() {
  const { data } = useOps()
  return (
    <div className="page-stack">
      <PageHeader eyebrow="Vendor management" title="Vendor register" description="Vendors, renewals, spend, and owners — mock vendor management." />
      <Section title="Vendors" subtitle={`${data.vendors.length} vendors`}>
        <div className="table-wrap">
          <table data-testid="vendors-table">
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Category</th>
                <th>Owner</th>
                <th>Renewal</th>
                <th>Spend</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.vendors.map((vendor) => (
                <tr key={vendor.id}>
                  <td>{vendor.name}</td>
                  <td>{vendor.category}</td>
                  <td>{vendor.owner}</td>
                  <td>{vendor.renewal}</td>
                  <td>{vendor.spend}</td>
                  <td>
                    <StatusPill label={vendor.status} tone={vendor.status === 'Active' ? 'positive' : vendor.status === 'Review' ? 'warning' : 'neutral'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}
