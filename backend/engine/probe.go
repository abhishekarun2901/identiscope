package engine

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"identiscope/backend/models"
)

const (
	maxConcurrentUsername = 20
	maxConcurrentEmail    = 5
	maxConcurrentPhone    = 3
	httpTimeoutUsername   = 12
	httpTimeoutEmailPhone = 15
	maxRetriesUsername    = 2
	maxRetriesEmailPhone  = 1
	snippetSize           = 512
)

// lastRequestTime stores the last time a request was made per platform.
var lastRequestTime sync.Map

// platformMutexes stores per-platform mutexes for serialising rate-limited access.
var platformMutexes sync.Map

// ProbeAll checks all identity x platform combinations concurrently.
// ctx is passed through so in-flight probes terminate when the HTTP client disconnects.
func ProbeAll(ctx context.Context, identities ValidatedIdentities, platforms []models.Platform, selectedIDs []string) []models.ScanResult {
	type task struct {
		platform     models.Platform
		identity     string
		identityType string
	}

	activePlatforms := filterPlatforms(platforms, selectedIDs)

	var tasks []task
	for _, p := range activePlatforms {
		for _, supType := range p.Supports {
			switch supType {
			case "username":
				for _, u := range identities.Usernames {
					tasks = append(tasks, task{platform: p, identity: u, identityType: "username"})
				}
			case "email":
				for _, e := range identities.Emails {
					tasks = append(tasks, task{platform: p, identity: e, identityType: "email"})
				}
			case "phone":
				for _, ph := range identities.Phones {
					tasks = append(tasks, task{platform: p, identity: ph, identityType: "phone"})
				}
			}
		}
	}

	// Three separate semaphores - one per identity type
	semUsername := make(chan struct{}, maxConcurrentUsername)
	semEmail := make(chan struct{}, maxConcurrentEmail)
	semPhone := make(chan struct{}, maxConcurrentPhone)

	results := make(chan models.ScanResult, len(tasks))
	var wg sync.WaitGroup

	for _, t := range tasks {
		wg.Add(1)
		go func(t task) {
			defer wg.Done()

			var sem chan struct{}
			var timeoutSec int
			switch t.identityType {
			case "email":
				sem = semEmail
				timeoutSec = httpTimeoutEmailPhone
			case "phone":
				sem = semPhone
				timeoutSec = httpTimeoutEmailPhone
			default:
				sem = semUsername
				timeoutSec = httpTimeoutUsername
			}

			select {
			case sem <- struct{}{}:
			case <-ctx.Done():
				return
			}
			defer func() { <-sem }()

			// Legacy per-platform delay for username probes only
			if t.platform.DelaySeconds > 0 && t.identityType == "username" {
				select {
				case <-time.After(time.Duration(t.platform.DelaySeconds) * time.Second):
				case <-ctx.Done():
					return
				}
			}

			result := probeOne(ctx, t.platform, t.identity, t.identityType, timeoutSec)
			results <- result
		}(t)
	}

	go func() {
		wg.Wait()
		close(results)
	}()

	var out []models.ScanResult
	for r := range results {
		out = append(out, r)
	}
	return out
}

// applyRateLimit enforces the per-platform minimum request interval.
func applyRateLimit(platformID string, rateLimitMs int) {
	if rateLimitMs <= 0 {
		return
	}
	muVal, _ := platformMutexes.LoadOrStore(platformID, &sync.Mutex{})
	mu := muVal.(*sync.Mutex)
	mu.Lock()
	defer mu.Unlock()

	if val, loaded := lastRequestTime.Load(platformID); loaded {
		lastReq := val.(time.Time)
		elapsed := time.Since(lastReq)
		minDur := time.Duration(rateLimitMs) * time.Millisecond
		if elapsed < minDur {
			time.Sleep(minDur - elapsed)
		}
	}
	lastRequestTime.Store(platformID, time.Now())
}

