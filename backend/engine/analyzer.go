package engine

import (
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	"identiscope/backend/models"
)

// Analyze determines account existence from an HTTP response.
// Check order:
//  1. NotFoundRegex match  → "not_found"
//  2. NotFoundHeader present → "not_found"
//  3. NotFoundStatus code   → "not_found"
//  4. FoundStatus code      → "found" / "breached" (if IsBreachDB) / "uncertain" (regex miss)
//  5. FoundHeader present   → "found"
//  6. 3xx redirect          → "uncertain"
//  7. 5xx error             → "error"
//  8. Default               → "uncertain"
//
// After determining the raw status, InvertResult flips found↔not_found.
func Analyze(resp *http.Response, body []byte, platform models.Platform, identity string) string {
	code := resp.StatusCode
	bodyStr := string(body)

	var status string

	// 0. SPA shell guard: for "api" check_type, if the response is HTML (a client-side
	//    SPA shell) instead of JSON, the endpoint returned the wrong content type —
	//    regex-based detection is unreliable, so mark uncertain immediately.
	if platform.CheckType == "api" && len(bodyStr) > 0 {
		trimmed := strings.TrimSpace(bodyStr)
		lower := strings.ToLower(trimmed)
		if strings.HasPrefix(lower, "<!doctype") ||
			strings.HasPrefix(lower, "<html") ||
			strings.Contains(bodyStr, `<div id="app">`) ||
			strings.Contains(bodyStr, `<div id="root">`) {
			status = "uncertain"
			goto invert
		}
	}

	// 1. NotFoundRegex
	if platform.NotFoundRegex != "" {
		nfRe, err := compileInsensitive(platform.NotFoundRegex, identity)
		if err == nil && nfRe.MatchString(bodyStr) {
			status = "not_found"
			goto invert
		}
	}

	// 2. NotFoundHeader
	if platform.NotFoundHeader != "" && resp.Header.Get(platform.NotFoundHeader) != "" {
		status = "not_found"
		goto invert
	}

	// 3. NotFoundStatus
	if platform.NotFoundStatus != 0 && code == platform.NotFoundStatus {
		status = "not_found"
		goto invert
	}

	// 4. FoundStatus
	if platform.FoundStatus != 0 && code == platform.FoundStatus {
		if platform.FoundRegex != "" {
			fRe, err := compileInsensitive(platform.FoundRegex, identity)
			if err != nil || !fRe.MatchString(bodyStr) {
				status = "uncertain"
				goto invert
			}
		}
		// Breach-DB platforms use "breached" instead of "found"
		if platform.IsBreachDB {
			status = "breached"
		} else {
			status = "found"
		}
		goto invert
	}

	// 5. FoundHeader
	if platform.FoundHeader != "" && resp.Header.Get(platform.FoundHeader) != "" {
		status = "found"
		goto invert
	}

	// 6. Regex-only matches (no status code constraint set)
	if platform.FoundRegex != "" && platform.FoundStatus == 0 {
		fRe, err := compileInsensitive(platform.FoundRegex, identity)
		if err == nil && fRe.MatchString(bodyStr) {
			if platform.IsBreachDB {
				status = "breached"
			} else {
				status = "found"
			}
			goto invert
		}
	}

	// 7. 3xx redirects
	if code >= 300 && code < 400 {
		status = "uncertain"
		goto invert
	}

	// 8. 5xx server errors
	if code >= 500 {
		status = "error"
		goto invert
	}

	status = "uncertain"

invert:
	if platform.InvertResult {
		switch status {
		case "found":
			status = "not_found"
		case "not_found":
			status = "found"
		}
	}
	return status
}

// compileInsensitive compiles a regex, substituting {username} placeholder.
func compileInsensitive(pattern, identity string) (*regexp.Regexp, error) {
	pattern = strings.ReplaceAll(pattern, "{username}", regexp.QuoteMeta(identity))
	return regexp.Compile("(?i)" + pattern)
}

// BuildHTTPClient returns a configured HTTP client with custom timeout.
func BuildHTTPClient(timeoutSec int) *http.Client {
	return &http.Client{
		Timeout: time.Duration(timeoutSec) * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return http.ErrUseLastResponse
			}
			return nil
		},
	}
}

// ReadBodySnippet reads up to maxBytes from an HTTP response body.
func ReadBodySnippet(body io.Reader, maxBytes int) []byte {
	buf := make([]byte, maxBytes)
	n, _ := io.ReadFull(body, buf)
	return buf[:n]
}
