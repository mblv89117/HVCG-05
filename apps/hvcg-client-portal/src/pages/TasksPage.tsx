import { usePortal } from '../state/PortalContext'

export function TasksPage() {
  const { tasks } = usePortal()
  const client = tasks.filter((t) => t.ownerType === 'Client')
  const advisor = tasks.filter((t) => t.ownerType === 'Advisor')
  const all = tasks
  const done = all.filter((t) => t.status === 'Done').reduce((s, t) => s + t.weight, 0)
  const total = all.reduce((s, t) => s + t.weight, 0) || 1
  const pct = Math.round((done / total) * 100)

  function Table({ rows }: { rows: typeof tasks }) {
    return (
      <table className="table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Owner</th>
            <th>Due</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id}>
              <td>{t.title}</td>
              <td>{t.ownerType}</td>
              <td>{t.dueDate}</td>
              <td>
                <span className={`badge ${t.status === 'Done' ? 'ok' : t.status === 'Open' ? 'warn' : ''}`}>
                  {t.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  const nextActions = tasks.filter((t) => t.nextAction && t.status !== 'Done')

  return (
    <div>
      <div className="page-head">
        <h2>Task Center</h2>
        <p>Client and advisor tasks with due dates, next actions, and progress indicators.</p>
      </div>

      {nextActions.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem', background: '#e8f1eb' }}>
          <h3>Next actions</h3>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {nextActions.map((t) => (
              <li key={t.id}>
                <strong>{t.title}</strong>
                <div className="muted">
                  {t.ownerType} · {t.dueDate}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3>Overall completion</h3>
        <div className="stat">
          <span className="value">{pct}%</span>
          <div className="progress" style={{ marginTop: '0.55rem' }}>
            <span style={{ width: `${pct}%` }} />
          </div>
          <p className="muted" style={{ marginTop: '0.45rem' }}>
            Weighted by task importance · {all.filter((t) => t.status === 'Done').length}/{all.length} done
          </p>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3>Client tasks</h3>
          <Table rows={client} />
        </div>
        <div className="card">
          <h3>Advisor tasks</h3>
          <Table rows={advisor} />
        </div>
      </div>
    </div>
  )
}
