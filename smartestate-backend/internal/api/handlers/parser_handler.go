package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"smartestate/internal/models"
	"smartestate/internal/services"
)

type ParserHandler struct {
	parserService *services.ParserService
}

func NewParserHandler(parserService *services.ParserService) *ParserHandler {
	return &ParserHandler{
		parserService: parserService,
	}
}

// ParseProperties godoc
// @Summary Парсинг недвижимости по фильтрам
// @Description Парсит недвижимость с сайта krisha.kz используя Selenium по заданным фильтрам. Поддерживает все основные фильтры для поиска квартир, домов и коммерческой недвижимости.
// @Tags Parser
// @Accept json
// @Produce json
// @Param request body ParsePropertiesRequest true "Параметры парсинга с фильтрами и количеством страниц"
// @Success 200 {object} ParseResponseSwagger "Успешный парсинг"
// @Failure 400 {object} ErrorResponse "Некорректные параметры запроса"
// @Failure 500 {object} ErrorResponse "Ошибка сервера или парсинга"
// @Router /parser/properties [post]
func (h *ParserHandler) ParseProperties(c *gin.Context) {
	var req ParsePropertiesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request",
			Message: err.Error(),
		})
		return
	}

	// Валидация
	if req.MaxPages <= 0 {
		req.MaxPages = 1
	}
	if req.MaxPages > 10 {
		req.MaxPages = 10 // Ограничиваем максимальное количество страниц
	}

	// Получаем ID пользователя из контекста (если авторизован)
	var userID *uuid.UUID
	if userIDValue, exists := c.Get("user_id"); exists {
		if id, ok := userIDValue.(uuid.UUID); ok {
			userID = &id
		}
	}

	// Запускаем парсинг
	response, err := h.parserService.ParseProperties(req.Filters, req.MaxPages, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "parsing_failed",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetParseRequest godoc
// @Summary Получить информацию о запросе парсинга
// @Description Получает детальную информацию о запросе парсинга по уникальному ID, включая статус, результаты и ошибки
// @Tags Parser
// @Accept json
// @Produce json
// @Param id path string true "UUID идентификатор запроса парсинга" Format(uuid)
// @Success 200 {object} models.ParseRequest "Информация о запросе парсинга"
// @Failure 400 {object} ErrorResponse "Некорректный формат ID"
// @Failure 404 {object} ErrorResponse "Запрос парсинга не найден"
// @Router /parser/requests/{id} [get]
func (h *ParserHandler) GetParseRequest(c *gin.Context) {
	requestID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "invalid_request_id",
			Message: "Invalid request ID format",
		})
		return
	}

	request, err := h.parserService.GetParseRequest(requestID)
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{
			Error:   "request_not_found",
			Message: "Parse request not found",
		})
		return
	}

	c.JSON(http.StatusOK, request)
}

