package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"identiscope/backend/engine"
	"identiscope/backend/models"

	"github.com/gin-gonic/gin"
)

var platforms []models.Platform

// disposableDomains is the built-in blocklist of obviously disposable email providers.
var disposableDomains = map[string]bool{
	"mailinator.com":    true,
	"guerrillamail.com": true,
	"throwam.com":       true,
	"yopmail.com":       true,
	"trashmail.com":     true,
	"sharklasers.com":   true,
	"dispostable.com":   true,
	"mailnull.com":      true,
	"spamgourmet.com":   true,
	"trashmail.me":      true,
}

// freeEmailProviders is the set of well-known free/consumer email providers.
var freeEmailProviders = map[string]bool{
	"gmail.com": true, "googlemail.com": true,
	"yahoo.com": true, "yahoo.co.uk": true, "yahoo.co.in": true, "yahoo.fr": true,
	"hotmail.com": true, "hotmail.co.uk": true, "hotmail.fr": true,
	"outlook.com": true, "outlook.co.uk": true,
	"live.com": true, "live.co.uk": true, "msn.com": true,
	"icloud.com": true, "me.com": true, "mac.com": true,
	"aol.com": true,
	"proton.me": true, "protonmail.com": true, "protonmail.ch": true,
	"tutanota.com": true, "tuta.io": true,
	"zoho.com": true, "zohomail.com": true,
	"mail.com": true, "email.com": true,
	"yandex.com": true, "yandex.ru": true,
	"inbox.com": true,
	"fastmail.com": true, "fastmail.fm": true,
	"hey.com": true,
}

// enrichEmailDomains derives zero-request context from email domain names.
func enrichEmailDomains(emails []string) []models.EmailDomainInfo {
	if len(emails) == 0 {
		return nil
	}
	out := make([]models.EmailDomainInfo, 0, len(emails))
	for _, e := range emails {
		parts := strings.SplitN(e, "@", 2)
		if len(parts) != 2 {
			continue
		}
		domain := strings.ToLower(parts[1])
		isDisp := disposableDomains[domain]
		isFree := freeEmailProviders[domain]
		out = append(out, models.EmailDomainInfo{
			Email:          e,
			Domain:         domain,
			IsDisposable:   isDisp,
			IsFreeProvider: isFree,
			IsCustomDomain: !isDisp && !isFree,
		})
	}
	return out
}

// LoadPlatforms reads and merges all *.json files from the config directory.
func LoadPlatforms(configDir string) error {
	entries, err := os.ReadDir(configDir)
	if err != nil {
		return err
	}

	seen := make(map[string]bool)
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}
		path := filepath.Join(configDir, entry.Name())
		data, err := os.ReadFile(path)
		if err != nil {
			log.Printf("[WARN] Could not read %s: %v", entry.Name(), err)
			continue
		}
		var batch []models.Platform
		if err := json.Unmarshal(data, &batch); err != nil {
			log.Printf("[WARN] Could not parse %s: %v", entry.Name(), err)
			continue
		}
		added := 0
		for _, p := range batch {
			if !seen[p.ID] {
				seen[p.ID] = true
				platforms = append(platforms, p)
				added++
			}
		}
		log.Printf("[INFO] Loaded %d platforms from %s", added, entry.Name())
	}
	log.Printf("[INFO] Total platforms loaded: %d", len(platforms))
	return nil
}

// GetPlatforms handles GET /api/platforms
func GetPlatforms(c *gin.Context) {
	var infos []models.PlatformInfo
	for _, p := range platforms {
		infos = append(infos, models.PlatformInfo{
			ID:       p.ID,
			Name:     p.Name,
			IconURL:  p.IconURL,
			Supports: p.Supports,
		})
	}
	c.JSON(http.StatusOK, infos)
}

