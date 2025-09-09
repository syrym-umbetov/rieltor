// internal/api/handlers/container.go
package handlers

import (
	"smartestate/internal/services"
)

type Container struct {
	Auth      *AuthHandler
	Property  *PropertyHandler
	Chat      *ChatHandler
	Targeting *TargetingHandler
	Analytics *AnalyticsHandler
	Parser    *ParserHandler
}

func NewContainer(services *services.Container) *Container {
	return &Container{
		Auth:      NewAuthHandler(services.Auth, services.User),
		Property:  NewPropertyHandler(services.Property, services.AI, services.Search),
		Chat:      NewChatHandler(services.Chat, services.AI),
		Targeting: NewTargetingHandler(services.Targeting, services.AI),
		Analytics: NewAnalyticsHandler(services.Analytics),
		Parser:    NewParserHandler(services.Parser),
	}
}
