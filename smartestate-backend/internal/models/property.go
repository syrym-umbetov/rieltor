package models

import (
	"database/sql/driver"
	"encoding/json"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type Property struct {
	ID           uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	UserID       uuid.UUID      `gorm:"type:uuid;not null" json:"user_id"`
	User         User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Title        string         `gorm:"not null" json:"title"`
	Description  string         `json:"description"`
	Price        int64          `json:"price"`
	PropertyType string         `json:"property_type"`
	Status       string         `gorm:"default:'active'" json:"status"`
	Address      Address        `gorm:"type:jsonb" json:"address"`
	Coordinates  Coordinates    `gorm:"type:jsonb" json:"coordinates"`
	Features     Features       `gorm:"type:jsonb" json:"features"`
	Images       []string       `gorm:"type:jsonb" json:"images"`
	VRTourURL    string         `json:"vr_tour_url"`
	AreaSqm      float64        `json:"area_sqm"`
	Rooms        int            `json:"rooms"`
	Floor        int            `json:"floor"`
	TotalFloors  int            `json:"total_floors"`
	Views        []PropertyView `gorm:"foreignKey:PropertyID" json:"views,omitempty"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
}

type Address struct {
	Street     string `json:"street"`
	City       string `json:"city"`
	Region     string `json:"region"`
	PostalCode string `json:"postal_code"`
	Country    string `json:"country"`
}

type Coordinates struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type Features struct {
	Bedrooms    int      `json:"bedrooms"`
	Bathrooms   int      `json:"bathrooms"`
	HasParking  bool     `json:"has_parking"`
	HasBalcony  bool     `json:"has_balcony"`
	HasElevator bool     `json:"has_elevator"`
	Furnished   bool     `json:"furnished"`
	YearBuilt   int      `json:"year_built"`
	Amenities   []string `json:"amenities"`
}

// Value and Scan methods for JSONB
func (a Address) Value() (driver.Value, error) {
	return json.Marshal(a)
}

func (a *Address) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, a)
}

func (c Coordinates) Value() (driver.Value, error) {
	return json.Marshal(c)
}

func (c *Coordinates) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, c)
}

func (f Features) Value() (driver.Value, error) {
	return json.Marshal(f)
}

func (f *Features) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, f)
}

func (p *Property) BeforeCreate(tx *gorm.DB) error {
	p.ID = uuid.New()
	return nil
}
