package engine

	"bytes"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"identiscope/backend/models"
)

const (
	maxConcurrent = 20
	httpTimeout   = 12
	maxRetries    = 2
	snippetSize   = 512
)

// ProbeAll checks all identity×platform combinations concurrently.
func ProbeAll(identities ValidatedIdentities, platforms []models.Platform, selectedIDs []string) []models.ScanResult {
	// Build task list
	type task struct {
		platform     models.Platform
		identity     string
		identityType string
	}

	// Filter platforms by selection
	activePlatforms := filterPlatforms(platforms, selectedIDs)

	var tasks []task
	for _, p := range activePlatforms {
		for _, supType := range p.Supports {
			switch supType {
			case "username":
				for _, u := range identities.Usernames {
					tasks = append(tasks, task{p, u, "username"})
				}
			case "email":
				for _, e := range identities.Emails {
					tasks = append(tasks, task{p, e, "email"})
				}
			case "phone":
				for _, ph := range identities.Phones {
					tasks = append(tasks, task{p, ph, "phone"})
				}
			}
		}
	}

	// Semaphore to cap concurrency
	sem := make(chan struct{}, maxConcurrent)
	results := make(chan models.ScanResult, len(tasks))
	var wg sync.WaitGroup

	for _, t := range tasks {
		wg.Add(1)
		go func(t task) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			// Per-platform delay
			if t.platform.DelaySeconds > 0 {
				time.Sleep(time.Duration(t.platform.DelaySeconds) * time.Second)
			}

			result := probeOne(t.platform, t.identity, t.identityType)
			results <- result
		}(t)
	}

	// Close results channel once all goroutines finish
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

// probeOne fires a single HTTP probe for one platform×identity pair.
func probeOne(p models.Platform, identity, identityType string) models.ScanResult {
	url := buildURL(p, identity, identityType)
	method := p.Method
	if method == "" {
		method = "GET"
	}
	payloadStr := buildPayload(p, identity, identityType)
	client := BuildHTTPClient(httpTimeout)

	var (
		resp       *http.Response
		bodyBytes  []byte
		statusCode int
		err        error
	)

	for attempt := 0; attempt <= maxRetries; attempt++ {
		if attempt > 0 {
			time.Sleep(time.Duration(attempt*2) * time.Second)
		}
		resp, bodyBytes, err = doRequest(client, method, url, payloadStr, p)
		if err == nil {
			statusCode = resp.StatusCode
			break
		}
		log.Printf("[WARN] attempt %d for %s/%s: %v", attempt+1, p.ID, identity, err)
	}

	result := models.ScanResult{
		Platform:     p.Name,
		PlatformID:   p.ID,
		PlatformIcon: p.IconURL,
		Identity:     identity,
		IdentityType: identityType,
		ProfileURL:   url,
		StatusCode:   statusCode,
	}

	if err != nil {
		result.Status = "error"
		result.Snippet = fmt.Sprintf("Network error: %v", err)
		return result
	}

	result.Status = Analyze(resp, bodyBytes, p, identity)
	result.Snippet = snippet(bodyBytes)

	// Clear profile URL if not found
	if result.Status != "found" {
		result.ProfileURL = ""
	}

	return result
}

// doRequest performs an HTTP request (GET or POST) and returns response + body bytes.
func doRequest(client *http.Client, method, url, payloadStr string, p models.Platform) (*http.Response, []byte, error) {
	var reqBody io.Reader
	if payloadStr != "" {
		reqBody = strings.NewReader(payloadStr)
	}

	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return nil, nil, err
	}
	req.Header.Set("User-Agent", p.UserAgent)
	
	// Default Accept headers
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.5")

	// Apply custom headers (overrides defaults like Content-Type)
	for k, v := range p.Headers {
		req.Header.Set(k, v)
	}

	// If it's a POST and no Content-Type was explicitly set by the user
	if method == "POST" && req.Header.Get("Content-Type") == "" {
		if strings.HasPrefix(payloadStr, "{") {
			req.Header.Set("Content-Type", "application/json")
		} else {
			req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
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

// buildURL substitutes identity into URL template.
func buildURL(p models.Platform, identity, identityType string) string {
	u := p.URLTemplate
	switch identityType {
	case "username":
		u = strings.ReplaceAll(u, "{username}", identity)
	case "email":
		u = strings.ReplaceAll(u, "{email}", identity)
		u = strings.ReplaceAll(u, "{username}", identity)
	case "phone":
		u = strings.ReplaceAll(u, "{phone}", identity)
		u = strings.ReplaceAll(u, "{username}", identity)
	}
	return u
}

// generateRandomPassword creates a 16-hex string to ensure login fails safely
func generateRandomPassword() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// buildPayload substitutes identity and a safe random password into PostData.
func buildPayload(p models.Platform, identity, identityType string) string {
	if p.PostData == "" {
		return ""
	}
	body := p.PostData
	body = strings.ReplaceAll(body, "{random_pass}", generateRandomPassword())
	
	switch identityType {
	case "username":
		body = strings.ReplaceAll(body, "{username}", identity)
	case "email":
		body = strings.ReplaceAll(body, "{email}", identity)
		body = strings.ReplaceAll(body, "{username}", identity)
	case "phone":
		body = strings.ReplaceAll(body, "{phone}", identity)
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
	// Strip HTML tags for readability
	re := []byte(bytes.ReplaceAll([]byte(s), []byte("<"), []byte(" <")))
	_ = re
	if len(s) > snippetSize {
		return s[:snippetSize] + "…"
	}
	return s
}
