
interface ProgressBarProps {
  label?: string
}

export default function ProgressBar({ label = 'Scanning platforms…' }: ProgressBarProps) {
  return (
    <div style={{ padding: '1.5rem', textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
        <span className="pulse-dot" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-cyan)' }} />
        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          {label}
        </span>
      </div>
      <div className="progress-bar">
        <div className="fill" />
      </div>
      <p style={{ margin: '0.75rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Checking platforms concurrently — this may take 30–90 seconds
      </p>
    </div>
  )
}
