package database

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/lib/pq"
)

var DB *sql.DB

func InitDB(url string) {
	var err error
	
	// Retry logic for DB connection (30s timeout total)
	maxRetries := 10
	for i := 0; i < maxRetries; i++ {
		DB, err = sql.Open("postgres", url)
		if err == nil {
			err = DB.Ping()
			if err == nil {
				fmt.Println("Database connection established")
				return
			}
		}
		
		log.Printf("Attempt %d: Database unreachable, retrying in 3s... (Error: %v)", i+1, err)
		time.Sleep(3 * time.Second)
	}

	log.Fatalf("Failed to connect to database after %d attempts: %v", maxRetries, err)
}
