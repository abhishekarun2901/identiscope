
import { useEffect, useState } from 'react'

interface ProgressBarProps {
  label?: string
}

const STEPS = [
  'Resolving platform endpoints…',
  'Probing username platforms…',
  'Checking email registrations…',
  'Verifying phone presence…',
  'Analysing derived identities…',
  'Computing risk scores…',
  'Almost done…',
]

export default function ProgressBar({ label }: ProgressBarProps) {
  const [elapsed, setElapsed] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    const ticker = setInterval(() => setElapsed(s => s + 1), 1000)
    const stepper = setInterval(() => setStepIndex(i => Math.min(i + 1, STEPS.length - 1)), 12_000)
    return () => { clearInterval(ticker); clearInterval(stepper) }
  }, [])

  const displayLabel = label ?? STEPS[stepIndex]
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`

  return (
    <div style={{ padding: '1.75rem 1.5rem', textAlign: 'center' }}>
      {/* Animated icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
        <span className="pulse-dot" style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: 'var(--accent-cyan)', flexShrink: 0 }} />
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          {displayLabel}
        </span>
      </div>

      {/* Progress bar */}
      <div className="progress-bar" style={{ marginBottom: '1rem' }}>
        <div className="fill" />
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          ⏱ Elapsed: <strong style={{ color: 'var(--accent-cyan)' }}>{timeStr}</strong>
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Scanning 240+ platforms concurrently
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Typical: 30 – 90s
        </span>
      </div>
    </div>
  )
}
