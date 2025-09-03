// internal/api/handlers/property.go
package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"net/http"
	"smartestate/internal/models"
	"smartestate/internal/services"
	"strconv"
)

type PropertyHandler struct {
	propertyService *services.PropertyService
	aiService       *services.AIService
	searchService   *services.SearchService
}

func NewPropertyHandler(ps *services.PropertyService, as *services.AIService, ss *services.SearchService) *PropertyHandler {
	return &PropertyHandler{
		propertyService: ps,
		aiService:       as,
		searchService:   ss,
	}
}

// List godoc
// @Summary List properties
// @Description Get paginated list of properties with filters
// @Tags Properties
// @Accept json
// @Produce json
// @Param city query string false "City filter"
// @Param property_type query string false "Property type filter"
// @Param min_price query number false "Minimum price"
// @Param max_price query number false "Maximum price"
// @Param rooms query integer false "Number of rooms"
// @Param page query integer false "Page number" default(1)
// @Param limit query integer false "Items per page" default(20)
// @Success 200 {object} map[string]interface{} "Properties list with pagination"
// @Router /properties [get]
func (h *PropertyHandler) List(c *gin.Context) {
	filters := make(map[string]interface{})

	// Parse query parameters
	if city := c.Query("city"); city != "" {
		filters["city"] = city
	}
	if propertyType := c.Query("property_type"); propertyType != "" {
		filters["property_type"] = propertyType
	}
	if minPrice := c.Query("min_price"); minPrice != "" {
		if price, err := strconv.ParseFloat(minPrice, 64); err == nil {
			filters["min_price"] = price
		}
	}
	if maxPrice := c.Query("max_price"); maxPrice != "" {
		if price, err := strconv.ParseFloat(maxPrice, 64); err == nil {
			filters["max_price"] = price
		}
	}
	if rooms := c.Query("rooms"); rooms != "" {
		if r, err := strconv.Atoi(rooms); err == nil {
			filters["rooms"] = r
		}
	}

	// Pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	properties, total, err := h.propertyService.List(filters, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch properties"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"properties": properties,
		"total":      total,
		"page":       page,
		"limit":      limit,
	})
}

// Get godoc
// @Summary Get property by ID
// @Description Get detailed information about a property
// @Tags Properties
// @Accept json
// @Produce json
// @Param id path string true "Property ID"
// @Success 200 {object} models.Property "Property details"
// @Failure 404 {object} map[string]string "Property not found"
// @Router /properties/{id} [get]
func (h *PropertyHandler) Get(c *gin.Context) {
	id := c.Param("id")

	property, err := h.propertyService.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Property not found"})
		return
	}

	// Record view
	go h.propertyService.RecordView(id, c.ClientIP())

	c.JSON(http.StatusOK, property)
}

// Create godoc
// @Summary Create property
// @Description Create a new property listing (requires authentication)
// @Tags Properties
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param property body models.Property true "Property data"
// @Success 201 {object} models.Property "Created property"
// @Failure 400 {object} map[string]string "Bad Request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 500 {object} map[string]string "Internal Server Error"
// @Router /properties [post]
func (h *PropertyHandler) Create(c *gin.Context) {
	userID := c.GetString("user_id")

	var property models.Property
	if err := c.ShouldBindJSON(&property); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	property.UserID = uuid.MustParse(userID)

	if err := h.propertyService.Create(&property); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create property"})
		return
	}

	c.JSON(http.StatusCreated, property)
}

// Update godoc
// @Summary Update property
// @Description Update an existing property (requires ownership)
// @Tags Properties
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Property ID"
// @Param property body models.Property true "Updated property data"
// @Success 200 {object} map[string]string "Success message"
// @Failure 400 {object} map[string]string "Bad Request"
// @Failure 403 {object} map[string]string "Forbidden"
// @Failure 404 {object} map[string]string "Property not found"
// @Router /properties/{id} [put]
func (h *PropertyHandler) Update(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("user_id")

	// Check ownership
	property, err := h.propertyService.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Property not found"})
		return
	}

	if property.UserID.String() != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to update this property"})
		return
	}

	var updateData models.Property
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.propertyService.Update(id, &updateData); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update property"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Property updated successfully"})
}

// Delete godoc
// @Summary Delete property
// @Description Delete a property listing (requires ownership)
// @Tags Properties
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Property ID"
// @Success 200 {object} map[string]string "Success message"
// @Failure 403 {object} map[string]string "Forbidden"
// @Failure 404 {object} map[string]string "Property not found"
// @Router /properties/{id} [delete]
func (h *PropertyHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("user_id")

	// Check ownership
	property, err := h.propertyService.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Property not found"})
		return
	}

	if property.UserID.String() != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to delete this property"})
		return
	}

	if err := h.propertyService.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete property"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Property deleted successfully"})
}

// Search godoc
// @Summary Search properties
// @Description AI-powered property search
// @Tags Properties
// @Accept json
// @Produce json
// @Param q query string true "Search query"
// @Success 200 {array} models.Property "Search results"
// @Failure 400 {object} map[string]string "Bad Request"
// @Router /properties/search [get]
func (h *PropertyHandler) Search(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Search query is required"})
		return
	}

	// Use AI-powered search
	results, err := h.searchService.SearchProperties(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Search failed"})
		return
	}

	c.JSON(http.StatusOK, results)
}

// GetRecommendations godoc
// @Summary Get property recommendations
// @Description Get AI-powered property recommendations based on user history
// @Tags Properties
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {array} models.Property "Recommended properties"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 500 {object} map[string]string "Internal Server Error"
// @Router /properties/recommendations [get]
func (h *PropertyHandler) GetRecommendations(c *gin.Context) {
	userID := c.GetString("user_id")

	// Get AI recommendations based on user history
	recommendations, err := h.aiService.GetPropertyRecommendations(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get recommendations"})
		return
	}

	c.JSON(http.StatusOK, recommendations)
}

// UploadImages godoc
// @Summary Upload property images
// @Description Upload images for a property listing
// @Tags Properties
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param id path string true "Property ID"
// @Param images formData file true "Property images"
// @Success 200 {object} map[string]interface{} "Uploaded image URLs"
// @Failure 400 {object} map[string]string "Bad Request"
// @Failure 403 {object} map[string]string "Forbidden"
// @Failure 404 {object} map[string]string "Property not found"
// @Router /properties/{id}/images [post]
func (h *PropertyHandler) UploadImages(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("user_id")

	// Check ownership
	property, err := h.propertyService.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Property not found"})
		return
	}

	if property.UserID.String() != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to upload images"})
		return
	}

	// Handle multipart form
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form"})
		return
	}

	files := form.File["images"]
	var uploadedURLs []string

	for _, file := range files {
		// Save file
		url, err := h.propertyService.UploadImage(id, file)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload image"})
			return
		}
		uploadedURLs = append(uploadedURLs, url)
	}

	c.JSON(http.StatusOK, gin.H{"urls": uploadedURLs})
}

// RecordView godoc
// @Summary Record property view
// @Description Record that a user viewed a property (for analytics)
// @Tags Properties
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Property ID"
// @Success 200 {object} map[string]string "Success message"
// @Failure 500 {object} map[string]string "Internal Server Error"
// @Router /properties/{id}/view [post]
func (h *PropertyHandler) RecordView(c *gin.Context) {
	id := c.Param("id")

	if err := h.propertyService.RecordView(id, c.ClientIP()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record view"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "View recorded"})
}