// TestParse godoc
// @Summary Тестовый парсинг недвижимости
// @Description Выполняет быстрый тестовый парсинг с базовыми фильтрами для демонстрации работы системы. Парсит только одну страницу результатов.
// @Tags Parser
// @Accept json
// @Produce json
// @Param city query string false "Город для поиска" default("Алматы") Enums(Алматы, Нур-Султан, Шымкент)
// @Param rooms query int false "Количество комнат" default(2) minimum(1) maximum(10)
// @Param max_price query int false "Максимальная цена в тенге" default(50000000) minimum(1000000)
// @Success 200 {object} ParseResponseSwagger "Результаты тестового парсинга"
// @Failure 500 {object} ErrorResponse "Ошибка при выполнении тестового парсинга"
// @Router /parser/test [get]
func (h *ParserHandler) TestParse(c *gin.Context) {
	city := c.DefaultQuery("city", "Алматы")
	
	rooms := 2
	if roomsStr := c.Query("rooms"); roomsStr != "" {
		if r, err := strconv.Atoi(roomsStr); err == nil {
			rooms = r
		}
	}

	maxPrice := int64(50000000)
	if priceStr := c.Query("max_price"); priceStr != "" {
		if p, err := strconv.ParseInt(priceStr, 10, 64); err == nil {
			maxPrice = p
		}
	}

	// Создаем тестовые фильтры
	filters := models.PropertyFilters{
		PropertyType: "apartment",
		City:         city,
		Rooms:        &rooms,
		PriceMax:     &maxPrice,
		HasPhotos:    true,
	}

	// Получаем ID пользователя из контекста (если авторизован)
	var userID *uuid.UUID
	if userIDValue, exists := c.Get("user_id"); exists {
		if id, ok := userIDValue.(uuid.UUID); ok {
			userID = &id
		}
	}

	// Запускаем парсинг одной страницы
	response, err := h.parserService.ParseProperties(filters, 1, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "test_parsing_failed",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

// ParsePropertiesRequest структура запроса для парсинга
type ParsePropertiesRequest struct {
	Filters  models.PropertyFilters `json:"filters" binding:"required" example:"{\"city\":\"Алматы\",\"rooms\":2,\"price_max\":50000000}"`
	MaxPages int                    `json:"max_pages" binding:"min=1,max=10" example:"2"`
}

// PropertyFiltersSwagger для Swagger документации
type PropertyFiltersSwagger struct {
	PropertyType      string `json:"property_type" example:"apartment"`
	City              string `json:"city" example:"Алматы"`
	Rooms             *int   `json:"rooms" example:"2"`
	PriceMin          *int64 `json:"price_min" example:"10000000"`
	PriceMax          *int64 `json:"price_max" example:"50000000"`
	TotalAreaFrom     *int   `json:"total_area_from" example:"50"`
	TotalAreaTo       *int   `json:"total_area_to" example:"120"`
	FloorFrom         *int   `json:"floor_from" example:"2"`
	FloorTo           *int   `json:"floor_to" example:"15"`
	TotalFloorsFrom   *int   `json:"total_floors_from" example:"5"`
	TotalFloorsTo     *int   `json:"total_floors_to" example:"20"`
	BuildYearFrom     *int   `json:"build_year_from" example:"2010"`
	BuildYearTo       *int   `json:"build_year_to" example:"2023"`
	HasPhotos         bool   `json:"has_photos" example:"true"`
	IsNewBuilding     bool   `json:"is_new_building" example:"false"`
	SellerType        string `json:"seller_type" example:"owner"`
	NotFirstFloor     bool   `json:"not_first_floor" example:"true"`
	NotLastFloor      bool   `json:"not_last_floor" example:"true"`
	ResidentialComplex string `json:"residential_complex" example:"Алматы Тауэрс"`
}

// ParsedPropertySwagger для Swagger документации  
type ParsedPropertySwagger struct {
	ID                 string   `json:"id" example:"krisha_12345"`
	Title              string   `json:"title" example:"Продается 2-комнатная квартира"`
	Price              int64    `json:"price" example:"25000000"`
	Currency           string   `json:"currency" example:"₸"`
	Address            string   `json:"address" example:"мкр. Самал-2, 58"`
	Rooms              *int     `json:"rooms" example:"2"`
	Area               *float64 `json:"area" example:"65.5"`
	Floor              *int     `json:"floor" example:"7"`
	TotalFloors        *int     `json:"total_floors" example:"16"`
	BuildYear          *int     `json:"build_year" example:"2018"`
	Images             []string `json:"images" example:"[\"https://krisha.kz/images/1.jpg\",\"https://krisha.kz/images/2.jpg\"]"`
	Description        string   `json:"description" example:"Просторная 2-комнатная квартира в центре Алматы"`
	URL                string   `json:"url" example:"https://krisha.kz/a/show/12345"`
	Phone              string   `json:"phone" example:"+77001234567"`
	IsNewBuilding      bool     `json:"is_new_building" example:"false"`
	BuildingType       string   `json:"building_type" example:"monolith"`
	SellerType         string   `json:"seller_type" example:"owner"`
	KitchenArea        *float64 `json:"kitchen_area" example:"12.5"`
	ResidentialComplex string   `json:"residential_complex" example:"Алматы Тауэрс"`
}

// ParseResponseSwagger для Swagger документации
type ParseResponseSwagger struct {
	Success    bool                    `json:"success" example:"true"`
	RequestID  string                  `json:"request_id" example:"550e8400-e29b-41d4-a716-446655440000"`
	Properties []ParsedPropertySwagger `json:"properties"`
	Count      int                     `json:"count" example:"15"`
	Status     string                  `json:"status" example:"completed"`
	Error      string                  `json:"error,omitempty" example:""`
	Cached     bool                    `json:"cached" example:"false"`
	ParserType string                  `json:"parser_type" example:"selenium"`
}