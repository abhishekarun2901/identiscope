import { useState, useCallback } from 'react'
import { runScan } from '../api/client'
import type { ScanResult, ScanRequest, RiskReport, EmailDomainInfo } from '../api/client'

type ScanState = 'idle' | 'loading' | 'done' | 'error'

export function useScan() {
  const [state, setState] = useState<ScanState>('idle')
  const [results, setResults] = useState<ScanResult[]>([])
  const [riskReport, setRiskReport] = useState<RiskReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [emailDomainDetails, setEmailDomainDetails] = useState<EmailDomainInfo[]>([])

  const scan = useCallback(async (req: ScanRequest) => {
    setState('loading')
    setError(null)
    setResults([])
    setRiskReport(null)
    setEmailDomainDetails([])
    try {
      const res = await runScan(req)
      setResults(res.results ?? [])
      setTotal(res.total ?? 0)
      setRiskReport(res.risk_report ?? null)
      setEmailDomainDetails(res.email_domain_details ?? [])
      setState('done')
    } catch (e: unknown) {
      let msg = 'An unexpected error occurred.'
      if (e && typeof e === 'object' && 'response' in e) {
        const axiosErr = e as { response?: { data?: { error?: string }; status?: number } }
        msg = axiosErr.response?.data?.error ?? `Server error (${axiosErr.response?.status})`
      } else if (e instanceof Error) {
        msg = e.message
      }
      setError(msg)
      setState('error')
    }
  }, [])

  const reset = useCallback(() => {
    setState('idle')
    setResults([])
    setRiskReport(null)
    setError(null)
    setTotal(0)
    setEmailDomainDetails([])
  }, [])

  return { state, results, riskReport, error, total, emailDomainDetails, scan, reset }
}
