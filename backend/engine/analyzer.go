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
func Analyze(resp *http.Response, body []byte, platform models.Platform, identity string) string {
	code := resp.StatusCode
	bodyStr := string(body)

	// If a not_found_regex matches the body, it's definitely gone.
	if platform.NotFoundRegex != "" {
		nfRe, err := compileInsensitive(platform.NotFoundRegex, identity)
		if err == nil && nfRe.MatchString(bodyStr) {
			return "not_found"
		}
	}

	// Status code check.
	if platform.NotFoundStatus != 0 && code == platform.NotFoundStatus {
		return "not_found"
	}

	if platform.FoundStatus != 0 && code == platform.FoundStatus {
		// If there's a found_regex, also require it to match.
		if platform.FoundRegex != "" {
			fRe, err := compileInsensitive(platform.FoundRegex, identity)
			if err != nil || !fRe.MatchString(bodyStr) {
				return "uncertain"
			}
		}
		return "found"
	}

	// 3xx redirects – could go either way.
	if code >= 300 && code < 400 {
		return "uncertain"
	}

	// 5xx server errors.
	if code >= 500 {
		return "error"
	}

	// Anything else is uncertain.
	return "uncertain"
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
