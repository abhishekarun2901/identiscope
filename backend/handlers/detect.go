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

	results := engine.ProbeAll(validated, platforms, sel)
	c.JSON(http.StatusOK, models.DetectResponse{Results: results, Total: len(results)})
}
