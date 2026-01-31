package handlers

import (
	"log"
	"net/http"
	"time"

	"github.com/Woeter69/hackoverflow/internal/database"
	"github.com/Woeter69/hackoverflow/internal/models"
	"github.com/Woeter69/hackoverflow/internal/websocket"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

var wsHub *websocket.Hub

func SetHub(hub *websocket.Hub) {
	wsHub = hub
}

// DTOs for JSON binding
type CreateTravelPlanRequest struct {
	UserID    string `json:"user_id"`
	RouteGeom string `json:"route_geom"` // WKT
}

type CreateErrandRequestDTO struct {
	UserID         string  `json:"user_id"`
	Title          string  `json:"title"`
	Description    string  `json:"description"`
	Category       string  `json:"category"`
	PickupGeom     string  `json:"pickup_geom"`  // WKT
	DropoffGeom    string  `json:"dropoff_geom"` // WKT
	RewardEstimate float64 `json:"reward_estimate"`
}

func CreateTravelPlan(c *gin.Context) {
	var req CreateTravelPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Default values for fields not in the simplified UI
	originName := "Point A"
	destName := "Point B"
	mode := "walk"
	startTime := time.Now()

	// Extract start/end points from LineString for origin/dest (Simplified)
	// We just insert the route_geom. PostGIS matching uses route_geom.
	// For origin_geom and destination_geom, we can use ST_StartPoint and ST_EndPoint in SQL but they work on Geometry, not Geography directly in some versions without casting.
    // Let's use a robust query.
	
	fullQuery := `
		INSERT INTO travel_plans (user_id, origin_name, destination_name, origin_geom, destination_geom, route_geom, mode, start_time)
		VALUES (
			$1, $2, $3, 
			ST_StartPoint(ST_GeomFromText($4, 4326))::geography, 
			ST_EndPoint(ST_GeomFromText($4, 4326))::geography, 
			ST_GeogFromText($4), 
			$5, $6
		)
		RETURNING id
	`

	var newID string
	err := database.DB.QueryRow(fullQuery, req.UserID, originName, destName, req.RouteGeom, mode, startTime).Scan(&newID)
	if err != nil {
		log.Printf("CreateTravelPlan DB Error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB Insert Failed: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": newID, "status": "created"})
}

func CreateErrandRequest(c *gin.Context) {
	var req CreateErrandRequestDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	query := `
		INSERT INTO errand_requests (user_id, title, description, category, pickup_geom, dropoff_geom, status, urgency_level, reward_estimate)
		VALUES ($1, $2, $3, $4, ST_GeomFromText($5, 4326)::geography, ST_GeomFromText($6, 4326)::geography, 'pending', 1, $7)
		RETURNING id
	`

	var newID string
	err := database.DB.QueryRow(query, req.UserID, req.Title, req.Description, req.Category, req.PickupGeom, req.DropoffGeom, req.RewardEstimate).Scan(&newID)
	if err != nil {
		log.Printf("CreateErrandRequest DB Error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB Insert Failed: " + err.Error()})
		return
	}

	// Broadcast the new errand via WebSocket
	if wsHub != nil {
		// Fetch the full details with coordinates
		var e ErrandResponseDTO
		q := `
			SELECT 
				id, title, description, category, reward_estimate,
				ST_Y(pickup_geom::geometry) as pickup_lat,
				ST_X(pickup_geom::geometry) as pickup_lng,
				ST_Y(dropoff_geom::geometry) as dropoff_lat,
				ST_X(dropoff_geom::geometry) as dropoff_lng
			FROM errand_requests
			WHERE id = $1
		`
		if err := database.DB.QueryRow(q, newID).Scan(&e.ID, &e.Title, &e.Description, &e.Category, &e.RewardEstimate, &e.PickupLat, &e.PickupLng, &e.DropoffLat, &e.DropoffLng); err == nil {
			wsHub.BroadcastJSON("NEW_ERRAND", e)

			// --- Notification Logic for Matching Travelers ---
			// Find travelers whose route is within 200m of this new errand's pickup
			matchQuery := `
				SELECT user_id 
				FROM travel_plans 
				WHERE is_active = TRUE 
				AND ST_DWithin(route_geom, ST_GeomFromText($1, 4326), 200)
			`
			rows, matchErr := database.DB.Query(matchQuery, req.PickupGeom)
			if matchErr == nil {
				defer rows.Close()
				var matchedUserIDs []string
				for rows.Next() {
					var uid string
					if err := rows.Scan(&uid); err == nil {
						matchedUserIDs = append(matchedUserIDs, uid)
					}
				}

				if len(matchedUserIDs) > 0 {
					wsHub.BroadcastJSON("MATCH_NOTIFICATION", gin.H{
						"errand":           e,
						"matched_user_ids": matchedUserIDs,
					})
					log.Printf("Notified %d travelers about new errand %s", len(matchedUserIDs), newID)
				}
			} else {
				log.Printf("Error finding matching travelers: %v", matchErr)
			}
			// ------------------------------------------------
		}
	}

	c.JSON(http.StatusCreated, gin.H{"id": newID, "status": "created"})
}

