import { useMemo, useState } from 'react'
import { EmptyState, PageHeader, Section, StatusPill } from '../components/Ui'
import { useOps } from '../state/OpsContext'

const approvalTone = {
  Approved: 'positive',
  'Pending review': 'warning',
  Draft: 'neutral',
  'Needs update': 'critical',
} as const

export function SopPage() {
  const { data, sopQuery, setSopQuery, sopCategory, setSopCategory, favoriteOnly, setFavoriteOnly } = useOps()
  const [selectedId, setSelectedId] = useState(data.sops[0]?.id ?? '')
  const categories = useMemo(() => ['All', ...Array.from(new Set(data.sops.map((sop) => sop.category)))], [data.sops])

  const filtered = data.sops.filter((sop) => {
    const matchesQuery = `${sop.title} ${sop.summary} ${sop.category}`.toLowerCase().includes(sopQuery.toLowerCase())
    const matchesCategory = sopCategory === 'All' || sop.category === sopCategory
    const matchesFavorite = !favoriteOnly || sop.favorite
    return matchesQuery && matchesCategory && matchesFavorite
  })

  const selected = filtered.find((sop) => sop.id === selectedId) ?? filtered[0]
  const recent = [...data.sops].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3)

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="SOP library"
        title="Standard operating procedures"
        description="Search, filter, favorites, approval state, and mock version history."
      />

      <div className="toolbar">
        <label className="search inline">
          <input
            aria-label="Search SOPs"
            placeholder="Search SOPs…"
            value={sopQuery}
            onChange={(event) => setSopQuery(event.target.value)}
            data-testid="sop-search"
          />
        </label>
        <label>
          Category
          <select aria-label="SOP category" value={sopCategory} onChange={(event) => setSopCategory(event.target.value)}>
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={favoriteOnly} onChange={(event) => setFavoriteOnly(event.target.checked)} aria-label="Favorites only" />
          Favorites only
        </label>
      </div>

      <div className="split-grid sop-layout">
        <Section title="Library" subtitle={`${filtered.length} documents`}>
          {filtered.length === 0 ? (
            <EmptyState message="No SOPs match the current filters." />
          ) : (
            <ul className="item-list selectable" data-testid="sop-list">
              {filtered.map((sop) => (
                <li key={sop.id}>
                  <button type="button" className={selected?.id === sop.id ? 'selected' : undefined} onClick={() => setSelectedId(sop.id)}>
                    <div>
                      <strong>
                        {sop.favorite ? '★ ' : ''}
                        {sop.title}
                      </strong>
                      <span>
                        {sop.category} · v{sop.version} · {sop.updatedAt}
                      </span>
                    </div>
                    <StatusPill label={sop.approval} tone={approvalTone[sop.approval]} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Detail & history" subtitle={selected ? selected.title : 'Select an SOP'}>
          {selected ? (
            <div className="sop-detail" data-testid="sop-detail">
              <p>{selected.summary}</p>
              <p>
                <strong>Owner:</strong> {selected.owner}
              </p>
              <StatusPill label={selected.approval} tone={approvalTone[selected.approval]} />
              <h3>Version history</h3>
              <ul className="simple-list">
                {selected.history.map((entry) => (
                  <li key={`${entry.version}-${entry.date}`}>
                    <strong>v{entry.version}</strong> · {entry.date} · {entry.author} — {entry.note}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState message="Select an SOP to view history." />
          )}
        </Section>
      </div>

      <Section title="Recently updated" subtitle="Last three changes">
        <ul className="item-list">
          {recent.map((sop) => (
            <li key={sop.id}>
              <div>
                <strong>{sop.title}</strong>
                <span>
                  {sop.updatedAt} · {sop.owner}
                </span>
              </div>
              <StatusPill label={`v${sop.version}`} tone="accent" />
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}
