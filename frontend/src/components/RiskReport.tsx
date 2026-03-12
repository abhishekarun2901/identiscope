import { useMemo } from 'react'
import type { RiskReport as RiskReportType, IdentityRisk, PlatformRiskDetail } from '../api/client'

interface RiskReportProps {
  riskReport: RiskReportType
}

type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical'

const riskColors: Record<RiskLevel, { bg: string; border: string; text: string; label: string }> = {
  none:     { bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.3)', text: '#9ca3af', label: 'NO EXPOSURE' },
  low:      { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)',  text: '#34d399', label: 'LOW RISK' },
  medium:   { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  text: '#fbbf24', label: 'MED RISK' },
  high:     { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   text: '#f87171', label: 'HIGH RISK' },
  critical: { bg: 'rgba(153,27,27,0.2)',    border: 'rgba(220,38,38,0.5)',   text: '#fca5a5', label: 'CRITICAL RISK' },
}

const ScoreGauge = ({ score, color, size = 96 }: { score: number; color: string; size?: number }) => {
  const s = Math.min(100, Math.max(0, score))
  const strokeW = size < 70 ? 6 : 8
  const r = (size - strokeW * 2) / 2
  const cx = size / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - s / 100)
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={strokeW} />
        <circle
          cx={cx} cy={cx} r={r} fill="none"
          stroke={color} strokeWidth={strokeW}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size < 70 ? '1rem' : '1.5rem', fontWeight: 900, color, lineHeight: 1 }}>{s}</span>
        <span style={{ fontSize: size < 70 ? '0.5rem' : '0.6rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>/100</span>
      </div>
    </div>
  )
}

export default function RiskReport({ riskReport }: RiskReportProps) {
  const overallLevel = (riskReport.overall_risk_level ?? 'none') as RiskLevel
  const overallColors = riskColors[overallLevel] ?? riskColors.none

  // Deduplicated recommended actions across all identities
  const allActions = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const ir of riskReport.identities ?? []) {
      for (const action of ir.recommended_actions ?? []) {
        if (!seen.has(action)) {
          seen.add(action)
          out.push(action)
        }
      }
    }
    return out
  }, [riskReport])

  const isCritical = overallLevel === 'critical'

  return (
    <div className="fade-in-up" style={{ marginBottom: '2rem' }}>
      {/* Pulse keyframe for critical */}
      {isCritical && (
        <style>{`
          @keyframes riskPulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.4); }
            50% { box-shadow: 0 0 0 8px rgba(220,38,38,0); }
          }
          .critical-pulse { animation: riskPulse 1.8s ease-in-out infinite; }
        `}</style>
      )}

      <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
        EXPOSURE ANALYSIS
      </h3>

      {/* Overall Risk Banner */}
      <div
        className={`glass-card${isCritical ? ' critical-pulse' : ''}`}
        style={{
          padding: '1.25rem 1.5rem',
          marginBottom: '1.25rem',
          background: overallColors.bg,
          borderColor: overallColors.border,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            Overall Risk Assessment
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: overallColors.text }}>
            {overallColors.label}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
          <ScoreGauge score={riskReport.overall_score_out_of_100} color={overallColors.text} />
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
            {riskReport.scan_summary?.total_identities ?? 0} id · {riskReport.scan_summary?.total_platforms ?? 0} platforms
          </div>
        </div>
      </div>

      {/* Per-Identity Risk Cards */}
      <div className="risk-cards" style={{ marginBottom: '1.5rem' }}>
        {(riskReport.identities ?? []).map((ir: IdentityRisk) => (
          <IdentityRiskCard key={`${ir.identity_type}-${ir.identity}`} ir={ir} />
        ))}
      </div>

      {/* Recommended Actions Panel */}
      {allActions.length > 0 && (
        <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
          <h4 style={{ margin: '0 0 0.875rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            RECOMMENDED ACTIONS
          </h4>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {allActions.map((action, i) => (
              <li key={i} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Scan Summary Strip */}
      {riskReport.scan_summary && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Found',    value: riskReport.scan_summary.total_found,    color: 'var(--status-found)' },
            { label: 'Breached', value: riskReport.scan_summary.total_breached, color: '#fca5a5' },
            { label: 'Errors',   value: riskReport.scan_summary.total_errors,   color: 'var(--status-error)' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '0.5rem 1rem', textAlign: 'center', minWidth: 80,
            }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '0.15rem', letterSpacing: '0.04em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function IdentityRiskCard({ ir }: { ir: IdentityRisk }) {
  const level = (ir.risk_level ?? 'none') as RiskLevel
  const colors = riskColors[level] ?? riskColors.none
  const breachBonus = ir.breach_detected ? 50 : 0
  const baseScore = ir.score - ir.correlation_bonus - breachBonus

  return (
    <div
      className="glass-card risk-card"
      style={{ padding: '1.25rem', background: colors.bg, borderColor: colors.border }}
    >
      {/* Header */}
      <div className="risk-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className={`tag ${ir.identity_type.toLowerCase()}`}>{ir.identity_type}</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
            {ir.identity}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ScoreGauge score={ir.score_out_of_100} color={colors.text} size={64} />
          <span style={{
            fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
            color: colors.text, background: colors.bg, border: `1px solid ${colors.border}`,
            borderRadius: 6, padding: '0.2rem 0.5rem',
          }}>
            {level}
          </span>
        </div>
      </div>

      {/* Breach Warning */}
      {ir.breach_detected && (
        <div style={{
          marginTop: '0.75rem', background: 'rgba(220,38,38,0.15)',
          border: '1px solid rgba(220,38,38,0.4)', borderRadius: 8,
          padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <span style={{ fontSize: '1rem' }}>⚠</span>
          <span style={{ fontSize: '0.8rem', color: '#fca5a5', fontWeight: 600 }}>
            Breach Detected — this identity appears in public breach data
          </span>
        </div>
      )}

      {/* Correlation Notice */}
      {ir.correlation_bonus > 0 && (
        <div style={{
          marginTop: '0.5rem', background: 'rgba(139,92,246,0.12)',
          border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8,
          padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: '#c4b5fd',
        }}>
          ↗ Cross-identity correlation detected (+{ir.correlation_bonus} pts) — multiple identity types linked to this person
        </div>
      )}

      {/* Found Platforms Chips */}
      {ir.found_platforms && ir.found_platforms.length > 0 && (
        <div style={{ marginTop: '0.875rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
            Found on
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {ir.found_platforms.map((p: PlatformRiskDetail) => (
              <span
                key={p.platform_id}
                style={{
                  fontSize: '0.72rem', fontWeight: 500,
                  background: p.status === 'breached' ? 'rgba(220,38,38,0.15)' : 'var(--bg-card)',
                  border: `1px solid ${p.status === 'breached' ? 'rgba(220,38,38,0.4)' : 'var(--border)'}`,
                  color: p.status === 'breached' ? '#fca5a5' : 'var(--text-secondary)',
                  borderRadius: 6, padding: '0.2rem 0.5rem',
                }}
              >
                {p.status === 'breached' ? '⚠ ' : ''}{p.platform_name} · {p.category} · {p.weight}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Score Breakdown */}
      <div style={{
        marginTop: '0.875rem', fontSize: '0.72rem', color: 'var(--text-muted)',
        background: 'rgba(0,0,0,0.15)', borderRadius: 6, padding: '0.35rem 0.6rem',
        fontFamily: 'monospace',
      }}>
        Base: {baseScore} + Breach: {breachBonus} + Correlation: {ir.correlation_bonus} = {ir.score} → {ir.score_out_of_100}/100
      </div>
    </div>
  )
}
