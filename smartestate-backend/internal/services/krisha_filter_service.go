package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"smartestate/internal/models"
)

const (
	N8N_WEBHOOK_URL_KRISHA = "https://umbetovs.app.n8n.cloud/webhook/analyze-realtor"
)

// N8nWebhookPayloadKrisha структура для отправки данных в n8n
type N8nWebhookPayloadKrisha struct {
	FiltersUsed map[string]interface{}    `json:"filters_used"`
	Properties  []models.ParsedProperty   `json:"properties"`
	TotalFound  int                      `json:"total_found"`
}

// KrishaFilterService - сервис для работы с фильтрами Krisha.kz
type KrishaFilterService struct {
	client *http.Client
}

// NewKrishaFilterService создает новый сервис
func NewKrishaFilterService() *KrishaFilterService {
	return &KrishaFilterService{
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// KrishaFilters - расширенная структура фильтров для Krisha
type KrishaFilters struct {
	City             string `json:"city"`              // almaty, nur-sultan, shymkent
	District         string `json:"district"`          // район города
	PriceFrom        string `json:"priceFrom"`         // минимальная цена
	PriceTo          string `json:"priceTo"`           // максимальная цена
	Rooms            string `json:"rooms"`             // количество комнат
	AreaFrom         string `json:"areaFrom"`          // минимальная площадь
	AreaTo           string `json:"areaTo"`            // максимальная площадь
	KitchenAreaFrom  string `json:"kitchenAreaFrom"`   // минимальная площадь кухни
	KitchenAreaTo    string `json:"kitchenAreaTo"`     // максимальная площадь кухни
	FloorFrom        string `json:"floorFrom"`         // минимальный этаж
	FloorTo          string `json:"floorTo"`           // максимальный этаж
	FloorNotFirst    bool   `json:"floorNotFirst"`     // исключить первый этаж
	FloorNotLast     bool   `json:"floorNotLast"`      // исключить последний этаж
	HouseFloorFrom   string `json:"houseFloorFrom"`    // минимальная этажность дома
	HouseFloorTo     string `json:"houseFloorTo"`      // максимальная этажность дома
	YearFrom         string `json:"yearFrom"`          // год постройки от
	YearTo           string `json:"yearTo"`            // год постройки до
	HouseType        string `json:"houseType"`         // тип дома
	WhoType          string `json:"whoType"`           // тип продавца
	HasPhoto         bool   `json:"hasPhoto"`          // только с фото
	Complex          string `json:"complex"`           // жилой комплекс
	Page             int    `json:"page"`              // номер страницы
	CollectAllPages  bool   `json:"collectAllPages"`   // собрать все страницы
	MaxResults       int    `json:"maxResults"`        // максимум результатов
}

// KrishaResult - результат парсинга
type KrishaResult struct {
	Properties   []models.ParsedProperty `json:"properties"`
	Total        int                     `json:"total"`
	TotalPages   int                     `json:"totalPages"`
	CurrentPage  int                     `json:"currentPage"`
	HasNextPage  bool                    `json:"hasNextPage"`
	URL          string                  `json:"url"`
	Filters      KrishaFilters           `json:"filters"`
}

// ParseWithFilters парсит объявления с фильтрами
func (s *KrishaFilterService) ParseWithFilters(filters KrishaFilters) (*KrishaResult, error) {
	// Валидация
	if filters.City == "" {
		return nil, fmt.Errorf("город обязателен")
	}

	// Если нужно собрать все страницы
	if filters.CollectAllPages {
		maxResults := filters.MaxResults
		if maxResults <= 0 {
			maxResults = 200 // по умолчанию 200
		}
		log.Printf("🔄 Krisha Filter: Режим сбора всех страниц активирован, лимит: %d", maxResults)
		return s.collectAllPages(filters, maxResults)
	}

	// Обычный режим - одна страница
	return s.parseSinglePage(filters)
}

// parseSinglePage парсит одну страницу
func (s *KrishaFilterService) parseSinglePage(filters KrishaFilters) (*KrishaResult, error) {
	// Строим URL
	targetURL := s.buildFilterURL(filters)
	log.Printf("🔍 Krisha Filter: Парсим URL: %s", targetURL)

	// Получаем HTML
	doc, err := s.fetchPage(targetURL)
	if err != nil {
		return nil, err
	}

	// Парсим объявления
	properties := s.parseProperties(doc)
	log.Printf("✅ Krisha Filter: Найдено %d объявлений", len(properties))

	// Парсим пагинацию
	totalPages, hasNextPage := s.parsePagination(doc)

	// Парсим общее количество
	totalFound := s.parseTotalCount(doc, len(properties), totalPages)

	result := &KrishaResult{
		Properties:  properties,
		Total:       totalFound,
		TotalPages:  totalPages,
		CurrentPage: filters.Page,
		HasNextPage: hasNextPage,
		URL:         targetURL,
		Filters:     filters,
	}

	return result, nil
}

// collectAllPages собирает данные со всех страниц пагинации
func (s *KrishaFilterService) collectAllPages(filters KrishaFilters, maxResults int) (*KrishaResult, error) {
	allProperties := []models.ParsedProperty{}
	currentPage := 1
	totalPages := 1

	log.Printf("🚀 Krisha Filter: Начинаем сбор всех страниц, максимум %d результатов", maxResults)

	for {
		// Создаем копию фильтров с текущей страницей
		pageFilters := filters
		pageFilters.Page = currentPage
		targetURL := s.buildFilterURL(pageFilters)

		log.Printf("📄 Krisha Filter: Парсим страницу %d: %s", currentPage, targetURL)

		// Получаем HTML
		doc, err := s.fetchPage(targetURL)
		if err != nil {
			log.Printf("❌ Krisha Filter: Ошибка на странице %d: %v", currentPage, err)
			break
		}

		// Парсим объявления на текущей странице
		pageProperties := s.parseProperties(doc)
		log.Printf("✅ Krisha Filter: Найдено объявлений на странице %d: %d", currentPage, len(pageProperties))

		// Добавляем найденные объявления к общему списку
		for _, property := range pageProperties {
			if len(allProperties) >= maxResults {
				log.Printf("🎯 Krisha Filter: Достигнут лимит в %d объявлений", maxResults)
				goto finished
			}
			allProperties = append(allProperties, property)
		}

		// Если это первая страница, определяем общее количество страниц
		if currentPage == 1 {
			totalPages, _ = s.parsePagination(doc)
			log.Printf("📊 Krisha Filter: Общее количество страниц: %d", totalPages)

			// Если результатов меньше чем на одной странице, прекращаем
			if len(pageProperties) == 0 {
				log.Printf("⚠️ Krisha Filter: На первой странице нет результатов")
				break
			}
		}

		// Переходим к следующей странице
		currentPage++

		// Добавляем небольшую задержку между запросами
		time.Sleep(500 * time.Millisecond)

		// Проверяем, не превышаем ли мы общее количество страниц
		if currentPage > totalPages {
			log.Printf("🏁 Krisha Filter: Достигнута последняя страница (%d)", totalPages)
			break
		}

		// Дополнительная защита от бесконечного цикла
		if currentPage > 50 { // Максимум 50 страниц как защита
			log.Printf("🛑 Krisha Filter: Достигнут максимальный лимит страниц (50)")
			break
		}

		// Если на текущей странице нет объявлений, прекращаем
		if len(pageProperties) == 0 {
			log.Printf("⚠️ Krisha Filter: На странице %d нет объявлений, прекращаем", currentPage-1)
			break
		}
	}

finished:
	log.Printf("🎉 Krisha Filter: Сбор завершен. Всего собрано объявлений: %d", len(allProperties))

	// Статистика по изображениям
	apartmentsWithImages := 0
	for _, apt := range allProperties {
		if len(apt.Images) > 0 {
			apartmentsWithImages++
		}
	}
	apartmentsWithoutImages := len(allProperties) - apartmentsWithImages

	log.Printf("📸 Krisha Filter: С изображениями: %d, без изображений: %d", apartmentsWithImages, apartmentsWithoutImages)

	// Отправляем данные в n8n webhook если найдены объявления
	if len(allProperties) > 0 {
		go s.sendToN8nWebhook(filters, allProperties)
	}

	result := &KrishaResult{
		Properties:  allProperties,
		Total:       len(allProperties), // Общее количество = количеству собранных
		TotalPages:  1,                  // В режиме всех страниц всегда 1 виртуальная страница
		CurrentPage: 1,                  // Все результаты на одной "виртуальной" странице
		HasNextPage: false,              // Никогда нет следующей страницы в режиме всех страниц
		URL:         s.buildFilterURL(filters),
		Filters:     filters,
	}

	return result, nil
}

// fetchPage получает и парсит HTML страницу
func (s *KrishaFilterService) fetchPage(targetURL string) (*goquery.Document, error) {
	// Делаем HTTP запрос
	req, err := http.NewRequest("GET", targetURL, nil)
	if err != nil {
		return nil, fmt.Errorf("ошибка создания запроса: %w", err)
	}

	// Устанавливаем заголовки для имитации браузера (как в рабочем krisha проекте)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3")
	// req.Header.Set("Accept-Encoding", "gzip, deflate, br") // Убираем gzip - проблемы с декодированием
	req.Header.Set("Connection", "keep-alive")
	req.Header.Set("Upgrade-Insecure-Requests", "1")
	req.Header.Set("Cache-Control", "no-cache")
	req.Header.Set("Pragma", "no-cache")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ошибка HTTP запроса: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP error: %d", resp.StatusCode)
	}

	// Читаем HTML
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("ошибка чтения ответа: %w", err)
	}

	// Парсим HTML
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(string(body)))
	if err != nil {
		return nil, fmt.Errorf("ошибка парсинга HTML: %w", err)
	}

	return doc, nil
}

