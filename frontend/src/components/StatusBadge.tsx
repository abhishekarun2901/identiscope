import type { NormalisedStatus } from '../api/client'
import { normaliseStatus } from '../api/client'
import type { ScanResult } from '../api/client'

interface StatusBadgeProps {
  status: ScanResult['status']
}

const config: Record<NormalisedStatus, { icon: string; label: string; className: string }> = {
  found:     { icon: '●', label: 'FOUND',    className: 'found' },
  not_found: { icon: '✕', label: 'NO MATCH', className: 'not_found' },
  uncertain: { icon: '?', label: 'UNKNOWN',  className: 'uncertain' },
  breached:  { icon: '⚠', label: 'BREACHED', className: 'breached' },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const norm = normaliseStatus(status)
  const { icon, label, className } = config[norm]

  if (norm === 'breached') {
    return (
      <span
        className={`badge ${className}`}
        style={{
          background: 'rgba(220, 38, 38, 0.2)',
          border: '1px solid rgba(153, 27, 27, 0.5)',
          color: '#fca5a5',
        }}
      >
        <span>{icon}</span>
        {label}
      </span>
    )
  }

  return (
    <span className={`badge ${className}`}>
      <span>{icon}</span>
      {label}
    </span>
  )
}
