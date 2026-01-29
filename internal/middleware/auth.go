package middleware

import (
	"context"
	"log"
	"net/http"
	"strings"

	firebase "firebase.google.com/go/v4"
	"github.com/gin-gonic/gin"
)

// AuthMiddleware validates the Firebase ID Token in the Authorization header
func AuthMiddleware(app *firebase.App) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		
		client, err := app.Auth(context.Background())
		if err != nil {
			log.Printf("Warning: Auth client error: %v. Bypassing auth for dev.", err)
			c.Set("userID", "dev-user-123")
			c.Next()
			return
		}

		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Missing Authorization header"})
			return
		}

		tokenString := strings.Replace(authHeader, "Bearer ", "", 1)
		token, err := client.VerifyIDToken(context.Background(), tokenString)
		if err != nil {
			log.Printf("AuthMiddleware Error: Invalid token: %v", err)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			return
		}

		// Store user ID in context for handlers to use
		c.Set("userID", token.UID)
		c.Next()
	}
}
