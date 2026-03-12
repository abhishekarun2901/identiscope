# IdentiScope

**Identity-Based Account Discovery Engine**

IdentiScope is a full-stack OSINT tool that probes whether a given username, email address, or phone number has registered accounts across 260+ online platforms. Designed for security researchers, penetration testers, and privacy assessments.

> **For authorized use only.** Only scan identities you own or have explicit written permission to investigate.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript 5.9, Vite 7, Tailwind CSS v4 |
| Backend | Go 1.22, Gin v1.10 |
| Serving | Nginx (production), Vite dev server (development) |
| Deployment | Docker, Docker Compose |
| Platform Config | JSON-driven — no code changes required to add platforms |

---

## Project Structure

```
identiscope/
├── docker-compose.yml
├── backend/
│   ├── main.go
│   ├── go.mod
│   ├── config/                    # Platform definition files (JSON)
│   │   ├── platforms.json
│   │   ├── platforms_social.json
│   │   ├── platforms_email.json
│   │   ├── platforms_phone.json
│   │   ├── platforms_developer.json
│   │   ├── platforms_community.json
│   │   ├── platforms_security.json
│   │   └── platforms_video_creative.json
│   ├── engine/                    # Core probe, analysis, risk scoring
│   │   ├── probe.go
│   │   ├── analyzer.go
│   │   ├── risk.go
│   │   └── identity.go
│   ├── handlers/                  # HTTP route handlers
│   │   └── detect.go
│   └── models/                    # Shared data types
│       └── types.go
└── frontend/
    └── src/
        ├── api/                   # Axios API client and TypeScript types
        ├── components/            # React UI components
        └── hooks/                 # useScan state management hook
```

---

## Prerequisites

### Docker (recommended)

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine with the Compose plugin

### Manual

- Go 1.22 or later — [go.dev/dl](https://go.dev/dl/)
- Node.js 18 or later — [nodejs.org](https://nodejs.org/)

---

## Running with Docker

```bash
docker compose up --build
```

The application will be available at **http://localhost:8080**.

The backend API runs on an internal Docker network and is proxied through Nginx. No separate port is exposed for the backend.

---

## Running Manually

### 1. Backend

```bash
cd backend
go mod tidy
go run .
```

The API server starts on port `8080`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server starts on port `5173` by default. Open **http://localhost:5173** in your browser.

---

## API Reference

### GET /api/platforms

Returns the full list of supported platforms.

**Response:**
```json
[
  {
    "id": "github",
    "name": "GitHub",
    "icon_url": "https://cdn.simpleicons.org/github/ffffff",
    "supports": ["username"]
  }
]
```

---

### POST /api/detect

Runs a scan for the given identities across selected (or all) platforms.

**Request body:**
```json
{
  "usernames": ["torvalds"],
  "emails": ["user@example.com"],
  "phones": ["+12125551234"],
  "platforms": ["github", "reddit"]
}
```

- `platforms` is optional. Omit or pass an empty array to scan all platforms.
- Phone numbers must be in E.164 format (e.g. `+12125551234`).

**Response:**
```json
{
  "total": 2,
  "results": [
    {
      "platform": "GitHub",
      "platform_id": "github",
      "platform_icon": "https://cdn.simpleicons.org/github/ffffff",
      "identity": "torvalds",
      "identity_type": "username",
      "status": "found",
      "profile_url": "https://github.com/torvalds",
      "status_code": 200,
      "platform_confidence": "high"
    }
  ],
  "risk_report": {
    "overall_risk_level": "medium",
    "overall_score": 34,
    "overall_score_out_of_100": 34,
    "identities": [],
    "scan_summary": {
      "total_identities": 1,
      "total_platforms": 2,
      "total_found": 1,
      "total_breached": 0,
      "total_errors": 0
    }
  }
}
```

**Status values:**

| Value | Meaning |
|---|---|
| `found` | Account confirmed present |
| `not_found` | Account confirmed absent |
| `uncertain` | Ambiguous response — manual verification recommended |
| `breached` | Identity appears in public breach data |
| `error` | Network or upstream error |

---

## Risk Scoring

Each scan produces a risk report with scores normalized to a 0–100 scale.

Scores are computed per identity using:

- **Platform weight** — each platform carries a sensitivity weight (1–10) based on its category
- **Identity type multiplier** — phone x1.5, email x1.2, username x1.0
- **Breach bonus** — +50 points when the identity appears in a breach database
- **Correlation bonus** — +15 to +30 points when multiple identity types resolve to the same person

**Risk levels:**

| Level | Score range |
|---|---|
| None | 0 |
| Low | 1 – 15 |
| Medium | 16 – 40 |
| High | 41 – 80 |
| Critical | 81 – 100 |

---

## Adding New Platforms

Add an entry to any JSON file under `backend/config/`. No code changes are required — restart the backend to load the new definition.

**Minimal example:**
```json
{
  "id": "myplatform",
  "name": "My Platform",
  "icon_url": "https://cdn.simpleicons.org/myplatform/ffffff",
  "url_template": "https://myplatform.com/{username}",
  "check_type": "profile_url",
  "found_status_code": 200,
  "not_found_status_code": 404,
  "not_found_regex": "user not found",
  "supports": ["username"],
  "weight": 5,
  "category": "social",
  "confidence": "high"
}
```

**Supported `check_type` values:** `profile_url`, `api`, `login`, `reset`, `signup`

**Supported `supports` values:** `username`, `email`, `phone`

---

## Features

- Multi-identity scanning across 260+ platforms — usernames, emails, phone numbers
- Concurrent probing with per-identity-type concurrency limits (20 / 5 / 3 goroutines)
- Automatic retry with exponential backoff on network failures
- Per-platform rate limiting to avoid triggering upstream defenses
- Weighted risk scoring normalized to a 0–100 display scale with a circular gauge
- Breach database integration via Have I Been Pwned
- Cross-identity correlation detection and bonus scoring
- Selective platform scanning — choose a subset or scan all
- Expandable HTTP response snippets for manual triage
- Responsive dark UI with desktop table and mobile card layouts

---

## License

For educational and research purposes only. Not for unauthorized use.
