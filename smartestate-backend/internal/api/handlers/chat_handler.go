// internal/api/handlers/chat.go
package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"smartestate/internal/models"
	"smartestate/internal/services"
)

type ChatHandler struct {
	chatService *services.ChatService
	aiService   *services.AIService
}

func NewChatHandler(chatService *services.ChatService, aiService *services.AIService) *ChatHandler {
	return &ChatHandler{
		chatService: chatService,
		aiService:   aiService,
	}
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Configure properly in production
	},
}

// CreateSession godoc
// @Summary Создать чат-сессию
// @Description Создать новую сессию чата с AI ассистентом
// @Tags Chat
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 201 {object} models.ChatSession "Созданная сессия"
// @Failure 401 {object} map[string]string "Не авторизован"
// @Failure 500 {object} map[string]string "Внутренняя ошибка сервера"
// @Router /chat/sessions [post]
func (h *ChatHandler) CreateSession(c *gin.Context) {
	userID := c.GetString("user_id")

	session := &models.ChatSession{
		UserID: uuid.MustParse(userID),
		Context: models.ChatContext{
			PropertyPreferences: make(map[string]interface{}),
			SearchHistory:       []string{},
		},
	}

	if err := h.chatService.CreateSession(session); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create session"})
		return
	}

	c.JSON(http.StatusCreated, session)
}

// GetSession godoc
// @Summary Получить чат-сессию
// @Description Получить информацию о конкретной сессии чата
// @Tags Chat
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID сессии"
// @Success 200 {object} models.ChatSession "Информация о сессии"
// @Failure 403 {object} map[string]string "Доступ запрещен"
// @Failure 404 {object} map[string]string "Сессия не найдена"
// @Router /chat/sessions/{id} [get]
func (h *ChatHandler) GetSession(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("user_id")

	session, err := h.chatService.GetSession(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	if session.UserID.String() != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	c.JSON(http.StatusOK, session)
}

// MessageRequest представляет запрос на отправку сообщения
type MessageRequest struct {
	SessionID string `json:"session_id" binding:"required" example:"550e8400-e29b-41d4-a716-446655440000"`
	Content   string `json:"content" binding:"required" example:"Найди мне квартиру в Алматы"`
}

// SendMessage godoc
// @Summary Отправить сообщение
// @Description Отправить сообщение в чат и получить ответ от AI ассистента
// @Tags Chat
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body MessageRequest true "Данные сообщения"
// @Success 200 {object} models.ChatMessage "Ответ AI ассистента"
// @Failure 400 {object} map[string]string "Некорректный запрос"
// @Failure 403 {object} map[string]string "Доступ запрещен"
// @Failure 404 {object} map[string]string "Сессия не найдена"
// @Failure 500 {object} map[string]string "Ошибка обработки сообщения"
// @Router /chat/messages [post]
func (h *ChatHandler) SendMessage(c *gin.Context) {
	userID := c.GetString("user_id")

	var req MessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check session ownership
	session, err := h.chatService.GetSession(req.SessionID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	if session.UserID.String() != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	// Save user message
	userMessage := &models.ChatMessage{
		SessionID: uuid.MustParse(req.SessionID),
		Role:      "user",
		Content:   req.Content,
	}

	if err := h.chatService.SaveMessage(userMessage); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save message"})
		return
	}

	// Get AI response
	aiResponse, err := h.aiService.ProcessChatMessage(req.SessionID, req.Content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get AI response"})
		return
	}

	// Save AI message
	aiMessage := &models.ChatMessage{
		SessionID: uuid.MustParse(req.SessionID),
		Role:      "assistant",
		Content:   aiResponse.Content,
		Metadata:  aiResponse.Metadata,
	}

	if err := h.chatService.SaveMessage(aiMessage); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save AI response"})
		return
	}

	c.JSON(http.StatusOK, aiMessage)
}

// GetMessages godoc
// @Summary Получить сообщения
// @Description Получить все сообщения из чат-сессии
// @Tags Chat
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "ID сессии"
// @Success 200 {array} models.ChatMessage "Список сообщений"
// @Failure 403 {object} map[string]string "Доступ запрещен"
// @Failure 404 {object} map[string]string "Сессия не найдена"
// @Failure 500 {object} map[string]string "Ошибка получения сообщений"
// @Router /chat/sessions/{id}/messages [get]
func (h *ChatHandler) GetMessages(c *gin.Context) {
	sessionID := c.Param("id")
	userID := c.GetString("user_id")

	// Check session ownership
	session, err := h.chatService.GetSession(sessionID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	if session.UserID.String() != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	messages, err := h.chatService.GetMessages(sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get messages"})
		return
	}

	c.JSON(http.StatusOK, messages)
}

// HandleWebSocket godoc
// @Summary WebSocket для чата
// @Description Установить WebSocket соединение для real-time общения
// @Tags Chat
// @Accept json
// @Produce json
// @Param token query string true "JWT токен"
// @Success 101 "WebSocket соединение установлено"
// @Router /ws/chat [get]
func (h *ChatHandler) HandleWebSocket(c *gin.Context) {
	// Get token from query parameter for WebSocket auth
	token := c.Query("token")
	if token != "" {
		c.Request.Header.Set("Authorization", "Bearer "+token)
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	// Handle WebSocket messages
	for {
		var msg struct {
			Type      string `json:"type"`
			SessionID string `json:"session_id"`
			Content   string `json:"content"`
		}

		if err := conn.ReadJSON(&msg); err != nil {
			break
		}

		switch msg.Type {
		case "message":
			// Process message
			response, err := h.aiService.ProcessChatMessage(msg.SessionID, msg.Content)
			if err != nil {
				conn.WriteJSON(gin.H{"error": err.Error()})
				continue
			}

			// Stream response
			conn.WriteJSON(gin.H{
				"type":    "response",
				"content": response.Content,
			})

		case "typing":
			// Handle typing indicator
			conn.WriteJSON(gin.H{
				"type": "typing",
			})
		}
	}
}
