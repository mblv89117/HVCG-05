import { usePortal } from '../state/PortalContext'

export function ContactsPage() {
  const { contacts, activeClient } = usePortal()
  return (
    <div>
      <div className="page-head">
        <h2>Contacts</h2>
        <p>Verified contacts for {activeClient.name}. Unverified emails show as pending.</p>
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Organization</th>
              <th>Title</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.role}</td>
                <td>{c.organization}</td>
                <td>{c.title}</td>
                <td className="muted">{c.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
