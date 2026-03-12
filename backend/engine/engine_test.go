package engine

import (
"fmt"
"net/http"
"testing"

"identiscope/backend/models"
)

// ─── hash.go tests ────────────────────────────────────────────────────────────

func TestExtractCountryCode(t *testing.T) {
cases := []struct {
input string
want  string
}{
{"+12025551234", "1"},
{"+447911123456", "44"},
{"+919876543210", "91"},
{"+8613912345678", "86"},
{"+61412345678", "61"},
{"+35312345678", "353"},
{"", ""},
}
for _, tc := range cases {
t.Run(fmt.Sprintf("ExtractCountryCode(%q)", tc.input), func(t *testing.T) {
got := ExtractCountryCode(tc.input)
if got != tc.want {
t.Errorf("ExtractCountryCode(%q) = %q; want %q", tc.input, got, tc.want)
}
})
}
}

func TestMD5Hash(t *testing.T) {
got := MD5Hash("test@example.com")
want := "55502f40dc8b7c769880b10874abc9d0"
if got != want {
t.Errorf("MD5Hash = %q; want %q", got, want)
}
}

func TestStripNonDigits(t *testing.T) {
got := StripNonDigits("+1 (202) 555-1234")
want := "12025551234"
if got != want {
t.Errorf("StripNonDigits = %q; want %q", got, want)
}
}

func TestExtractLocalNumber(t *testing.T) {
cases := []struct {
input string
want  string
}{
{"+14155552671", "4155552671"},
{"+447911123456", "7911123456"},
{"+919876543210", "9876543210"},
{"+8613912345678", "13912345678"},
{"+35312345678", "12345678"},
}
for _, tc := range cases {
t.Run(fmt.Sprintf("ExtractLocalNumber(%q)", tc.input), func(t *testing.T) {
cc := ExtractCountryCode(tc.input)
got := ExtractLocalNumber(tc.input, cc)
if got != tc.want {
t.Errorf("ExtractLocalNumber(%q, cc=%q) = %q; want %q", tc.input, cc, got, tc.want)
}
})
}
}

// ─── probe.go / buildURL tests ────────────────────────────────────────────────

func TestBuildURL_EmailMD5(t *testing.T) {
p := models.Platform{
ID:          "gravatar",
URLTemplate: "https://www.gravatar.com/avatar/{md5_hash}?d=404",
HashType:    "md5",
}
email := "  Test@Example.COM  "
expectedHash := MD5Hash("test@example.com")
got := buildURL(p, email, "email")
want := "https://www.gravatar.com/avatar/" + expectedHash + "?d=404"
if got != want {
t.Errorf("buildURL (email md5) = %q; want %q", got, want)
}
}

func TestBuildURL_PhoneDigits(t *testing.T) {
p := models.Platform{
ID:          "snapchat-phone",
URLTemplate: "https://example.com/check?phone={phone_digits}&cc={cc}",
}
phone := "+12025551234"
got := buildURL(p, phone, "phone")
digits := StripNonDigits(phone)
cc := ExtractCountryCode(phone)
want := "https://example.com/check?phone=" + digits + "&cc=" + cc
if got != want {
t.Errorf("buildURL (phone digits+cc) = %q; want %q", got, want)
}
}

func TestBuildURL_PhoneLocal(t *testing.T) {
p := models.Platform{
ID:          "truecaller-web",
URLTemplate: "https://www.truecaller.com/search/{cc}/{phone_local}",
}
phone := "+14155552671"
got := buildURL(p, phone, "phone")
want := "https://www.truecaller.com/search/1/4155552671"
if got != want {
t.Errorf("buildURL (phone_local) = %q; want %q", got, want)
}
}

func TestBuildPayload_Phone(t *testing.T) {
p := models.Platform{
ID:              "snapchat-phone",
URLTemplate:     "https://example.com/register",
Method:          "POST",
ContentType:     "application/x-www-form-urlencoded",
PayloadTemplate: "phone_numbers={phone_digits}&country={cc}",
}
phone := "+447911123456"
got := buildPayload(p, phone, "phone")
digits := StripNonDigits(phone)
cc := ExtractCountryCode(phone)
want := "phone_numbers=" + digits + "&country=" + cc
if got != want {
t.Errorf("buildPayload (phone) = %q; want %q", got, want)
}
}