// Detect handles POST /api/detect
func Detect(c *gin.Context) {
	// Dry run mode — validate inputs and return what would be probed without executing
	if c.Query("dry_run") == "true" {
		handleDryRun(c)
		return
	}

	var req models.DetectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	sel := make([]string, len(req.Platforms))
	for i, p := range req.Platforms {
		sel[i] = strings.ToLower(p)
	}

	validated := engine.ValidateAndNormalize(req.Usernames, req.Emails, req.Phones)

	// Extra email validations: domain TLD check + disposable domain blocklist
	var filteredEmails []string
	for _, e := range validated.Emails {
		parts := strings.SplitN(e, "@", 2)
		if len(parts) != 2 {
			continue
		}
		domain := parts[1]
		if !strings.Contains(domain, ".") {
			validated.Errors = append(validated.Errors,
				"email '"+e+"' has an invalid domain (no TLD)")
			continue
		}
		if disposableDomains[strings.ToLower(domain)] {
			validated.Errors = append(validated.Errors,
				"email '"+e+"' uses a disposable email domain and cannot be scanned")
			continue
		}
		filteredEmails = append(filteredEmails, e)
	}
	validated.Emails = filteredEmails

	// Extra phone validation: recognisable country code required
	var filteredPhones []string
	for _, ph := range validated.Phones {
		if engine.ExtractCountryCode(ph) == "" {
			validated.Errors = append(validated.Errors,
				"phone '"+ph+"' does not have a recognizable country code")
			continue
		}
		filteredPhones = append(filteredPhones, ph)
	}
	validated.Phones = filteredPhones

	total := len(validated.Usernames) + len(validated.Emails) + len(validated.Phones)
	if total == 0 {
		msg := "No valid identities provided."
		if len(validated.Errors) > 0 {
			msg += " Errors: " + strings.Join(validated.Errors, "; ")
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": msg})
		return
	}

	log.Printf("[INFO] Scan: %d usernames, %d emails, %d phones",
		len(validated.Usernames), len(validated.Emails), len(validated.Phones))

	ctx := c.Request.Context()
	results := engine.ProbeAll(ctx, validated, platforms, sel)
	riskReport := engine.ComputeRisk(results, platforms)
	domainDetails := enrichEmailDomains(filteredEmails)

	c.JSON(http.StatusOK, models.DetectResponse{
		Results:            results,
		Total:              len(results),
		RiskReport:         riskReport,
		EmailDomainDetails: domainDetails,
	})
}

// handleDryRun validates inputs and returns which platforms would be probed — without executing any probes.
func handleDryRun(c *gin.Context) {
	var req models.DetectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	sel := make([]string, len(req.Platforms))
	for i, p := range req.Platforms {
		sel[i] = strings.ToLower(p)
	}

	validated := engine.ValidateAndNormalize(req.Usernames, req.Emails, req.Phones)

	type wouldProbeEntry struct {
		PlatformID   string `json:"platform_id"`
		PlatformName string `json:"platform_name"`
		IdentityType string `json:"identity_type"`
	}

	activePlatforms := filterPlatforms(platforms, sel)
	var wouldProbe []wouldProbeEntry
	for _, p := range activePlatforms {
		for _, supType := range p.Supports {
			switch supType {
			case "username":
				if len(validated.Usernames) > 0 {
					wouldProbe = append(wouldProbe, wouldProbeEntry{p.ID, p.Name, "username"})
				}
			case "email":
				if len(validated.Emails) > 0 {
					wouldProbe = append(wouldProbe, wouldProbeEntry{p.ID, p.Name, "email"})
				}
			case "phone":
				if len(validated.Phones) > 0 {
					wouldProbe = append(wouldProbe, wouldProbeEntry{p.ID, p.Name, "phone"})
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"dry_run":    true,
		"would_probe": wouldProbe,
	})
}

// filterPlatforms mirrors engine.filterPlatforms for the dry-run path.
func filterPlatforms(all []models.Platform, selected []string) []models.Platform {
	if len(selected) == 0 {
		return all
	}
	sel := make(map[string]bool, len(selected))
	for _, id := range selected {
		sel[id] = true
	}
	var out []models.Platform
	for _, p := range all {
		if sel[p.ID] {
			out = append(out, p)
		}
	}
	return out
}
