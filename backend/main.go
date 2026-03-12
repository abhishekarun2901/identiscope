package main

import (
	"log"
	"os"
	"path/filepath"
	"runtime"

	"identiscope/backend/handlers"

	"github.com/gin-gonic/gin"
)

func main() {
	// Support CONFIG_DIR env var for Docker deployments;
	// fall back to source-relative config/ for local dev.
	configDir := os.Getenv("CONFIG_DIR")
	if configDir == "" {
		_, filename, _, _ := runtime.Caller(0)
		configDir = filepath.Join(filepath.Dir(filename), "config")
	}

	if err := handlers.LoadPlatforms(configDir); err != nil {
		log.Fatalf("Failed to load platform config: %v", err)
	}
	log.Println("Platform config loaded successfully")

	r := gin.Default()

	// CORS middleware
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Accept")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Routes
	api := r.Group("/api")
	{
		api.GET("/platforms", handlers.GetPlatforms)
		api.POST("/detect", handlers.Detect)
	}

	log.Println("IdentiScope backend listening on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