// buildFilterURL строит URL с расширенными фильтрами
func (s *KrishaFilterService) buildFilterURL(filters KrishaFilters) string {
	baseURL := "https://krisha.kz/prodazha/kvartiry"

	// Добавляем район к URL если указан
	cityURL := fmt.Sprintf("%s/%s", baseURL, filters.City)
	if filters.District != "" {
		cityURL += "-" + filters.District
	}
	cityURL += "/"

	params := url.Values{}

	// Базовые параметры
	if filters.Rooms != "" {
		params.Set("das[live.rooms]", filters.Rooms)
	}

	// Цена
	if filters.PriceFrom != "" {
		params.Set("das[price][from]", filters.PriceFrom)
	}
	if filters.PriceTo != "" {
		params.Set("das[price][to]", filters.PriceTo)
	}

	// Площадь общая
	if filters.AreaFrom != "" {
		params.Set("das[live.square][from]", filters.AreaFrom)
	}
	if filters.AreaTo != "" {
		params.Set("das[live.square][to]", filters.AreaTo)
	}

	// Площадь кухни
	if filters.KitchenAreaFrom != "" {
		params.Set("das[kitchen.square][from]", filters.KitchenAreaFrom)
	}
	if filters.KitchenAreaTo != "" {
		params.Set("das[kitchen.square][to]", filters.KitchenAreaTo)
	}

	// Этаж квартиры
	if filters.FloorFrom != "" {
		params.Set("das[flat.floor][from]", filters.FloorFrom)
	}
	if filters.FloorTo != "" {
		params.Set("das[flat.floor][to]", filters.FloorTo)
	}

	// Этажность дома
	if filters.HouseFloorFrom != "" {
		params.Set("das[house.floor_num][from]", filters.HouseFloorFrom)
	}
	if filters.HouseFloorTo != "" {
		params.Set("das[house.floor_num][to]", filters.HouseFloorTo)
	}

	// Год постройки
	if filters.YearFrom != "" {
		params.Set("das[house.year][from]", filters.YearFrom)
	}
	if filters.YearTo != "" {
		params.Set("das[house.year][to]", filters.YearTo)
	}

	// Тип дома
	if filters.HouseType != "" {
		params.Set("das[house.type]", filters.HouseType)
	}

	// Тип объявления (от кого)
	if filters.WhoType != "" {
		params.Set("das[who]", filters.WhoType)
	}

	// Дополнительные параметры
	if filters.HasPhoto {
		params.Set("das[_sys.hasphoto]", "1")
	}

	if filters.FloorNotFirst {
		params.Set("das[floor_not_first]", "1")
	}

	if filters.FloorNotLast {
		params.Set("das[floor_not_last]", "1")
	}

	if filters.Complex != "" {
		params.Set("das[map.complex]", filters.Complex)
	}

	// Пагинация
	if filters.Page > 1 {
		params.Set("page", strconv.Itoa(filters.Page))
	}

	finalURL := cityURL
	if len(params) > 0 {
		finalURL = fmt.Sprintf("%s?%s", cityURL, params.Encode())
	}

	log.Printf("🔗 Krisha Filter: Сформированный URL: %s", finalURL)
	return finalURL
}

