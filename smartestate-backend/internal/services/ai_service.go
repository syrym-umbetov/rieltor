// internal/services/ai_service.go
package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"github.com/sashabaranov/go-openai"
	"smartestate/internal/config"
	"smartestate/internal/models"
	"strings"
)

type AIService struct {
	client             *openai.Client
	config             *config.Config
	parserService      *ParserService
	chatService        *ChatService
	krishaFilterService *KrishaFilterService
}

func NewAIService(cfg *config.Config) *AIService {
	client := openai.NewClient(cfg.AI.OpenAIKey)
	return &AIService{
		client: client,
		config: cfg,
	}
}

func (s *AIService) isAPIKeyConfigured() bool {
	switch s.config.AI.Provider {
	case "openai":
		return s.config.AI.OpenAIKey != ""
	case "gemini":
		return s.config.AI.GeminiKey != ""
	case "claude":
		return s.config.AI.AnthropicKey != ""
	default:
		return false
	}
}

// SetParserService устанавливает парсер сервис для AI
func (s *AIService) SetParserService(parserService *ParserService) {
	s.parserService = parserService
}

// SetChatService устанавливает чат сервис для AI
func (s *AIService) SetChatService(chatService *ChatService) {
	s.chatService = chatService
}

// SetKrishaFilterService устанавливает Krisha filter сервис для AI
func (s *AIService) SetKrishaFilterService(krishaFilterService *KrishaFilterService) {
	s.krishaFilterService = krishaFilterService
}

type AIResponse struct {
	Content  string                 `json:"content"`
	Metadata models.MessageMetadata `json:"metadata"`
}

// Gemini API structures
type GeminiRequest struct {
	Contents []GeminiContent `json:"contents"`
}

type GeminiContent struct {
	Parts []GeminiPart `json:"parts"`
}

type GeminiPart struct {
	Text string `json:"text"`
}

type GeminiResponse struct {
	Candidates []GeminiCandidate `json:"candidates"`
}

type GeminiCandidate struct {
	Content GeminiContent `json:"content"`
}

func (s *AIService) callGeminiAPI(prompt string) (string, error) {
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=%s", s.config.AI.GeminiKey)
	
	reqData := GeminiRequest{
		Contents: []GeminiContent{
			{
				Parts: []GeminiPart{
					{Text: prompt},
				},
			},
		},
	}
	
	jsonData, err := json.Marshal(reqData)
	if err != nil {
		return "", err
	}
	
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("Gemini API error: %s", string(body))
	}
	
	var geminiResp GeminiResponse
	if err := json.Unmarshal(body, &geminiResp); err != nil {
		return "", err
	}
	
	if len(geminiResp.Candidates) > 0 && len(geminiResp.Candidates[0].Content.Parts) > 0 {
		return geminiResp.Candidates[0].Content.Parts[0].Text, nil
	}
	
	return "", fmt.Errorf("no response from Gemini")
}

func (s *AIService) processWithGemini(sessionID, content, systemPrompt string) (*AIResponse, error) {
	// Проверяем, является ли это подтверждением для парсинга
	confirmationWords := []string{"да", "согласен", "подтверждаю", "запускай", "давай", "окей", "ок", "старт"}
	userContentLower := strings.ToLower(content)
	
	hasConfirmation := false
	for _, word := range confirmationWords {
		if strings.Contains(userContentLower, word) {
			hasConfirmation = true
			break
		}
	}
	
	if hasConfirmation {
		// Пользователь дал подтверждение - пытаемся извлечь параметры из истории сообщений
		if s.chatService != nil {
			session, err := s.chatService.GetSession(sessionID)
			if err == nil && session != nil && len(session.Messages) > 0 {
				// Ищем последние параметры поиска в истории
				for i := len(session.Messages) - 1; i >= 0; i-- {
					msg := session.Messages[i]
					if msg.Role == "user" {
						filters := s.extractSearchParams(msg.Content)
						if filters.City != "" {
							// Нашли параметры поиска - вызываем парсинг
							return s.handleParsePropertiesWithParams(sessionID, filters, content)
						}
					}
				}
			}
		}
	}
	
	// Обычный чат с Gemini
	fullPrompt := systemPrompt + "\n\nПользователь: " + content
	aiResponse, err := s.callGeminiAPI(fullPrompt)
	if err != nil {
		return nil, err
	}
	
	metadata := s.extractMetadata(content, aiResponse)
	return &AIResponse{
		Content:  aiResponse,
		Metadata: metadata,
	}, nil
}

