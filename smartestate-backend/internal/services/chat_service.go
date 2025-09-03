// internal/services/chat_service.go
package services

import (
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
	"smartestate/internal/models"
)

type ChatService struct {
	db    *gorm.DB
	redis *redis.Client
}

func NewChatService(db *gorm.DB, redis *redis.Client) *ChatService {
	return &ChatService{db: db, redis: redis}
}

func (s *ChatService) CreateSession(session *models.ChatSession) error {
	return s.db.Create(session).Error
}

func (s *ChatService) GetSession(id string) (*models.ChatSession, error) {
	var session models.ChatSession
	err := s.db.Preload("Messages").Where("id = ?", id).First(&session).Error
	return &session, err
}

func (s *ChatService) SaveMessage(message *models.ChatMessage) error {
	return s.db.Create(message).Error
}

func (s *ChatService) GetMessages(sessionID string) ([]models.ChatMessage, error) {
	var messages []models.ChatMessage
	err := s.db.Where("session_id = ?", sessionID).Order("created_at ASC").Find(&messages).Error
	return messages, err
}
