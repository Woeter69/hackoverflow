package handlers

import (
	"fmt"
	"net/http"

	"github.com/Woeter69/hackoverflow/internal/database"
	"github.com/Woeter69/hackoverflow/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// FindMatchingErrands finds errands within a certain distance (buffer) of a travel plan's route
func FindMatchingErrands(c *gin.Context) {
	travelPlanIDStr := c.Param("id")
	travelPlanID, err := uuid.Parse(travelPlanIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid travel plan ID"})
		return
	}

	// Buffer distance in meters (default 200m)
	buffer := 200.0

	query := `
		SELECT 
			e.id, e.user_id, e.title, e.description, 
			ST_Y(e.pickup_geom::geometry) as pickup_lat, ST_X(e.pickup_geom::geometry) as pickup_lng,
			ST_Y(e.dropoff_geom::geometry) as dropoff_lat, ST_X(e.dropoff_geom::geometry) as dropoff_lng,
			e.status, e.urgency_level, e.reward_estimate, e.created_at,
			ST_Distance(e.pickup_geom, t.route_geom) as distance_from_route
		FROM errand_requests e, travel_plans t
		WHERE t.id = $1
		  AND e.status = 'pending'
		  AND ST_DWithin(e.pickup_geom, t.route_geom, $2)
		ORDER BY distance_from_route ASC;
	`

	rows, err := database.DB.Query(query, travelPlanID, buffer)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Query failed: %v", err)})
		return
	}
	defer rows.Close()

	var matches []models.MatchResponse
	for rows.Next() {
		var m models.MatchResponse
		err := rows.Scan(
			&m.Errand.ID, &m.Errand.UserID, &m.Errand.Title, &m.Errand.Description,
			&m.Errand.Pickup.Lat, &m.Errand.Pickup.Lng,
			&m.Errand.Dropoff.Lat, &m.Errand.Dropoff.Lng,
			&m.Errand.Status, &m.Errand.UrgencyLevel, &m.Errand.RewardEstimate, &m.Errand.CreatedAt,
			&m.DistanceFromRoute,
		)
		if err != nil {
			continue
		}
		matches = append(matches, m)
	}

	c.JSON(http.StatusOK, matches)
}