// parseProperties парсит объявления со страницы
func (s *KrishaFilterService) parseProperties(doc *goquery.Document) []models.ParsedProperty {
	var properties []models.ParsedProperty

	doc.Find(".a-card").Each(func(i int, sel *goquery.Selection) {
		// Пропускаем рекламные блоки
		if sel.HasClass("ddl_campaign") || sel.Find(".adfox").Length() > 0 {
			return
		}

		property := s.parsePropertyCard(sel)
		if property.Title != "" && property.Price > 0 {
			properties = append(properties, property)
		}
	})

	return properties
}

// parsePropertyCard парсит одну карточку объявления
func (s *KrishaFilterService) parsePropertyCard(card *goquery.Selection) models.ParsedProperty {
	property := models.ParsedProperty{}

	// ID и UUID
	if id, exists := card.Attr("data-id"); exists {
		property.ID = id
	}

	// Заголовок
	titleText := card.Find(".a-card__title").Text()
	property.Title = strings.TrimSpace(titleText)

	// URL
	if href, exists := card.Find(".a-card__title").Attr("href"); exists {
		if strings.HasPrefix(href, "/") {
			property.URL = "https://krisha.kz" + href
		} else {
			property.URL = href
		}
	}

	// Цена
	priceText := card.Find(".a-card__price").Text()
	property.Price, property.Currency = s.parsePrice(strings.TrimSpace(priceText))

	// Адрес
	addressText := card.Find(".a-card__subtitle").Text()
	property.Address = strings.TrimSpace(addressText)

	// Описание
	descText := card.Find(".a-card__text-preview").Text()
	property.Description = strings.TrimSpace(descText)

	// Изображение
	property.Images = s.parseImages(card)

	// Извлекаем площадь и этаж из заголовка
	s.parseAreaAndFloor(property.Title, &property)

	// Телефон (если есть)
	phoneText := card.Find(".seller-phone").Text()
	if phoneText != "" {
		property.Phone = strings.TrimSpace(phoneText)
	}

	return property
}

