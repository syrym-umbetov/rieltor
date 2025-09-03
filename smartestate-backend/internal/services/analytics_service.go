// internal/services/analytics_service.go - FIXED VERSION
package services

import (
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type AnalyticsService struct {
	db    *gorm.DB
	redis *redis.Client
}

func NewAnalyticsService(db *gorm.DB, redis *redis.Client) *AnalyticsService {
	return &AnalyticsService{db: db, redis: redis}
}

type PropertyAnalytics struct {
	Views       int64   `json:"views"` // CHANGED TO int64
	Favorites   int64   `json:"favorites"`
	Inquiries   int64   `json:"inquiries"`
	AverageTime int     `json:"average_time_seconds"`
	Conversion  float64 `json:"conversion_rate"`
}

type CampaignAnalytics struct {
	Impressions int     `json:"impressions"`
	Clicks      int     `json:"clicks"`
	CTR         float64 `json:"ctr"`
	Conversions int     `json:"conversions"`
	Spend       float64 `json:"spend"`
	ROI         float64 `json:"roi"`
}

type MarketTrends struct {
	AveragePrice        float64 `json:"average_price"`
	PriceChange         float64 `json:"price_change_percent"`
	TotalListings       int64   `json:"total_listings"` // CHANGED TO int64
	AverageDaysOnMarket int     `json:"average_days_on_market"`
}

func (s *AnalyticsService) GetPropertyAnalytics(propertyID, userID, startDate, endDate string) (*PropertyAnalytics, error) {
	analytics := &PropertyAnalytics{}

	// Parse dates
	start, _ := time.Parse("2006-01-02", startDate)
	end, _ := time.Parse("2006-01-02", endDate)

	// Get view count - Count expects *int64
	s.db.Table("property_views").
		Where("property_id = ? AND viewed_at BETWEEN ? AND ?", propertyID, start, end).
		Count(&analytics.Views)

	// Get favorites count
	s.db.Table("favorites").
		Where("property_id = ?", propertyID).
		Count(&analytics.Favorites)

	// You can add more analytics queries here

	return analytics, nil
}

func (s *AnalyticsService) GetCampaignAnalytics(campaignID, userID string) (*CampaignAnalytics, error) {
	// Implement campaign analytics
	analytics := &CampaignAnalytics{
		Impressions: 1234,
		Clicks:      56,
		CTR:         4.54,
		Conversions: 3,
		Spend:       25000,
		ROI:         2.5,
	}
	return analytics, nil
}

func (s *AnalyticsService) GetMarketTrends(city, propertyType string) (*MarketTrends, error) {
	trends := &MarketTrends{}

	// Calculate average price
	s.db.Table("properties").
		Where("address->>'city' = ? AND property_type = ?", city, propertyType).
		Select("AVG(price) as average_price").
		Scan(&trends.AveragePrice)

	// Get total listings - Count expects *int64
	s.db.Table("properties").
		Where("address->>'city' = ? AND property_type = ?", city, propertyType).
		Count(&trends.TotalListings)

	// Set some default values for demo
	trends.PriceChange = 5.2
	trends.AverageDaysOnMarket = 45

	return trends, nil
}
