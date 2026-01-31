package main

import (
	"context"
	"fmt"
	"log"
	"os"

	firebase "firebase.google.com/go/v4"
	"github.com/Woeter69/hackoverflow/internal/database"
	"github.com/Woeter69/hackoverflow/internal/handlers"
	"github.com/Woeter69/hackoverflow/internal/middleware"
	"github.com/Woeter69/hackoverflow/internal/websocket"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Try loading from current dir or parent for Docker/Air flexibility
	_ = godotenv.Load()
	_ = godotenv.Load("/app/.env")

	// Initialize Websocket Hub
	wsHub := websocket.NewHub()
	go wsHub.Run()
	handlers.SetHub(wsHub)

	// Initialize Firebase App
	ctx := context.Background()
	firebaseApp, err := firebase.NewApp(ctx, nil)
	if err != nil {
		log.Printf("Warning: Failed to initialize Firebase: %v", err)
		// We don't fatal here just yet to allow local dev without keys if needed, 
		// but middleware will fail if called.
	}

	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		// Fallback for local development if DB_URL isn't fully formed in .env
		dbUser := os.Getenv("DB_USER")
		dbPass := os.Getenv("DB_PASSWORD")
		dbHost := os.Getenv("DB_HOST")
		dbPort := os.Getenv("DB_PORT")
		dbName := os.Getenv("DB_NAME")
		dbSSL := os.Getenv("DB_SSLMODE")
		
		if dbHost == "" { dbHost = "localhost" } // Default for local run outside docker

		dbURL = fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
			dbUser, dbPass, dbHost, dbPort, dbName, dbSSL)
	}

	database.InitDB(dbURL)
	defer database.DB.Close()

	if err := database.InitRedis(); err != nil {
		log.Printf("Warning: Failed to connect to Redis: %v", err)
	} else {
		fmt.Println("Connected to Redis")
	}

	// Set Gin mode
	mode := os.Getenv("GIN_MODE")
	if mode != "" {
		gin.SetMode(mode)
	}

	r := gin.Default()

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy"})
	})

	// WebSocket Route
	r.GET("/ws", func(c *gin.Context) {
		websocket.ServeWs(wsHub, c)
	})

	// API Routes
	api := r.Group("/api/v1")
	// Protect all API routes with Firebase Auth
	if firebaseApp != nil {
		api.Use(middleware.AuthMiddleware(firebaseApp))
	}
	{
		api.POST("/travel-plans", handlers.CreateTravelPlan)
		api.GET("/travel-plans/:id/matches", handlers.FindMatchingErrands)
		api.POST("/errand-requests", handlers.CreateErrandRequest)
		api.GET("/errand-requests", handlers.GetPendingErrands)
		api.PUT("/errand-requests/:id/status", handlers.UpdateErrandStatus)
		api.POST("/emergency", handlers.ToggleEmergency)
		api.GET("/profile", handlers.GetUserProfile)
		api.GET("/errand-requests/:id/chat", handlers.GetChatHistory)
		api.POST("/errand-requests/:id/chat", handlers.SendMessage)
	}

	// Serve Frontend Static Files
	r.Static("/assets", "./dist/assets")
	r.StaticFile("/favicon.ico", "./dist/favicon.ico")

	// SPA Fallback: Serve index.html for any unknown route, except API routes
	r.NoRoute(func(c *gin.Context) {
		if len(c.Request.URL.Path) >= 4 && c.Request.URL.Path[:4] == "/api" {
			c.JSON(404, gin.H{"error": "API endpoint not found"})
			return
		}
		c.File("./dist/index.html")
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("CampusLoop Backend starting on port %s...\n", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
