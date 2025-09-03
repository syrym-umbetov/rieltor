// internal/api/handlers/analytics.go
package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"smartestate/internal/services"
)

type AnalyticsHandler struct {
	analyticsService *services.AnalyticsService
}

func NewAnalyticsHandler(as *services.AnalyticsService) *AnalyticsHandler {
	return &AnalyticsHandler{
		analyticsService: as,
	}
}

// PropertyAnalytics godoc
// @Summary Аналитика недвижимости
// @Description Получить аналитику по конкретному объекту недвижимости
// @Tags Analytics
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID недвижимости"
// @Param start_date query string false "Начальная дата (YYYY-MM-DD)" default("30 дней назад")
// @Param end_date query string false "Конечная дата (YYYY-MM-DD)" default("сегодня")
// @Success 200 {object} map[string]interface{} "Аналитические данные"
// @Failure 401 {object} map[string]string "Не авторизован"
// @Failure 500 {object} map[string]string "Ошибка получения аналитики"
// @Router /analytics/properties/{id} [get]
func (h *AnalyticsHandler) PropertyAnalytics(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("user_id")

	// Date range
	startDate := c.DefaultQuery("start_date", time.Now().AddDate(0, -1, 0).Format("2006-01-02"))
	endDate := c.DefaultQuery("end_date", time.Now().Format("2006-01-02"))

	analytics, err := h.analyticsService.GetPropertyAnalytics(id, userID, startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch analytics"})
		return
	}

	c.JSON(http.StatusOK, analytics)
}

// CampaignAnalytics godoc
// @Summary Аналитика рекламной кампании
// @Description Получить аналитику по рекламной кампании
// @Tags Analytics
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID кампании"
// @Success 200 {object} map[string]interface{} "Метрики кампании"
// @Failure 401 {object} map[string]string "Не авторизован"
// @Failure 500 {object} map[string]string "Ошибка получения аналитики"
// @Router /analytics/campaigns/{id} [get]
func (h *AnalyticsHandler) CampaignAnalytics(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("user_id")

	analytics, err := h.analyticsService.GetCampaignAnalytics(id, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch analytics"})
		return
	}

	c.JSON(http.StatusOK, analytics)
}

// MarketTrends godoc
// @Summary Тренды рынка
// @Description Получить тренды рынка недвижимости по городу и типу недвижимости
// @Tags Analytics
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param city query string false "Город" default(almaty) Enums(almaty, astana, shymkent)
// @Param property_type query string false "Тип недвижимости" default(apartment) Enums(apartment, house, commercial, land)
// @Success 200 {object} map[string]interface{} "Рыночные тренды и статистика"
// @Failure 500 {object} map[string]string "Ошибка получения трендов"
// @Router /analytics/market-trends [get]
func (h *AnalyticsHandler) MarketTrends(c *gin.Context) {
	city := c.DefaultQuery("city", "almaty")
	propertyType := c.DefaultQuery("property_type", "apartment")

	trends, err := h.analyticsService.GetMarketTrends(city, propertyType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch trends"})
		return
	}

	c.JSON(http.StatusOK, trends)
}
