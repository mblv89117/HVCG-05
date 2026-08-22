import type { AtlasModule, KnowledgeUser } from './types'
import { KNOWLEDGE_CATALOG, REFERENCE_TODAY } from './catalog'
import { suggestKnowledge } from './contextual'
import './knowledge-rail.css'

export function ModuleKnowledgeRail({
  module,
  user,
  clientCode,
  title = 'Related knowledge',
  knowledgeBaseUrl,
}: {
  module: AtlasModule
  user: KnowledgeUser
  clientCode?: string
  title?: string
  /** Optional deep-link base to Knowledge Platform article routes */
  knowledgeBaseUrl?: string
}) {
  const suggestions = suggestKnowledge(
    user,
    KNOWLEDGE_CATALOG,
    { module, clientCode, limit: 5 },
    REFERENCE_TODAY,
  )

  return (
    <aside className="hvcg-knowledge-rail" data-testid="module-knowledge-rail" aria-label={title}>
      <div className="hvcg-knowledge-rail__head">
        <p className="hvcg-knowledge-rail__eyebrow">Knowledge</p>
        <h3>{title}</h3>
        <p className="hvcg-knowledge-rail__sub">
          Approved · {module}
          {clientCode ? ` · ${clientCode}` : ''} · org {user.organizationId}
        </p>
      </div>
      {suggestions.length === 0 ? (
        <p className="hvcg-knowledge-rail__empty">No approved knowledge for this context and role.</p>
      ) : (
        <ul className="hvcg-knowledge-rail__list">
          {suggestions.map((a) => {
            const href = knowledgeBaseUrl ? `${knowledgeBaseUrl.replace(/\/$/, '')}/article/${a.id}` : a.sourceUrl
            return (
              <li key={a.id}>
                <a href={href} className="hvcg-knowledge-rail__link">
                  <strong>{a.title}</strong>
                  <span>
                    {a.knowledgeType} · v{a.versionLabel} · {a.ownerEmail}
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
      )}
      <p className="hvcg-knowledge-rail__foot">Drafts and other-client knowledge are excluded.</p>
    </aside>
  )
}
