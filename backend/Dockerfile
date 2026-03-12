# ── Stage 1: Build ──────────────────────────────────────────────────
FROM golang:1.22-bookworm AS builder

WORKDIR /app

# Copy all source first (go mod tidy needs the full source tree to resolve imports)
COPY . .

# Generate go.sum and download dependencies, then build
RUN go mod tidy && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /identiscope .

# ── Stage 2: Run ────────────────────────────────────────────────────
FROM debian:bookworm-slim

# Install wget for healthchecks (minimal footprint)
RUN apt-get update && apt-get install -y --no-install-recommends wget ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy the binary and config
COPY --from=builder /identiscope /identiscope
COPY --from=builder /app/config /config

# The binary needs the config directory at runtime.
ENV CONFIG_DIR=/config

EXPOSE 8080

ENTRYPOINT ["/identiscope"]
