// internal/services/ai_service.go
package services

import (
	"context"
	"fmt"
	"github.com/sashabaranov/go-openai"
	"smartestate/internal/config"
	"smartestate/internal/models"
	"strings"
)

type AIService struct {
	client *openai.Client
	config *config.Config
}

func NewAIService(cfg *config.Config) *AIService {
	client := openai.NewClient(cfg.OpenAI.APIKey)
	return &AIService{
		client: client,
		config: cfg,
	}
}

type AIResponse struct {
	Content  string                 `json:"content"`
	Metadata models.MessageMetadata `json:"metadata"`
}

func (s *AIService) ProcessChatMessage(sessionID, content string) (*AIResponse, error) {
	systemPrompt := `You are SmartEstate AI assistant, helping users find and manage real estate in Kazakhstan. 
	You can help with:
	- Finding properties based on preferences
	- Calculating mortgage payments
	- Property valuation
	- Scheduling viewings
	- Market analysis
	Respond in Russian or Kazakh based on user's language.`

	resp, err := s.client.CreateChatCompletion(
		context.Background(),
		openai.ChatCompletionRequest{
			Model: openai.GPT4,
			Messages: []openai.ChatCompletionMessage{
				{
					Role:    openai.ChatMessageRoleSystem,
					Content: systemPrompt,
				},
				{
					Role:    openai.ChatMessageRoleUser,
					Content: content,
				},
			},
		},
	)

	if err != nil {
		return nil, err
	}

	metadata := s.extractMetadata(content, resp.Choices[0].Message.Content)

	return &AIResponse{
		Content:  resp.Choices[0].Message.Content,
		Metadata: metadata,
	}, nil
}

func (s *AIService) GenerateAdCreatives(propertyID string, platforms []string) ([]models.Creative, error) {
	// Implementation for generating ad creatives
	return []models.Creative{}, nil
}

func (s *AIService) GetPropertyRecommendations(userID string) ([]models.Property, error) {
	return []models.Property{}, nil
}

func (s *AIService) GeneratePropertyDescription(property *models.Property) (string, error) {
	prompt := fmt.Sprintf(`Generate an attractive property listing description in Russian:
	Type: %s
	Rooms: %d
	Area: %.2f sqm
	Floor: %d/%d
	Location: %s, %s`,
		property.PropertyType,
		property.Rooms,
		property.AreaSqm,
		property.Floor,
		property.TotalFloors,
		property.Address.City,
		property.Address.Street,
	)

	resp, err := s.client.CreateChatCompletion(
		context.Background(),
		openai.ChatCompletionRequest{
			Model: openai.GPT4,
			Messages: []openai.ChatCompletionMessage{
				{
					Role:    openai.ChatMessageRoleUser,
					Content: prompt,
				},
			},
		},
	)

	if err != nil {
		return "", err
	}

	return resp.Choices[0].Message.Content, nil
}

func (s *AIService) extractMetadata(userContent, aiResponse string) models.MessageMetadata {
	metadata := models.MessageMetadata{
		Actions:     []string{},
		PropertyIDs: []string{},
		Extra:       make(map[string]interface{}),
	}

	if containsAny(aiResponse, []string{"показать", "найти", "подобрать"}) {
		metadata.Actions = append(metadata.Actions, "search")
	}
	if containsAny(aiResponse, []string{"рассчитать", "ипотека", "кредит"}) {
		metadata.Actions = append(metadata.Actions, "mortgage_calculation")
	}
	if containsAny(aiResponse, []string{"записать", "просмотр", "встреча"}) {
		metadata.Actions = append(metadata.Actions, "schedule_viewing")
	}

	metadata.Confidence = 0.85
	return metadata
}

func containsAny(text string, keywords []string) bool {
	text = strings.ToLower(text)
	for _, keyword := range keywords {
		if strings.Contains(text, keyword) {
			return true
		}
	}
	return false
}