func (s *AIService) extractSearchParams(content string) models.PropertyFilters {
	var filters models.PropertyFilters
	contentLower := strings.ToLower(content)
	
	// Извлекаем город
	cities := []string{"алматы", "нур-султан", "астана", "шымкент"}
	for _, city := range cities {
		if strings.Contains(contentLower, city) {
			if city == "нур-султан" || city == "астана" {
				filters.City = "Нур-Sultan"
			} else if city == "алматы" {
				filters.City = "Алматы"
			} else if city == "шымкент" {
				filters.City = "Шымкент"
			}
			break
		}
	}
	
	// Извлекаем количество комнат
	if strings.Contains(contentLower, "1-комн") || strings.Contains(contentLower, "1 комн") || strings.Contains(contentLower, "однокомн") {
		rooms := 1
		filters.Rooms = &rooms
	} else if strings.Contains(contentLower, "2-комн") || strings.Contains(contentLower, "2 комн") || strings.Contains(contentLower, "двухкомн") {
		rooms := 2
		filters.Rooms = &rooms
	} else if strings.Contains(contentLower, "3-комн") || strings.Contains(contentLower, "3 комн") || strings.Contains(contentLower, "трехкомн") {
		rooms := 3
		filters.Rooms = &rooms
	}
	
	// Извлекаем бюджет
	if strings.Contains(contentLower, "40 млн") || strings.Contains(contentLower, "40млн") {
		price := int64(40000000)
		filters.PriceMax = &price
	} else if strings.Contains(contentLower, "30 млн") || strings.Contains(contentLower, "30млн") {
		price := int64(30000000)
		filters.PriceMax = &price
	} else if strings.Contains(contentLower, "50 млн") || strings.Contains(contentLower, "50млн") {
		price := int64(50000000)
		filters.PriceMax = &price
	}
	
	filters.PropertyType = "apartment"
	return filters
}

func (s *AIService) handleParsePropertiesWithParams(sessionID string, filters models.PropertyFilters, userContent string) (*AIResponse, error) {
	if s.krishaFilterService == nil {
		return &AIResponse{
			Content: "Извините, сервис парсинга временно недоступен. Попробуйте позже.",
			Metadata: models.MessageMetadata{
				Actions:    []string{"parser_unavailable"},
				Confidence: 0.9,
				Extra:      map[string]interface{}{"error": "krisha_filter_service_not_initialized"},
			},
		}, nil
	}

	// Convert to KrishaFilters format
	krishaFilters := s.convertToKrishaFilters(filters)
	
	// Call KrishaFilterService
	krishaResult, err := s.krishaFilterService.ParseWithFilters(krishaFilters)
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
	if len(krishaResult.Properties) == 0 {
		content := "К сожалению, по вашим критериям ничего не найдено. Попробуйте расширить параметры поиска или изменить город."
		return &AIResponse{
			Content: content,
			Metadata: models.MessageMetadata{
				Actions:    []string{"search_no_results"},
				Confidence: 0.9,
				Extra: map[string]interface{}{
					"filters_used": krishaFilters,
					"total_found":  0,
				},
			},
		}, nil
	}

	// Create response with found properties using Krisha format
	log.Printf("🔄 AI Service: Начинаю форматирование %d объектов недвижимости", len(krishaResult.Properties))

	content := s.formatKrishaPropertiesResponse(krishaResult.Properties, krishaFilters)

	log.Printf("✅ AI Service: Успешно обработано %d объектов недвижимости", len(krishaResult.Properties))

	return &AIResponse{
		Content: content,
		Metadata: models.MessageMetadata{
			Actions: []string{"search_completed", "properties_found"},
			PropertyIDs: extractKrishaPropertyIDs(krishaResult.Properties),
			Confidence: 0.95,
			Extra: map[string]interface{}{
				"filters_used": krishaFilters,
				"total_found":  len(krishaResult.Properties),
				"properties":   krishaResult.Properties,
			},
		},
	}, nil
}

