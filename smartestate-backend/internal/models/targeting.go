package models

import (
	"database/sql/driver"
	"encoding/json"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type Campaign struct {
	ID             uuid.UUID       `gorm:"type:uuid;primary_key" json:"id"`
	UserID         uuid.UUID       `gorm:"type:uuid;not null" json:"user_id"`
	User           User            `gorm:"foreignKey:UserID" json:"user,omitempty"`
	PropertyID     uuid.UUID       `gorm:"type:uuid" json:"property_id"`
	Property       Property        `gorm:"foreignKey:PropertyID" json:"property,omitempty"`
	Name           string          `json:"name"`
	Platforms      []string        `gorm:"type:jsonb" json:"platforms"`
	Budget         float64         `json:"budget"`
	DurationDays   int             `json:"duration_days"`
	TargetAudience TargetAudience  `gorm:"type:jsonb" json:"target_audience"`
	Creatives      []Creative      `gorm:"type:jsonb" json:"creatives"`
	Status         string          `gorm:"default:'draft'" json:"status"`
	Metrics        CampaignMetrics `gorm:"type:jsonb" json:"metrics"`
	StartDate      *time.Time      `json:"start_date"`
	EndDate        *time.Time      `json:"end_date"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
}

type TargetAudience struct {
	AgeRange     []int                  `json:"age_range"`
	Gender       string                 `json:"gender"`
	Locations    []string               `json:"locations"`
	Interests    []string               `json:"interests"`
	Behaviors    []string               `json:"behaviors"`
	CustomParams map[string]interface{} `json:"custom_params"`
}

type Creative struct {
	ID          string                 `json:"id"`
	Type        string                 `json:"type"` // image, video, carousel
	Platform    string                 `json:"platform"`
	MediaURL    string                 `json:"media_url"`
	Headline    string                 `json:"headline"`
	Description string                 `json:"description"`
	CTA         string                 `json:"cta"`
	Metadata    map[string]interface{} `json:"metadata"`
}

type CampaignMetrics struct {
	Impressions  int       `json:"impressions"`
	Clicks       int       `json:"clicks"`
	CTR          float64   `json:"ctr"`
	Conversions  int       `json:"conversions"`
	Spend        float64   `json:"spend"`
	CostPerClick float64   `json:"cost_per_click"`
	CostPerLead  float64   `json:"cost_per_lead"`
	LastUpdated  time.Time `json:"last_updated"`
}

func (t TargetAudience) Value() (driver.Value, error) {
	return json.Marshal(t)
}

func (t *TargetAudience) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, t)
}

func (m CampaignMetrics) Value() (driver.Value, error) {
	return json.Marshal(m)
}

func (m *CampaignMetrics) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, m)
}

func (c *Campaign) BeforeCreate(tx *gorm.DB) error {
	c.ID = uuid.New()
	return nil
}
