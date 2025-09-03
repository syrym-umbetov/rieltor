// internal/services/targeting_service.go
package services

import (
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
	"smartestate/internal/config"
	"smartestate/internal/models"
)

type TargetingService struct {
	db     *gorm.DB
	redis  *redis.Client
	config *config.Config
}

func NewTargetingService(db *gorm.DB, redis *redis.Client, cfg *config.Config) *TargetingService {
	return &TargetingService{db: db, redis: redis, config: cfg}
}

func (s *TargetingService) CreateCampaign(campaign *models.Campaign) error {
	return s.db.Create(campaign).Error
}

func (s *TargetingService) GetUserCampaigns(userID string) ([]models.Campaign, error) {
	var campaigns []models.Campaign
	err := s.db.Where("user_id = ?", userID).Find(&campaigns).Error
	return campaigns, err
}

func (s *TargetingService) GetCampaign(id string) (*models.Campaign, error) {
	var campaign models.Campaign
	err := s.db.Where("id = ?", id).First(&campaign).Error
	return &campaign, err
}

func (s *TargetingService) LaunchCampaign(id string) error {
	now := time.Now()
	return s.db.Model(&models.Campaign{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":     "active",
			"start_date": &now,
		}).Error
}

func (s *TargetingService) GetCampaignMetrics(id string) (*models.CampaignMetrics, error) {
	var campaign models.Campaign
	err := s.db.Where("id = ?", id).First(&campaign).Error
	if err != nil {
		return nil, err
	}
	return &campaign.Metrics, nil
}