// parsePrice извлекает цену из текста
func (s *KrishaFilterService) parsePrice(priceText string) (int64, string) {
	if priceText == "" {
		return 0, "KZT"
	}

	// Убираем все кроме цифр
	re := regexp.MustCompile(`[^\d]`)
	priceStr := re.ReplaceAllString(priceText, "")
	
	if price, err := strconv.ParseInt(priceStr, 10, 64); err == nil {
		return price, "KZT"
	}

	return 0, "KZT"
}

// parseImages извлекает изображения используя продвинутый алгоритм
func (s *KrishaFilterService) parseImages(card *goquery.Selection) []string {
	var images []string

	// Убираем поиск существующих изображений - генерируем только из UUID

	// Ищем data-photo-id в picture элементе для определения номера фото
	pictureElement := card.Find("picture")
	photoId := "1"
	if pictureElement.Length() > 0 {
		if dataPhotoId, exists := pictureElement.Attr("data-photo-id"); exists && dataPhotoId != "" {
			photoId = dataPhotoId
		}
	}

	// Генерируем одно главное изображение из data-uuid
	if uuid, exists := card.Attr("data-uuid"); exists && uuid != "" {
		firstTwoChars := uuid[:2]
		mainDomain := "https://krisha-photos.kcdn.online" // Основной рабочий домен

		// Добавляем только ОДНО главное изображение
		imageURL := fmt.Sprintf("%s/webp/%s/%s/%s-%s.webp", mainDomain, firstTwoChars, uuid, photoId, "400x300")
		images = append(images, imageURL)
	}

	// Возвращаем только сгенерированные из UUID изображения (без дубликатов)
	return images
}

// parseAreaAndFloor извлекает площадь и этаж из заголовка
func (s *KrishaFilterService) parseAreaAndFloor(title string, property *models.ParsedProperty) {
	// Ищем площадь и этаж в заголовке: "25.5 м² 3/9 этаж"
	areaFloorRe := regexp.MustCompile(`(\d+(?:\.\d+)?)\s*м².*?(\d+)\/(\d+)\s*этаж`)
	if matches := areaFloorRe.FindStringSubmatch(title); len(matches) >= 4 {
		if area, err := strconv.ParseFloat(matches[1], 64); err == nil {
			property.Area = &area
		}
		if floor, err := strconv.Atoi(matches[2]); err == nil {
			property.Floor = &floor
		}
		if totalFloors, err := strconv.Atoi(matches[3]); err == nil {
			property.TotalFloors = &totalFloors
		}
	}

	// Ищем количество комнат
	roomsRe := regexp.MustCompile(`(\d+)[\-\s]*комн`)
	if matches := roomsRe.FindStringSubmatch(title); len(matches) >= 2 {
		if rooms, err := strconv.Atoi(matches[1]); err == nil {
			property.Rooms = &rooms
		}
	}
}

