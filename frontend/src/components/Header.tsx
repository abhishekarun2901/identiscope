
export default function Header() {
  return (
    <header style={{ borderBottom: '1px solid var(--border)', padding: '0.875rem 1.5rem', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(16px)', background: 'rgba(var(--bg-primary-rgb, 10,15,30), 0.85)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        {/* Logo + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, boxShadow: '0 4px 12px rgba(6,182,212,0.3)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
              <circle cx="11" cy="11" r="3"/>
            </svg>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              <span className="gradient-text">Identi</span>
              <span style={{ color: 'var(--text-primary)' }}>Scope</span>
            </h1>
            <p className="header-subtitle" style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Identity Discovery Engine
            </p>
          </div>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="header-badge" style={{
            fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.08em', color: 'var(--status-found)',
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.25)',
            padding: '0.2rem 0.6rem', borderRadius: 999,
            whiteSpace: 'nowrap',
          }}>
            Research Tool
          </span>
        </div>
      </div>
    </header>
  )
}
