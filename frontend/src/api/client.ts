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
  status: 'found' | 'not_found' | 'uncertain' | 'error' | 'breached' // raw from backend
  profile_url?: string
  status_code?: number
  snippet?: string
  platform_confidence?: 'high' | 'medium' | 'low' // reliability of the check (phone/email platforms)
}

export interface EmailDomainInfo {
  email: string
  domain: string
  is_disposable: boolean
  is_free_provider: boolean
  is_custom_domain: boolean
}

export interface PlatformRiskDetail {
  platform_id: string
  platform_name: string
  weight: number
  category: string
  status: 'found' | 'breached'
}

export interface IdentityRisk {
  identity: string
  identity_type: string
  score: number
  score_out_of_100: number
  risk_level: 'none' | 'low' | 'medium' | 'high' | 'critical'
  found_platforms: PlatformRiskDetail[]
  breach_detected: boolean
  correlation_bonus: number
  recommended_actions: string[]
}

export interface RiskSummary {
  total_identities: number
  total_platforms: number
  total_found: number
  total_breached: number
  total_errors: number
}

export interface RiskReport {
  identities: IdentityRisk[]
  overall_risk_level: 'none' | 'low' | 'medium' | 'high' | 'critical'
  overall_score: number
  overall_score_out_of_100: number
  scan_summary: RiskSummary
}

export interface ScanResponse {
  results: ScanResult[]
  total: number
  risk_report: RiskReport
  email_domain_details?: EmailDomainInfo[]
}

export const getPlatforms = (): Promise<Platform[]> =>
  api.get('/platforms').then(r => r.data)

export const runScan = (req: ScanRequest): Promise<ScanResponse> =>
  api.post('/detect', req).then(r => r.data)

// Normalised statuses for display (breached is kept distinct from found)
export type NormalisedStatus = 'found' | 'not_found' | 'uncertain' | 'breached'
export const normaliseStatus = (s: ScanResult['status']): NormalisedStatus => {
  if (s === 'error') return 'uncertain'
  return s
}
