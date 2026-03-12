package engine

import (
	"fmt"
	"strings"

	"identiscope/backend/models"
)

const (
	breachBonus           = 50
	correlationBonus2Type = 15
	correlationBonus3Type = 30
)

// ComputeRisk calculates a weighted multi-signal risk report from scan results.
func ComputeRisk(results []models.ScanResult, platforms []models.Platform) models.RiskReport {
	// Build platform lookup map
	platformMap := make(map[string]models.Platform, len(platforms))
	for _, p := range platforms {
		platformMap[p.ID] = p
	}

	// Group results by (identity, identityType)
	type identityKey struct {
		identity     string
		identityType string
	}
	identityResults := make(map[identityKey][]models.ScanResult)
	for _, r := range results {
		key := identityKey{r.Identity, r.IdentityType}
		identityResults[key] = append(identityResults[key], r)
	}

	// Determine how many distinct identity types have at least one found/breached result
	typeHasFound := make(map[string]bool)
	for _, r := range results {
		if r.Status == "found" || r.Status == "breached" {
			typeHasFound[r.IdentityType] = true
		}
	}
	numTypesWithFound := len(typeHasFound)

	// Pre-pass: aggregate scan summary counters
	totalFound := 0
	totalBreached := 0
	totalErrors := 0
	for _, r := range results {
		switch r.Status {
		case "found":
			totalFound++
		case "breached":
			totalBreached++
		case "error":
			totalErrors++
		}
	}

	// Build per-identity risk assessments
	var identityRisks []models.IdentityRisk
	for key, keyResults := range identityResults {
		multiplier := identityMultiplier(key.identityType)

		var foundPlatforms []models.PlatformRiskDetail
		breachDetected := false
		rawScore := 0.0

		for _, r := range keyResults {
			if r.Status != "found" && r.Status != "breached" {
				continue
			}
			if r.Status == "breached" {
				breachDetected = true
			}

			p, ok := platformMap[r.PlatformID]
			if !ok {
				continue
			}
			w := p.Weight
			if w == 0 {
				w = defaultCategoryWeight(p.Category)
			}

			rawScore += float64(w) * multiplier
			foundPlatforms = append(foundPlatforms, models.PlatformRiskDetail{
				PlatformID:   p.ID,
				PlatformName: p.Name,
				Weight:       w,
				Category:     p.Category,
				Status:       r.Status,
			})
		}

		bBonus := 0
		if breachDetected {
			bBonus = breachBonus
		}

		// Correlation bonus only applies when this identity has found platforms
		cBonus := 0
		if len(foundPlatforms) > 0 {
			if numTypesWithFound >= 3 {
				cBonus = correlationBonus3Type
			} else if numTypesWithFound >= 2 {
				cBonus = correlationBonus2Type
			}
		}

		totalScore := int(rawScore) + bBonus + cBonus

		ir := models.IdentityRisk{
			Identity:         key.identity,
			IdentityType:     key.identityType,
			Score:            totalScore,
			ScoreOutOf100:    clamp100(totalScore),
			RiskLevel:        scoreToRiskLevel(totalScore),
			FoundPlatforms:   foundPlatforms,
			BreachDetected:   breachDetected,
			CorrelationBonus: cBonus,
		}
		ir.RecommendedActions = generateRecommendations(ir, foundPlatforms)
		identityRisks = append(identityRisks, ir)
	}

	// Overall: highest individual level + sum of all scores
	overallScore := 0
	overallRiskLevel := "none"
	for _, ir := range identityRisks {
		overallScore += ir.Score
		if riskLevelOrder(ir.RiskLevel) > riskLevelOrder(overallRiskLevel) {
			overallRiskLevel = ir.RiskLevel
		}
	}

	// Count unique platforms probed
	seenPlatforms := make(map[string]bool)
	for _, r := range results {
		seenPlatforms[r.PlatformID] = true
	}

	return models.RiskReport{
		Identities:           identityRisks,
		OverallRiskLevel:     overallRiskLevel,
		OverallScore:         overallScore,
		OverallScoreOutOf100: clamp100(overallScore),
		ScanSummary: models.RiskSummary{
			TotalIdentities: len(identityRisks),
			TotalPlatforms:  len(seenPlatforms),
			TotalFound:      totalFound,
			TotalBreached:   totalBreached,
			TotalErrors:     totalErrors,
		},
	}
}

