// internal/database/db.go
package database

import (
	"fmt"
	"log"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"smartestate/internal/config"
	"smartestate/internal/models"
)

func InitDB(cfg config.DatabaseConfig) (*gorm.DB, error) {
	// First, ensure the database exists
	if err := ensureDatabase(cfg); err != nil {
		return nil, fmt.Errorf("failed to ensure database exists: %w", err)
	}

	// Connect to the database
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%d sslmode=disable",
		cfg.Host, cfg.User, cfg.Password, cfg.Name, cfg.Port)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger:                                   logger.Default.LogMode(logger.Info),
		DisableForeignKeyConstraintWhenMigrating: true, // Important for UUID relations
	})

	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Configure connection pool
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database instance: %w", err)
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	// Test connection
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}
	log.Println("Database connection established")

	// Enable UUID support
	if err := enableUUIDSupport(db); err != nil {
		log.Printf("Warning: Could not enable UUID support: %v", err)
	}

	// Run migrations
	if err := runMigrations(db); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Println("Database initialized successfully")
	return db, nil
}

func ensureDatabase(cfg config.DatabaseConfig) error {
	// Connect to postgres database to check/create target database
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=postgres port=%d sslmode=disable",
		cfg.Host, cfg.User, cfg.Password, cfg.Port)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Error),
	})
	if err != nil {
		return fmt.Errorf("failed to connect to postgres: %w", err)
	}

	// Check if database exists
	var exists bool
	checkSQL := fmt.Sprintf("SELECT EXISTS(SELECT datname FROM pg_catalog.pg_database WHERE datname = '%s')", cfg.Name)
	if err := db.Raw(checkSQL).Scan(&exists).Error; err != nil {
		return fmt.Errorf("failed to check if database exists: %w", err)
	}

	if !exists {
		// Create database
		createSQL := fmt.Sprintf("CREATE DATABASE %s", cfg.Name)
		if err := db.Exec(createSQL).Error; err != nil {
			return fmt.Errorf("failed to create database: %w", err)
		}
		log.Printf("Database %s created successfully", cfg.Name)
	} else {
		log.Printf("Database %s already exists", cfg.Name)
	}

	// Close connection
	sqlDB, _ := db.DB()
	sqlDB.Close()

	return nil
}

func enableUUIDSupport(db *gorm.DB) error {
	log.Println("Enabling UUID support...")

	// Try to enable pgcrypto (provides gen_random_uuid)
	if err := db.Exec("CREATE EXTENSION IF NOT EXISTS pgcrypto").Error; err != nil {
		log.Printf("Could not enable pgcrypto: %v", err)

		// Try uuid-ossp as fallback
		if err := db.Exec("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"").Error; err != nil {
			return fmt.Errorf("could not enable any UUID extension: %w", err)
		}
		log.Println("Enabled uuid-ossp extension")
	} else {
		log.Println("Enabled pgcrypto extension")
	}

	return nil
}

func runMigrations(db *gorm.DB) error {
	log.Println("Starting migrations...")

	// Debug: Let's first try to create a very simple table to test
	log.Println("Testing with simple model first...")
	type SimpleTest struct {
		ID   uint `gorm:"primaryKey"`
		Name string
	}

	if err := db.AutoMigrate(&SimpleTest{}); err != nil {
		log.Printf("ERROR: Even simple model migration failed: %v", err)
		return fmt.Errorf("database migration test failed: %w", err)
	}

	// Drop test table
	db.Exec("DROP TABLE IF EXISTS simple_tests")
	log.Println("Simple model test passed")

	// Now let's try User model step by step
	log.Println("Creating User model structure...")

	// First, try to create the table manually
	createUserSQL := `
    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20),
        password_hash TEXT NOT NULL,
        full_name VARCHAR(255),
        avatar_url VARCHAR(500),
        role VARCHAR(50) DEFAULT 'user',
        subscription_tier VARCHAR(50) DEFAULT 'free',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP
    )`

	if err := db.Exec(createUserSQL).Error; err != nil {
		log.Printf("Could not create users table manually: %v", err)
		log.Println("Attempting AutoMigrate for User model...")

		// Try AutoMigrate
		if err := db.AutoMigrate(&models.User{}); err != nil {
			log.Printf("ERROR details: %+v", err)
			return fmt.Errorf("failed to migrate User model: %w", err)
		}
	} else {
		log.Println("Users table created manually")

		// Add index for deleted_at
		db.Exec("CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at)")
	}

	// Continue with other models
	models := []interface{}{
		&models.Property{},
		&models.PropertyView{},
		&models.ChatSession{},
		&models.ChatMessage{},
		&models.Campaign{},
		&models.ParseRequest{},
	}

	for _, model := range models {
		modelName := fmt.Sprintf("%T", model)
		log.Printf("Migrating %s...", modelName)

		if err := db.AutoMigrate(model); err != nil {
			log.Printf("Warning: Failed to migrate %s: %v (continuing...)", modelName, err)
		} else {
			log.Printf("%s migrated successfully", modelName)
		}
	}

	// After all tables are created, add foreign key constraints
	log.Println("Adding foreign key constraints...")
	constraints := []string{
		"ALTER TABLE properties ADD CONSTRAINT fk_properties_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE",
		"ALTER TABLE property_views ADD CONSTRAINT fk_property_views_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE",
		"ALTER TABLE property_views ADD CONSTRAINT fk_property_views_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL",
		"ALTER TABLE chat_sessions ADD CONSTRAINT fk_chat_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE",
		"ALTER TABLE chat_messages ADD CONSTRAINT fk_chat_messages_session FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE",
		"ALTER TABLE campaigns ADD CONSTRAINT fk_campaigns_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE",
		"ALTER TABLE parse_requests ADD CONSTRAINT fk_parse_requests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL",
	}

	for _, constraint := range constraints {
		if err := db.Exec(constraint).Error; err != nil {
			// Ignore if constraint already exists
			log.Printf("Note: Could not add constraint (may already exist): %v", err)
		}
	}

	log.Println("All migrations completed")
	return nil
}
