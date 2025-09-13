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
	Parser    *ParserService
}

func NewContainer(db *gorm.DB, redis *redis.Client, cfg *config.Config) *Container {
	// Create services
	authService := NewAuthService(cfg, redis)
	userService := NewUserService(db)
	propertyService := NewPropertyService(db, redis)
	chatService := NewChatService(db, redis)
	aiService := NewAIService(cfg)
	searchService := NewSearchService(db, redis)
	targetingService := NewTargetingService(db, redis, cfg)
	analyticsService := NewAnalyticsService(db, redis)
	parserService := NewParserService(db)
	krishaFilterService := NewKrishaFilterService()

	// Set up AI service integrations
	aiService.SetParserService(parserService)
	aiService.SetChatService(chatService)
	aiService.SetKrishaFilterService(krishaFilterService)

	return &Container{
		Auth:      authService,
		User:      userService,
		Property:  propertyService,
		Chat:      chatService,
		AI:        aiService,
		Search:    searchService,
		Targeting: targetingService,
		Analytics: analyticsService,
		Parser:    parserService,
	}
}
