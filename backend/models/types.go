package models

// Platform holds info about a supported platform from config.
type Platform struct {
	ID             string            `json:"id"`
	Name           string            `json:"name"`
	IconURL        string            `json:"icon_url"`
	URLTemplate    string            `json:"url_template"`
	CheckType      string            `json:"check_type"`
	FoundStatus    int               `json:"found_status_code"`
	NotFoundStatus int               `json:"not_found_status_code"`
	FoundRegex     string            `json:"found_regex"`
	NotFoundRegex  string            `json:"not_found_regex"`
	DelaySeconds   int               `json:"delay_seconds"`
	UserAgent      string            `json:"user_agent"`
	Supports       []string          `json:"supports"`                 // "username", "email", "phone"
	Method         string            `json:"method,omitempty"`         // "GET" or "POST"
	Headers        map[string]string `json:"headers,omitempty"`        // custom headers
	PostData       string            `json:"post_data,omitempty"`      // legacy payload template
	CheckCategory  string            `json:"check_category,omitempty"` // "login", "reset", "signup", "api", "profile"
	// Extended fields for email/phone discovery
	PayloadTemplate string `json:"payload_template,omitempty"` // JSON/form body template with {email}/{phone}/{hash} placeholders
	ContentType     string `json:"content_type,omitempty"`     // e.g. "application/json" or "application/x-www-form-urlencoded"
	HashType        string `json:"hash_type,omitempty"`        // "md5", "sha256", or "" (no hashing needed)
	FoundHeader     string `json:"found_header,omitempty"`     // HTTP response header key whose presence = found
	NotFoundHeader  string `json:"not_found_header,omitempty"` // HTTP response header key whose presence = not_found
	InvertResult    bool   `json:"invert_result,omitempty"`    // if true, swap found and not_found in final output
	RateLimitMs     int    `json:"rate_limit_ms,omitempty"`    // minimum milliseconds between requests to this platform
	RequiresAuth        bool   `json:"requires_auth,omitempty"`        // skip in unauthenticated mode if true
	Weight              int    `json:"weight,omitempty"`               // platform sensitivity weight 1-10 for risk scoring
	Category            string `json:"category,omitempty"`             // platform category for risk grouping
	IsBreachDB          bool   `json:"is_breach_db,omitempty"`         // true for breach databases like HIBP
	ProfileURLTemplate  string `json:"profile_url_template,omitempty"` // separate user-facing profile URL (overrides url_template for display)
	Confidence          string `json:"confidence,omitempty"`           // "high" | "medium" | "low" — how reliably this check can distinguish found vs not_found
}

// DetectRequest is the incoming POST /api/detect body.
type DetectRequest struct {
	Usernames []string `json:"usernames"`
	Emails    []string `json:"emails"`
	Phones    []string `json:"phones"`
	Platforms []string `json:"platforms"` // empty = all
}

// ScanResult is one platform × identity probe result.
// Status values: "found" | "not_found" | "uncertain" | "error" | "breached"
// "breached" is used exclusively for breach-database results (e.g. HIBP) meaning the
// identity appears in known public breach data — distinct from a normal "found".
type ScanResult struct {
	Platform        string `json:"platform"`
	PlatformID      string `json:"platform_id"`
	PlatformIcon    string `json:"platform_icon"`
	Identity        string `json:"identity"`
	IdentityType    string `json:"identity_type"`    // "username", "email", "phone"
	Status          string `json:"status"`           // "found" | "not_found" | "uncertain" | "error" | "breached"
	ProfileURL      string `json:"profile_url,omitempty"`
	StatusCode      int    `json:"status_code,omitempty"`
	Snippet             string `json:"snippet,omitempty"`
	PlatformConfidence  string `json:"platform_confidence,omitempty"` // "high" | "medium" | "low" — propagated from Platform.Confidence
}

// PlatformRiskDetail describes a single found/breached platform in a risk report.
type PlatformRiskDetail struct {
	PlatformID   string `json:"platform_id"`
	PlatformName string `json:"platform_name"`
	Weight       int    `json:"weight"`
	Category     string `json:"category"`
	Status       string `json:"status"` // "found" or "breached"
}

// IdentityRisk holds the risk assessment for a single identity.
type IdentityRisk struct {
	Identity           string               `json:"identity"`
	IdentityType       string               `json:"identity_type"`
	Score              int                  `json:"score"`
	ScoreOutOf100      int                  `json:"score_out_of_100"`
	RiskLevel          string               `json:"risk_level"` // "none"|"low"|"medium"|"high"|"critical"
	FoundPlatforms     []PlatformRiskDetail `json:"found_platforms"`
	BreachDetected     bool                 `json:"breach_detected"`
	CorrelationBonus   int                  `json:"correlation_bonus"`
	RecommendedActions []string             `json:"recommended_actions"`
}

// RiskSummary holds aggregate scan statistics.
type RiskSummary struct {
	TotalIdentities int `json:"total_identities"`
	TotalPlatforms  int `json:"total_platforms"`
	TotalFound      int `json:"total_found"`
	TotalBreached   int `json:"total_breached"`
	TotalErrors     int `json:"total_errors"`
}

// RiskReport is the full multi-signal risk assessment for a scan session.
type RiskReport struct {
	Identities       []IdentityRisk `json:"identities"`
	OverallRiskLevel     string         `json:"overall_risk_level"`
	OverallScore         int            `json:"overall_score"`
	OverallScoreOutOf100 int            `json:"overall_score_out_of_100"`
	ScanSummary          RiskSummary    `json:"scan_summary"`
}

// EmailDomainInfo holds zero-request context derived from an email's domain.
type EmailDomainInfo struct {
	Email          string `json:"email"`
	Domain         string `json:"domain"`
	IsDisposable   bool   `json:"is_disposable"`
	IsFreeProvider bool   `json:"is_free_provider"`
	IsCustomDomain bool   `json:"is_custom_domain"` // not disposable and not a well-known free/consumer provider
}

// DetectResponse wraps the full scan output including risk report.
type DetectResponse struct {
	Results            []ScanResult      `json:"results"`
	Total              int               `json:"total"`
	RiskReport         RiskReport        `json:"risk_report"`
	EmailDomainDetails []EmailDomainInfo `json:"email_domain_details,omitempty"`
}

// PlatformInfo is the public-facing platform descriptor for GET /api/platforms.
type PlatformInfo struct {
	ID       string   `json:"id"`
	Name     string   `json:"name"`
	IconURL  string   `json:"icon_url"`
	Supports []string `json:"supports"`
}
