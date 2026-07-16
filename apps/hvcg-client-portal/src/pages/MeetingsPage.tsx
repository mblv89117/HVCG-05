import { useState } from 'react'
import { usePortal } from '../state/PortalContext'
import { integrations } from '../integrations/mockIntegrations'

export function MeetingsPage() {
  const { meetings, advisor } = usePortal()
  const [note, setNote] = useState('')

  async function book() {
    const slot = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString()
    const res = await integrations.mockBookMeeting(slot)
    setNote(`Mock booking reserved with ${advisor.name}: ${new Date(res.slot).toLocaleString()}`)
  }

  return (
    <div>
      <div className="page-head">
        <h2>Upcoming Meetings</h2>
        <p>Teams-ready meeting list with mocked Book a Meeting scheduling.</p>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <button className="btn" onClick={book}>
          Book a meeting (mock)
        </button>
        {note && <p className="muted" style={{ marginTop: '0.65rem' }}>{note}</p>}
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Meeting</th>
              <th>When</th>
              <th>Location</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {meetings.map((m) => (
              <tr key={m.id}>
                <td>{m.title}</td>
                <td>{new Date(m.startsAt).toLocaleString()}</td>
                <td>{m.location}</td>
                <td>
                  {m.joinUrl ? (
                    <a className="btn secondary" href={m.joinUrl} onClick={(e) => e.preventDefault()}>
                      Join (mock)
                    </a>
                  ) : (
                    <span className="muted">Pending link</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