// probeOne fires a single HTTP probe for one platform x identity pair.
// When derivedUsername is non-empty the URL/payload are built using that string
// (e.g. the local part of an email) while the result is attributed to identity.
func probeOne(ctx context.Context, p models.Platform, identity, identityType string, timeoutSec int) models.ScanResult {
	urlIdentity := identity
	urlIdentityType := identityType

	builtURL := buildURL(p, urlIdentity, urlIdentityType)
	method := p.Method
	if method == "" {
		method = "GET"
	}
	payloadStr := buildPayload(p, urlIdentity, urlIdentityType)
	client := BuildHTTPClient(timeoutSec)

	applyRateLimit(p.ID, p.RateLimitMs)

	maxR := maxRetriesUsername
	if identityType == "email" || identityType == "phone" {
		maxR = maxRetriesEmailPhone
	}

	var (
		resp       *http.Response
		bodyBytes  []byte
		statusCode int
		err        error
	)

	for attempt := 0; attempt <= maxR; attempt++ {
		if attempt > 0 {
			select {
			case <-ctx.Done():
				err = ctx.Err()
				goto done
			case <-time.After(time.Duration(attempt*2) * time.Second):
			}
		}

		resp, bodyBytes, err = doRequest(ctx, client, method, builtURL, payloadStr, p)
		if err == nil {
			statusCode = resp.StatusCode
			break
		}
		if ctx.Err() != nil {
			break
		}
		log.Printf("[WARN] attempt %d for %s/%s: %v", attempt+1, p.ID, identity, err)
	}

done:
	// Determine the user-facing profile URL.
	// - If platform declares a separate profile_url_template, use that.
	// - If the check is a GET request (profile page check), the check URL doubles as the profile URL.
	// - For POST/API endpoints, the check URL is not a user-facing page; leave blank.
	var displayURL string
	if p.ProfileURLTemplate != "" {
		profilePlatform := models.Platform{URLTemplate: p.ProfileURLTemplate, HashType: p.HashType}
		displayURL = buildURL(profilePlatform, urlIdentity, urlIdentityType)
	} else if method != "POST" {
		displayURL = builtURL
	}

	result := models.ScanResult{
		Platform:           p.Name,
		PlatformID:         p.ID,
		PlatformIcon:       p.IconURL,
		Identity:           identity,
		IdentityType:       identityType,
		ProfileURL:         displayURL,
		StatusCode:         statusCode,
		PlatformConfidence: p.Confidence,
	}

	if err != nil {
		result.Status = "error"
		result.Snippet = fmt.Sprintf("Network error: %v", err)
		return result
	}

	// HIBP 429 - surface a clear message; do not retry
	if p.IsBreachDB && statusCode == 429 {
		result.Status = "error"
		result.Snippet = "Rate limited by HIBP API. Wait before retrying."
		return result
	}

	result.Status = Analyze(resp, bodyBytes, p, identity)
	result.Snippet = snippet(bodyBytes)

	// Only clear the profile URL on definitive "not found".
	// Keep it for "uncertain" so the user can click through to check manually
	// (especially important for phone platforms that can't auto-detect presence).
	if result.Status == "not_found" {
		result.ProfileURL = ""
	}

	return result
}

// doRequest performs an HTTP request and returns the response + body bytes.
func doRequest(ctx context.Context, client *http.Client, method, rawURL, payloadStr string, p models.Platform) (*http.Response, []byte, error) {
	var reqBody io.Reader
	if payloadStr != "" {
		reqBody = strings.NewReader(payloadStr)
	}

	req, err := http.NewRequestWithContext(ctx, method, rawURL, reqBody)
	if err != nil {
		return nil, nil, err
	}

	ua := p.UserAgent
	if ua == "" {
		ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
	}
	req.Header.Set("User-Agent", ua)
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.5")

	for k, v := range p.Headers {
		req.Header.Set(k, v)
	}

	if method == "POST" {
		if p.ContentType != "" {
			req.Header.Set("Content-Type", p.ContentType)
		} else if req.Header.Get("Content-Type") == "" {
			if strings.HasPrefix(payloadStr, "{") {
				req.Header.Set("Content-Type", "application/json")
			} else {
				req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
			}
		}
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, nil, err
	}
	defer resp.Body.Close()

	body := ReadBodySnippet(resp.Body, snippetSize*10)
	return resp, body, nil
}

// urlEncode URL-encodes a string for use in query parameters or form bodies.
func urlEncode(s string) string {
	return url.QueryEscape(s)
}

