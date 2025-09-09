// internal/services/property_service.go
package services

import (
	"fmt"
	"mime/multipart"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
	"smartestate/internal/models"
)

type PropertyService struct {
	db    *gorm.DB
	redis *redis.Client
}

func NewPropertyService(db *gorm.DB, redis *redis.Client) *PropertyService {
	return &PropertyService{db: db, redis: redis}
}

func (s *PropertyService) List(filters map[string]interface{}, page, limit int) ([]models.Property, int64, error) {
	var properties []models.Property
	var total int64

	query := s.db.Model(&models.Property{})

	// Apply filters
	if city, ok := filters["city"].(string); ok && city != "" {
		query = query.Where("address->>'city' = ?", city)
	}
	if propertyType, ok := filters["property_type"].(string); ok && propertyType != "" {
		query = query.Where("property_type = ?", propertyType)
	}
	if minPrice, ok := filters["min_price"].(float64); ok {
		query = query.Where("price >= ?", int64(minPrice))
	}
	if maxPrice, ok := filters["max_price"].(float64); ok {
		query = query.Where("price <= ?", int64(maxPrice))
	}
	if rooms, ok := filters["rooms"].(int); ok {
		query = query.Where("rooms = ?", rooms)
	}

	// Count total
	query.Count(&total)

	// Pagination
	offset := (page - 1) * limit
	err := query.Offset(offset).Limit(limit).Find(&properties).Error

	return properties, total, err
}

func (s *PropertyService) GetByID(id string) (*models.Property, error) {
	var property models.Property
	err := s.db.Preload("User").Where("id = ?", id).First(&property).Error
	return &property, err
}

func (s *PropertyService) Create(property *models.Property) error {
	return s.db.Create(property).Error
}

func (s *PropertyService) Update(id string, updates *models.Property) error {
	return s.db.Model(&models.Property{}).Where("id = ?", id).Updates(updates).Error
}

func (s *PropertyService) Delete(id string) error {
	return s.db.Where("id = ?", id).Delete(&models.Property{}).Error
}

func (s *PropertyService) RecordView(propertyID, ipAddress string) error {
	view := models.PropertyView{
		PropertyID: uuid.MustParse(propertyID),
		IPAddress:  ipAddress,
		ViewedAt:   time.Now(),
	}
	return s.db.Create(&view).Error
}

func (s *PropertyService) UploadImage(propertyID string, file *multipart.FileHeader) (string, error) {
	// Save file and return URL
	filename := fmt.Sprintf("%s_%s%s", propertyID, uuid.New().String(), filepath.Ext(file.Filename))
	// Implementation depends on your storage solution (S3, local, etc.)
	return "/uploads/" + filename, nil
}
