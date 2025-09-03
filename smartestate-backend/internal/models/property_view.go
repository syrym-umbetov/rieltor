// internal/models/property_view.go
package models

import (
	"github.com/google/uuid"
	"time"
)

type PropertyView struct {
	ID         uuid.UUID  `gorm:"type:uuid;primary_key" json:"id"`
	PropertyID uuid.UUID  `gorm:"type:uuid;not null" json:"property_id"`
	Property   *Property  `gorm:"foreignKey:PropertyID" json:"property,omitempty"`
	UserID     *uuid.UUID `gorm:"type:uuid" json:"user_id,omitempty"` // Can be null for anonymous views
	User       *User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	IPAddress  string     `json:"ip_address"`
	UserAgent  string     `json:"user_agent"`
	Referrer   string     `json:"referrer"`
	ViewedAt   time.Time  `json:"viewed_at"`
	Duration   int        `json:"duration"` // Duration in seconds
}
