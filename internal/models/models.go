package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID           string    `json:"id"`
	Username     string    `json:"username"`
	Email        string    `json:"email"`
	Credits      int       `json:"credits"`
	XP           int       `json:"xp"`
	Rating       float64   `json:"rating"`
	CreatedAt    time.Time `json:"created_at"`
}

type Message struct {
	ID          uuid.UUID `json:"id"`
	ErrandID    uuid.UUID `json:"errand_id"`
	SenderID    string    `json:"sender_id"`
	Content     string    `json:"content"`
	IsEncrypted bool      `json:"is_encrypted"`
	CreatedAt   time.Time `json:"created_at"`
}

type Point struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

type TravelPlan struct {
	ID              uuid.UUID `json:"id"`
	UserID          uuid.UUID `json:"user_id"`
	OriginName      string    `json:"origin_name"`
	DestinationName string    `json:"destination_name"`
	Origin          Point     `json:"origin"`
	Destination     Point     `json:"destination"`
	Route           []Point   `json:"route,omitempty"` // LineString
	Mode            string    `json:"mode"`           // walk, cycle, car
	StartTime       time.Time `json:"start_time"`
	SeatsAvailable  int       `json:"seats_available"`
	IsActive        bool      `json:"is_active"`
	CreatedAt       time.Time `json:"created_at"`
}

type ErrandRequest struct {
	ID             uuid.UUID `json:"id"`
	UserID         uuid.UUID `json:"user_id"`
	Title          string    `json:"title"`
	Description    string    `json:"description"`
	Pickup         Point     `json:"pickup"`
	Dropoff        Point     `json:"dropoff"`
	Status         string    `json:"status"` // pending, matched, etc.
	Category       string    `json:"category"` // delivery, borrow, favor, etc.
	RunnerID       string    `json:"runner_id,omitempty"`
	UrgencyLevel   int       `json:"urgency_level"`
	RewardEstimate float64   `json:"reward_estimate"`
	CreatedAt      time.Time `json:"created_at"`
}

type MatchResponse struct {
	Errand          ErrandRequest `json:"errand"`
	DistanceFromRoute float64     `json:"distance_from_route"` // in meters
}
