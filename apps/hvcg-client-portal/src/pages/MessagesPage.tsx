import { useMemo, useState } from 'react'
import { usePortal } from '../state/PortalContext'

export function MessagesPage() {
  const { threads, messages, notifications } = usePortal()
  const [activeId, setActiveId] = useState(threads[0]?.id ?? '')
  const [draft, setDraft] = useState('')
  const [local, setLocal] = useState(messages)

  const activeMessages = useMemo(
    () => local.filter((m) => m.threadId === activeId).sort((a, b) => a.sentAt.localeCompare(b.sentAt)),
    [local, activeId],
  )

  function send() {
    if (!draft.trim() || !activeId) return
    setLocal((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        threadId: activeId,
        sender: 'You',
        direction: 'ClientToHVCG',
        body: draft.trim(),
        sentAt: new Date().toISOString(),
      },
    ])
    setDraft('')
  }

  return (
    <div>
      <div className="page-head">
        <h2>Messages</h2>
        <p>Internal secure messaging with conversation history, attachments, and notifications. External email remains Off.</p>
      </div>

      <div className="grid cols-3" style={{ marginBottom: '1rem' }}>
        {notifications.slice(0, 3).map((n) => (
          <div key={n.id} className="card">
            <strong>{n.title}</strong>
            <p className="muted">{n.body}</p>
            {!n.read && <span className="badge warn">Unread</span>}
          </div>
        ))}
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3>Conversations</h3>
          <div className="thread-list">
            {threads.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`thread${t.id === activeId ? ' active' : ''}`}
                onClick={() => setActiveId(t.id)}
              >
                <div className="subject">{t.subject}</div>
                <div className="muted">
                  {new Date(t.updatedAt).toLocaleString()}
                  {t.unread ? ` · ${t.unread} unread` : ''}
                </div>
              </button>
            ))}
            {threads.length === 0 && <p className="muted">No threads for this client.</p>}
          </div>
        </div>
        <div className="card message-pane">
          <h3>Conversation</h3>
          {activeMessages.map((m) => (
            <div key={m.id} className={`bubble${m.direction === 'ClientToHVCG' ? ' out' : ''}`}>
              <div className="muted" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                {m.sender} · {new Date(m.sentAt).toLocaleString()}
              </div>
              <div>{m.body}</div>
              {m.attachmentName && (
                <div className="muted" style={{ marginTop: '0.35rem' }}>
                  Attachment: {m.attachmentName}
                </div>
              )}
            </div>
          ))}
          <div className="composer">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a secure message…"
              aria-label="Message composer"
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn" onClick={send} disabled={!draft.trim()}>
                Send
              </button>
              <button className="btn ghost" type="button" disabled title="Mock only">
                Attach file (mock)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
