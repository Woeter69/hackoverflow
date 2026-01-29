package handlers

import (
	"log"
	"net/http"
	"time"

	"github.com/Woeter69/hackoverflow/internal/database"
	"github.com/Woeter69/hackoverflow/internal/websocket"
	"github.com/gin-gonic/gin"
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
		}
	}

	c.JSON(http.StatusCreated, gin.H{"id": newID, "status": "created"})
}

type ErrandResponseDTO struct {
	ID             string  `json:"id"`
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
			id, title, description, category, reward_estimate::FLOAT,
			ST_Y(pickup_geom::geometry) as pickup_lat,
			ST_X(pickup_geom::geometry) as pickup_lng,
			ST_Y(dropoff_geom::geometry) as dropoff_lat,
			ST_X(dropoff_geom::geometry) as dropoff_lng
		FROM errand_requests
		WHERE status = 'pending'
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
		if err := rows.Scan(&e.ID, &e.Title, &e.Description, &e.Category, &e.RewardEstimate, &e.PickupLat, &e.PickupLng, &e.DropoffLat, &e.DropoffLng); err != nil {
			log.Printf("Scan Error: %v\n", err)
			continue
		}
		errands = append(errands, e)
	}

	c.JSON(http.StatusOK, errands)
}

type UpdateErrandStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=completed cancelled pending"`
}

func UpdateErrandStatus(c *gin.Context) {
	id := c.Param("id")
	var req UpdateErrandStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update status in DB
	_, err := database.DB.Exec("UPDATE errand_requests SET status = $1 WHERE id = $2", req.Status, id)
	if err != nil {
		log.Printf("UpdateErrandStatus DB Error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update status"})
		return
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

func ToggleEmergency(c *gin.Context) {
	var req EmergencyToggleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Broadcast global alert with details
	if wsHub != nil {
		wsHub.BroadcastJSON("EMERGENCY_STATE", gin.H{
			"active":      req.Active,
			"message":     req.Message,
			"building_id": req.BuildingID,
		})
	}

	c.JSON(http.StatusOK, gin.H{"status": "broadcasted", "active": req.Active})
}
