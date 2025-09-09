// internal/services/ai_service.go
package services

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/sashabaranov/go-openai"
	"smartestate/internal/config"
	"smartestate/internal/models"
	"strings"
)

type AIService struct {
	client        *openai.Client
	config        *config.Config
	parserService *ParserService
	chatService   *ChatService
}

func NewAIService(cfg *config.Config) *AIService {
	client := openai.NewClient(cfg.OpenAI.APIKey)
	return &AIService{
		client: client,
		config: cfg,
	}
}

func (s *AIService) isAPIKeyConfigured() bool {
	return s.config.OpenAI.APIKey != ""
}

// SetParserService устанавливает парсер сервис для AI
func (s *AIService) SetParserService(parserService *ParserService) {
	s.parserService = parserService
}

// SetChatService устанавливает чат сервис для AI
func (s *AIService) SetChatService(chatService *ChatService) {
	s.chatService = chatService
}

type AIResponse struct {
	Content  string                 `json:"content"`
	Metadata models.MessageMetadata `json:"metadata"`
}

func (s *AIService) ProcessChatMessage(sessionID, content string) (*AIResponse, error) {
	// Проверяем наличие API ключа
	if !s.isAPIKeyConfigured() {
		return &AIResponse{
			Content: "❌ OpenAI API ключ не настроен. Пожалуйста, добавьте OPENAI_API_KEY в файл .env",
			Metadata: models.MessageMetadata{
				Actions:    []string{"configuration_error"},
				Confidence: 1.0,
				Extra:      map[string]interface{}{"error": "openai_api_key_missing"},
			},
		}, nil
	}
	systemPrompt := `You are SmartEstate AI assistant, helping users find and manage real estate in Kazakhstan. 

	CRITICAL RULE - NEVER call parse_properties function without EXPLICIT final confirmation!

	SMART CONVERSATION FLOW:
	1. When user provides search request with COMPLETE information (city, rooms, budget), IMMEDIATELY summarize and ask for confirmation
	2. When user provides INCOMPLETE information, ask only for missing critical details
	3. ALWAYS summarize parameters and ask FINAL CONFIRMATION: "Подтверждаете поиск?" 
	4. ONLY use parse_properties function when user explicitly confirms with "да", "согласен", "подтверждаю", "давай", "окей" etc.

	CRITICAL: If user provides city + rooms + budget in first message - DON'T ask additional questions, go straight to confirmation!

	You can help with:
	- Finding properties (only after confirmation)
	- Calculating mortgage payments
	- Property valuation
	- Scheduling viewings
	- Market analysis
	
	Always respond in Russian or Kazakh based on user's language.
	
	Example conversation flow:
	User: "Найди 2-комн в Алматы до 40 млн"
	AI: "Понял ваши требования:
	✅ 2-комнатная квартира
	✅ Город: Алматы  
	✅ Бюджет: до 40 млн тенге
	
	Подтверждаете поиск? Напишите 'Да' и я начну парсинг."
	
	User: "Да"
	AI: (NOW calls parse_properties function)
	
	NEVER call parse_properties without final user confirmation!`

	// Определяем доступные функции
	functions := []openai.FunctionDefinition{
		{
			Name:        "parse_properties",
			Description: "Парсит недвижимость с сайта krisha.kz по заданным фильтрам. КРИТИЧЕСКИ ВАЖНО: Используй эту функцию ТОЛЬКО после ЯВНОГО подтверждения пользователем типа 'да, ищи', 'согласен', 'подтверждаю'. НИКОГДА не вызывай без финального подтверждения!",
			Parameters: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"city": map[string]interface{}{
						"type":        "string",
						"description": "Город поиска (Алматы, Нур-Султан, Шымкент)",
						"enum":        []string{"Алматы", "Нур-Sultan", "Шымкент"},
					},
					"property_type": map[string]interface{}{
						"type":        "string", 
						"description": "Тип недвижимости",
						"enum":        []string{"apartment", "house", "commercial"},
					},
					"rooms": map[string]interface{}{
						"type":        "integer",
						"description": "Количество комнат",
						"minimum":     1,
						"maximum":     10,
					},
					"price_min": map[string]interface{}{
						"type":        "integer",
						"description": "Минимальная цена в тенге",
					},
					"price_max": map[string]interface{}{
						"type":        "integer", 
						"description": "Максимальная цена в тенге",
					},
					"total_area_from": map[string]interface{}{
						"type":        "integer",
						"description": "Минимальная площадь в м²",
					},
					"total_area_to": map[string]interface{}{
						"type":        "integer",
						"description": "Максимальная площадь в м²",
					},
					"has_photos": map[string]interface{}{
						"type":        "boolean",
						"description": "Только с фотографиями",
					},
					"is_new_building": map[string]interface{}{
						"type":        "boolean", 
						"description": "Только новостройки",
					},
					"seller_type": map[string]interface{}{
						"type":        "string",
						"description": "Тип продавца",
						"enum":        []string{"owner", "agent", "developer"},
					},
				},
				"required": []string{"city"},
			},
		},
	}

	// Получаем историю сообщений для контекста
	var messages []openai.ChatCompletionMessage
	messages = append(messages, openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleSystem,
		Content: systemPrompt,
	})

	// Добавляем историю сообщений если ChatService доступен
	if s.chatService != nil {
		session, err := s.chatService.GetSession(sessionID)
		if err == nil && session != nil {
			// Добавляем все сообщения из истории (кроме последнего - его добавим отдельно)
			for _, msg := range session.Messages {
				var role string
				switch msg.Role {
				case "user":
					role = openai.ChatMessageRoleUser
				case "assistant":
					role = openai.ChatMessageRoleAssistant
				default:
					continue
				}
				messages = append(messages, openai.ChatCompletionMessage{
					Role:    role,
					Content: msg.Content,
				})
			}
		}
	}

	// Добавляем текущее сообщение пользователя
	messages = append(messages, openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleUser,
		Content: content,
	})

	resp, err := s.client.CreateChatCompletion(
		context.Background(),
		openai.ChatCompletionRequest{
			Model:        openai.GPT4,
			Messages:     messages,
			Functions:    functions,
			FunctionCall: "auto",
		},
	)

	if err != nil {
		return nil, err
	}

	message := resp.Choices[0].Message

	// Проверяем, вызывает ли ИИ функцию
	if message.FunctionCall != nil {
		return s.handleFunctionCall(sessionID, message, content)
	}

	metadata := s.extractMetadata(content, message.Content)

	return &AIResponse{
		Content:  message.Content,
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

func (s *AIService) handleFunctionCall(sessionID string, message openai.ChatCompletionMessage, userContent string) (*AIResponse, error) {
	if message.FunctionCall == nil {
		return nil, fmt.Errorf("no function call found")
	}

	switch message.FunctionCall.Name {
	case "parse_properties":
		return s.handleParsePropertiesCall(sessionID, message.FunctionCall.Arguments, userContent)
	default:
		return nil, fmt.Errorf("unknown function: %s", message.FunctionCall.Name)
	}
}

func (s *AIService) handleParsePropertiesCall(sessionID, arguments, userContent string) (*AIResponse, error) {
	// КРИТИЧЕСКАЯ ПРОВЕРКА: Блокируем вызов парсера без подтверждения
	// Только ЯВНЫЕ слова согласия, БЕЗ слов из поисковых запросов типа "найди", "ищи", "поиск"
	confirmationWords := []string{"да", "согласен", "подтверждаю", "запускай", "давай", "окей", "ок", "старт"}
	userContentLower := strings.ToLower(userContent)
	
	hasConfirmation := false
	foundWord := ""
	for _, word := range confirmationWords {
		if strings.Contains(userContentLower, word) {
			hasConfirmation = true
			foundWord = word
			break
		}
	}
	
	// Debug логирование
	fmt.Printf("[AI SERVICE] Проверка подтверждения для текста: '%s'\n", userContent)
	fmt.Printf("[AI SERVICE] Найдено слово подтверждения: '%s', hasConfirmation: %v\n", foundWord, hasConfirmation)
	
	if !hasConfirmation {
		return &AIResponse{
			Content: `Я понял ваши требования к поиску, но для запуска парсинга нужно ваше подтверждение.

Параметры поиска готовы. Подтвердите запуск поиска, написав:
- "Да, ищи"  
- "Согласен"
- "Запускай поиск"

Вы готовы начать поиск недвижимости?`,
			Metadata: models.MessageMetadata{
				Actions:    []string{"waiting_confirmation"},
				Confidence: 1.0,
				Extra:      map[string]interface{}{"requires_confirmation": true},
			},
		}, nil
	}

	if s.parserService == nil {
		return &AIResponse{
			Content: "Извините, сервис парсинга временно недоступен. Попробуйте позже.",
			Metadata: models.MessageMetadata{
				Actions:    []string{"parser_unavailable"},
				Confidence: 0.9,
				Extra:      map[string]interface{}{"error": "parser_service_not_initialized"},
			},
		}, nil
	}

	// Parse function arguments
	var filters models.PropertyFilters
	if err := json.Unmarshal([]byte(arguments), &filters); err != nil {
		return &AIResponse{
			Content: "Не удалось обработать параметры поиска. Попробуйте переформулировать запрос.",
			Metadata: models.MessageMetadata{
				Actions:    []string{"parse_error"},
				Confidence: 0.8,
				Extra:      map[string]interface{}{"error": err.Error()},
			},
		}, nil
	}

	// Call parser service
	parseResponse, err := s.parserService.ParseProperties(filters, 3, nil) // максимум 3 страницы
	if err != nil {
		return &AIResponse{
			Content: fmt.Sprintf("Не удалось выполнить поиск недвижимости: %v. Попробуйте изменить параметры поиска.", err),
			Metadata: models.MessageMetadata{
				Actions:    []string{"parse_failed"},
				Confidence: 0.7,
				Extra:      map[string]interface{}{"error": err.Error()},
			},
		}, nil
	}

	// Format response based on parsing results
	if len(parseResponse.Properties) == 0 {
		content := "К сожалению, по вашим критериям ничего не найдено. Попробуйте расширить параметры поиска или изменить город."
		return &AIResponse{
			Content: content,
			Metadata: models.MessageMetadata{
				Actions:    []string{"search_no_results"},
				Confidence: 0.9,
				Extra: map[string]interface{}{
					"parse_request_id": parseResponse.RequestID,
					"filters_used":     filters,
					"total_found":      0,
				},
			},
		}, nil
	}

	// Create response with found properties
	content := s.formatPropertiesResponse(parseResponse.Properties, filters)
	
	return &AIResponse{
		Content: content,
		Metadata: models.MessageMetadata{
			Actions: []string{"search_completed", "properties_found"},
			PropertyIDs: extractPropertyIDs(parseResponse.Properties),
			Confidence: 0.95,
			Extra: map[string]interface{}{
				"parse_request_id": parseResponse.RequestID,
				"filters_used":     filters,
				"total_found":      len(parseResponse.Properties),
				"properties":       parseResponse.Properties,
			},
		},
	}, nil
}

func (s *AIService) formatPropertiesResponse(properties []models.ParsedProperty, filters models.PropertyFilters) string {
	if len(properties) == 0 {
		return "Недвижимость не найдена."
	}

	var response strings.Builder
	response.WriteString(fmt.Sprintf("🏠 Найдено %d объектов недвижимости", len(properties)))
	
	if filters.City != "" {
		response.WriteString(fmt.Sprintf(" в городе %s", filters.City))
	}
	if filters.Rooms != nil {
		response.WriteString(fmt.Sprintf(", %d-комнатные", *filters.Rooms))
	}
	response.WriteString(":\n\n")

	for i, property := range properties {
		if i >= 10 { // показываем максимум 10 объектов
			response.WriteString(fmt.Sprintf("... и еще %d объектов\n", len(properties)-i))
			break
		}

		response.WriteString(fmt.Sprintf("🏢 **%s**\n", property.Title))
		
		if property.Price > 0 {
			response.WriteString(fmt.Sprintf("💰 Цена: %s ₸\n", formatPrice(property.Price)))
		}
		
		if property.Rooms != nil && *property.Rooms > 0 {
			response.WriteString(fmt.Sprintf("🚪 Комнат: %d\n", *property.Rooms))
		}
		
		if property.Area != nil && *property.Area > 0 {
			response.WriteString(fmt.Sprintf("📐 Площадь: %.1f м²\n", *property.Area))
		}
		
		if property.Address != "" {
			response.WriteString(fmt.Sprintf("📍 Адрес: %s\n", property.Address))
		}
		
		// Добавляем изображения
		if len(property.Images) > 0 {
			response.WriteString("📸 Фото:\n")
			// Показываем максимум 3 изображения для каждого объекта
			maxImages := len(property.Images)
			if maxImages > 3 {
				maxImages = 3
			}
			for j := 0; j < maxImages; j++ {
				response.WriteString(fmt.Sprintf("![Фото %d](%s)\n", j+1, property.Images[j]))
			}
			if len(property.Images) > 3 {
				response.WriteString(fmt.Sprintf("*... и еще %d фото*\n", len(property.Images)-3))
			}
		}
		
		if property.URL != "" {
			// Создаем полный URL для krisha.kz
			fullURL := property.URL
			if strings.HasPrefix(property.URL, "/") {
				fullURL = "https://krisha.kz" + property.URL
			}
			response.WriteString(fmt.Sprintf("🔗 [Подробнее](%s)\n", fullURL))
		}
		
		response.WriteString("\n---\n\n")
	}

	response.WriteString("Хотите уточнить поиск или получить больше информации о каком-то объекте?")
	return response.String()
}

func formatPrice(price int64) string {
	if price >= 1000000 {
		millions := float64(price) / 1000000
		if millions == float64(int64(millions)) {
			return fmt.Sprintf("%.0f млн", millions)
		}
		return fmt.Sprintf("%.1f млн", millions)
	}
	if price >= 1000 {
		thousands := float64(price) / 1000
		if thousands == float64(int64(thousands)) {
			return fmt.Sprintf("%.0f тыс", thousands)
		}
		return fmt.Sprintf("%.1f тыс", thousands)
	}
	return fmt.Sprintf("%d", price)
}

func extractPropertyIDs(properties []models.ParsedProperty) []string {
	ids := make([]string, 0, len(properties))
	for _, property := range properties {
		if property.ID != "" {
			ids = append(ids, property.ID)
		}
	}
	return ids
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
