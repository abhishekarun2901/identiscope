import type { NormalisedStatus } from '../api/client'
import { normaliseStatus } from '../api/client'
import type { ScanResult } from '../api/client'

interface StatusBadgeProps {
  status: ScanResult['status']
}

const config: Record<NormalisedStatus, { icon: string; label: string }> = {
  found:     { icon: '●', label: 'Found' },
  not_found: { icon: '✕', label: 'Not Found' },
  uncertain: { icon: '?', label: 'Uncertain' },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const norm = normaliseStatus(status)
  const { icon, label } = config[norm]
  return (
    <span className={`badge ${norm}`}>
      <span>{icon}</span>
      {label}
    </span>
  )
}
