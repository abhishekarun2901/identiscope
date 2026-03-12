import { useState, useMemo, Fragment } from 'react'
import type { ScanResult } from '../api/client'
import { normaliseStatus } from '../api/client'
import StatusBadge from './StatusBadge'

interface ResultsTableProps {
  results: ScanResult[]
  total: number
}

type FilterStatus = 'all' | 'found' | 'not_found' | 'uncertain'

export default function ResultsTable({ results, total }: ResultsTableProps) {
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [sortBy, setSortBy] = useState<'platform' | 'identity' | 'status'>('status')

  const counts = useMemo(() => {
    const normed = results.map(r => normaliseStatus(r.status))
    return {
      all:       results.length,
      found:     normed.filter(s => s === 'found').length,
      not_found: normed.filter(s => s === 'not_found').length,
      uncertain: normed.filter(s => s === 'uncertain').length,
    }
  }, [results])

  const filtered = useMemo(() => {
    let arr = results.map(r => ({ ...r, status: normaliseStatus(r.status) as ScanResult['status'] }))
    if (filter !== 'all') arr = arr.filter(r => r.status === filter)
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      arr = arr.filter(r => r.platform.toLowerCase().includes(q) || r.identity.toLowerCase().includes(q))
    }
    return [...arr].sort((a, b) => {
      if (sortBy === 'platform') return a.platform.localeCompare(b.platform)
      if (sortBy === 'identity') return a.identity.localeCompare(b.identity)
      const order = { found: 0, uncertain: 1, not_found: 2, error: 3 }
      return (order[a.status] ?? 4) - (order[b.status] ?? 4)
    })
  }, [results, filter, searchTerm, sortBy])

  const toggleExpand = (i: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const filterBtns: { key: FilterStatus; label: string; color?: string }[] = [
    { key: 'all',       label: `All (${counts.all})` },
    { key: 'found',     label: `✓ Found (${counts.found})`,         color: 'var(--status-found)' },
    { key: 'not_found', label: `✕ Not Found (${counts.not_found})`, color: 'var(--status-not-found)' },
    { key: 'uncertain', label: `? Uncertain (${counts.uncertain})`, color: 'var(--status-uncertain)' },
  ]

  return (
    <div className="fade-in-up">
      {/* Summary cards */}
      <div className="stat-cards">
        {[
          { label: 'Total Checks', value: total, color: 'var(--accent-cyan)' },
          { label: 'Found', value: counts.found, color: 'var(--status-found)' },
          { label: 'Not Found', value: counts.not_found, color: 'var(--status-not-found)' },
          { label: 'Uncertain', value: counts.uncertain, color: 'var(--status-uncertain)' },
        ].map(card => (
          <div key={card.label} className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.875rem', alignItems: 'center' }}>
        {filterBtns.map(btn => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            style={{
              background: filter === btn.key ? 'var(--bg-card-hover)' : 'var(--bg-card)',
              border: `1px solid ${filter === btn.key ? (btn.color ?? 'var(--accent-cyan)') : 'var(--border)'}`,
              color: filter === btn.key ? (btn.color ?? 'var(--text-primary)') : 'var(--text-secondary)',
              borderRadius: 8, padding: '0.3rem 0.75rem', cursor: 'pointer',
              fontSize: '0.78rem', fontWeight: 500, transition: 'all 0.15s',
            }}
          >
            {btn.label}
          </button>
        ))}
        <input
          className="input-field"
          placeholder="Search platform or identity…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ maxWidth: 220, fontSize: '0.8rem', padding: '0.3rem 0.75rem', marginLeft: 'auto' }}
          aria-label="Search results"
        />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', borderRadius: 8, padding: '0.3rem 0.5rem',
            fontSize: '0.78rem', cursor: 'pointer', outline: 'none',
          }}
          aria-label="Sort results"
        >
          <option value="status">Sort: Status</option>
          <option value="platform">Sort: Platform</option>
          <option value="identity">Sort: Identity</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Platform</th>
              <th>Identity</th>
              <th>Type</th>
              <th>Status</th>
              <th>Profile Link</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  No results match the current filter.
                </td>
              </tr>
            )}
            {filtered.map((r, i) => (
              <Fragment key={`${r.platform_id}-${r.identity}-${i}`}>
                <tr>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <img
                        src={r.platform_icon}
                        alt={r.platform}
                        width={16}
                        height={16}
                        style={{ opacity: 0.85, flexShrink: 0 }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{r.platform}</span>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.identity}</td>
                  <td>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase',
                      letterSpacing: '0.04em', color: 'var(--text-muted)',
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: 6, padding: '0.15rem 0.5rem',
                    }}>
                      {r.identity_type}
                    </span>
                  </td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>
                    {r.profile_url ? (
                      <a
                        href={r.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--accent-cyan)', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 500 }}
                      >
                        View Profile →
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                    )}
                  </td>
                  <td>
                    {r.snippet && (
                      <button
                        onClick={() => toggleExpand(i)}
                        style={{
                          background: 'none', border: '1px solid var(--border)',
                          color: 'var(--text-muted)', borderRadius: 6,
                          padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.72rem',
                        }}
                      >
                        {expandedRows.has(i) ? 'Hide' : 'Show'}
                      </button>
                    )}
                    {!r.snippet && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>}
                  </td>
                </tr>
                {expandedRows.has(i) && r.snippet && (
                  <tr style={{ background: 'var(--bg-card)' }}>
                    <td colSpan={6} style={{ padding: '0.75rem 1rem' }}>
                      <pre style={{
                        fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        maxHeight: 120, overflowY: 'auto',
                        background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '0.5rem',
                        fontFamily: 'monospace',
                      }}>
                        HTTP {r.status_code} — {r.snippet}
                      </pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
