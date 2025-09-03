package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SavedSearch struct {
	ID                   uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	UserID               uuid.UUID      `gorm:"type:uuid;not null" json:"user_id"`
	Name                 string         `json:"name"`
	Criteria             SearchCriteria `gorm:"type:jsonb" json:"criteria"`
	NotificationsEnabled bool           `json:"notifications_enabled"`
	CreatedAt            time.Time      `json:"created_at"`
	UpdatedAt            time.Time      `json:"updated_at"`
}

type SearchCriteria struct {
	City         string   `json:"city,omitempty"`
	PropertyType string   `json:"property_type,omitempty"`
	MinPrice     float64  `json:"min_price,omitempty"`
	MaxPrice     float64  `json:"max_price,omitempty"`
	MinArea      float64  `json:"min_area,omitempty"`
	MaxArea      float64  `json:"max_area,omitempty"`
	Rooms        []int    `json:"rooms,omitempty"`
	Features     []string `json:"features,omitempty"`
	Keywords     string   `json:"keywords,omitempty"`
}

func (s SearchCriteria) Value() (driver.Value, error) {
	return json.Marshal(s)
}

func (s *SearchCriteria) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, s)
}

func (ss *SavedSearch) BeforeCreate(tx *gorm.DB) error {
	ss.ID = uuid.New()
	return nil
}
