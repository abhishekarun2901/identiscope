import { useState, useEffect } from 'react'
import './index.css'
import Header from './components/Header'
import InputForm from './components/InputForm'
import PlatformSelector from './components/PlatformSelector'
import ProgressBar from './components/ProgressBar'
import ResultsTable from './components/ResultsTable'
import RiskReport from './components/RiskReport'
import { useScan } from './hooks/useScan'

function App() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved !== 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const [usernames, setUsernames] = useState<string[]>([])
  const [emails, setEmails] = useState<string[]>([])
  const [phones, setPhones] = useState<string[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])

  const { state, results, error, total, scan, reset } = useScan()

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
      <Header isDark={isDark} onToggle={() => setIsDark(d => !d)} />

      <main style={{ flex: 1, maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem', width: '100%' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 800, margin: '0 0 0.75rem', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Discover identities across{' '}
            <span className="gradient-text">240+ platforms</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', margin: '0 auto', maxWidth: 560, lineHeight: 1.6 }}>
            Enter usernames, emails, or phone numbers to search for linked accounts across the web.
            Built for security research and privacy assessments.
          </p>
        </div>

        {/* Disclaimer */}
        <div style={{
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 12, padding: '0.75rem 1rem', marginBottom: '1.75rem',
          display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
        }}>
          <span style={{ fontSize: '1rem', lineHeight: 1.4, flexShrink: 0 }}>⚠️</span>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--status-uncertain)', lineHeight: 1.5 }}>
            <strong>Disclaimer:</strong> IdentiScope is intended solely for security research, ethical hacking, and personal privacy assessments.
            Only scan identities you own or have explicit written permission to investigate.
          </p>
        </div>

        {/* Input + Platform panels (shown when idle or error) */}
        {(isIdle || isError) && (
          <div className="responsive-grid">
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1.25rem', fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                🔍 Identity Inputs
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
                🌐 Platform Selection
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
          <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }} className="scan-row">
            <button
              className="btn-primary"
              onClick={handleScan}
              disabled={!canScan}
              style={{ minWidth: 180 }}
            >
              {isError ? '🔄 Retry Scan' : '🚀 Start Scan'}
            </button>
            {isError && (
              <button
                onClick={handleReset}
                style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 10, padding: '0.625rem 1.25rem', cursor: 'pointer', fontSize: '0.9rem' }}
              >
                ← New Scan
              </button>
            )}
            {identityCount === 0 && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
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
            <p style={{ margin: 0, color: 'var(--status-not-found)', fontSize: '0.875rem' }}>❌ {error}</p>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="glass-card fade-in-up" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
            <ProgressBar />
          </div>
        )}

        {/* Results */}
        {isDone && (
          <div style={{ marginTop: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                📊 Scan Results{' '}
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                  {total} checks completed
                </span>
              </h3>
              <button
                onClick={handleReset}
                style={{
                  background: 'none', border: '1px solid var(--border)',
                  color: 'var(--text-secondary)', borderRadius: 10,
                  padding: '0.5rem 1.25rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
                }}
              >
                ← New Scan
              </button>
            </div>
            <RiskReport results={results} />
            <ResultsTable results={results} total={total} />
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
