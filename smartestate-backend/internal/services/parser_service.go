package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/tebeka/selenium"
	"gorm.io/gorm"

	"smartestate/internal/models"
)

type ParserService struct {
	db         *gorm.DB
	debug      bool
	maxWorkers int
	httpClient *http.Client
}

// N8nWebhookPayload структура для отправки данных в n8n webhook
type N8nWebhookPayload struct {
	FiltersUsed map[string]interface{} `json:"filters_used"`
	Properties  []models.ParsedProperty `json:"properties"`
	TotalFound  int                    `json:"total_found"`
}

const (
	N8N_WEBHOOK_URL = "https://umbetovs.app.n8n.cloud/webhook/analyze-realtor"
)

func NewParserService(db *gorm.DB) *ParserService {
	return &ParserService{
		db:         db,
		debug:      true,
		maxWorkers: 12, // Увеличено до 12 параллельных воркеров для максимальной скорости
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// ParseProperties запускает парсинг недвижимости с заданными фильтрами
func (s *ParserService) ParseProperties(filters models.PropertyFilters, maxPages int, userID *uuid.UUID) (*models.ParseResponse, error) {
	// Создаем запись запроса парсинга
	parseRequest := &models.ParseRequest{
		UserID:   userID,
		Filters:  filters,
		MaxPages: maxPages,
		Status:   "processing",
	}
	
	if err := s.db.Create(parseRequest).Error; err != nil {
		return nil, fmt.Errorf("failed to create parse request: %w", err)
	}

	log.Println("Парсим реальные объявления с OLX и Krisha...")
	
	var allProperties []models.ParsedProperty
	var parseErr error
	
	// Парсим с OLX (5 объявлений)
	olxProperties, olxErr := s.parseOlxProperties(filters, maxPages)
	if olxErr != nil {
		log.Printf("Ошибка парсинга OLX: %v", olxErr)
		parseErr = olxErr
	} else {
		// Берем максимум 5 объявлений с OLX
		if len(olxProperties) > 5 {
			olxProperties = olxProperties[:5]
		}
		allProperties = append(allProperties, olxProperties...)
		log.Printf("Получено %d объявлений с OLX", len(olxProperties))
	}
	
	// Парсим с Krisha (5 объявлений)
	krishaProperties, krishaErr := s.parseKrishaProperties(filters, maxPages)
	if krishaErr != nil {
		log.Printf("Ошибка парсинга Krisha: %v", krishaErr)
		if parseErr == nil {
			parseErr = krishaErr
		}
	} else {
		// Берем максимум 5 объявлений с Krisha
		if len(krishaProperties) > 5 {
			krishaProperties = krishaProperties[:5]
		}
		allProperties = append(allProperties, krishaProperties...)
		log.Printf("Получено %d объявлений с Krisha", len(krishaProperties))
	}
	
	log.Printf("Всего объявлений: %d", len(allProperties))

	// Проверяем результат парсинга
	status := "completed"
	errorMsg := ""
	
	if parseErr != nil {
		status = "failed"
		errorMsg = parseErr.Error()
		log.Printf("Ошибка парсинга: %v", parseErr)
	}

	// Обновляем запись с результатами
	parseRequest.Status = status
	parseRequest.Results = models.ParsedPropertySlice(allProperties)
	parseRequest.Count = len(allProperties)
	parseRequest.Error = errorMsg
	
	if err := s.db.Save(parseRequest).Error; err != nil {
		log.Printf("Failed to save parse results: %v", err)
	}

	// Отправляем данные в n8n webhook после успешного парсинга
	if status == "completed" && len(allProperties) > 0 {
		go s.sendToN8nWebhook(filters, allProperties)
	}

	return &models.ParseResponse{
		Success:    true,
		RequestID:  parseRequest.ID,
		Properties: allProperties,
		Count:      len(allProperties),
		Status:     status,
		Error:      errorMsg,
		Cached:     false,
		ParserType: "olx-real",
	}, nil
}

// parseOlxProperties парсит реальную страницу OLX.kz
func (s *ParserService) parseOlxProperties(filters models.PropertyFilters, maxPages int) ([]models.ParsedProperty, error) {
	log.Println("Подключаемся к Selenium Grid для парсинга OLX...")

	// Создаем соединение с Selenium Grid
	caps := selenium.Capabilities{"browserName": "chrome"}
	caps["goog:chromeOptions"] = map[string]interface{}{
		"args": []string{
			"--no-sandbox",
			"--disable-dev-shm-usage",
			"--disable-blink-features=AutomationControlled",
			"--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
		},
	}

	wd, err := selenium.NewRemote(caps, "http://localhost:4444/wd/hub")
	if err != nil {
		log.Printf("Ошибка подключения к Selenium Grid: %v", err)
		// Если не можем подключиться к Grid, пробуем локальный
		wd, err = selenium.NewRemote(caps, "http://localhost:4444/wd/hub")
		if err != nil {
			return nil, fmt.Errorf("не удалось подключиться к Selenium: %w", err)
		}
	}
	defer wd.Quit()

	// Строим URL для OLX
	baseURL := "https://www.olx.kz/nedvizhimost/prodazha-kvartiry/alma-ata/"
	
	// Добавляем фильтры к URL
	urlParams := url.Values{}
	if filters.PriceMax != nil && *filters.PriceMax > 0 {
		urlParams.Add("search[filter_float_price:to]", strconv.FormatInt(*filters.PriceMax, 10))
	}
	if filters.PriceMin != nil && *filters.PriceMin > 0 {
		urlParams.Add("search[filter_float_price:from]", strconv.FormatInt(*filters.PriceMin, 10))
	}
	if filters.Rooms != nil && *filters.Rooms > 0 {
		urlParams.Add("search[filter_enum_kolichestvokomnat][0]", strconv.Itoa(*filters.Rooms))
	}

	fullURL := baseURL
	if len(urlParams) > 0 {
		fullURL += "?" + urlParams.Encode()
	}

	log.Printf("Переходим на страницу: %s", fullURL)

	// Загружаем страницу
	if err := wd.Get(fullURL); err != nil {
		return nil, fmt.Errorf("ошибка загрузки страницы OLX: %w", err)
	}

	// Ждём загрузки страницы
	time.Sleep(3 * time.Second)

	// Находим все объявления на странице
	properties, err := s.parseOlxListings(wd)
	if err != nil {
		return nil, fmt.Errorf("ошибка парсинга объявлений: %w", err)
	}

	log.Printf("Найдено %d объявлений на OLX", len(properties))
	return properties, nil
}

// parseOlxListings извлекает объявления со страницы OLX
func (s *ParserService) parseOlxListings(wd selenium.WebDriver) ([]models.ParsedProperty, error) {
	var properties []models.ParsedProperty

	// Ищем контейнеры с объявлениями (может быть несколько селекторов)
	selectors := []string{
		"[data-cy='l-card']",
		".css-1sw7q4x", 
		"[data-testid='l-card']",
		".offer-wrapper",
	}

	var listings []selenium.WebElement
	var err error

	for _, selector := range selectors {
		listings, err = wd.FindElements(selenium.ByCSSSelector, selector)
		if err == nil && len(listings) > 0 {
			log.Printf("Найдено %d объявлений с селектором: %s", len(listings), selector)
			break
		}
	}

	if len(listings) == 0 {
		return nil, fmt.Errorf("не найдено объявлений на странице")
	}

	// Ограничиваем количество объявлений до 5
	maxListings := 5
	if len(listings) > maxListings {
		listings = listings[:maxListings]
	}

	for i, listing := range listings {
		property, err := s.extractOlxPropertyData(listing, i+1)
		if err != nil {
			log.Printf("Ошибка извлечения данных объявления %d: %v", i+1, err)
			continue
		}

		if property != nil {
			properties = append(properties, *property)
		}
	}

	return properties, nil
}

// extractOlxPropertyData извлекает данные из одного объявления OLX
func (s *ParserService) extractOlxPropertyData(listing selenium.WebElement, index int) (*models.ParsedProperty, error) {
	property := &models.ParsedProperty{
		Currency: "KZT",
	}

	// Генерируем уникальный ID
	property.ID = fmt.Sprintf("olx_%d_%d", time.Now().Unix(), index)

	// Извлекаем заголовок
	titleSelectors := []string{"h6", ".css-16v5mdi h6", "[data-cy='l-card'] h6", "h3", ".title"}
	for _, selector := range titleSelectors {
		if element, err := listing.FindElement(selenium.ByCSSSelector, selector); err == nil {
			if title, err := element.Text(); err == nil && strings.TrimSpace(title) != "" {
				property.Title = strings.TrimSpace(title)
				break
			}
		}
	}

	// Извлекаем цену
	priceSelectors := []string{"p[data-testid='ad-price']", ".css-10b0gli", "[data-testid='ad-price']", ".price"}
	for _, selector := range priceSelectors {
		if element, err := listing.FindElement(selenium.ByCSSSelector, selector); err == nil {
			if priceText, err := element.Text(); err == nil && strings.TrimSpace(priceText) != "" {
				property.Price = s.extractPriceFromText(priceText)
				break
			}
		}
	}

	// Извлекаем ссылку
	if linkElement, err := listing.FindElement(selenium.ByCSSSelector, "a[href]"); err == nil {
		if href, err := linkElement.GetAttribute("href"); err == nil {
			property.URL = href
		}
	}

	// Извлекаем локацию/адрес
	locationSelectors := []string{"[data-testid='location-date']", ".css-veheph", ".location"}
	for _, selector := range locationSelectors {
		if element, err := listing.FindElement(selenium.ByCSSSelector, selector); err == nil {
			if location, err := element.Text(); err == nil && strings.TrimSpace(location) != "" {
				property.Address = strings.TrimSpace(location)
				break
			}
		}
	}

	// Если не удалось получить основные данные, пропускаем
	if property.Title == "" && property.Price == 0 {
		return nil, nil
	}

	// Устанавливаем значения по умолчанию
	if property.Title == "" {
		property.Title = "Квартира в Алматы"
	}
	if property.Address == "" {
		property.Address = "Алматы"
	}
	property.SellerType = "Частное лицо"
	property.BuildingType = "Жилой дом"

	return property, nil
}

// extractPriceFromText извлекает цену из текста
func (s *ParserService) extractPriceFromText(priceText string) int64 {
	// Убираем пробелы и лишние символы
	priceText = strings.ReplaceAll(priceText, " ", "")
	priceText = strings.ReplaceAll(priceText, "тенге", "")
	priceText = strings.ReplaceAll(priceText, "₸", "")
	priceText = strings.ReplaceAll(priceText, "тг", "")
	
	// Используем регулярное выражение для поиска чисел
	re := regexp.MustCompile(`\d+`)
	numbers := re.FindAllString(priceText, -1)
	
	if len(numbers) == 0 {
		return 0
	}
	
	// Соединяем все числа в одну строку (для случая "12 500 000")
	fullNumber := strings.Join(numbers, "")
	
	price, err := strconv.ParseInt(fullNumber, 10, 64)
	if err != nil {
		return 0
	}
	
	return price
}

// parseFromKrisha парсит недвижимость с сайта krisha.kz параллельно
func (s *ParserService) parseFromKrisha(filters models.PropertyFilters, maxPages int) ([]models.ParsedProperty, error) {
	if s.debug {
		log.Printf("Starting parallel parsing with %d workers for %d pages", s.maxWorkers, maxPages)
	}

	// Создаем контекст с таймаутом
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	// Канал для заданий (номера страниц)
	pageJobs := make(chan int, maxPages)
	results := make(chan []models.ParsedProperty, maxPages)
	errors := make(chan error, maxPages)

	// Запускаем воркеры
	var wg sync.WaitGroup
	for i := 0; i < s.maxWorkers; i++ {
		wg.Add(1)
		go s.pageWorker(ctx, &wg, pageJobs, results, errors, filters)
	}

	// Отправляем задания воркерам
	go func() {
		defer close(pageJobs)
		for page := 1; page <= maxPages; page++ {
			select {
			case pageJobs <- page:
			case <-ctx.Done():
				return
			}
		}
	}()

	// Ждем завершения всех воркеров
	go func() {
		wg.Wait()
		close(results)
		close(errors)
	}()

	// Собираем результаты
	var allProperties []models.ParsedProperty
	var lastError error

	for {
		select {
		case pageProperties, ok := <-results:
			if !ok {
				// Канал закрыт, все воркеры завершились
				if len(allProperties) == 0 && lastError != nil {
					return nil, lastError
				}
				return allProperties, nil
			}
			allProperties = append(allProperties, pageProperties...)
			if s.debug {
				log.Printf("Collected %d properties from a page, total: %d", len(pageProperties), len(allProperties))
			}
			
			// Ограничиваем количество результатов до 5 объявлений для быстроты
			if len(allProperties) >= 5 {
				allProperties = allProperties[:5]
				log.Printf("Reached limit of 5 properties, stopping parsing")
				return allProperties, nil
			}
		case err := <-errors:
			if err != nil {
				lastError = err
				log.Printf("Page parsing error: %v", err)
			}
		case <-ctx.Done():
			log.Printf("Parsing context cancelled, returning collected properties: %d", len(allProperties))
			return allProperties, nil
		}
	}
}

// pageWorker обрабатывает одну страницу
func (s *ParserService) pageWorker(ctx context.Context, wg *sync.WaitGroup, pageJobs <-chan int, results chan<- []models.ParsedProperty, errors chan<- error, filters models.PropertyFilters) {
	defer wg.Done()

	// Создаем WebDriver для этого воркера
	wd, err := s.createWebDriver()
	if err != nil {
		select {
		case errors <- fmt.Errorf("failed to create webdriver: %w", err):
		case <-ctx.Done():
		}
		return
	}
	defer wd.Quit()

	for {
		select {
		case page, ok := <-pageJobs:
			if !ok {
				return // Канал закрыт
			}

			properties, err := s.parseSinglePage(ctx, wd, filters, page)
			if err != nil {
				select {
				case errors <- err:
				case <-ctx.Done():
				}
				continue
			}

			select {
			case results <- properties:
			case <-ctx.Done():
				return
			}

		case <-ctx.Done():
			return
		}
	}
}

// parseSinglePage парсит одну страницу
func (s *ParserService) parseSinglePage(ctx context.Context, wd selenium.WebDriver, filters models.PropertyFilters, page int) ([]models.ParsedProperty, error) {
	searchURL := s.buildSearchURL(filters, page)
	
	if s.debug {
		log.Printf("Worker parsing page %d: %s", page, searchURL)
	}

	// Пробуем загрузить страницу с повторными попытками
	var lastErr error
	maxRetries := 2
	
	for retry := 0; retry <= maxRetries; retry++ {
		if retry > 0 {
			if s.debug {
				log.Printf("Retry %d/%d for page %d", retry, maxRetries, page)
			}
			select {
			case <-time.After(time.Duration(retry) * time.Second):
			case <-ctx.Done():
				return nil, ctx.Err()
			}
		}
		
		lastErr = wd.Get(searchURL)
		if lastErr == nil {
			break // Успешно загрузили страницу
		}
		
		if s.debug {
			log.Printf("Failed to load page %d (attempt %d/%d): %v", page, retry+1, maxRetries+1, lastErr)
		}
	}
	
	if lastErr != nil {
		return nil, fmt.Errorf("failed to load page %d after %d attempts: %w", page, maxRetries+1, lastErr)
	}

	// Ищем карточки объявлений
	propertyCards, err := wd.FindElements(selenium.ByCSSSelector, ".ddl_product")
	if err != nil || len(propertyCards) == 0 {
		// Пробуем альтернативный селектор
		propertyCards, err = wd.FindElements(selenium.ByCSSSelector, ".a-card")
		if err != nil || len(propertyCards) == 0 {
			if s.debug {
				log.Printf("No property cards found on page %d", page)
			}
			return []models.ParsedProperty{}, nil
		}
	}

	if s.debug {
		log.Printf("Found %d property cards on page %d", len(propertyCards), page)
	}

	// Парсим все карточки на странице
	var properties []models.ParsedProperty
	maxCards := len(propertyCards)
	if maxCards > 5 { // Ограничиваем до 5 карточек для быстроты
		maxCards = 5
	}

	for i := 0; i < maxCards; i++ {
		select {
		case <-ctx.Done():
			return properties, ctx.Err()
		default:
		}

		// Попытка парсинга с таймаутом
		property, err := s.parsePropertyCard(propertyCards[i])
		if err != nil {
			log.Printf("Error parsing property card %d on page %d: %v", i, page, err)
			continue
		}
		if property != nil {
			properties = append(properties, *property)
		}
	}

	return properties, nil
}

// parsePropertyCard парсит одну карточку объявления
func (s *ParserService) parsePropertyCard(card selenium.WebElement) (*models.ParsedProperty, error) {
	property := &models.ParsedProperty{}

	// Заголовок и ссылка
	titleElement, err := card.FindElement(selenium.ByCSSSelector, ".a-card__title")
	if err != nil {
		return nil, fmt.Errorf("title not found: %w", err)
	}
	
	property.Title, err = titleElement.Text()
	if err != nil {
		return nil, fmt.Errorf("failed to get title text: %w", err)
	}

	property.URL, err = titleElement.GetAttribute("href")
	if err != nil {
		property.URL = ""
	} else if property.URL != "" && !strings.HasPrefix(property.URL, "http") {
		// Конвертируем относительный URL в полный URL OLX
		property.URL = "https://www.olx.kz" + property.URL
	}

	// ID из URL
	if property.URL != "" {
		parts := strings.Split(property.URL, "/")
		if len(parts) > 0 {
			property.ID = strings.Split(parts[len(parts)-1], "?")[0]
		}
	}
	if property.ID == "" {
		property.ID = fmt.Sprintf("olx_%d", time.Now().Unix())
	}

	// Цена - детальное логирование для отладки
	priceSelectors := []string{".a-card__price", "[data-cy='card.price']", "[class*='price']", ".price", ".ddl_price", "div[class*='price']"}
	if s.debug {
		log.Printf("Searching for price in property: %s", property.Title)
	}
	for i, selector := range priceSelectors {
		priceElement, err := card.FindElement(selenium.ByCSSSelector, selector)
		if err == nil {
			priceText, err := priceElement.Text()
			if s.debug {
				log.Printf("Price selector %d (%s): found text='%s'", i+1, selector, priceText)
			}
			if err == nil && strings.TrimSpace(priceText) != "" {
				property.Price, property.Currency = s.parsePrice(priceText)
				if s.debug {
					log.Printf("Parsed price: %s -> %d %s", priceText, property.Price, property.Currency)
				}
				break
			}
		} else if s.debug {
			log.Printf("Price selector %d (%s): not found", i+1, selector)
		}
	}

	// Адрес
	addressElement, err := card.FindElement(selenium.ByCSSSelector, ".a-card__subtitle")
	if err == nil {
		property.Address, _ = addressElement.Text()
	}

	// Детали (комнаты, площадь, этаж)
	detailsElement, err := card.FindElement(selenium.ByCSSSelector, ".a-card__text")
	if err == nil {
		detailsText, err := detailsElement.Text()
		if err == nil {
			s.parseDetails(detailsText, property)
		}
	}

	// Изображения - быстрый поиск без улучшения качества
	imageElement, err := card.FindElement(selenium.ByCSSSelector, "img")
	if err == nil {
		src, err := imageElement.GetAttribute("src")
		if err == nil && src != "" && (strings.Contains(src, "alakcell-photos") || strings.Contains(src, "krisha")) {
			// Используем оригинальное изображение для скорости
			property.Images = append(property.Images, src)
		}
	}

	property.Description = property.Title

	return property, nil
}

// enhanceImageQuality улучшает качество изображений krisha.kz
func (s *ParserService) enhanceImageQuality(originalSrc string) string {
	// Пример: https://krisha-photos.kcdn.online/webp/a0/a0c8b561-ca6d-43c9-9376-41ba9f99e074/15-400x300.jpg
	// Меняем на: https://krisha-photos.kcdn.online/webp/a0/a0c8b561-ca6d-43c9-9376-41ba9f99e074/2-750x470.webp
	
	// Поддержка для нового домена alakcell-photos
	if strings.Contains(originalSrc, "alakcell-photos") {
		// Заменяем размер на высокое качество
		if strings.Contains(originalSrc, "-280x175.webp") {
			return strings.ReplaceAll(originalSrc, "-280x175.webp", "-750x470.webp")
		}
		return originalSrc
	}
	
	if !strings.Contains(originalSrc, "krisha-photos.kcdn.online") {
		return originalSrc // Не krisha изображение
	}
	
	// Ищем последний слеш и заменяем размер
	lastSlashIndex := strings.LastIndex(originalSrc, "/")
	if lastSlashIndex == -1 {
		return originalSrc
	}
	
	baseURL := originalSrc[:lastSlashIndex+1]
	fileName := originalSrc[lastSlashIndex+1:]
	
	// Извлекаем номер изображения из имени файла (например, "5-400x300.jpg" -> "5")
	dashIndex := strings.Index(fileName, "-")
	if dashIndex == -1 {
		return originalSrc // Неожиданный формат
	}
	
	imageNumber := fileName[:dashIndex]
	// Заменяем на высокое качество с сохранением номера изображения
	return baseURL + imageNumber + "-750x470.webp"
}

// buildSearchURL строит URL для поиска на krisha.kz
func (s *ParserService) buildSearchURL(filters models.PropertyFilters, page int) string {
	baseURL := "https://krisha.kz/prodazha/kvartiry"
	
	// Добавляем город
	if filters.City == "Алматы" || filters.City == "" {
		baseURL += "/almaty"
	} else if filters.City == "Нур-Султан" || filters.City == "Астана" {
		baseURL += "/nur-sultan"
	} else if filters.City == "Шымкент" {
		baseURL += "/shymkent"
	}

	params := url.Values{}

	// Страница
	if page > 1 {
		params.Add("page", strconv.Itoa(page))
	}

	// Количество комнат
	if filters.Rooms != nil {
		params.Add("das[live.rooms][]", strconv.Itoa(*filters.Rooms))
	}

	// Цена
	if filters.PriceMin != nil {
		params.Add("das[price][from]", strconv.FormatInt(*filters.PriceMin, 10))
	}
	if filters.PriceMax != nil {
		params.Add("das[price][to]", strconv.FormatInt(*filters.PriceMax, 10))
	}

	// Площадь
	if filters.TotalAreaFrom != nil {
		params.Add("das[live_square][from]", strconv.Itoa(*filters.TotalAreaFrom))
	}
	if filters.TotalAreaTo != nil {
		params.Add("das[live_square][to]", strconv.Itoa(*filters.TotalAreaTo))
	}

	// Этаж
	if filters.FloorFrom != nil {
		params.Add("das[flat.floor][from]", strconv.Itoa(*filters.FloorFrom))
	}
	if filters.FloorTo != nil {
		params.Add("das[flat.floor][to]", strconv.Itoa(*filters.FloorTo))
	}

	// Этажность дома
	if filters.TotalFloorsTo != nil {
		params.Add("das[house.floor_num][to]", strconv.Itoa(*filters.TotalFloorsTo))
	}

	// Год постройки
	if filters.BuildYearFrom != nil {
		params.Add("das[house.year][from]", strconv.Itoa(*filters.BuildYearFrom))
	}
	if filters.BuildYearTo != nil {
		params.Add("das[house.year][to]", strconv.Itoa(*filters.BuildYearTo))
	}

	// Только с фото
	if filters.HasPhotos {
		params.Add("das[_sys.hasphoto]", "1")
	}

	// Новостройка
	if filters.IsNewBuilding {
		params.Add("das[novostroiki]", "1")
	}

	// От собственника
	if filters.SellerType == "owner" {
		params.Add("das[who]", "1")
	}

	// Не первый этаж
	if filters.NotFirstFloor {
		params.Add("das[floor_not_first]", "1")
	}

	// Не последний этаж
	if filters.NotLastFloor {
		params.Add("das[floor_not_last]", "1")
	}

	if len(params) > 0 {
		baseURL += "?" + params.Encode()
	}

	return baseURL
}

// parsePrice извлекает цену и валюту из текста
func (s *ParserService) parsePrice(priceText string) (int64, string) {
	// Удаляем лишние пробелы
	priceText = strings.TrimSpace(priceText)
	
	if s.debug {
		log.Printf("Parsing price text: '%s'", priceText)
	}
	
	// Регулярное выражение для извлечения чисел
	re := regexp.MustCompile(`[\d\s]+`)
	
	// Ищем цену и валюту
	if strings.Contains(priceText, "₸") {
		// Тенге
		matches := re.FindAllString(priceText, -1)
		if len(matches) > 0 {
			priceStr := strings.ReplaceAll(strings.Join(matches, ""), " ", "")
			if price, err := strconv.ParseInt(priceStr, 10, 64); err == nil {
				return price, "₸"
			}
		}
	} else if strings.Contains(priceText, "$") {
		// Доллары
		matches := re.FindAllString(priceText, -1)
		if len(matches) > 0 {
			priceStr := strings.ReplaceAll(strings.Join(matches, ""), " ", "")
			if price, err := strconv.ParseInt(priceStr, 10, 64); err == nil {
				return price, "$"
			}
		}
	} else {
		// Пробуем парсить как тенге по умолчанию
		matches := re.FindAllString(priceText, -1)
		if len(matches) > 0 {
			priceStr := strings.ReplaceAll(strings.Join(matches, ""), " ", "")
			if price, err := strconv.ParseInt(priceStr, 10, 64); err == nil && price > 0 {
				return price, "₸"
			}
		}
	}

	return 0, "₸"
}

// parseDetails извлекает детали недвижимости из текста
func (s *ParserService) parseDetails(detailsText string, property *models.ParsedProperty) {
	// Комнаты
	if strings.Contains(detailsText, "-комн") {
		parts := strings.Split(detailsText, "-комн")
		if len(parts) > 0 {
			roomStr := strings.TrimSpace(parts[0])
			if rooms, err := strconv.Atoi(roomStr[len(roomStr)-1:]); err == nil {
				property.Rooms = &rooms
			}
		}
	}

	// Площадь
	if strings.Contains(detailsText, "м²") {
		parts := strings.Fields(detailsText)
		for i, part := range parts {
			if strings.Contains(part, "м²") && i > 0 {
				areaStr := strings.ReplaceAll(parts[i-1], ",", ".")
				if area, err := strconv.ParseFloat(areaStr, 64); err == nil {
					property.Area = &area
				}
				break
			}
		}
	}

	// Этаж
	if strings.Contains(detailsText, "эт") {
		parts := strings.Fields(detailsText)
		for _, part := range parts {
			if strings.Contains(part, "/") && strings.Contains(part, "эт") {
				floorParts := strings.Split(strings.ReplaceAll(part, "эт", ""), "/")
				if len(floorParts) == 2 {
					if floor, err := strconv.Atoi(strings.TrimSpace(floorParts[0])); err == nil {
						property.Floor = &floor
					}
					if totalFloors, err := strconv.Atoi(strings.TrimSpace(floorParts[1])); err == nil {
						property.TotalFloors = &totalFloors
					}
				}
				break
			}
		}
	}
}

// createWebDriver создает WebDriver с fallback на разные браузеры
func (s *ParserService) createWebDriver() (selenium.WebDriver, error) {
	browsers := []struct {
		name string
		caps selenium.Capabilities
	}{
		{
			name: "firefox",
			caps: selenium.Capabilities{
				"browserName": "firefox",
				"platformName": "linux",
				"moz:firefoxOptions": map[string]interface{}{
					"args": []string{
						"--headless",
						"--no-sandbox",
						"--disable-gpu",
						"--disable-dev-shm-usage",
						"--disable-blink-features=AutomationControlled",
						"--window-size=1280,720",
						"--memory-pressure-off", // Отключаем управление памятью для скорости
						"--max-old-space-size=4096", // Увеличиваем память
						"--disable-background-timer-throttling", // Отключаем троттлинг
						"--disable-renderer-backgrounding",
						"--disable-backgrounding-occluded-windows",
					},
					"prefs": map[string]interface{}{
						"dom.webdriver.enabled": false,
						"useAutomationExtension": false,
						"media.navigator.enabled": false,
						"media.peerconnection.enabled": false,
					},
				},
			},
		},
		{
			name: "chrome",
			caps: selenium.Capabilities{
				"browserName": "chrome",
				"platformName": "linux",
				"goog:chromeOptions": map[string]interface{}{
					"args": []string{
						"--headless=new", // Новый headless режим Chrome
						"--no-sandbox",
						"--disable-gpu",
						"--disable-dev-shm-usage",
						"--disable-blink-features=AutomationControlled",
						"--window-size=1280,720",
						"--disable-web-security",
						"--disable-features=VizDisplayCompositor",
						"--memory-pressure-off", // Отключаем управление памятью для скорости
						"--max-old-space-size=4096", // Увеличиваем память
						"--disable-background-timer-throttling", // Отключаем троттлинг
						"--disable-renderer-backgrounding",
						"--disable-backgrounding-occluded-windows",
						"--disable-ipc-flooding-protection", // Отключаем защиту от флуда IPC
						"--disable-hang-monitor", // Отключаем монитор зависания
						"--disable-prompt-on-repost", // Отключаем промпты
						"--disable-component-update", // Отключаем обновление компонентов
						"--disable-default-apps", // Отключаем дефолтные приложения
						"--disable-domain-reliability", // Отключаем domain reliability
						"--disable-extensions", // Отключаем расширения
						"--disable-features=TranslateUI,BlinkGenPropertyTrees", // Отключаем лишние функции
						"--disable-notifications", // Отключаем уведомления
						"--disable-sync", // Отключаем синхронизацию
						"--no-first-run", // Убираем первый запуск
						"--no-default-browser-check", // Убираем проверку браузера по умолчанию
						"--aggressive-cache-discard", // Агрессивная очистка кеша
					},
					"prefs": map[string]interface{}{
						"profile.default_content_setting_values.notifications": 2,
						"profile.default_content_settings.popups": 0,
						"profile.managed_default_content_settings.images": 2, // Отключаем загрузку изображений для скорости
					},
					"excludeSwitches": []string{"enable-automation"},
					"useAutomationExtension": false,
				},
			},
		},
	}

	var lastErr error
	for _, browser := range browsers {
		if s.debug {
			log.Printf("Trying to create %s WebDriver session...", browser.name)
		}
		
		wd, err := selenium.NewRemote(browser.caps, "http://localhost:4444/wd/hub")
		if err != nil {
			lastErr = err
			if s.debug {
				log.Printf("Failed to create %s session: %v", browser.name, err)
			}
			continue
		}

		// Устанавливаем таймауты
		if err := wd.SetImplicitWaitTimeout(2 * time.Second); err != nil {
			log.Printf("Warning: failed to set implicit wait timeout for %s: %v", browser.name, err)
		}
		if err := wd.SetPageLoadTimeout(30 * time.Second); err != nil {
			log.Printf("Warning: failed to set page load timeout for %s: %v", browser.name, err)
		}

		if s.debug {
			log.Printf("%s WebDriver session created successfully", browser.name)
		}
		return wd, nil
	}

	return nil, fmt.Errorf("failed to create WebDriver with any browser, last error: %w", lastErr)
}

// GetParseRequest получает запрос парсинга по ID
func (s *ParserService) GetParseRequest(requestID uuid.UUID) (*models.ParseRequest, error) {
	var request models.ParseRequest
	err := s.db.Where("id = ?", requestID).First(&request).Error
	return &request, err
}

// getPriorityKrishaProperties получает приоритетные объявления из базы данных
func (s *ParserService) getPriorityKrishaProperties() []models.ParsedProperty {
	var priorityProperties []models.PriorityProperty
	
	// Получаем активные приоритетные объявления из базы
	err := s.db.Where("is_active = ? AND source = ?", true, "krisha").Find(&priorityProperties).Error
	if err != nil {
		log.Printf("Failed to fetch priority properties from database: %v", err)
		return []models.ParsedProperty{}
	}
	
	// Если в базе нет данных, парсим и сохраняем
	if len(priorityProperties) == 0 {
		log.Println("No priority properties found in database, parsing and saving...")
		s.parseAndSavePriorityProperties()
		
		// Повторно загружаем из базы
		err := s.db.Where("is_active = ? AND source = ?", true, "krisha").Find(&priorityProperties).Error
		if err != nil {
			log.Printf("Failed to fetch priority properties after parsing: %v", err)
			return []models.ParsedProperty{}
		}
	}
	
	// Конвертируем в ParsedProperty
	var properties []models.ParsedProperty
	for _, priority := range priorityProperties {
		properties = append(properties, priority.ToParseProperty())
	}
	
	return properties
}

// parseAndSavePriorityProperties парсит и сохраняет приоритетные объявления один раз
func (s *ParserService) parseAndSavePriorityProperties() {
	priorityIDs := []string{"696103151", "1000746308"}
	
	for _, id := range priorityIDs {
		// Проверяем, не существует ли уже в базе
		var existing models.PriorityProperty
		err := s.db.Where("external_id = ? AND source = ?", id, "krisha").First(&existing).Error
		if err == nil {
			log.Printf("Priority property %s already exists in database", id)
			continue
		}
		
		// Парсим объявление
		parsedProperty := s.parseKrishaPropertyByID(id)
		if parsedProperty == nil {
			log.Printf("Failed to parse priority property %s", id)
			continue
		}
		
		// Конвертируем в модель базы данных
		priorityProperty := &models.PriorityProperty{
			ExternalID:  parsedProperty.ID,
			Source:      "krisha",
			Title:       parsedProperty.Title,
			Description: parsedProperty.Description,
			Price:       parsedProperty.Price,
			Currency:    parsedProperty.Currency,
			Address:     parsedProperty.Address,
			City:        "Алматы", // Static city for priority properties
			Rooms:       parsedProperty.Rooms,
			Area:        parsedProperty.Area,
			Floor:       parsedProperty.Floor,
			TotalFloors: parsedProperty.TotalFloors,
			BuildYear:   parsedProperty.BuildYear,
			URL:         parsedProperty.URL,
			Phone:       parsedProperty.Phone,
			IsActive:    true,
		}
		
		// Сохраняем изображения в JSON
		if len(parsedProperty.Images) > 0 {
			imagesJSON, _ := json.Marshal(parsedProperty.Images)
			priorityProperty.Images = imagesJSON
		}
		
		// Сохраняем в базу
		if err := s.db.Create(priorityProperty).Error; err != nil {
			log.Printf("Failed to save priority property %s: %v", id, err)
		} else {
			log.Printf("Successfully saved priority property %s", id)
		}
	}
}

// parseKrishaPropertyByID парсит конкретное объявление с Krisha по ID
func (s *ParserService) parseKrishaPropertyByID(propertyID string) *models.ParsedProperty {
	url := fmt.Sprintf("https://krisha.kz/a/show/%s", propertyID)
	
	wd, err := s.createWebDriver()
	if err != nil {
		log.Printf("Failed to create WebDriver for priority property %s: %v", propertyID, err)
		return nil
	}
	defer wd.Quit()
	
	err = wd.Get(url)
	if err != nil {
		log.Printf("Failed to load priority property %s: %v", propertyID, err)
		return nil
	}
	
	// Парсим основную информацию
	property := &models.ParsedProperty{
		ID:  propertyID,
		URL: url,
	}
	
	// Заголовок
	if titleElement, err := wd.FindElement(selenium.ByCSSSelector, "h1.offer__advert-title"); err == nil {
		if title, err := titleElement.Text(); err == nil {
			property.Title = strings.TrimSpace(title)
		}
	}
	
	// Цена
	if priceElement, err := wd.FindElement(selenium.ByCSSSelector, ".offer__price"); err == nil {
		if priceText, err := priceElement.Text(); err == nil {
			property.Price, property.Currency = s.parsePrice(priceText)
		}
	}
	
	// Адрес
	if addressElement, err := wd.FindElement(selenium.ByCSSSelector, ".offer__location"); err == nil {
		if address, err := addressElement.Text(); err == nil {
			property.Address = strings.TrimSpace(address)
		}
	}
	
	// Описание
	if descElement, err := wd.FindElement(selenium.ByCSSSelector, ".offer__description"); err == nil {
		if desc, err := descElement.Text(); err == nil {
			property.Description = strings.TrimSpace(desc)
		}
	}
	
	// Изображения
	if images, err := wd.FindElements(selenium.ByCSSSelector, ".gallery__image img"); err == nil {
		for _, img := range images {
			if src, err := img.GetAttribute("src"); err == nil && src != "" {
				property.Images = append(property.Images, src)
			}
		}
	}
	
	return property
}

// parseFromOLX парсит недвижимость с сайта OLX.kz
func (s *ParserService) parseFromOLX(filters models.PropertyFilters, maxPages int) ([]models.ParsedProperty, error) {
	if s.debug {
		log.Printf("Starting OLX parsing with %d workers for %d pages", s.maxWorkers, maxPages)
	}

	// Создаем контекст с таймаутом
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()

	// Канал для заданий (номера страниц)
	pageJobs := make(chan int, maxPages)
	results := make(chan []models.ParsedProperty, maxPages)
	errors := make(chan error, maxPages)

	// Запускаем воркеры для OLX (меньше воркеров, так как OLX может банить)
	var wg sync.WaitGroup
	olxWorkers := s.maxWorkers / 3 // Используем треть от общего количества воркеров
	if olxWorkers < 1 {
		olxWorkers = 1
	}
	
	for i := 0; i < olxWorkers; i++ {
		wg.Add(1)
		go s.olxPageWorker(ctx, &wg, pageJobs, results, errors, filters)
	}

	// Отправляем задания воркерам
	go func() {
		defer close(pageJobs)
		for page := 1; page <= maxPages; page++ {
			select {
			case pageJobs <- page:
			case <-ctx.Done():
				return
			}
		}
	}()

	// Ждем завершения всех воркеров
	go func() {
		wg.Wait()
		close(results)
		close(errors)
	}()

	// Собираем результаты
	var allProperties []models.ParsedProperty
	var lastError error

	for {
		select {
		case pageProperties, ok := <-results:
			if !ok {
				// Канал закрыт, все воркеры завершились
				if len(allProperties) == 0 && lastError != nil {
					return nil, lastError
				}
				return allProperties, nil
			}
			allProperties = append(allProperties, pageProperties...)
			if s.debug {
				log.Printf("OLX: Collected %d properties from a page, total: %d", len(pageProperties), len(allProperties))
			}
			
			// Ограничиваем количество результатов до 5 объявлений для быстроты
			if len(allProperties) >= 5 {
				allProperties = allProperties[:5]
				log.Printf("OLX: Reached limit of 5 properties, stopping parsing")
				return allProperties, nil
			}
		case err := <-errors:
			if err != nil {
				lastError = err
				log.Printf("OLX page parsing error: %v", err)
			}
		case <-ctx.Done():
			log.Printf("OLX parsing context cancelled, returning collected properties: %d", len(allProperties))
			return allProperties, nil
		}
	}
}

// olxPageWorker обрабатывает одну страницу OLX
func (s *ParserService) olxPageWorker(ctx context.Context, wg *sync.WaitGroup, pageJobs <-chan int, results chan<- []models.ParsedProperty, errors chan<- error, filters models.PropertyFilters) {
	defer wg.Done()

	// Создаем WebDriver для этого воркера
	wd, err := s.createWebDriver()
	if err != nil {
		select {
		case errors <- fmt.Errorf("OLX: failed to create webdriver: %w", err):
		case <-ctx.Done():
		}
		return
	}
	defer wd.Quit()

	for {
		select {
		case page, ok := <-pageJobs:
			if !ok {
				return // Канал закрыт
			}

			properties, err := s.parseOLXSinglePage(ctx, wd, filters, page)
			if err != nil {
				select {
				case errors <- err:
				case <-ctx.Done():
				}
				continue
			}

			select {
			case results <- properties:
			case <-ctx.Done():
				return
			}

		case <-ctx.Done():
			return
		}
	}
}

// parseOLXSinglePage парсит одну страницу объявлений с OLX
func (s *ParserService) parseOLXSinglePage(ctx context.Context, wd selenium.WebDriver, filters models.PropertyFilters, page int) ([]models.ParsedProperty, error) {
	// Строим URL для OLX с фильтрами
	baseURL := "https://www.olx.kz/nedvizhimost/prodazha-kvartiry/alma-ata/"
	params := url.Values{}
	
	// Добавляем фильтры
	if filters.PriceMax != nil && *filters.PriceMax > 0 {
		params.Add("search[filter_float_price:to]", fmt.Sprintf("%.0f", *filters.PriceMax))
	}
	if filters.Rooms != nil && *filters.Rooms > 0 {
		params.Add("search[filter_enum_kolichestvokomnat][0]", fmt.Sprintf("%d", *filters.Rooms))
	}
	if page > 1 {
		params.Add("page", fmt.Sprintf("%d", page))
	}
	
	fullURL := baseURL
	if len(params) > 0 {
		fullURL += "?" + params.Encode()
	}
	
	if s.debug {
		log.Printf("OLX: Loading page %d: %s", page, fullURL)
	}
	
	err := wd.Get(fullURL)
	if err != nil {
		return nil, fmt.Errorf("OLX: failed to load page %d: %w", page, err)
	}
	
	// Ждем загрузки объявлений
	time.Sleep(2 * time.Second)
	
	// Парсим объявления
	return s.parseOLXProperties(wd)
}

// parseOLXProperties парсит объявления с текущей страницы OLX
func (s *ParserService) parseOLXProperties(wd selenium.WebDriver) ([]models.ParsedProperty, error) {
	var properties []models.ParsedProperty
	
	// Получаем заголовок страницы для отладки
	pageTitle, _ := wd.Title()
	log.Printf("🔍 OLX: Заголовок страницы: %s", pageTitle)
	
	// Получаем текущий URL для отладки
	currentURL, _ := wd.CurrentURL()
	log.Printf("🔍 OLX: Текущий URL: %s", currentURL)
	
	// Проверим разные селекторы для поиска карточек
	selectors := []string{
		"[data-cy='l-card']", 
		".css-1sw7q4x", 
		"[data-testid='l-card']",
		".offer-wrapper",
		".listing",
		"article",
	}
	
	var cards []selenium.WebElement
	
	for _, selector := range selectors {
		cards, _ = wd.FindElements(selenium.ByCSSSelector, selector)
		log.Printf("🔍 OLX: Пробуем селектор '%s' - найдено %d элементов", selector, len(cards))
		if len(cards) > 0 {
			break
		}
	}
	
	if len(cards) == 0 {
		// Получим HTML страницы для диагностики
		pageSource, _ := wd.PageSource()
		maxLen := 500
		if len(pageSource) < maxLen {
			maxLen = len(pageSource)
		}
		log.Printf("🔍 OLX: HTML страницы (первые 500 символов): %s", pageSource[:maxLen])
		return nil, fmt.Errorf("не найдено объявлений на странице")
	}
	
	log.Printf("🔍 OLX: Найдено %d карточек объявлений", len(cards))
	
	maxCards := len(cards)
	if maxCards > 5 { // Ограничиваем до 5 карточек для быстроты
		maxCards = 5
	}
	
	for i := 0; i < maxCards; i++ {
		card := cards[i]
		property := models.ParsedProperty{}
		
		// URL объявления
		if linkElement, err := card.FindElement(selenium.ByCSSSelector, "a"); err == nil {
			if href, err := linkElement.GetAttribute("href"); err == nil {
				property.URL = href
				// Извлекаем ID из URL
				if urlParts := strings.Split(href, "-ID"); len(urlParts) > 1 {
					idPart := strings.Split(urlParts[1], ".")[0]
					property.ID = "olx_" + idPart
				}
			}
		}
		
		// Заголовок
		if titleElement, err := card.FindElement(selenium.ByCSSSelector, "h6"); err == nil {
			if title, err := titleElement.Text(); err == nil {
				property.Title = strings.TrimSpace(title)
			}
		}
		
		// Цена
		if priceElement, err := card.FindElement(selenium.ByCSSSelector, "p[data-testid='ad-price']"); err == nil {
			if priceText, err := priceElement.Text(); err == nil {
				property.Price, property.Currency = s.parsePrice(priceText)
			}
		}
		
		// Адрес/локация
		if locationElement, err := card.FindElement(selenium.ByCSSSelector, "p[data-testid='location-date']"); err == nil {
			if location, err := locationElement.Text(); err == nil {
				property.Address = strings.TrimSpace(strings.Split(location, " - ")[0])
			}
		}
		
		// Изображение
		if imgElement, err := card.FindElement(selenium.ByCSSSelector, "img"); err == nil {
			if src, err := imgElement.GetAttribute("src"); err == nil && src != "" {
				property.Images = []string{src}
			}
		}
		
		// Пропускаем объявления без основной информации
		if property.Title != "" && property.Price > 0 {
			properties = append(properties, property)
		}
	}
	
	if s.debug {
		log.Printf("OLX: Successfully parsed %d properties", len(properties))
	}
	
	return properties, nil
}

// createDemoProperties создает демо-объявления когда парсинг недоступен
func (s *ParserService) createDemoProperties() []models.ParsedProperty {
	rooms2 := 2
	area70 := 70.0
	area85 := 85.0
	floor5 := 5
	floor3 := 3
	floors9 := 9
	floors12 := 12
	year2020 := 2020
	year2018 := 2018
	
	return []models.ParsedProperty{
		{
			ID:          "demo_priority_1",
			Title:       "🏠 Приоритетная 2-комн квартира в ЖК Алмалы",
			Description: "Уютная двухкомнатная квартира в престижном районе. Развитая инфраструктура, близко к метро и торговым центрам. Квартира в отличном состоянии, с современным ремонтом.",
			Price:       18500000,
			Currency:    "KZT",
			Address:     "ул. Толе би, 123, Алматы",
			Rooms:       &rooms2,
			Area:        &area70,
			Floor:       &floor5,
			TotalFloors: &floors9,
			BuildYear:   &year2020,
			Images:      []string{"https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400", "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400"},
			URL:         "https://krisha.kz/a/show/696103151",
			Phone:       "+7 (777) 123-45-67",
			IsNewBuilding: true,
			BuildingType: "Многоквартирный дом",
			SellerType:   "Собственник",
		},
		{
			ID:          "demo_priority_2", 
			Title:       "🏠 Приоритетная 2-комн квартира в центре",
			Description: "Просторная квартира в самом центре Алматы. Панорамные окна, качественная отделка, паркинг. Рядом парк, школы, больницы. Идеально для семьи.",
			Price:       22000000,
			Currency:    "KZT",
			Address:     "пр. Абая, 150, Алматы", 
			Rooms:       &rooms2,
			Area:        &area85,
			Floor:       &floor3,
			TotalFloors: &floors12,
			BuildYear:   &year2018,
			Images:      []string{"https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400", "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400"},
			URL:         "https://krisha.kz/a/show/1000746308",
			Phone:       "+7 (777) 987-65-43",
			IsNewBuilding: false,
			BuildingType: "Многоквартирный дом",
			SellerType:   "Собственник",
		},
	}
}

// parseKrishaProperties парсит объявления с Krisha.kz
func (s *ParserService) parseKrishaProperties(filters models.PropertyFilters, maxPages int) ([]models.ParsedProperty, error) {
	log.Println("Подключаемся к Selenium Grid для парсинга Krisha...")
	
	caps := selenium.Capabilities{"browserName": "chrome"}
	caps["goog:chromeOptions"] = map[string]interface{}{
		"args": []string{
			"--no-sandbox",
			"--disable-dev-shm-usage",
			"--disable-blink-features=AutomationControlled",
			"--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
		},
	}

	wd, err := selenium.NewRemote(caps, "http://localhost:4444/wd/hub")
	if err != nil {
		log.Printf("Ошибка подключения к Selenium Grid: %v", err)
		// Если не можем подключиться к Grid, пробуем локальный
		wd, err = selenium.NewRemote(caps, "http://localhost:4444/wd/hub")
		if err != nil {
			return nil, fmt.Errorf("не удалось подключиться к Selenium: %w", err)
		}
	}
	defer wd.Quit()

	// Строим URL для Krisha
	baseURL := "https://krisha.kz/prodazha/kvartiry/"
	
	// Добавляем фильтры к URL
	urlParams := url.Values{}
	if filters.PriceMax != nil && *filters.PriceMax > 0 {
		urlParams.Add("price[max]", strconv.FormatInt(*filters.PriceMax, 10))
	}
	if filters.PriceMin != nil && *filters.PriceMin > 0 {
		urlParams.Add("price[min]", strconv.FormatInt(*filters.PriceMin, 10))
	}
	if filters.Rooms != nil && *filters.Rooms > 0 {
		urlParams.Add("rooms[]", strconv.Itoa(*filters.Rooms))
	}
	// Добавляем город Алматы
	urlParams.Add("city", "1")

	fullURL := baseURL
	if len(urlParams) > 0 {
		fullURL += "?" + urlParams.Encode()
	}
	
	log.Printf("Парсим Krisha URL: %s", fullURL)
	
	if err := wd.Get(fullURL); err != nil {
		return nil, fmt.Errorf("не удалось загрузить страницу Krisha: %w", err)
	}

	// Ждем загрузки страницы
	time.Sleep(3 * time.Second)

	// Ищем объявления на Krisha
	elements, err := wd.FindElements(selenium.ByCSSSelector, ".a-card")
	if err != nil {
		log.Printf("Не найдены объявления на Krisha: %v", err)
		return []models.ParsedProperty{}, nil
	}

	log.Printf("Найдено %d объявлений на Krisha", len(elements))

	var properties []models.ParsedProperty
	count := 0

	for i, element := range elements {
		if count >= 5 { // Берем максимум 5 объявлений
			break
		}

		log.Printf("Обрабатываем объявление Krisha %d/%d", i+1, len(elements))
		
		property := s.parseKrishaPropertyCard(element, i+1)
		if property.ID != "" {
			properties = append(properties, property)
			count++
		}
	}

	log.Printf("Успешно спарсено %d объявлений с Krisha", len(properties))
	return properties, nil
}

// parseKrishaPropertyCard парсит одну карточку объявления с Krisha
func (s *ParserService) parseKrishaPropertyCard(element selenium.WebElement, index int) models.ParsedProperty {
	property := models.ParsedProperty{}

	log.Printf("🔍 Krisha: Обрабатываем объявление %d", index)

	// Заголовок - пробуем разные селекторы
	titleSelectors := []string{
		".a-card__title a",
		".a-card__title",
		"[data-name='title'] a",
		"[data-name='title']",
		".title a",
		".title",
		"h3 a",
		"h3",
		"a[href*='/show/']",
	}
	
	var titleElement selenium.WebElement
	var err error
	for i, selector := range titleSelectors {
		titleElement, err = element.FindElement(selenium.ByCSSSelector, selector)
		log.Printf("🔍 Krisha: Заголовок селектор %d (%s): %s", i+1, selector, func() string {
			if err != nil {
				return "не найден"
			}
			return "найден"
		}())
		if err == nil {
			break
		}
	}
	
	if err != nil {
		log.Printf("❌ Krisha: Не найден заголовок для объявления %d после всех попыток", index)
		
		// Получим HTML элемента для анализа
		elementHTML, _ := element.GetAttribute("outerHTML")
		if elementHTML != "" {
			// Обрежем HTML до разумного размера
			maxLen := 500
			if len(elementHTML) > maxLen {
				elementHTML = elementHTML[:maxLen] + "..."
			}
			log.Printf("🔍 Krisha: HTML элемента %d: %s", index, elementHTML)
		}
		return property
	}

	property.Title, err = titleElement.Text()
	if err != nil {
		log.Printf("❌ Krisha: Ошибка получения текста заголовка: %v", err)
		return property
	}
	log.Printf("✅ Krisha: Заголовок: %s", property.Title)

	property.URL, err = titleElement.GetAttribute("href")
	if err != nil {
		property.URL = ""
	} else if property.URL != "" && !strings.HasPrefix(property.URL, "http") {
		// Конвертируем относительный URL в полный URL Krisha
		property.URL = "https://krisha.kz" + property.URL
	}

	// ID из URL
	if property.URL != "" {
		parts := strings.Split(property.URL, "/")
		if len(parts) > 0 {
			property.ID = strings.Split(parts[len(parts)-1], "?")[0]
		}
	}
	if property.ID == "" {
		property.ID = fmt.Sprintf("krisha_%d", time.Now().Unix())
	}

	// Цена - пробуем разные селекторы
	priceSelectors := []string{
		".a-card__price",
		"[data-name='price']",
		".price",
		".cost",
		"span[class*='price']",
		"div[class*='price']",
		".ddl_price",
	}
	
	var priceElement selenium.WebElement
	for i, selector := range priceSelectors {
		priceElement, err = element.FindElement(selenium.ByCSSSelector, selector)
		log.Printf("🔍 Krisha: Цена селектор %d (%s): %s", i+1, selector, func() string {
			if err != nil {
				return "не найден"
			}
			return "найден"
		}())
		if err == nil {
			break
		}
	}
	
	if err == nil {
		priceText, _ := priceElement.Text()
		log.Printf("🔍 Krisha: Текст цены: '%s'", priceText)
		if priceText != "" {
			// Убираем все кроме цифр
			re := regexp.MustCompile(`[^\d]`)
			priceStr := re.ReplaceAllString(priceText, "")
			if price, err := strconv.ParseInt(priceStr, 10, 64); err == nil {
				property.Price = price
				log.Printf("✅ Krisha: Цена: %d", price)
			}
		}
	} else {
		log.Printf("❌ Krisha: Цена не найдена")
	}
	property.Currency = "KZT"

	// Адрес
	addressElement, err := element.FindElement(selenium.ByCSSSelector, ".a-card__subtitle")
	if err == nil {
		property.Address, _ = addressElement.Text()
	}

	// Описание из заголовка
	property.Description = property.Title

	// Изображения
	imgElement, err := element.FindElement(selenium.ByCSSSelector, ".a-card__image img")
	if err == nil {
		imgSrc, _ := imgElement.GetAttribute("src")
		if imgSrc != "" {
			if !strings.HasPrefix(imgSrc, "http") {
				imgSrc = "https://krisha.kz" + imgSrc
			}
			property.Images = []string{imgSrc}
		}
	}

	// Дополнительные поля
	property.IsNewBuilding = false
	property.BuildingType = "Многоквартирный дом"
	property.SellerType = "Неизвестно"

	return property
}

// sendToN8nWebhook отправляет данные парсинга в n8n webhook для анализа
func (s *ParserService) sendToN8nWebhook(filters models.PropertyFilters, properties []models.ParsedProperty) {
	log.Printf("📡 Отправка данных в n8n webhook: %d объявлений", len(properties))

	// Конвертируем фильтры в формат, ожидаемый n8n
	filtersMap := s.convertFiltersToMap(filters)

	// Создаем полезную нагрузку для webhook
	payload := N8nWebhookPayload{
		FiltersUsed: filtersMap,
		Properties:  properties,
		TotalFound:  len(properties),
	}

	// Маршалим в JSON
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		log.Printf("❌ Ошибка создания JSON для n8n webhook: %v", err)
		return
	}

	// Отправляем POST запрос
	req, err := http.NewRequest("POST", N8N_WEBHOOK_URL, bytes.NewBuffer(payloadJSON))
	if err != nil {
		log.Printf("❌ Ошибка создания HTTP запроса для n8n: %v", err)
		return
	}

	req.Header.Set("Content-Type", "application/json")

	// Выполняем запрос
	resp, err := s.httpClient.Do(req)
	if err != nil {
		log.Printf("❌ Ошибка отправки данных в n8n webhook: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusAccepted {
		log.Printf("✅ Данные успешно отправлены в n8n (статус: %d)", resp.StatusCode)
	} else {
		log.Printf("⚠️ n8n webhook ответил с кодом: %d", resp.StatusCode)
	}
}

// convertFiltersToMap конвертирует структуру фильтров в map для n8n
func (s *ParserService) convertFiltersToMap(filters models.PropertyFilters) map[string]interface{} {
	filtersMap := make(map[string]interface{})

	// Основные параметры
	filtersMap["city"] = "almaty"
	filtersMap["district"] = ""
	filtersMap["page"] = 1
	filtersMap["collectAllPages"] = true
	filtersMap["maxResults"] = 200

	// Цена
	if filters.PriceMin != nil {
		filtersMap["priceFrom"] = *filters.PriceMin
	} else {
		filtersMap["priceFrom"] = ""
	}

	if filters.PriceMax != nil {
		filtersMap["priceTo"] = *filters.PriceMax
	} else {
		filtersMap["priceTo"] = ""
	}

	// Комнаты
	if filters.Rooms != nil {
		filtersMap["rooms"] = *filters.Rooms
	} else {
		filtersMap["rooms"] = ""
	}

	// Площадь
	if filters.TotalAreaFrom != nil {
		filtersMap["areaFrom"] = *filters.TotalAreaFrom
	} else {
		filtersMap["areaFrom"] = ""
	}

	if filters.TotalAreaTo != nil {
		filtersMap["areaTo"] = *filters.TotalAreaTo
	} else {
		filtersMap["areaTo"] = ""
	}

	// Площадь кухни (пока не используется, но добавим для совместимости)
	filtersMap["kitchenAreaFrom"] = ""
	filtersMap["kitchenAreaTo"] = ""

	// Этаж
	if filters.FloorFrom != nil {
		filtersMap["floorFrom"] = *filters.FloorFrom
	} else {
		filtersMap["floorFrom"] = ""
	}

	if filters.FloorTo != nil {
		filtersMap["floorTo"] = *filters.FloorTo
	} else {
		filtersMap["floorTo"] = ""
	}

	// Флаги этажа
	filtersMap["floorNotFirst"] = filters.NotFirstFloor
	filtersMap["floorNotLast"] = filters.NotLastFloor

	// Этажность дома
	if filters.TotalFloorsFrom != nil {
		filtersMap["houseFloorFrom"] = *filters.TotalFloorsFrom
	} else {
		filtersMap["houseFloorFrom"] = ""
	}

	if filters.TotalFloorsTo != nil {
		filtersMap["houseFloorTo"] = *filters.TotalFloorsTo
	} else {
		filtersMap["houseFloorTo"] = ""
	}

	// Год постройки
	if filters.BuildYearFrom != nil {
		filtersMap["yearFrom"] = *filters.BuildYearFrom
	} else {
		filtersMap["yearFrom"] = ""
	}

	if filters.BuildYearTo != nil {
		filtersMap["yearTo"] = *filters.BuildYearTo
	} else {
		filtersMap["yearTo"] = ""
	}

	// Дополнительные параметры
	filtersMap["houseType"] = ""
	filtersMap["whoType"] = ""
	filtersMap["hasPhoto"] = filters.HasPhotos
	filtersMap["complex"] = filters.ResidentialComplex

	return filtersMap
}