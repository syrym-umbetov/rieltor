// internal/models/user.go
package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type User struct {
	ID               uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	Email            string     `gorm:"uniqueIndex;not null;size:255" json:"email"`
	Phone            string     `gorm:"size:20" json:"phone"`
	PasswordHash     string     `gorm:"not null" json:"-"`
	FullName         string     `gorm:"size:255" json:"full_name"`
	AvatarURL        string     `gorm:"size:500" json:"avatar_url"`
	Role             string     `gorm:"size:50;default:'user'" json:"role"`
	SubscriptionTier string     `gorm:"size:50;default:'free'" json:"subscription_tier"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
	DeletedAt        *time.Time `gorm:"index" json:"deleted_at,omitempty" swaggertype:"string"` // <- изменено

	// Relationships - remove constraint tags for initial migration
	Properties   []Property    `gorm:"foreignKey:UserID" json:"properties,omitempty"`
	ChatSessions []ChatSession `gorm:"foreignKey:UserID" json:"chat_sessions,omitempty"`
	Campaigns    []Campaign    `gorm:"foreignKey:UserID" json:"campaigns,omitempty"`
}

// BeforeCreate hook to set UUID
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}

// TableName overrides the table name
func (User) TableName() string {
	return "users"
}