type ErrandResponseDTO struct {
	ID             string  `json:"id"`
	UserID         string  `json:"user_id"`
	RunnerID       string  `json:"runner_id"`
	Title          string  `json:"title"`
	Description    string  `json:"description"`
	Category       string  `json:"category"`
	RewardEstimate float64 `json:"reward_estimate"`
	PickupLat      float64 `json:"pickup_lat"`
	PickupLng      float64 `json:"pickup_lng"`
	DropoffLat     float64 `json:"dropoff_lat"`
	DropoffLng     float64 `json:"dropoff_lng"`
}

func GetPendingErrands(c *gin.Context) {
	query := `
		SELECT 
			id, user_id, COALESCE(runner_id, '') as runner_id, title, description, category, reward_estimate::FLOAT,
			ST_Y(pickup_geom::geometry) as pickup_lat,
			ST_X(pickup_geom::geometry) as pickup_lng,
			ST_Y(dropoff_geom::geometry) as dropoff_lat,
			ST_X(dropoff_geom::geometry) as dropoff_lng
		FROM errand_requests
		WHERE status IN ('pending', 'matched')
		ORDER BY created_at DESC
		LIMIT 50
	`

	rows, err := database.DB.Query(query)
	if err != nil {
		log.Printf("GetPendingErrands DB Error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Query failed: " + err.Error()})
		return
	}
	defer rows.Close()

	errands := []ErrandResponseDTO{}
	for rows.Next() {
		var e ErrandResponseDTO
		if err := rows.Scan(&e.ID, &e.UserID, &e.RunnerID, &e.Title, &e.Description, &e.Category, &e.RewardEstimate, &e.PickupLat, &e.PickupLng, &e.DropoffLat, &e.DropoffLng); err != nil {
			log.Printf("Scan Error: %v\n", err)
			continue
		}
		errands = append(errands, e)
	}

	c.JSON(http.StatusOK, errands)
}

type UpdateErrandStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=completed cancelled pending matched"`
}

func UpdateErrandStatus(c *gin.Context) {
	id := c.Param("id")
	var req UpdateErrandStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("userID")

	// Special handling for matching (accepting) an errand
	if req.Status == "matched" {
		_, err := database.DB.Exec("UPDATE errand_requests SET status = 'matched', runner_id = $1 WHERE id = $2 AND status = 'pending'", userID, id)
		if err != nil {
			log.Printf("AcceptErrand DB Error: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to accept errand"})
			return
		}
	} else if req.Status == "cancelled" {
		// Authorization check: Only requester, runner, or admin can cancel
		var requesterID, runnerID string
		err := database.DB.QueryRow("SELECT user_id, runner_id FROM errand_requests WHERE id = $1", id).Scan(&requesterID, &runnerID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Errand not found"})
			return
		}

		// In this hackathon build, we assume 'admin' can be a specific ID or we check context
		isAdmin := false // Placeholder for actual admin role check if implemented
		
		if userID != requesterID && userID != runnerID && !isAdmin {
			c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to cancel this mission"})
			return
		}

		_, err = database.DB.Exec("UPDATE errand_requests SET status = 'cancelled' WHERE id = $1", id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel mission"})
			return
		}
	} else {
		// Update status in DB for other statuses (e.g., completed)
		_, err := database.DB.Exec("UPDATE errand_requests SET status = $1 WHERE id = $2", req.Status, id)
		if err != nil {
			log.Printf("UpdateErrandStatus DB Error: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update status"})
			return
		}
	}

	// If completed, award credits/XP to the person who did it (the runner)
	if req.Status == "completed" {
		// Get reward amount and the runner's ID
		var reward float64
		var runnerID string
		err := database.DB.QueryRow("SELECT reward_estimate, runner_id FROM errand_requests WHERE id = $1", id).Scan(&reward, &runnerID)
		if err == nil && runnerID != "" {
			// Award XP and Credits to the runner
			_, updateErr := database.DB.Exec("UPDATE users SET credits = credits + $1, xp = xp + 50 WHERE id = $2", int(reward), runnerID)
			if updateErr != nil {
				log.Printf("Failed to award credits: %v\n", updateErr)
			} else {
				log.Printf("Awarded %d credits to runner %s for errand %s\n", int(reward), runnerID, id)
			}
		}
	}

	// Broadcast update
	if wsHub != nil {
		wsHub.BroadcastJSON("ERRAND_STATUS_UPDATE", gin.H{
			"id":     id,
			"status": req.Status,
		})
	}

	c.JSON(http.StatusOK, gin.H{"status": "updated"})
}

