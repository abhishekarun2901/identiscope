import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 120_000, // 2 min – scans can be slow
  headers: { 'Content-Type': 'application/json' },
})

export interface Platform {
  id: string
  name: string
  icon_url: string
  supports: string[]
}

export interface ScanRequest {
  usernames: string[]
  emails: string[]
  phones: string[]
  platforms: string[]
}

export interface ScanResult {
  platform: string
  platform_id: string
  platform_icon: string
  identity: string
  identity_type: string
  status: 'found' | 'not_found' | 'uncertain' | 'error' // raw from backend
  profile_url?: string
  status_code?: number
  snippet?: string
}

export interface ScanResponse {
  results: ScanResult[]
  total: number
}

export const getPlatforms = (): Promise<Platform[]> =>
  api.get('/platforms').then(r => r.data)

export const runScan = (req: ScanRequest): Promise<ScanResponse> =>
  api.post('/detect', req).then(r => r.data)

// Normalise backend statuses — 'error' is treated as 'uncertain' in the UI
export type NormalisedStatus = 'found' | 'not_found' | 'uncertain'
export const normaliseStatus = (s: ScanResult['status']): NormalisedStatus =>
  s === 'error' ? 'uncertain' : s