// parsePagination парсит информацию о пагинации
func (s *KrishaFilterService) parsePagination(doc *goquery.Document) (totalPages int, hasNextPage bool) {
	totalPages = 1
	hasNextPage = false

	// Ищем пагинатор
	paginator := doc.Find(".paginator, .pagination, nav.paginator")
	if paginator.Length() == 0 {
		return totalPages, hasNextPage
	}

	// Ищем номера страниц
	var pageNumbers []int
	paginator.Find(".paginator__btn, .pagination__btn, .page-btn, a[data-page]").Each(func(i int, btn *goquery.Selection) {
		// Из data-page атрибута
		if dataPage, exists := btn.Attr("data-page"); exists {
			if pageNum, err := strconv.Atoi(dataPage); err == nil && pageNum > 0 {
				pageNumbers = append(pageNumbers, pageNum)
			}
		}

		// Из текста кнопки
		pageText := strings.TrimSpace(btn.Text())
		if pageNum, err := strconv.Atoi(pageText); err == nil && pageNum > 0 {
			pageNumbers = append(pageNumbers, pageNum)
		}
	})

	// Ищем в href атрибутах
	paginator.Find("a[href*=\"page=\"]").Each(func(i int, link *goquery.Selection) {
		if href, exists := link.Attr("href"); exists {
			re := regexp.MustCompile(`page=(\d+)`)
			if matches := re.FindStringSubmatch(href); len(matches) >= 2 {
				if pageNum, err := strconv.Atoi(matches[1]); err == nil && pageNum > 0 {
					pageNumbers = append(pageNumbers, pageNum)
				}
			}
		}
	})

	// Находим максимальную страницу
	if len(pageNumbers) > 0 {
		for _, num := range pageNumbers {
			if num > totalPages {
				totalPages = num
			}
		}
	}

	// Проверяем есть ли кнопка "Дальше"
	nextBtn := paginator.Find(".paginator__btn--next, .pagination__btn--next, .next, .page-next")
	hasNextPage = nextBtn.Length() > 0

	return totalPages, hasNextPage
}

// parseTotalCount парсит общее количество объявлений
func (s *KrishaFilterService) parseTotalCount(doc *goquery.Document, foundCount, totalPages int) int {
	// Ищем текст "Найдено X объявлений"
	searchSubtitle := doc.Find(".a-search-subtitle, .search-results-nb").Text()
	
	totalRe := regexp.MustCompile(`Найдено\s+(\d+(?:\s+\d+)*)\s+объявлени`)
	if matches := totalRe.FindStringSubmatch(searchSubtitle); len(matches) >= 2 {
		// Убираем пробелы из числа
		cleanNumber := strings.ReplaceAll(matches[1], " ", "")
		if total, err := strconv.Atoi(cleanNumber); err == nil {
			return total
		}
	}

	// Альтернативный поиск
	selectors := []string{
		".search-results-header",
		".results-count", 
		".found-count",
		".search-results__count",
		".listing-header",
		"h1",
		".search-summary",
		".page-title",
	}

	totalCount := 0
	for _, selector := range selectors {
		if totalCount > 0 {
			break
		}
		doc.Find(selector).Each(func(i int, sel *goquery.Selection) {
			if totalCount > 0 {
				return // Already found
			}
			text := sel.Text()
			re := regexp.MustCompile(`(\d+(?:\s+\d+)*)\s*(?:объявлени|результат|найден)`)
			if matches := re.FindStringSubmatch(text); len(matches) >= 2 {
				cleanNumber := strings.ReplaceAll(matches[1], " ", "")
				if total, err := strconv.Atoi(cleanNumber); err == nil {
					totalCount = total
				}
			}
		})
	}
	
	if totalCount > 0 {
		return totalCount
	}

	// Если не нашли, оцениваем по пагинации
	if totalPages > 1 {
		return totalPages * 20 // предполагаем 20 объявлений на странице
	}

	return foundCount
}

