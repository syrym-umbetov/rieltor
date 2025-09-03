// internal/database/redis.go
package database

import (
	"context"
	"log"

	"github.com/redis/go-redis/v9"
	"smartestate/internal/config"
)

func InitRedis(cfg config.RedisConfig) *redis.Client {
	opts, err := redis.ParseURL(cfg.URL)
	if err != nil {
		log.Printf("Failed to parse Redis URL, using default: %v", err)
		// Use default if URL parsing fails
		opts = &redis.Options{
			Addr: "localhost:6379",
			DB:   0,
		}
	}

	client := redis.NewClient(opts)

	// Test connection
	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		log.Printf("Warning: Could not connect to Redis: %v", err)
		// Don't panic - allow the app to run without Redis
		// You might want to return nil and handle it in your services
	}

	return client
}
