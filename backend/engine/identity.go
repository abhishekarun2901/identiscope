package engine

import (
	"fmt"
	"net/mail"
	"regexp"
	"strings"
	"unicode"
)

// phoneRegex matches E.164 format phone numbers.
var phoneRegex = regexp.MustCompile(`^\+?[1-9]\d{6,14}$`)

// usernameRegex allows alphanumeric chars, hyphens, underscores, dots.
var usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9._\-]+$`)

// ValidatedIdentities holds cleaned and validated identity inputs.
type ValidatedIdentities struct {
	Usernames []string
	Emails    []string
	Phones    []string
	Errors    []string
}

// ValidateAndNormalize cleans and validates raw inputs.
func ValidateAndNormalize(usernames, emails, phones []string) ValidatedIdentities {
	result := ValidatedIdentities{}

	for _, u := range usernames {
		u = strings.TrimSpace(u)
		if u == "" {
			continue
		}
		if len(u) > 50 {
			result.Errors = append(result.Errors, fmt.Sprintf("username '%s' is too long (max 50 chars)", u))
			continue
		}
		if !usernameRegex.MatchString(u) {
			result.Errors = append(result.Errors, fmt.Sprintf("username '%s' contains invalid characters", u))
			continue
		}
		result.Usernames = append(result.Usernames, u)
	}

	for _, e := range emails {
		e = strings.TrimSpace(strings.ToLower(e))
		if e == "" {
			continue
		}
		if _, err := mail.ParseAddress(e); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("email '%s' is invalid", e))
			continue
		}
		result.Emails = append(result.Emails, e)
	}

	for _, p := range phones {
		p = strings.TrimSpace(p)
		// Remove spaces/dashes for normalization
		p = strings.Map(func(r rune) rune {
			if unicode.IsDigit(r) || r == '+' {
				return r
			}
			return -1
		}, p)
		if p == "" {
			continue
		}
		if !phoneRegex.MatchString(p) {
			result.Errors = append(result.Errors, fmt.Sprintf("phone '%s' is not a valid E.164 number", p))
			continue
		}
		result.Phones = append(result.Phones, p)
	}

	return result
}
