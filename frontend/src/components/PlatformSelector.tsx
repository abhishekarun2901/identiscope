import { useEffect, useState } from 'react'
import { getPlatforms } from '../api/client'
import type { Platform } from '../api/client'

interface PlatformSelectorProps {
  selected: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

export default function PlatformSelector({ selected, onChange, disabled }: PlatformSelectorProps) {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    getPlatforms()
      .then(p => { setPlatforms(p); setLoading(false) })
      .catch(() => { setError('Could not load platforms. Is the backend running?'); setLoading(false) })
  }, [])

  const toggle = (id: string) => {
    if (disabled) return
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])
  }

  const selectAll = () => { if (!disabled) onChange(platforms.map(p => p.id)) }
  const deselectAll = () => { if (!disabled) onChange([]) }

  const filtered = platforms.filter(p =>
    p.name.toLowerCase().includes(filter.toLowerCase())
  )

  if (loading) return (
    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '1rem 0' }}>
      Loading platforms…
    </div>
  )

  if (error) return (
    <div style={{ color: 'var(--status-not-found)', fontSize: '0.875rem', padding: '0.5rem 0' }}>
      ⚠ {error}
    </div>
  )

  return (
    <div>
      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
        <input
          className="input-field"
          placeholder="Filter platforms…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          disabled={disabled}
          style={{ maxWidth: 200, fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
          aria-label="Filter platforms"
        />
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {selected.length === 0 ? 'All platforms' : `${selected.length} selected`}
        </span>
        <button
          onClick={selectAll}
          disabled={disabled}
          style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 8, padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500 }}
        >
          Select All
        </button>
        <button
          onClick={deselectAll}
          disabled={disabled}
          style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 8, padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500 }}
        >
          Clear
        </button>
      </div>

      {/* Platform grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.5rem', maxHeight: 320, overflowY: 'auto', paddingRight: '0.25rem' }}>
        {filtered.map(p => {
          const isSelected = selected.includes(p.id)
          return (
            <div
              key={p.id}
              className={`platform-tile ${isSelected ? 'selected' : ''}`}
              onClick={() => toggle(p.id)}
              role="checkbox"
              aria-checked={isSelected}
              tabIndex={0}
              onKeyDown={e => e.key === ' ' && toggle(p.id)}
            >
              <img
                src={p.icon_url}
                alt={p.name}
                width={16}
                height={16}
                style={{ opacity: 0.85 }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </span>
              {isSelected && <span style={{ color: 'var(--accent-cyan)', fontSize: '0.7rem' }}>✓</span>}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', gridColumn: '1/-1', padding: '0.5rem' }}>
            No platforms match your filter.
          </div>
        )}
      </div>

      {selected.length === 0 && (
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          💡 No platforms selected = scan all {platforms.length} platforms
        </p>
      )}
    </div>
  )
}
