package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Notification struct {
	ID        uuid.UUID        `gorm:"type:uuid;primary_key" json:"id"`
	UserID    uuid.UUID        `gorm:"type:uuid;not null" json:"user_id"`
	Type      string           `json:"type"`
	Title     string           `json:"title"`
	Message   string           `json:"message"`
	Data      NotificationData `gorm:"type:jsonb" json:"data"`
	Read      bool             `json:"read"`
	ReadAt    *time.Time       `json:"read_at,omitempty"`
	CreatedAt time.Time        `json:"created_at"`
}

type NotificationData struct {
	PropertyID *uuid.UUID             `json:"property_id,omitempty"`
	CampaignID *uuid.UUID             `json:"campaign_id,omitempty"`
	Link       string                 `json:"link,omitempty"`
	Extra      map[string]interface{} `json:"extra,omitempty"`
}

func (n NotificationData) Value() (driver.Value, error) {
	return json.Marshal(n)
}

func (n *NotificationData) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, n)
}

func (n *Notification) BeforeCreate(tx *gorm.DB) error {
	n.ID = uuid.New()
	return nil
}