// ─── risk.go tests ────────────────────────────────────────────────────────────

func TestComputeRisk_BreachBonus(t *testing.T) {
platforms := []models.Platform{
{
ID:         "haveibeenpwned",
Weight:     10,
Category:   "breach",
IsBreachDB: true,
Supports:   []string{"email"},
},
}
results := []models.ScanResult{
{
PlatformID:   "haveibeenpwned",
Platform:     "Have I Been Pwned",
Identity:     "victim@example.com",
IdentityType: "email",
Status:       "breached",
},
}
report := ComputeRisk(results, platforms)

if len(report.Identities) == 0 {
t.Fatal("expected at least one IdentityRisk entry")
}
risk := report.Identities[0]
if !risk.BreachDetected {
t.Error("expected BreachDetected = true when a breached result is present")
}
// score must include weight*multiplier + breachBonus
// weight=10, email multiplier=1.2 → 12, + 50 breach bonus = 62 minimum
expectedMin := int(float64(10)*1.2) + breachBonus
if risk.Score < expectedMin {
t.Errorf("Score = %d; want >= %d (weight*multiplier + breachBonus)", risk.Score, expectedMin)
}
}

func TestComputeRisk_CorrelationBonus(t *testing.T) {
platforms := []models.Platform{
{ID: "twitter", Weight: 6, Category: "social", Supports: []string{"username"}},
{ID: "gmail-check", Weight: 5, Category: "identity", Supports: []string{"email"}},
}
results := []models.ScanResult{
{PlatformID: "twitter", Platform: "Twitter", Identity: "johndoe", IdentityType: "username", Status: "found"},
{PlatformID: "gmail-check", Platform: "Gmail", Identity: "john@gmail.com", IdentityType: "email", Status: "found"},
}
report := ComputeRisk(results, platforms)

// With 2 distinct identity types found, each identity should get correlationBonus2Type
for _, ir := range report.Identities {
if ir.CorrelationBonus < correlationBonus2Type {
t.Errorf("identity %q CorrelationBonus = %d; want >= %d",
ir.Identity, ir.CorrelationBonus, correlationBonus2Type)
}
}
}

// ─── analyzer.go tests ────────────────────────────────────────────────────────

func mockResponse(code int, body string, headers map[string]string) (*http.Response, []byte) {
h := make(http.Header)
for k, v := range headers {
h.Set(k, v)
}
return &http.Response{StatusCode: code, Header: h}, []byte(body)
}

func TestAnalyze_InvertResult(t *testing.T) {
p := models.Platform{
ID:            "twitter-x-email",
NotFoundRegex: "email_is_available",
InvertResult:  true,
}
resp, body := mockResponse(200, `{"email_is_available": true}`, nil)
got := Analyze(resp, body, p, "test@x.com")
if got != "found" {
t.Errorf("Analyze with InvertResult: got %q; want %q", got, "found")
}
}

func TestAnalyze_FoundStatus_IsBreachDB(t *testing.T) {
p := models.Platform{
ID:          "haveibeenpwned",
FoundStatus: 200,
IsBreachDB:  true,
}
resp, body := mockResponse(200, `[{"Name":"Adobe"}]`, nil)
got := Analyze(resp, body, p, "victim@example.com")
if got != "breached" {
t.Errorf("Analyze breach DB: got %q; want %q", got, "breached")
}
}

func TestAnalyze_NotFoundStatus(t *testing.T) {
p := models.Platform{
ID:             "generic",
NotFoundStatus: 404,
}
resp, body := mockResponse(404, "Not found", nil)
got := Analyze(resp, body, p, "nobody")
if got != "not_found" {
t.Errorf("Analyze not_found status: got %q; want %q", got, "not_found")
}
}
