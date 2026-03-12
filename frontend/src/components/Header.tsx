
interface Props {
  isDark: boolean
  onToggle: () => void
}

export default function Header({ isDark, onToggle }: Props) {
  return (
    <header style={{ borderBottom: '1px solid var(--border)', padding: '1rem 2rem' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
              <circle cx="11" cy="11" r="3"/>
            </svg>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              <span className="gradient-text">Identi</span>
              <span style={{ color: 'var(--text-primary)' }}>scope</span>
            </h1>
            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Identity Discovery Engine
            </p>
          </div>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{
            fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.08em', color: 'var(--status-found)',
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.25)',
            padding: '0.25rem 0.625rem', borderRadius: 999,
          }}>
            ● Research Tool
          </span>
          <button
            onClick={onToggle}
            title="Toggle theme"
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 10, width: 40, height: 40,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)', fontSize: '1.1rem',
              transition: 'background 0.2s, border-color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-card)')}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  )
}
