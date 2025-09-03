// internal/services/search_service.go
package services

import (
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
	"smartestate/internal/models"
)

type SearchService struct {
	db    *gorm.DB
	redis *redis.Client
}

func NewSearchService(db *gorm.DB, redis *redis.Client) *SearchService {
	return &SearchService{db: db, redis: redis}
}

func (s *SearchService) SearchProperties(query string) ([]models.Property, error) {
	var properties []models.Property

	// Simple text search - in production, use Elasticsearch
	err := s.db.Where("title ILIKE ? OR description ILIKE ?",
		"%"+query+"%", "%"+query+"%").
		Limit(20).
		Find(&properties).Error

	return properties, err
}
