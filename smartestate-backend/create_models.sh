#!/bin/bash

# Create missing model files
# Run this script in your smartestate-backend directory

# Create the model files
cat > internal/models/saved_search.go << 'EOF'
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
EOF

cat > internal/models/favorite.go << 'EOF'
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
EOF

cat > internal/models/notification.go << 'EOF'
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
EOF

cat > internal/models/subscription.go << 'EOF'
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
EOF

echo "✅ Created missing model files!"
echo ""
echo "Files created:"
echo "  - internal/models/saved_search.go"
echo "  - internal/models/favorite.go"
echo "  - internal/models/notification.go"
echo "  - internal/models/subscription.go"