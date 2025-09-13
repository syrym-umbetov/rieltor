package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// PriorityProperty представляет приоритетное объявление, сохраненное в базе данных
type PriorityProperty struct {
	ID          uuid.UUID      `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	ExternalID  string         `json:"external_id" gorm:"unique;not null"` // ID от источника (krisha.kz, olx.kz)
	Source      string         `json:"source" gorm:"not null"`             // krisha, olx
	Title       string         `json:"title"`
	Description string         `json:"description"`
	Price       int64          `json:"price"`
	Currency    string         `json:"currency"`
	Address     string         `json:"address"`
	City        string         `json:"city"`
	Rooms       *int           `json:"rooms"`
	Area        *float64       `json:"area"`
	Floor       *int           `json:"floor"`
	TotalFloors *int           `json:"total_floors"`
	BuildYear   *int           `json:"build_year"`
	Images      datatypes.JSON `json:"images" gorm:"type:jsonb"`
	Features    datatypes.JSON `json:"features" gorm:"type:jsonb"`
	URL         string         `json:"url"`
	Phone       string         `json:"phone"`
	IsActive    bool           `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"deleted_at" gorm:"index"`
}

// ToParseProperty конвертирует PriorityProperty в ParsedProperty для совместимости
func (p *PriorityProperty) ToParseProperty() ParsedProperty {
	var images []string
	if p.Images != nil {
		// Десериализуем JSON массив изображений
		if err := json.Unmarshal([]byte(p.Images), &images); err != nil {
			images = []string{}
		}
	}

	return ParsedProperty{
		ID:                 p.ExternalID,
		Title:              p.Title,
		Description:        p.Description,
		Price:              p.Price,
		Currency:           p.Currency,
		Address:            p.Address,
		Rooms:              p.Rooms,
		Area:               p.Area,
		Floor:              p.Floor,
		TotalFloors:        p.TotalFloors,
		BuildYear:          p.BuildYear,
		Images:             images,
		URL:                p.URL,
		Phone:              p.Phone,
		IsNewBuilding:      false,
		BuildingType:       "",
		SellerType:         "",
		KitchenArea:        nil,
		ResidentialComplex: "",
	}
}