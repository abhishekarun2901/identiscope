import { useState } from 'react'
import './index.css'
import Header from './components/Header'
import InputForm from './components/InputForm'
import PlatformSelector from './components/PlatformSelector'
import ProgressBar from './components/ProgressBar'
import ResultsTable from './components/ResultsTable'
import RiskReport from './components/RiskReport'
import { useScan } from './hooks/useScan'

function App() {
  const [usernames, setUsernames] = useState<string[]>([])
  const [emails, setEmails] = useState<string[]>([])
  const [phones, setPhones] = useState<string[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])

  const { state, results, riskReport, error, total, emailDomainDetails, scan, reset } = useScan()

  const isLoading = state === 'loading'
  const isIdle = state === 'idle'
  const isDone = state === 'done'
  const isError = state === 'error'
  const identityCount = usernames.length + emails.length + phones.length
  const canScan = identityCount > 0 && !isLoading

  const handleScan = () => {
    if (!canScan) return
    void scan({ usernames, emails, phones, platforms: selectedPlatforms })
  }

  const handleReset = () => {
    reset()
    setUsernames([])
    setEmails([])
    setPhones([])
    setSelectedPlatforms([])
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <main style={{ flex: 1, maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem', width: '100%' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em',
            color: 'var(--accent-cyan)', background: 'rgba(6,182,212,0.1)',
            border: '1px solid rgba(6,182,212,0.25)', borderRadius: 999,
            padding: '0.3rem 0.875rem', marginBottom: '1rem',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-cyan)', display: 'inline-block' }} />
            Open-Source Intelligence
          </div>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 800, margin: '0 0 0.75rem', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Discover identities across{' '}
            <span className="gradient-text">240+ platforms</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', margin: '0 auto', maxWidth: 520, lineHeight: 1.65 }}>
            Enter usernames, emails, or phone numbers to search for linked accounts across the web.
            Built for security research and privacy assessments.
          </p>
        </div>

        {/* Disclaimer */}
        <div style={{
          background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 12, padding: '0.75rem 1rem', marginBottom: '1.75rem',
          display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
        }}>
          <span style={{ fontSize: '1rem', lineHeight: 1.5, flexShrink: 0 }}>⚠</span>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--status-uncertain)', lineHeight: 1.55 }}>
            <strong>Disclaimer:</strong> IdentiScope is intended solely for security research, ethical hacking, and personal privacy assessments.
            Only scan identities you own or have explicit written permission to investigate.
          </p>
        </div>

        {/* Input + Platform panels (shown when idle or error) */}
        {(isIdle || isError) && (
          <div className="responsive-grid">
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1.25rem', fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                IDENTITY INPUTS
              </h3>
              <InputForm
                usernames={usernames}
                emails={emails}
                phones={phones}
                onChangeUsernames={setUsernames}
                onChangeEmails={setEmails}
                onChangePhones={setPhones}
                disabled={false}
              />
            </div>

            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1.25rem', fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                PLATFORM SELECTION
              </h3>
              <PlatformSelector
                selected={selectedPlatforms}
                onChange={setSelectedPlatforms}
                disabled={false}
              />
            </div>
          </div>
        )}

        {/* Scan button row */}
        {(isIdle || isError) && (
          <div style={{ marginTop: '1.5rem' }} className="scan-row">
            <button
              className="btn-primary"
              onClick={handleScan}
              disabled={!canScan}
            >
              {isError ? 'RETRY SCAN' : 'RUN SCAN'}
            </button>
            {isError && (
              <button
                onClick={handleReset}
                style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 10, padding: '0.625rem 1.25rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}
              >
                ← New Scan
              </button>
            )}
            {identityCount === 0 && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Enter at least one identity to start
              </span>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{
            marginTop: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 10, padding: '0.75rem 1rem',
          }}>
            <p style={{ margin: 0, color: 'var(--status-not-found)', fontSize: '0.875rem' }}>{error}</p>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="glass-card fade-in-up" style={{ marginTop: '1.5rem' }}>
            <ProgressBar />
          </div>
        )}

        {/* Results */}
        {isDone && (
          <div style={{ marginTop: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.2rem', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  SCAN RESULTS
                </h3>
                <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                  {total} platform checks completed
                </span>
              </div>
              <button
                onClick={handleReset}
                style={{
                  background: 'none', border: '1px solid var(--border)',
                  color: 'var(--text-secondary)', borderRadius: 10,
                  padding: '0.5rem 1.25rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-cyan)'; e.currentTarget.style.color = 'var(--accent-cyan)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                ← New Scan
              </button>
            </div>
            {riskReport && <RiskReport riskReport={riskReport} />}
            <ResultsTable results={results} total={total} emailDomainDetails={emailDomainDetails} />
          </div>
        )}
      </main>

      <footer style={{
        borderTop: '1px solid var(--border)', padding: '1rem 2rem',
        textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)',
      }}>
        IdentiScope — For security research &amp; privacy assessment only · Not for unauthorized use
      </footer>
    </div>
  )
}

export default App