type EmergencyToggleRequest struct {
	Active     bool   `json:"active"`
	Message    string `json:"message"`
	BuildingID int    `json:"building_id"`
}

func GetChatHistory(c *gin.Context) {
	errandID := c.Param("id")
	
	query := `
		SELECT id, errand_id, sender_id, content, is_encrypted, created_at
		FROM messages
		WHERE errand_id = $1
		ORDER BY created_at ASC
	`
	rows, err := database.DB.Query(query, errandID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch chat"})
		return
	}
	defer rows.Close()

	messages := []models.Message{}
	for rows.Next() {
		var m models.Message
		if err := rows.Scan(&m.ID, &m.ErrandID, &m.SenderID, &m.Content, &m.IsEncrypted, &m.CreatedAt); err != nil {
			continue
		}
		messages = append(messages, m)
	}

	c.JSON(http.StatusOK, messages)
}

func SendMessage(c *gin.Context) {
	errandIDStr := c.Param("id")
	errandID, err := uuid.Parse(errandIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid errand ID"})
		return
	}

	var req struct {
		Content  string `json:"content"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	senderID := c.GetString("userID")
	if senderID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	query := `
		INSERT INTO messages (errand_id, sender_id, content)
		VALUES ($1, $2, $3)
		RETURNING id, created_at
	`
	var m models.Message
	m.ErrandID = errandID
	m.SenderID = senderID
	m.Content = req.Content
	m.IsEncrypted = true

	err = database.DB.QueryRow(query, errandID, senderID, req.Content).Scan(&m.ID, &m.CreatedAt)
	if err != nil {
		log.Printf("SendMessage DB Error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save message"})
		return
	}

	// Broadcast via WebSocket
	if wsHub != nil {
		wsHub.BroadcastJSON("NEW_MESSAGE", m)

		// Send targeted notification to the other party
		var requesterID, runnerID string
		err := database.DB.QueryRow("SELECT user_id, runner_id FROM errand_requests WHERE id = $1", errandID).Scan(&requesterID, &runnerID)
		if err == nil {
			recipientID := requesterID
			if senderID == requesterID {
				recipientID = runnerID
			}
			if recipientID != "" {
				wsHub.SendToUser(recipientID, "INCOMING_CHAT", gin.H{
					"errand_id": errandID,
					"sender_id": senderID,
				})
			}
		}
	}

	c.JSON(http.StatusCreated, m)
}

func ToggleEmergency(c *gin.Context) {
	var req EmergencyToggleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	userID := c.GetString("userID")
	// TODO: Implement actual emergency logic (insert into emergency_beacons)
	log.Printf("Emergency toggled by %s: %v", userID, req)

	c.JSON(http.StatusOK, gin.H{"status": "success", "active": req.Active})
}

func GetUserProfile(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var u models.User
	query := "SELECT id, username, email, credits, xp, rating, created_at FROM users WHERE id = $1"
	err := database.DB.QueryRow(query, userID).Scan(&u.ID, &u.Username, &u.Email, &u.Credits, &u.XP, &u.Rating, &u.CreatedAt)
	if err != nil {
		// Lazy Registration: If user not found, create them
		log.Printf("User %s not found, creating new profile...", userID)
		
		insertQuery := `
			INSERT INTO users (id, username, email, credits, xp, rating)
			VALUES ($1, 'Traveler', 'traveler@campusloop.xyz', 100, 0, 5.0)
			RETURNING id, username, email, credits, xp, rating, created_at
		`
		err = database.DB.QueryRow(insertQuery, userID).Scan(&u.ID, &u.Username, &u.Email, &u.Credits, &u.XP, &u.Rating, &u.CreatedAt)
		if err != nil {
			log.Printf("GetUserProfile Create Error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user profile"})
			return
		}
	}
	c.JSON(http.StatusOK, u)
}
