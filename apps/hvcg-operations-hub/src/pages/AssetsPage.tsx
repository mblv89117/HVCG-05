import { PageHeader, Section, StatusPill } from '../components/Ui'
import { useOps } from '../state/OpsContext'

export function AssetsPage() {
  const { data } = useOps()
  return (
    <div className="page-stack">
      <PageHeader eyebrow="Asset management" title="Asset inventory" description="Devices and equipment with assignee and location — mock asset register." />
      <Section title="Assets" subtitle={`${data.assets.length} items`}>
        <div className="table-wrap">
          <table data-testid="assets-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Type</th>
                <th>Assignee</th>
                <th>Location</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.assets.map((asset) => (
                <tr key={asset.id}>
                  <td>{asset.name}</td>
                  <td>{asset.type}</td>
                  <td>{asset.assignee}</td>
                  <td>{asset.location}</td>
                  <td>
                    <StatusPill
                      label={asset.status}
                      tone={asset.status === 'In use' || asset.status === 'Available' ? 'positive' : asset.status === 'Maintenance' ? 'warning' : 'neutral'}
                    />
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
