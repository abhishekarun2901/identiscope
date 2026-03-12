import { useMemo } from 'react'
import type { ScanResult } from '../api/client'
import { normaliseStatus } from '../api/client'

interface RiskReportProps {
  results: ScanResult[]
}

type RiskLevel = 'High' | 'Medium' | 'Low' | 'None'

interface IdentityStats {
  identity: string
  type: string
  foundCount: number
  totalCount: number
  riskLevel: RiskLevel
}

export default function RiskReport({ results }: RiskReportProps) {
  const stats = useMemo(() => {
    const map = new Map<string, IdentityStats>()
    
    for (const r of results) {
      if (!map.has(r.identity)) {
        map.set(r.identity, {
          identity: r.identity,
          type: r.identity_type,
          foundCount: 0,
          totalCount: 0,
          riskLevel: 'None'
        })
      }
      
      const s = map.get(r.identity)!
      s.totalCount++
      if (normaliseStatus(r.status) === 'found') {
        s.foundCount++
      }
    }

    const arr = Array.from(map.values())
    
    // Calculate risk levels
    for (const s of arr) {
      if (s.foundCount > 10) s.riskLevel = 'High'
      else if (s.foundCount >= 5) s.riskLevel = 'Medium'
      else if (s.foundCount >= 1) s.riskLevel = 'Low'
      else s.riskLevel = 'None'
    }
    
    // Sort by risk (High -> Low -> None)
    const order = { High: 0, Medium: 1, Low: 2, None: 3 }
    return arr.sort((a, b) => order[a.riskLevel] - order[b.riskLevel])
  }, [results])

  if (stats.length === 0) return null

  return (
    <div className="fade-in-up" style={{ marginBottom: '2rem' }}>
      <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
        🛡️ Identity Exposure Risk
      </h3>
      <div className="risk-cards">
        {stats.map(s => (
          <div key={s.identity} className={`glass-card risk-card risk-${s.riskLevel.toLowerCase()}`}>
            <div className="risk-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className={`tag ${s.type.toLowerCase()}`}>{s.type}</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {s.identity}
                </span>
              </div>
              <div className={`risk-badge ${s.riskLevel.toLowerCase()}`}>
                {s.riskLevel === 'High' && '🔴 High Risk'}
                {s.riskLevel === 'Medium' && '🟡 Medium Risk'}
                {s.riskLevel === 'Low' && '🟢 Low Risk'}
                {s.riskLevel === 'None' && '⚪ No Exposure'}
              </div>
            </div>
            
            <div className="risk-body">
              <div className="risk-stats">
                <span className="risk-count">{s.foundCount}</span>
                <span className="risk-text">platforms found</span>
                <span className="risk-total">/ {s.totalCount} checked</span>
              </div>
              
              <div className="risk-recommendations">
                {s.riskLevel === 'High' && (
                  <p><strong>Critical Exposure:</strong> Highly visible identity. Ensure unique cryptographic passwords and hardware 2FA are enabled across all linked accounts. Assume this identity is in public breach lists.</p>
                )}
                {s.riskLevel === 'Medium' && (
                  <p><strong>Moderate Exposure:</strong> Significant digital footprint. Review connected accounts for stale data and ensure multi-factor authentication is active on primary accounts.</p>
                )}
                {s.riskLevel === 'Low' && (
                  <p><strong>Low Exposure:</strong> Minimal visibility. Continue practicing good credential hygiene. Only necessary accounts appear to be linked.</p>
                )}
                {s.riskLevel === 'None' && (
                  <p><strong>No Exposure Detected:</strong> This identity does not appear to be linked to the platforms checked. Excellent privacy preservation.</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
