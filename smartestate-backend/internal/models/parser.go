package models

import (
	"database/sql/driver"
	"encoding/json"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

// PropertyFilters структура для фильтров поиска недвижимости
type PropertyFilters struct {
	PropertyType      string  `json:"property_type"`      // apartment, house, commercial
	City              string  `json:"city"`               // Алматы, Астана, и т.д.
	Rooms             *int    `json:"rooms"`              // количество комнат
	PriceMin          *int64  `json:"price_min"`          // минимальная цена
	PriceMax          *int64  `json:"price_max"`          // максимальная цена
	TotalAreaFrom     *int    `json:"total_area_from"`    // минимальная площадь
	TotalAreaTo       *int    `json:"total_area_to"`      // максимальная площадь
	FloorFrom         *int    `json:"floor_from"`         // минимальный этаж
	FloorTo           *int    `json:"floor_to"`           // максимальный этаж
	TotalFloorsFrom   *int    `json:"total_floors_from"`  // минимальная этажность дома
	TotalFloorsTo     *int    `json:"total_floors_to"`    // максимальная этажность дома
	BuildYearFrom     *int    `json:"build_year_from"`    // минимальный год постройки
	BuildYearTo       *int    `json:"build_year_to"`      // максимальный год постройки
	HasPhotos         bool    `json:"has_photos"`         // только с фото
	IsNewBuilding     bool    `json:"is_new_building"`    // новостройка
	SellerType        string  `json:"seller_type"`        // owner, agent, developer
	NotFirstFloor     bool    `json:"not_first_floor"`    // не первый этаж
	NotLastFloor      bool    `json:"not_last_floor"`     // не последний этаж
	ResidentialComplex string `json:"residential_complex"` // жилой комплекс
}

// ParsedProperty структура для спарсенной недвижимости
type ParsedProperty struct {
	ID                 string  `json:"id"`
	Title              string  `json:"title"`
	Price              int64   `json:"price"`
	Currency           string  `json:"currency"`
	Address            string  `json:"address"`
	Rooms              *int    `json:"rooms"`
	Area               *float64 `json:"area"`
	Floor              *int    `json:"floor"`
	TotalFloors        *int    `json:"total_floors"`
	BuildYear          *int    `json:"build_year"`
	Images             []string `json:"images"`
	Description        string  `json:"description"`
	URL                string  `json:"url"`
	Phone              string  `json:"phone"`
	IsNewBuilding      bool    `json:"is_new_building"`
	BuildingType       string  `json:"building_type"`
	SellerType         string  `json:"seller_type"`
	KitchenArea        *float64 `json:"kitchen_area"`
	ResidentialComplex string  `json:"residential_complex"`
}

// ParseRequest структура для запроса парсинга
type ParseRequest struct {
	ID       uuid.UUID           `gorm:"type:uuid;primary_key" json:"id"`
	UserID   *uuid.UUID          `gorm:"type:uuid" json:"user_id"`
	Filters  PropertyFilters     `gorm:"type:jsonb" json:"filters"`
	MaxPages int                 `json:"max_pages"`
	Status   string              `gorm:"default:'pending'" json:"status"` // pending, processing, completed, failed
	Results  ParsedPropertySlice `gorm:"type:jsonb" json:"results"`
	Count    int                 `json:"count"`
	Error    string              `json:"error"`
	CreatedAt time.Time          `json:"created_at"`
	UpdatedAt time.Time          `json:"updated_at"`
}

// ParseResponse структура для ответа на запрос парсинга
type ParseResponse struct {
	Success    bool             `json:"success"`
	RequestID  uuid.UUID        `json:"request_id"`
	Properties []ParsedProperty `json:"properties"`
	Count      int              `json:"count"`
	Status     string           `json:"status"`
	Error      string           `json:"error,omitempty"`
	Cached     bool             `json:"cached"`
	ParserType string           `json:"parser_type"` // selenium, http
}

func (r *ParseRequest) BeforeCreate(db *gorm.DB) error {
	r.ID = uuid.New()
	return nil
}

// JSONB support для PropertyFilters
func (f PropertyFilters) Value() (driver.Value, error) {
	return json.Marshal(f)
}

func (f *PropertyFilters) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, f)
}

// JSONB support для []ParsedProperty
type ParsedPropertySlice []ParsedProperty

func (p ParsedPropertySlice) Value() (driver.Value, error) {
	return json.Marshal(p)
}

func (p *ParsedPropertySlice) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, p)
}