// identityMultiplier returns the risk score multiplier for an identity type.
func identityMultiplier(identityType string) float64 {
	switch identityType {
	case "phone":
		return 1.5
	case "email":
		return 1.2
	default: // username
		return 1.0
	}
}

// defaultCategoryWeight returns the default weight for a platform category
// when no explicit weight is set on the platform config entry.
func defaultCategoryWeight(category string) int {
	switch category {
	case "breach":
		return 10
	case "financial", "crypto":
		return 9
	case "adult", "dating":
		return 9
	case "identity", "sso":
		return 8
	case "communication":
		return 7
	case "social":
		return 6
	case "professional":
		return 5
	case "gaming", "entertainment":
		return 3
	case "developer":
		return 2
	case "community":
		return 2
	default:
		return 3
	}
}

// scoreToRiskLevel converts a numeric score to a risk level label.
func scoreToRiskLevel(score int) string {
	switch {
	case score == 0:
		return "none"
	case score <= 15:
		return "low"
	case score <= 40:
		return "medium"
	case score <= 80:
		return "high"
	default:
		return "critical"
	}
}

// riskLevelOrder maps risk level strings to a comparable integer for max comparisons.
func riskLevelOrder(level string) int {
	switch level {
	case "none":
		return 0
	case "low":
		return 1
	case "medium":
		return 2
	case "high":
		return 3
	case "critical":
		return 4
	}
	return 0
}

// clamp100 normalises a raw risk score to the 0–100 display range.
func clamp100(n int) int {
	if n <= 0 {
		return 0
	}
	if n >= 100 {
		return 100
	}
	return n
}

// generateRecommendations produces specific, actionable advice based on the scan findings.
func generateRecommendations(identity models.IdentityRisk, foundPlatforms []models.PlatformRiskDetail) []string {
	var recs []string

	if identity.RiskLevel == "critical" {
		recs = append(recs, "CRITICAL: Immediate action recommended. This identity has a severe exposure profile combining breach data and real-identity platform presence.")
	}

	if identity.BreachDetected {
		recs = append(recs, fmt.Sprintf(
			"Your %s (%s) appears in known public data breaches. Immediately change passwords on all platforms where you reuse credentials. Enable breach monitoring at haveibeenpwned.com.",
			identity.IdentityType, identity.Identity,
		))
	}

	var commPlatforms []string
	for _, p := range foundPlatforms {
		if p.Category == "communication" {
			commPlatforms = append(commPlatforms, p.PlatformName)
		}
	}
	if len(commPlatforms) > 0 {
		recs = append(recs, fmt.Sprintf(
			"Your contact details are discoverable via: %s. Review contact discovery settings on these platforms.",
			strings.Join(commPlatforms, ", "),
		))
	}

	if identity.IdentityType == "phone" && len(foundPlatforms) >= 2 {
		recs = append(recs, fmt.Sprintf(
			"Your phone number is linked to %d discoverable accounts. Consider using a secondary number for non-critical registrations.",
			len(foundPlatforms),
		))
	}

	if identity.IdentityType == "email" && (identity.RiskLevel == "high" || identity.RiskLevel == "critical") {
		recs = append(recs, "This email address has a large public footprint. Consider using email aliases (e.g. SimpleLogin, AnonAddy) for new account registrations.")
	}

	var socialHighPlatforms []string
	for _, p := range foundPlatforms {
		if p.Category == "social" && p.Weight >= 6 {
			socialHighPlatforms = append(socialHighPlatforms, p.PlatformName)
		}
	}
	if len(socialHighPlatforms) > 0 {
		recs = append(recs, fmt.Sprintf(
			"Your real-identity social profiles are publicly indexed on: %s. Review privacy settings and limit profile discoverability.",
			strings.Join(socialHighPlatforms, ", "),
		))
	}

	var devPlatforms []string
	for _, p := range foundPlatforms {
		if p.Category == "developer" {
			devPlatforms = append(devPlatforms, p.PlatformName)
		}
	}
	if len(devPlatforms) > 0 && (identity.RiskLevel == "medium" || identity.RiskLevel == "high" || identity.RiskLevel == "critical") {
		recs = append(recs, fmt.Sprintf(
			"Your developer accounts are public. Audit repositories on %s for accidentally committed secrets, config files, or personal data.",
			strings.Join(devPlatforms, ", "),
		))
	}

	return recs
}