// GenerateFiltersFromMessage - ИИ будет генерировать фильтры из сообщения пользователя
func (s *KrishaFilterService) GenerateFiltersFromMessage(message string) KrishaFilters {
	filters := KrishaFilters{
		City:      "almaty", // по умолчанию
		PriceFrom: "",
		PriceTo:   "",
		Rooms:     "",
		Page:      1,
	}

	message = strings.ToLower(message)

	// Определяем город
	if strings.Contains(message, "астана") || strings.Contains(message, "нур-султан") {
		filters.City = "astana"
	} else if strings.Contains(message, "шымкент") {
		filters.City = "shymkent"
	} else if strings.Contains(message, "алматы") {
		filters.City = "almaty"
	}

	// Извлекаем цену
	priceRe := regexp.MustCompile(`(\d+(?:\s+\d+)*)\s*(?:млн|миллион|тысяч|тенге|₸)`)
	priceMatches := priceRe.FindAllStringSubmatch(message, -1)
	
	var prices []int64
	for _, match := range priceMatches {
		if len(match) >= 2 {
			priceStr := strings.ReplaceAll(match[1], " ", "")
			if price, err := strconv.ParseInt(priceStr, 10, 64); err == nil {
				// Определяем единицы измерения
				if strings.Contains(match[0], "млн") || strings.Contains(match[0], "миллион") {
					price *= 1000000
				} else if strings.Contains(match[0], "тысяч") {
					price *= 1000
				}
				prices = append(prices, price)
			}
		}
	}

	if len(prices) >= 2 {
		filters.PriceFrom = strconv.FormatInt(prices[0], 10)
		filters.PriceTo = strconv.FormatInt(prices[1], 10)
	} else if len(prices) == 1 {
		filters.PriceFrom = strconv.FormatInt(prices[0], 10)
	}

	// Извлекаем количество комнат
	roomsRe := regexp.MustCompile(`(\d+)[\-\s]*(?:комн|комнат)`)
	if matches := roomsRe.FindStringSubmatch(message); len(matches) >= 2 {
		filters.Rooms = matches[1]
	}

	return filters
}

// FormatResultForChat форматирует результат для отправки в чат
func (s *KrishaFilterService) FormatResultForChat(result *KrishaResult) string {
	if len(result.Properties) == 0 {
		return "🏠 По вашим критериям ничего не найдено. Попробуйте расширить параметры поиска."
	}

	var response strings.Builder
	
	response.WriteString(fmt.Sprintf("🏠 Найдено %d объявлений (страница %d из %d):\n\n", 
		result.Total, result.CurrentPage, result.TotalPages))

	// Показываем первые 5 объявлений
	count := len(result.Properties)
	if count > 5 {
		count = 5
	}

	for i := 0; i < count; i++ {
		prop := result.Properties[i]
		
		response.WriteString(fmt.Sprintf("🏡 **%s**\n", prop.Title))
		response.WriteString(fmt.Sprintf("💰 %s %s\n", s.formatPrice(prop.Price), prop.Currency))
		
		if prop.Address != "" {
			response.WriteString(fmt.Sprintf("📍 %s\n", prop.Address))
		}
		
		if len(prop.Images) > 0 {
			response.WriteString(fmt.Sprintf("🖼️ [Фото](%s)\n", prop.Images[0]))
		}
		
		if prop.URL != "" {
			response.WriteString(fmt.Sprintf("🔗 [Открыть на Krisha.kz](%s)\n", prop.URL))
		}
		
		response.WriteString("\n")
	}

	if len(result.Properties) > 5 {
		response.WriteString(fmt.Sprintf("... и ещё %d объявлений\n\n", len(result.Properties)-5))
	}

	if result.HasNextPage {
		response.WriteString("➡️ Для просмотра следующих страниц отправьте: \"следующая страница\"")
	}

	return response.String()
}

// formatPrice форматирует цену для отображения
func (s *KrishaFilterService) formatPrice(price int64) string {
	if price == 0 {
		return "Цена не указана"
	}

	// Форматируем с разделителями тысяч
	str := strconv.FormatInt(price, 10)
	if len(str) <= 3 {
		return str
	}

	var result []string
	for i := len(str); i > 0; i -= 3 {
		start := i - 3
		if start < 0 {
			start = 0
		}
		result = append([]string{str[start:i]}, result...)
	}

	return strings.Join(result, " ")
}

