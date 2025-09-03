package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Subscription struct {
	ID            uuid.UUID  `gorm:"type:uuid;primary_key" json:"id"`
	UserID        uuid.UUID  `gorm:"type:uuid;not null" json:"user_id"`
	Plan          string     `json:"plan"` // free, premium, business
	Status        string     `json:"status"` // active, cancelled, expired
	StartDate     time.Time  `json:"start_date"`
	EndDate       *time.Time `json:"end_date,omitempty"`
	PaymentMethod string     `json:"payment_method,omitempty"`
	Amount        float64    `json:"amount"`
	Currency      string     `json:"currency"`
	AutoRenew     bool       `json:"auto_renew"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

func (s *Subscription) BeforeCreate(tx *gorm.DB) error {
	s.ID = uuid.New()
	return nil
}
