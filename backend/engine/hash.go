package engine

import (
	"crypto/md5"
	"crypto/sha256"
	"fmt"
	"strings"
	"unicode"
)

// MD5Hash returns the lowercase hex MD5 digest of s.
func MD5Hash(s string) string {
	h := md5.Sum([]byte(s))
	return fmt.Sprintf("%x", h)
}

// SHA256Hash returns the lowercase hex SHA-256 digest of s.
func SHA256Hash(s string) string {
	h := sha256.Sum256([]byte(s))
	return fmt.Sprintf("%x", h)
}

// StripNonDigits removes every character from s that is not a decimal digit.
func StripNonDigits(s string) string {
	return strings.Map(func(r rune) rune {
		if unicode.IsDigit(r) {
			return r
		}
		return -1
	}, s)
}

// ExtractLocalNumber strips the country-code prefix from an E.164 number and
// returns only the subscriber (national) portion as a digit-only string.
// countryCode should be the result of ExtractCountryCode for the same input.
// Example: ExtractLocalNumber("+14155552671", "1") → "4155552671"
func ExtractLocalNumber(e164, countryCode string) string {
	digits := StripNonDigits(e164)
	if len(countryCode) > 0 && strings.HasPrefix(digits, countryCode) {
		return digits[len(countryCode):]
	}
	return digits
}

// ExtractCountryCode parses the country code digit(s) from an E.164 number.
// E.164 format: +[1-3 digit country code][subscriber number]
// Returns the country code as a string (e.g. "1", "44", "91", "86").
// Uses a prefix-match table for the most common country codes.
// If unrecognised, returns the first digit after the +.
func ExtractCountryCode(e164 string) string {
	stripped := strings.TrimPrefix(e164, "+")

	// 3-digit country codes first (to avoid prefix conflicts with shorter codes)
	threedigit := []string{
		"212", "213", "216", "218", "220", "221", "222", "223", "224", "225",
		"226", "227", "228", "229", "230", "231", "232", "233", "234", "235",
		"236", "237", "238", "239", "240", "241", "242", "243", "244", "245",
		"246", "247", "248", "249", "250", "251", "252", "253", "254", "255",
		"256", "257", "258", "260", "261", "262", "263", "264", "265", "266",
		"267", "268", "269", "290", "291", "297", "298", "299", "350", "351",
		"352", "353", "354", "355", "356", "357", "358", "359", "370", "371",
		"372", "373", "374", "375", "376", "377", "378", "380", "381", "382",
		"385", "386", "387", "389", "420", "421", "423", "500", "501", "502",
		"503", "504", "505", "506", "507", "508", "509", "590", "591", "592",
		"593", "594", "595", "596", "597", "598", "599", "670", "672", "673",
		"674", "675", "676", "677", "678", "679", "680", "681", "682", "683",
		"685", "686", "687", "688", "689", "690", "691", "692", "850", "852",
		"853", "855", "856", "880", "886", "960", "961", "962", "963", "964",
		"965", "966", "967", "968", "970", "971", "972", "973", "974", "975",
		"976", "977", "992", "993", "994", "995", "996", "998",
	}
	for _, cc := range threedigit {
		if strings.HasPrefix(stripped, cc) {
			return cc
		}
	}

	// 2-digit country codes
	twodigit := []string{
		"20", "27", "30", "31", "32", "33", "34", "36", "39", "40", "41",
		"43", "44", "45", "46", "47", "48", "49", "51", "52", "53", "54",
		"55", "56", "57", "58", "60", "61", "62", "63", "64", "65", "66",
		"81", "82", "84", "86", "90", "91", "92", "93", "94", "95", "98",
	}
	for _, cc := range twodigit {
		if strings.HasPrefix(stripped, cc) {
			return cc
		}
	}

	// 1-digit (NANP +1)
	if strings.HasPrefix(stripped, "1") {
		return "1"
	}

	// Fallback: first character after the +
	if len(stripped) > 0 {
		return string(stripped[0])
	}
	return ""
}
