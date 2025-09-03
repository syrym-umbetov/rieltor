// internal/api/handlers/targeting.go
package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"net/http"
	"smartestate/internal/models"
	"smartestate/internal/services"
)

type TargetingHandler struct {
	targetingService *services.TargetingService
	aiService        *services.AIService
}

func NewTargetingHandler(ts *services.TargetingService, as *services.AIService) *TargetingHandler {
	return &TargetingHandler{
		targetingService: ts,
		aiService:        as,
	}
}

// CreateCampaign godoc
// @Summary Создать рекламную кампанию
// @Description Создать новую таргетированную рекламную кампанию
// @Tags Targeting
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param campaign body models.Campaign true "Данные кампании"
// @Success 201 {object} models.Campaign "Созданная кампания"
// @Failure 400 {object} map[string]string "Некорректные данные"
// @Failure 401 {object} map[string]string "Не авторизован"
// @Failure 500 {object} map[string]string "Ошибка создания кампании"
// @Router /targeting/campaigns [post]
func (h *TargetingHandler) CreateCampaign(c *gin.Context) {
	userID := c.GetString("user_id")

	var campaign models.Campaign
	if err := c.ShouldBindJSON(&campaign); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	campaign.UserID = uuid.MustParse(userID)
	campaign.Status = "draft"

	if err := h.targetingService.CreateCampaign(&campaign); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create campaign"})
		return
	}

	c.JSON(http.StatusCreated, campaign)
}

// ListCampaigns godoc
// @Summary Список кампаний
// @Description Получить список всех рекламных кампаний пользователя
// @Tags Targeting
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {array} models.Campaign "Список кампаний"
// @Failure 401 {object} map[string]string "Не авторизован"
// @Failure 500 {object} map[string]string "Ошибка получения кампаний"
// @Router /targeting/campaigns [get]
func (h *TargetingHandler) ListCampaigns(c *gin.Context) {
	userID := c.GetString("user_id")

	campaigns, err := h.targetingService.GetUserCampaigns(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch campaigns"})
		return
	}

	c.JSON(http.StatusOK, campaigns)
}

// GetCampaign godoc
// @Summary Получить кампанию
// @Description Получить детальную информацию о рекламной кампании
// @Tags Targeting
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID кампании"
// @Success 200 {object} models.Campaign "Информация о кампании"
// @Failure 403 {object} map[string]string "Доступ запрещен"
// @Failure 404 {object} map[string]string "Кампания не найдена"
// @Router /targeting/campaigns/{id} [get]
func (h *TargetingHandler) GetCampaign(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("user_id")

	campaign, err := h.targetingService.GetCampaign(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}

	if campaign.UserID.String() != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	c.JSON(http.StatusOK, campaign)
}

// LaunchCampaign godoc
// @Summary Запустить кампанию
// @Description Запустить рекламную кампанию на выбранных площадках
// @Tags Targeting
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID кампании"
// @Success 200 {object} map[string]string "Кампания успешно запущена"
// @Failure 403 {object} map[string]string "Доступ запрещен"
// @Failure 404 {object} map[string]string "Кампания не найдена"
// @Failure 500 {object} map[string]string "Ошибка запуска кампании"
// @Router /targeting/campaigns/{id}/launch [post]
func (h *TargetingHandler) LaunchCampaign(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("user_id")

	campaign, err := h.targetingService.GetCampaign(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}

	if campaign.UserID.String() != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	// Launch campaign on platforms
	if err := h.targetingService.LaunchCampaign(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to launch campaign"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Campaign launched successfully"})
}

// GetMetrics godoc
// @Summary Метрики кампании
// @Description Получить метрики и статистику рекламной кампании
// @Tags Targeting
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID кампании"
// @Success 200 {object} map[string]interface{} "Метрики кампании"
// @Failure 403 {object} map[string]string "Доступ запрещен"
// @Failure 404 {object} map[string]string "Кампания не найдена"
// @Failure 500 {object} map[string]string "Ошибка получения метрик"
// @Router /targeting/campaigns/{id}/metrics [get]
func (h *TargetingHandler) GetMetrics(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("user_id")

	campaign, err := h.targetingService.GetCampaign(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}

	if campaign.UserID.String() != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	metrics, err := h.targetingService.GetCampaignMetrics(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch metrics"})
		return
	}

	c.JSON(http.StatusOK, metrics)
}

// GenerateCreativesRequest представляет запрос на генерацию креативов
type GenerateCreativesRequest struct {
	PropertyID string   `json:"property_id" binding:"required" example:"550e8400-e29b-41d4-a716-446655440000"`
	Platforms  []string `json:"platforms" binding:"required" example:"facebook,instagram,google"`
}

// GenerateCreatives godoc
// @Summary Генерировать креативы
// @Description Генерировать рекламные креативы с помощью AI для разных платформ
// @Tags Targeting
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body GenerateCreativesRequest true "Параметры генерации"
// @Success 200 {object} map[string]interface{} "Сгенерированные креативы для каждой платформы"
// @Failure 400 {object} map[string]string "Некорректные данные"
// @Failure 401 {object} map[string]string "Не авторизован"
// @Failure 500 {object} map[string]string "Ошибка генерации креативов"
// @Router /targeting/generate-creatives [post]
func (h *TargetingHandler) GenerateCreatives(c *gin.Context) {
	var req GenerateCreativesRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	creatives, err := h.aiService.GenerateAdCreatives(req.PropertyID, req.Platforms)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate creatives"})
		return
	}

	c.JSON(http.StatusOK, creatives)
}
