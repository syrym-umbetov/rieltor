// internal/config/config.go
package config

import (
	"os"
	"strconv"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Redis    RedisConfig
	JWT      JWTConfig
	OpenAI   OpenAIConfig
	Storage  StorageConfig
}

type ServerConfig struct {
	Port           string
	AllowedOrigins []string
}

type DatabaseConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	Name     string
}

type RedisConfig struct {
	URL string
}

type JWTConfig struct {
	Secret             string
	AccessTokenExpiry  string
	RefreshTokenExpiry string
}

type OpenAIConfig struct {
	APIKey string
}

type StorageConfig struct {
	S3Bucket  string
	S3Region  string
	AWSKey    string
	AWSSecret string
}

func New() *Config {
	return &Config{
		Server: ServerConfig{
			Port:           getEnv("PORT", "8080"),
			AllowedOrigins: []string{"http://localhost:3000"},
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnvAsInt("DB_PORT", 5432),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", ""),
			Name:     getEnv("DB_NAME", "smartestate"),
		},
		Redis: RedisConfig{
			URL: getEnv("REDIS_URL", "redis://localhost:6379"),
		},
		JWT: JWTConfig{
			Secret:             getEnv("JWT_SECRET", "your-secret-key"),
			AccessTokenExpiry:  getEnv("JWT_EXPIRY", "15m"),
			RefreshTokenExpiry: getEnv("REFRESH_TOKEN_EXPIRY", "7d"),
		},
		OpenAI: OpenAIConfig{
			APIKey: getEnv("OPENAI_API_KEY", ""),
		},
		Storage: StorageConfig{
			S3Bucket:  getEnv("S3_BUCKET", ""),
			S3Region:  getEnv("S3_REGION", "us-east-1"),
			AWSKey:    getEnv("AWS_ACCESS_KEY", ""),
			AWSSecret: getEnv("AWS_SECRET_KEY", ""),
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	valueStr := getEnv(key, "")
	if value, err := strconv.Atoi(valueStr); err == nil {
		return value
	}
	return defaultValue
}
