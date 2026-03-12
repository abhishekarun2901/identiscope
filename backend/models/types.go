package models

// Platform holds info about a supported platform from config.
type Platform struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	IconURL      string   `json:"icon_url"`
	URLTemplate  string   `json:"url_template"`
	CheckType    string   `json:"check_type"`
	FoundStatus  int      `json:"found_status_code"`
	NotFoundStatus int    `json:"not_found_status_code"`
	FoundRegex   string   `json:"found_regex"`
	NotFoundRegex  string            `json:"not_found_regex"`
	DelaySeconds   int               `json:"delay_seconds"`
	UserAgent      string            `json:"user_agent"`
	Supports       []string          `json:"supports"` // "username", "email", "phone"
	Method         string            `json:"method,omitempty"`         // "GET" or "POST"
	Headers        map[string]string `json:"headers,omitempty"`        // custom headers
	PostData       string            `json:"post_data,omitempty"`      // Payload template
	CheckCategory  string            `json:"check_category,omitempty"` // "login", "reset", "signup", "api", "profile"
}

// DetectRequest is the incoming POST /api/detect body.
type DetectRequest struct {
	Usernames []string `json:"usernames"`
	Emails    []string `json:"emails"`
	Phones    []string `json:"phones"`
	Platforms []string `json:"platforms"` // empty = all
}

// ScanResult is one platform × identity probe result.
type ScanResult struct {
	Platform     string `json:"platform"`
	PlatformID   string `json:"platform_id"`
	PlatformIcon string `json:"platform_icon"`
	Identity     string `json:"identity"`
	IdentityType string `json:"identity_type"` // "username", "email", "phone"
	Status       string `json:"status"`        // "found" | "not_found" | "uncertain" | "error"
	ProfileURL   string `json:"profile_url,omitempty"`
	StatusCode   int    `json:"status_code,omitempty"`
	Snippet      string `json:"snippet,omitempty"`
}

// DetectResponse wraps the full scan output.
type DetectResponse struct {
	Results []ScanResult `json:"results"`
	Total   int          `json:"total"`
}

// PlatformInfo is the public-facing platform descriptor for GET /api/platforms.
type PlatformInfo struct {
	ID       string   `json:"id"`
	Name     string   `json:"name"`
	IconURL  string   `json:"icon_url"`
	Supports []string `json:"supports"`
}