func (s *AIService) ProcessChatMessage(sessionID, content string) (*AIResponse, error) {
	// Проверяем наличие API ключа
	if !s.isAPIKeyConfigured() {
		return &AIResponse{
			Content: fmt.Sprintf("❌ AI API ключ для провайдера '%s' не настроен. Пожалуйста, добавьте соответствующий ключ в файл .env", s.config.AI.Provider),
			Metadata: models.MessageMetadata{
				Actions:    []string{"configuration_error"},
				Confidence: 1.0,
				Extra:      map[string]interface{}{"error": "ai_api_key_missing", "provider": s.config.AI.Provider},
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

	// Выбираем провайдера AI
	var aiResponse string
	var err error
	
	switch s.config.AI.Provider {
	case "gemini":
		// Для Gemini используем специальную логику с парсингом намерений
		return s.processWithGemini(sessionID, content, systemPrompt)
	case "openai":
	default:
		// OpenAI как fallback
		resp, openaiErr := s.client.CreateChatCompletion(
			context.Background(),
			openai.ChatCompletionRequest{
				Model:        openai.GPT4,
				Messages:     messages,
				Functions:    functions,
				FunctionCall: "auto",
			},
		)
		
		if openaiErr != nil {
			err = openaiErr
		} else {
			message := resp.Choices[0].Message
			
			// Проверяем, вызывает ли ИИ функцию
			if message.FunctionCall != nil {
				return s.handleFunctionCall(sessionID, message, content)
			}
			
			aiResponse = message.Content
		}
	}
	
	if err != nil {
		return nil, err
	}

	metadata := s.extractMetadata(content, aiResponse)

	return &AIResponse{
		Content:  aiResponse,
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
	parseResponse, err := s.parserService.ParseProperties(filters, 1, nil) // максимум 1 страница для быстроты
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
		if i >= 100 { // показываем максимум 100 объектов
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

// ProgressInfo для WebSocket updates (exported)
type ProgressInfo struct {
	Step        string `json:"step"`
	Current     int    `json:"current"`
	Total       int    `json:"total"`
	Percentage  int    `json:"percentage"`
	Description string `json:"description"`
}

// ProcessChatMessageWithProgress processes chat message with real-time progress updates
func (s *AIService) ProcessChatMessageWithProgress(sessionID, content string, progressChan chan<- ProgressInfo) (*AIResponse, error) {
	// Send initial progress
	progressChan <- ProgressInfo{
		Step:        "ai_analysis",
		Current:     1,
		Total:       4,
		Percentage:  25,
		Description: "🤖 Анализирую ваш запрос...",
	}

	// Check API key first
	if !s.isAPIKeyConfigured() {
		return &AIResponse{
			Content: fmt.Sprintf("❌ AI API ключ для провайдера '%s' не настроен. Пожалуйста, добавьте соответствующий ключ в файл .env", s.config.AI.Provider),
			Metadata: models.MessageMetadata{
				Actions:    []string{"configuration_error"},
				Confidence: 1.0,
				Extra:      map[string]interface{}{"error": "ai_api_key_missing", "provider": s.config.AI.Provider},
			},
		}, nil
	}

	// Check if this is a confirmation for parsing
	confirmationWords := []string{"да", "согласен", "подтверждаю", "запускай", "давай", "окей", "ок", "старт"}
	userContentLower := strings.ToLower(content)
	
	hasConfirmation := false
	for _, word := range confirmationWords {
		if strings.Contains(userContentLower, word) {
			hasConfirmation = true
			break
		}
	}

	if hasConfirmation {
		progressChan <- ProgressInfo{
			Step:        "params_extraction",
			Current:     2,
			Total:       4,
			Percentage:  50,
			Description: "🔍 Извлекаю параметры поиска...",
		}

		// Extract parameters from chat history
		if s.chatService != nil {
			session, err := s.chatService.GetSession(sessionID)
			if err == nil && session != nil && len(session.Messages) > 0 {
				// Search for parameters in history
				for i := len(session.Messages) - 1; i >= 0; i-- {
					msg := session.Messages[i]
					if msg.Role == "user" {
						filters := s.extractSearchParams(msg.Content)
						if filters.City != "" {
							// Found parameters - start parsing with progress
							return s.handleParsePropertiesWithProgress(sessionID, filters, content, progressChan)
						}
					}
				}
			}
		}
	}

	// Regular Gemini chat
	progressChan <- ProgressInfo{
		Step:        "ai_response",
		Current:     3,
		Total:       4,
		Percentage:  75,
		Description: "💬 Генерирую ответ...",
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

	fullPrompt := systemPrompt + "\n\nПользователь: " + content
	aiResponse, err := s.callGeminiAPI(fullPrompt)
	if err != nil {
		return nil, err
	}

	progressChan <- ProgressInfo{
		Step:        "completed",
		Current:     4,
		Total:       4,
		Percentage:  100,
		Description: "✅ Готово!",
	}

	metadata := s.extractMetadata(content, aiResponse)
	return &AIResponse{
		Content:  aiResponse,
		Metadata: metadata,
	}, nil
}

// handleParsePropertiesWithProgress handles property parsing with progress updates
func (s *AIService) handleParsePropertiesWithProgress(sessionID string, filters models.PropertyFilters, userContent string, progressChan chan<- ProgressInfo) (*AIResponse, error) {
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

	progressChan <- ProgressInfo{
		Step:        "parsing_start",
		Current:     3,
		Total:       4,
		Percentage:  75,
		Description: "🏠 Ищу подходящие квартиры...",
	}

	// Call parser service (this takes the most time)
	parseResponse, err := s.parserService.ParseProperties(filters, 1, nil) // максимум 1 страница для быстроты
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

	progressChan <- ProgressInfo{
		Step:        "formatting_results",
		Current:     4,
		Total:       4,
		Percentage:  100,
		Description: "📝 Обрабатываю результаты...",
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

// convertToKrishaFilters converts PropertyFilters to enhanced KrishaFilters format
func (s *AIService) convertToKrishaFilters(filters models.PropertyFilters) KrishaFilters {
	krishaFilters := KrishaFilters{
		CollectAllPages: true, // Включаем сбор всех страниц по умолчанию
		MaxResults:     200,  // Максимум 200 результатов как в проекте krisha
		Page:           1,
		HasPhoto:       false, // Убираем фильтр по фото - может ограничивать результаты
	}

	// Convert city
	if filters.City != "" {
		switch strings.ToLower(filters.City) {
		case "алматы", "almaty":
			krishaFilters.City = "almaty"
		case "нур-султан", "астана", "nur-sultan", "astana":
			krishaFilters.City = "nur-sultan"
		case "шымкент", "shymkent":
			krishaFilters.City = "shymkent"
		default:
			krishaFilters.City = strings.ToLower(filters.City)
		}
	}

	// Convert rooms
	if filters.Rooms != nil {
		krishaFilters.Rooms = fmt.Sprintf("%d", *filters.Rooms)
	}

	// Convert price range
	if filters.PriceMin != nil {
		krishaFilters.PriceFrom = fmt.Sprintf("%d", *filters.PriceMin)
	}
	if filters.PriceMax != nil {
		krishaFilters.PriceTo = fmt.Sprintf("%d", *filters.PriceMax)
	}

	// Convert area range (используем TotalAreaFrom/TotalAreaTo)
	if filters.TotalAreaFrom != nil {
		krishaFilters.AreaFrom = fmt.Sprintf("%d", *filters.TotalAreaFrom)
	}
	if filters.TotalAreaTo != nil {
		krishaFilters.AreaTo = fmt.Sprintf("%d", *filters.TotalAreaTo)
	}

	return krishaFilters
}

// formatKrishaPropertiesResponse formats Krisha properties into chat response with enhanced display
func (s *AIService) formatKrishaPropertiesResponse(properties []models.ParsedProperty, filters KrishaFilters) string {
	if len(properties) == 0 {
		return "Недвижимость не найдена."
	}

	var response strings.Builder
	response.WriteString(fmt.Sprintf("🏠 **Найдено %d объектов недвижимости**", len(properties)))

	if filters.City != "" {
		cityName := filters.City
		switch filters.City {
		case "almaty":
			cityName = "Алматы"
		case "nur-sultan":
			cityName = "Нур-Султан"
		case "shymkent":
			cityName = "Шымкент"
		}
		response.WriteString(fmt.Sprintf(" в городе **%s**", cityName))
	}
	if filters.Rooms != "" {
		response.WriteString(fmt.Sprintf(", **%s-комнатные**", filters.Rooms))
	}
	response.WriteString(":\n\n")

	// Показываем все найденные объекты
	displayCount := len(properties)

	// Показываем объекты с полной информацией и фотографиями
	for i := 0; i < displayCount; i++ {
		property := properties[i]

		response.WriteString(fmt.Sprintf("**%d. %s**\n", i+1, property.Title))

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

		// Показываем все доступные фотографии
		if len(property.Images) > 0 {
			response.WriteString("📸 Фото:\n")
			for j, imageURL := range property.Images {
				if j >= 5 { // Ограничиваем до 5 фото на объект для читаемости
					response.WriteString(fmt.Sprintf("*... и еще %d фото*\n", len(property.Images)-j))
					break
				}
				response.WriteString(fmt.Sprintf("![Фото %d](%s)\n", j+1, imageURL))
			}
		}

		if property.URL != "" {
			fullURL := property.URL
			if strings.HasPrefix(property.URL, "/") {
				fullURL = "https://krisha.kz" + property.URL
			}
			response.WriteString(fmt.Sprintf("🔗 [Подробнее](%s)\n", fullURL))
		}

		response.WriteString("\n---\n\n")
	}

	// Информация о количестве показанных объектов
	response.WriteString(fmt.Sprintf("📋 **Показано всех %d найденных объектов**\n\n", len(properties)))

	// Статистика
	apartmentsWithImages := 0
	for _, apt := range properties {
		if len(apt.Images) > 0 {
			apartmentsWithImages++
		}
	}

	response.WriteString(fmt.Sprintf("📊 **Статистика:** %d объектов, %d с фото (%d%%)\n\n",
		len(properties),
		apartmentsWithImages,
		apartmentsWithImages*100/len(properties)))

	response.WriteString("💬 **Хотите уточнить поиск или получить больше информации о каком-то объекте? Просто напишите мне!**")
	return response.String()
}

// extractKrishaPropertyIDs extracts property IDs from Krisha properties
func extractKrishaPropertyIDs(properties []models.ParsedProperty) []string {
	ids := make([]string, 0, len(properties))
	for _, property := range properties {
		if property.ID != "" {
			ids = append(ids, property.ID)
		}
	}
	return ids
}