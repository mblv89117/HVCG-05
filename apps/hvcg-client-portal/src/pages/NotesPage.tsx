import { usePortal } from '../state/PortalContext'

export function NotesPage() {
  const { notes, activeClient, canViewInternal } = usePortal()
  return (
    <div>
      <div className="page-head">
        <h2>Notes</h2>
        <p>
          Client-visible notes for {activeClient.name}. Internal HVCG notes are hidden unless your role is HVCG Owner,
          HVCG Team Member, or Administrator{canViewInternal ? ' (visible now)' : ''}.
        </p>
      </div>
      <div className="grid cols-2">
        {notes.map((n) => (
          <div className="card" key={n.id}>
            <h3>{n.title}</h3>
            <p>{n.body}</p>
            <p className="muted">
              {n.author} · {n.visibility} · {new Date(n.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
        {notes.length === 0 && <div className="card muted">No visible notes.</div>}
      </div>
    </div>
  )
}