// buildURL substitutes all identity-type placeholders into the URL template.
func buildURL(p models.Platform, identity, identityType string) string {
	u := p.URLTemplate
	switch identityType {
	case "email":
		encoded := urlEncode(identity)
		emailLocal := strings.SplitN(identity, "@", 2)[0]
		emailDomain := ""
		if parts := strings.SplitN(identity, "@", 2); len(parts) == 2 {
			emailDomain = parts[1]
		}
		u = strings.ReplaceAll(u, "{email_encoded}", encoded)
		u = strings.ReplaceAll(u, "{email_local}", emailLocal)
		u = strings.ReplaceAll(u, "{email_domain}", emailDomain)
		u = strings.ReplaceAll(u, "{email}", encoded)
		if p.HashType == "md5" {
			hash := MD5Hash(strings.TrimSpace(strings.ToLower(identity)))
			u = strings.ReplaceAll(u, "{md5_hash}", hash)
		} else if p.HashType == "sha256" {
			hash := SHA256Hash(strings.TrimSpace(strings.ToLower(identity)))
			u = strings.ReplaceAll(u, "{sha256_hash}", hash)
		}
		u = strings.ReplaceAll(u, "{username}", encoded)
	case "phone":
		digits := StripNonDigits(identity)
		cc := ExtractCountryCode(identity)
		local := ExtractLocalNumber(identity, cc)
		// {phone_e164_encoded} → percent-encoded E.164, e.g. %2B14155551234
		e164Encoded := "%2B" + digits
		u = strings.ReplaceAll(u, "{phone}", urlEncode(identity))
		u = strings.ReplaceAll(u, "{phone_digits}", digits)
		u = strings.ReplaceAll(u, "{phone_local}", local)
		u = strings.ReplaceAll(u, "{phone_e164_encoded}", e164Encoded)
		u = strings.ReplaceAll(u, "{cc}", cc)
		u = strings.ReplaceAll(u, "{username}", urlEncode(identity))
	case "username":
		u = strings.ReplaceAll(u, "{username}", identity)
	}
	return u
}

// generateRandomPassword creates a 16-hex string so login checks always fail safely.
func generateRandomPassword() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// buildPayload substitutes identity into the payload template.
// Checks PayloadTemplate first, then falls back to the legacy PostData field.
func buildPayload(p models.Platform, identity, identityType string) string {
	tmpl := p.PayloadTemplate
	if tmpl == "" {
		tmpl = p.PostData
	}
	if tmpl == "" {
		return ""
	}

	body := tmpl
	body = strings.ReplaceAll(body, "{random_pass}", generateRandomPassword())

	isForm := p.ContentType == "application/x-www-form-urlencoded"

	switch identityType {
	case "email":
		emailVal := identity
		if isForm {
			emailVal = urlEncode(identity)
		}
		payloadLocal := strings.SplitN(identity, "@", 2)[0]
		payloadDomain := ""
		if parts := strings.SplitN(identity, "@", 2); len(parts) == 2 {
			payloadDomain = parts[1]
		}
		body = strings.ReplaceAll(body, "{email_encoded}", urlEncode(identity))
		body = strings.ReplaceAll(body, "{email_local}", payloadLocal)
		body = strings.ReplaceAll(body, "{email_domain}", payloadDomain)
		body = strings.ReplaceAll(body, "{email}", emailVal)
		if p.HashType == "md5" {
			hash := MD5Hash(strings.TrimSpace(strings.ToLower(identity)))
			body = strings.ReplaceAll(body, "{md5_hash}", hash)
		} else if p.HashType == "sha256" {
			hash := SHA256Hash(strings.TrimSpace(strings.ToLower(identity)))
			body = strings.ReplaceAll(body, "{sha256_hash}", hash)
		}
		body = strings.ReplaceAll(body, "{username}", identity)
	case "phone":
		digits := StripNonDigits(identity)
		cc := ExtractCountryCode(identity)
		local := ExtractLocalNumber(identity, cc)
		phoneVal := identity
		if isForm {
			phoneVal = urlEncode(identity)
		}
		e164Encoded := "%2B" + digits
		body = strings.ReplaceAll(body, "{phone}", phoneVal)
		body = strings.ReplaceAll(body, "{phone_digits}", digits)
		body = strings.ReplaceAll(body, "{phone_local}", local)
		body = strings.ReplaceAll(body, "{phone_e164_encoded}", e164Encoded)
		body = strings.ReplaceAll(body, "{cc}", cc)
		body = strings.ReplaceAll(body, "{username}", identity)
	case "username":
		body = strings.ReplaceAll(body, "{username}", identity)
	}
	return body
}

// filterPlatforms returns only platforms in the selectedIDs list (or all if empty).
func filterPlatforms(all []models.Platform, selected []string) []models.Platform {
	if len(selected) == 0 {
		return all
	}
	sel := make(map[string]bool, len(selected))
	for _, id := range selected {
		sel[strings.ToLower(id)] = true
	}
	var out []models.Platform
	for _, p := range all {
		if sel[p.ID] {
			out = append(out, p)
		}
	}
	return out
}

// snippet returns a small readable excerpt of body bytes.
func snippet(body []byte) string {
	s := string(body)
	s = strings.TrimSpace(s)
	_ = bytes.ReplaceAll([]byte(s), []byte("<"), []byte(" <"))
	if len(s) > snippetSize {
		return s[:snippetSize] + "..."
	}
	return s
}
