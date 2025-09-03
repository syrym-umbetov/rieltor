package models

import (
	"database/sql/driver"
	"encoding/json"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type ChatSession struct {
	ID        uuid.UUID     `gorm:"type:uuid;primary_key" json:"id"`
	UserID    uuid.UUID     `gorm:"type:uuid;not null" json:"user_id"`
	User      User          `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Context   ChatContext   `gorm:"type:jsonb" json:"context"`
	Messages  []ChatMessage `gorm:"foreignKey:SessionID" json:"messages,omitempty"`
	CreatedAt time.Time     `json:"created_at"`
	UpdatedAt time.Time     `json:"updated_at"`
}

type ChatMessage struct {
	ID        uuid.UUID       `gorm:"type:uuid;primary_key" json:"id"`
	SessionID uuid.UUID       `gorm:"type:uuid;not null" json:"session_id"`
	Session   ChatSession     `gorm:"foreignKey:SessionID" json:"session,omitempty"`
	Role      string          `json:"role"` // user, assistant, system
	Content   string          `json:"content"`
	Metadata  MessageMetadata `gorm:"type:jsonb" json:"metadata"`
	CreatedAt time.Time       `json:"created_at"`
}

type ChatContext struct {
	PropertyPreferences map[string]interface{} `json:"property_preferences"`
	SearchHistory       []string               `json:"search_history"`
	LastIntent          string                 `json:"last_intent"`
}

type MessageMetadata struct {
	PropertyIDs []string               `json:"property_ids,omitempty"`
	Actions     []string               `json:"actions,omitempty"`
	Confidence  float64                `json:"confidence,omitempty"`
	Extra       map[string]interface{} `json:"extra,omitempty"`
}

func (c ChatContext) Value() (driver.Value, error) {
	return json.Marshal(c)
}

func (c *ChatContext) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, c)
}

func (m MessageMetadata) Value() (driver.Value, error) {
	return json.Marshal(m)
}

func (m *MessageMetadata) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, m)
}

func (cs *ChatSession) BeforeCreate(tx *gorm.DB) error {
	cs.ID = uuid.New()
	return nil
}

func (cm *ChatMessage) BeforeCreate(tx *gorm.DB) error {
	cm.ID = uuid.New()
	return nil
}
