# Identiscope

**Identity-Based Account Discovery Engine**

Identiscope is a full-stack tool that checks whether a given username, email, or phone number has registered accounts on 30+ online platforms. Built for security researchers, ethical hackers, and privacy-conscious individuals.

> ⚠️ **For authorized use only.** Only scan identities you own or have explicit written permission to investigate.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS v4 |
| Backend | Go 1.22 + Gin |
| Config | JSON-driven platform definitions |

---

## Project Structure

```
identiscope/
├── backend/                   # Go API server
│   ├── main.go
│   ├── config/platforms.json  # Platform definitions (add new ones here)
│   ├── engine/                # Probe, analyzer, identity validator
│   ├── handlers/              # HTTP endpoint handlers
│   └── models/                # Shared types
└── frontend/                  # React + Vite app
    └── src/
        ├── components/        # UI components
        ├── api/               # Backend API client
        └── hooks/             # useScan state hook
```

---

## Prerequisites

- **Go 1.22+** — [Download](https://go.dev/dl/)
- **Node.js 18+** — [Download](https://nodejs.org/)

---

## Setup & Run

### 1. Backend

```bash
cd backend

# Download dependencies
go mod tidy

# Start the API server (port 8080)
go run .
```

### 2. Frontend (new terminal)

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Start dev server (port 8080)
npm run dev
```

Open **http://localhost:8080** in your browser.

---

## API Reference

### `GET /api/platforms`

Returns the list of supported platforms.

```json
[
  { "id": "github", "name": "GitHub", "icon_url": "...", "supports": ["username"] },
  ...
]
```

### `POST /api/detect`

Runs a scan for the given identities.

**Request:**
```json
{
  "usernames": ["torvalds"],
  "emails": ["user@example.com"],
  "phones": ["+1234567890"],
  "platforms": ["github", "reddit"]
}
```

- `platforms`: optional — omit or send `[]` to scan all platforms

**Response:**
```json
{
  "total": 2,
  "results": [
    {
      "platform": "GitHub",
      "platform_id": "github",
      "identity": "torvalds",
      "identity_type": "username",
      "status": "found",
      "profile_url": "https://github.com/torvalds",
      "status_code": 200
    }
  ]
}
```

**Status values:** `found` · `not_found` · `uncertain` · `error`

---

## Adding New Platforms

Edit `backend/config/platforms.json` and add an entry:

```json
{
  "id": "myplatform",
  "name": "My Platform",
  "icon_url": "https://cdn.simpleicons.org/myplatform/ffffff",
  "url_template": "https://myplatform.com/{username}",
  "check_type": "profile_url",
  "found_status_code": 200,
  "not_found_status_code": 404,
  "found_regex": "",
  "not_found_regex": "user not found",
  "delay_seconds": 1,
  "user_agent": "Mozilla/5.0 ...",
  "supports": ["username"]
}
```

No code changes required — restart the backend to pick up the new platform.

---

## Features

- 🔍 **Multi-identity scanning** — usernames, emails, phone numbers
- ⚡ **Concurrent probing** — up to 20 goroutines in parallel
- 🔄 **Auto-retry** — up to 2 retries on network failure
- 🎯 **Selective scanning** — choose specific platforms or scan all
- 📊 **Rich results** — status badges, profile links, expandable snippets
- 🌙 **Dark/light mode** — persisted in localStorage
- 📱 **Responsive** — works on desktop and mobile
- 🔌 **Extensible** — add platforms via JSON config, no code changes needed

---

## License

For educational and research purposes only.