// sendToN8nWebhook отправляет данные в n8n webhook
func (s *KrishaFilterService) sendToN8nWebhook(filters KrishaFilters, properties []models.ParsedProperty) {
	log.Printf("📡 Krisha Filter: Отправка данных в n8n webhook: %d объявлений", len(properties))

	// Конвертируем фильтры в формат, ожидаемый n8n
	filtersMap := s.convertKrishaFiltersToMap(filters)

	// Создаем полезную нагрузку для webhook
	payload := N8nWebhookPayloadKrisha{
		FiltersUsed: filtersMap,
		Properties:  properties,
		TotalFound:  len(properties),
	}

	// Маршалим в JSON
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		log.Printf("❌ Krisha Filter: Ошибка создания JSON для n8n webhook: %v", err)
		return
	}

	// Отправляем POST запрос
	req, err := http.NewRequest("POST", N8N_WEBHOOK_URL_KRISHA, bytes.NewBuffer(payloadJSON))
	if err != nil {
		log.Printf("❌ Krisha Filter: Ошибка создания HTTP запроса для n8n: %v", err)
		return
	}

	req.Header.Set("Content-Type", "application/json")

	// Выполняем запрос
	resp, err := s.client.Do(req)
	if err != nil {
		log.Printf("❌ Krisha Filter: Ошибка отправки запроса в n8n: %v", err)
		return
	}
	defer resp.Body.Close()

	// Читаем ответ
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("❌ Krisha Filter: Ошибка чтения ответа от n8n: %v", err)
		return
	}

	if resp.StatusCode == http.StatusOK {
		log.Printf("✅ Krisha Filter: Данные успешно отправлены в n8n webhook")
		log.Printf("📄 Krisha Filter: Ответ от n8n: %s", string(responseBody))
	} else {
		log.Printf("❌ Krisha Filter: n8n webhook вернул ошибку %d: %s", resp.StatusCode, string(responseBody))
	}
}

// convertKrishaFiltersToMap конвертирует KrishaFilters в map для n8n
func (s *KrishaFilterService) convertKrishaFiltersToMap(filters KrishaFilters) map[string]interface{} {
	filtersMap := make(map[string]interface{})

	if filters.City != "" {
		filtersMap["city"] = filters.City
	}
	if filters.District != "" {
		filtersMap["district"] = filters.District
	}
	if filters.PriceFrom != "" {
		filtersMap["price_min"] = filters.PriceFrom
	}
	if filters.PriceTo != "" {
		filtersMap["price_max"] = filters.PriceTo
	}
	if filters.Rooms != "" {
		filtersMap["rooms"] = filters.Rooms
	}
	if filters.AreaFrom != "" {
		filtersMap["total_area_from"] = filters.AreaFrom
	}
	if filters.AreaTo != "" {
		filtersMap["total_area_to"] = filters.AreaTo
	}
	if filters.KitchenAreaFrom != "" {
		filtersMap["kitchen_area_from"] = filters.KitchenAreaFrom
	}
	if filters.KitchenAreaTo != "" {
		filtersMap["kitchen_area_to"] = filters.KitchenAreaTo
	}
	if filters.FloorFrom != "" {
		filtersMap["floor_from"] = filters.FloorFrom
	}
	if filters.FloorTo != "" {
		filtersMap["floor_to"] = filters.FloorTo
	}
	if filters.FloorNotFirst {
		filtersMap["not_first_floor"] = true
	}
	if filters.FloorNotLast {
		filtersMap["not_last_floor"] = true
	}
	if filters.HouseFloorFrom != "" {
		filtersMap["total_floors_from"] = filters.HouseFloorFrom
	}
	if filters.HouseFloorTo != "" {
		filtersMap["total_floors_to"] = filters.HouseFloorTo
	}
	if filters.YearFrom != "" {
		filtersMap["build_year_from"] = filters.YearFrom
	}
	if filters.YearTo != "" {
		filtersMap["build_year_to"] = filters.YearTo
	}
	if filters.CollectAllPages {
		filtersMap["collect_all_pages"] = true
	}
	if filters.MaxResults > 0 {
		filtersMap["max_results"] = filters.MaxResults
	}

	return filtersMap
}