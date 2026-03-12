import { useState, useCallback } from 'react'
import { runScan } from '../api/client'
import type { ScanResult, ScanRequest } from '../api/client'

type ScanState = 'idle' | 'loading' | 'done' | 'error'

export function useScan() {
  const [state, setState] = useState<ScanState>('idle')
  const [results, setResults] = useState<ScanResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const scan = useCallback(async (req: ScanRequest) => {
    setState('loading')
    setError(null)
    setResults([])
    try {
      const res = await runScan(req)
      setResults(res.results ?? [])
      setTotal(res.total ?? 0)
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
    setError(null)
    setTotal(0)
  }, [])

  return { state, results, error, total, scan, reset }
}
