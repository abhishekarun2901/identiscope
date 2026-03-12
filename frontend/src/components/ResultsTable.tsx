import { useState, useMemo, Fragment } from 'react'
import type { ScanResult, EmailDomainInfo } from '../api/client'
import { normaliseStatus } from '../api/client'
import StatusBadge from './StatusBadge'

interface ResultsTableProps {
  results: ScanResult[]
  total: number
  emailDomainDetails?: EmailDomainInfo[]
}

type FilterStatus = 'all' | 'found' | 'not_found' | 'uncertain' | 'breached'

const IDENTITY_TYPES: { key: 'username' | 'email' | 'phone'; label: string }[] = [
  { key: 'username', label: '// USERNAMES' },
  { key: 'email',    label: '// EMAIL' },
  { key: 'phone',    label: '// PHONE' },
]

export default function ResultsTable({ results, total, emailDomainDetails }: ResultsTableProps) {
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'platform' | 'identity' | 'status'>('status')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const counts = useMemo(() => {
    const normed = results.map(r => normaliseStatus(r.status))
    return {
      all:       results.length,
      found:     normed.filter(s => s === 'found').length,
      not_found: normed.filter(s => s === 'not_found').length,
      uncertain: normed.filter(s => s === 'uncertain').length,
      breached:  normed.filter(s => s === 'breached').length,
    }
  }, [results])

  const filtered = useMemo(() => {
    let arr = results.map(r => ({ ...r, _norm: normaliseStatus(r.status) }))
    if (filter !== 'all') arr = arr.filter(r => r._norm === filter)
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      arr = arr.filter(r => r.platform.toLowerCase().includes(q) || r.identity.toLowerCase().includes(q))
    }
    return [...arr].sort((a, b) => {
      if (sortBy === 'platform') return a.platform.localeCompare(b.platform)
      if (sortBy === 'identity') return a.identity.localeCompare(b.identity)
      const order: Record<string, number> = { found: 0, breached: 1, uncertain: 2, not_found: 3, error: 4 }
      return (order[a._norm] ?? 5) - (order[b._norm] ?? 5)
    })
  }, [results, filter, searchTerm, sortBy])

  // Group filtered results by identity type
  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    for (const r of filtered) {
      const type = r.identity_type ?? 'username'
      if (!map.has(type)) map.set(type, [])
      map.get(type)!.push(r)
    }
    return map
  }, [filtered])

  const toggleExpand = (key: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const toggleGroup = (type: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }

  const filterBtns: { key: FilterStatus; label: string; color?: string }[] = [
    { key: 'all',       label: `All (${counts.all})` },
    { key: 'found',     label: `FOUND (${counts.found})`,          color: 'var(--status-found)' },
    { key: 'breached',  label: `⚠ BREACHED (${counts.breached})`,  color: '#fca5a5' },
    { key: 'not_found', label: `NO MATCH (${counts.not_found})`,   color: 'var(--status-not-found)' },
    { key: 'uncertain', label: `UNKNOWN (${counts.uncertain})`,    color: 'var(--status-uncertain)' },
  ]

  // Confidence badge for phone/email checks
  const ConfidenceBadge = ({ level }: { level: string }) => {
    const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
      high:   { label: 'HIGH',   color: '#4ade80', bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.25)' },
      medium: { label: 'MED',    color: '#facc15', bg: 'rgba(250,204,21,0.08)', border: 'rgba(250,204,21,0.25)' },
      low:    { label: 'LOW',    color: '#fb923c', bg: 'rgba(251,146,60,0.08)',  border: 'rgba(251,146,60,0.25)' },
    }
    const conf = map[level]
    if (!conf) return null
    return (
      <span title={`Detection confidence: ${level}`} style={{
        fontSize: '0.62rem', fontWeight: 600, color: conf.color,
        background: conf.bg, border: `1px solid ${conf.border}`,
        borderRadius: 4, padding: '0.1rem 0.4rem', display: 'inline-block',
        letterSpacing: '0.02em', whiteSpace: 'nowrap',
      }}>
        {conf.label}
      </span>
    )
  }

  const SnippetToggle = ({ rowKey, snippet }: { rowKey: string; snippet?: string }) => (
    snippet ? (
      <button
        onClick={() => toggleExpand(rowKey)}
        style={{
          background: 'none', border: '1px solid var(--border)',
          color: 'var(--text-muted)', borderRadius: 6,
          padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.72rem',
          transition: 'border-color 0.15s',
        }}
      >
        {expandedRows.has(rowKey) ? 'Hide' : 'Details'}
      </button>
    ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
  )

  const SnippetExpanded = ({ rowKey, snippet, statusCode }: { rowKey: string; snippet: string; statusCode?: number }) => (
    expandedRows.has(rowKey) ? (
      <pre className="snippet-pre">
        HTTP {statusCode} — {snippet}
      </pre>
    ) : null
  )

  // ── Desktop table row ──
  const renderTableRow = (r: (typeof filtered)[0], rowKey: string) => (
    <Fragment key={rowKey}>
      <tr>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img
              src={r.platform_icon}
              alt={r.platform}
              width={16} height={16}
              style={{ opacity: 0.85, flexShrink: 0 }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{r.platform}</span>
              {r.identity_type === 'phone' && r.platform_confidence && (
                <ConfidenceBadge level={r.platform_confidence} />
              )}
            </div>
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
        <td><SnippetToggle rowKey={rowKey} snippet={r.snippet} /></td>
      </tr>
      {r.snippet && (
        <tr style={{ background: 'var(--bg-card)' }}>
          <td colSpan={6} style={{ padding: expandedRows.has(rowKey) ? '0.75rem 1rem' : 0, transition: 'padding 0.15s' }}>
            <SnippetExpanded rowKey={rowKey} snippet={r.snippet} statusCode={r.status_code} />
          </td>
        </tr>
      )}
    </Fragment>
  )

  // ── Mobile card ──
  const renderMobileCard = (r: (typeof filtered)[0], rowKey: string) => (
    <div key={rowKey} className="result-card-mobile glass-card">
      <div className="result-card-mobile-header">
        <img
          src={r.platform_icon}
          alt={r.platform}
          width={18} height={18}
          style={{ opacity: 0.9, flexShrink: 0 }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1 }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{r.platform}</span>
          {r.identity_type === 'phone' && r.platform_confidence && (
            <ConfidenceBadge level={r.platform_confidence} />
          )}
        </div>
        <StatusBadge status={r.status} />
      </div>
      <div className="result-card-mobile-identity">{r.identity}</div>
      <div className="result-card-mobile-footer">
        {r.profile_url && (
          <a
            href={r.profile_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent-cyan)', fontSize: '0.82rem', textDecoration: 'none', fontWeight: 500 }}
          >
            View Profile →
          </a>
        )}
        <SnippetToggle rowKey={rowKey} snippet={r.snippet} />
      </div>
      {r.snippet && (
        <SnippetExpanded rowKey={rowKey} snippet={r.snippet} statusCode={r.status_code} />
      )}
    </div>
  )

  return (
    <div className="fade-in-up">
      {/* Summary cards */}
      <div className="stat-cards">
        {[
          { label: 'Total Checks', value: total,            color: 'var(--accent-cyan)' },
          { label: 'Found',        value: counts.found,     color: 'var(--status-found)' },
          { label: 'Breached',     value: counts.breached,  color: '#fca5a5' },
          { label: 'Not Found',    value: counts.not_found, color: 'var(--status-not-found)' },
        ].map(card => (
          <div key={card.label} className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Filters + Search row */}
      <div className="filter-bar" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
        <div className="filter-btn-group" style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', flex: 1 }}>
          {filterBtns.map(btn => (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              style={{
                background: filter === btn.key ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                border: `1px solid ${filter === btn.key ? (btn.color ?? 'var(--accent-cyan)') : 'var(--border)'}`,
                color: filter === btn.key ? (btn.color ?? 'var(--text-primary)') : 'var(--text-secondary)',
                borderRadius: 8, padding: '0.3rem 0.7rem', cursor: 'pointer',
                fontSize: '0.78rem', fontWeight: 500, transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
        <input
          className="input-field"
          placeholder="Search platform or identity…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ maxWidth: 220, fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
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

      {/* Grouped Results by Identity Type */}
      {IDENTITY_TYPES.map(({ key, label }) => {
        const groupRows = groups.get(key)
        if (!groupRows || groupRows.length === 0) return null
        const isCollapsed = collapsedGroups.has(key)

        return (
          <div key={key} style={{ marginBottom: '1.25rem' }}>
            {/* Group header */}
            <button
              className="group-header-btn"
              onClick={() => toggleGroup(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                width: '100%', background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: isCollapsed ? 10 : '10px 10px 0 0',
                padding: '0.625rem 1rem', cursor: 'pointer', textAlign: 'left',
                color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 600,
                transition: 'background 0.15s',
              }}
            >
              <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>{label}</span>
              <span style={{
                fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 999, padding: '0.1rem 0.5rem',
              }}>
                {groupRows.length}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {isCollapsed ? '▶' : '▼'}
              </span>
            </button>
            {/* Email domain context strip */}
            {key === 'email' && !isCollapsed && emailDomainDetails && emailDomainDetails.length > 0 && (
              <div style={{
                border: '1px solid var(--border)', borderTop: 'none',
                background: 'rgba(6,182,212,0.03)',
                padding: '0.5rem 1rem',
                display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center',
              }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0 }}>Domain</span>
                {emailDomainDetails.map(d => {
                  const label = d.is_disposable ? 'Disposable' : d.is_custom_domain ? 'Custom Domain' : 'Free Provider'
                  const textColor = d.is_disposable ? 'var(--status-not-found)' : d.is_custom_domain ? 'var(--accent-cyan)' : 'var(--text-muted)'
                  const chipBg = d.is_disposable ? 'rgba(239,68,68,0.07)' : d.is_custom_domain ? 'rgba(6,182,212,0.07)' : 'var(--bg-card)'
                  return (
                    <span key={d.email} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      background: chipBg, border: '1px solid var(--border)',
                      borderRadius: 6, padding: '0.15rem 0.5rem', fontSize: '0.72rem',
                    }}>
                      <code style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{d.email}</code>
                      <span style={{ color: textColor, whiteSpace: 'nowrap' }}>{label}</span>
                      {d.is_custom_domain && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>· higher value</span>
                      )}
                    </span>
                  )
                })}
              </div>
            )}
            {/* Desktop table */}
            {!isCollapsed && (
              <div className="table-wrapper results-table-wrapper" style={{ borderRadius: '0 0 10px 10px', borderTop: 'none' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Platform</th>
                      <th>Identity</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Profile</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupRows.map((r, i) => renderTableRow(r, `${r.platform_id}-${r.identity}-${i}`))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Mobile cards */}
            {!isCollapsed && (
              <div className="results-cards-mobile" style={{ borderRadius: '0 0 10px 10px', overflow: 'hidden', border: '1px solid var(--border)', borderTop: 'none', padding: '0.5rem', gap: '0.5rem', flexDirection: 'column' }}>
                {groupRows.map((r, i) => renderMobileCard(r, `mob-${r.platform_id}-${r.identity}-${i}`))}
              </div>
            )}
          </div>
        )
      })}

      {/* Fallback if all groups filtered out */}
      {filtered.length === 0 && (
        <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>No results match</div>
          <div style={{ fontSize: '0.82rem' }}>Try changing the filter or clearing the search</div>
        </div>
      )}
    </div>
  )
}
