package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Favorite struct {
	ID         uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	UserID     uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	PropertyID uuid.UUID `gorm:"type:uuid;not null" json:"property_id"`
	Notes      string    `json:"notes,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

func (f *Favorite) BeforeCreate(tx *gorm.DB) error {
	f.ID = uuid.New()
	return nil
}
