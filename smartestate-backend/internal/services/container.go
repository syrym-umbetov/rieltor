// internal/services/container.go
package services

import (
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
	"smartestate/internal/config"
)

type Container struct {
	Auth      *AuthService
	User      *UserService
	Property  *PropertyService
	Chat      *ChatService
	AI        *AIService
	Search    *SearchService
	Targeting *TargetingService
	Analytics *AnalyticsService
}

func NewContainer(db *gorm.DB, redis *redis.Client, cfg *config.Config) *Container {
	return &Container{
		Auth:      NewAuthService(cfg, redis),
		User:      NewUserService(db),
		Property:  NewPropertyService(db, redis),
		Chat:      NewChatService(db, redis),
		AI:        NewAIService(cfg),
		Search:    NewSearchService(db, redis),
		Targeting: NewTargetingService(db, redis, cfg),
		Analytics: NewAnalyticsService(db, redis),
	}
}
