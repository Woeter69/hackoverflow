package websocket

import "encoding/json"

// Hub maintains the set of active clients and broadcasts messages to the
// clients.
type Hub struct {
	// Registered clients.
	clients map[*Client]bool

	// Inbound messages from the clients.
	broadcast chan []byte

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client
}

func NewHub() *Hub {
	return &Hub{
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
		case message := <-h.broadcast:
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
		}
	}
}

// BroadcastJSON is a helper to send JSON structs to all clients
func (h *Hub) BroadcastJSON(eventType string, payload interface{}) {
	msg := map[string]interface{}{
		"type":    eventType,
		"payload": payload,
	}
	bytes, err := json.Marshal(msg)
	if err == nil {
		h.broadcast <- bytes
	}
}

// SendToUser sends a message to a specific user
func (h *Hub) SendToUser(userID string, eventType string, payload interface{}) {
	msg := map[string]interface{}{
		"type":    eventType,
		"payload": payload,
	}
	bytes, err := json.Marshal(msg)
	if err != nil {
		return
	}

	for client := range h.clients {
		if client.UserID == userID {
			select {
			case client.send <- bytes:
			default:
				// If send channel is full, do nothing or handle accordingly
			}
		}
	}
}
