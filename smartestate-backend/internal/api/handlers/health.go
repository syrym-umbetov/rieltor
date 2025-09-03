package handlers

import (
	"github.com/gin-gonic/gin"
	"net/http"
)

// Health godoc
// @Summary Health check
// @Description Get health status of the API
// @Tags Health
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "OK"
// @Router /health [get]

func Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"service": "SmartEstate API",
		"version": "1.0.0",
	})
}
