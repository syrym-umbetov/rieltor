package services

import (
	"fmt"
	"log"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/tebeka/selenium"
	"gorm.io/gorm"

	"smartestate/internal/models"
)

type ParserService struct {
	db    *gorm.DB
	debug bool
}

func NewParserService(db *gorm.DB) *ParserService {
	return &ParserService{
		db:    db,
		debug: true,
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

	// Запускаем парсинг
	properties, err := s.parseFromKrisha(filters, maxPages)
	if err != nil {
		// Обновляем статус на failed
		parseRequest.Status = "failed"
		parseRequest.Error = err.Error()
		s.db.Save(parseRequest)
		
		return &models.ParseResponse{
			Success:    false,
			RequestID:  parseRequest.ID,
			Properties: []models.ParsedProperty{},
			Count:      0,
			Status:     "failed",
			Error:      err.Error(),
			Cached:     false,
			ParserType: "selenium",
		}, err
	}

	// Обновляем запись с результатами
	parseRequest.Status = "completed"
	parseRequest.Results = models.ParsedPropertySlice(properties)
	parseRequest.Count = len(properties)
	
	if err := s.db.Save(parseRequest).Error; err != nil {
		log.Printf("Failed to save parse results: %v", err)
	}

	return &models.ParseResponse{
		Success:    true,
		RequestID:  parseRequest.ID,
		Properties: properties,
		Count:      len(properties),
		Status:     "completed",
		Cached:     false,
		ParserType: "selenium",
	}, nil
}

// parseFromKrisha парсит недвижимость с сайта krisha.kz
func (s *ParserService) parseFromKrisha(filters models.PropertyFilters, maxPages int) ([]models.ParsedProperty, error) {
	wd, err := s.createWebDriver()
	if err != nil {
		return nil, fmt.Errorf("failed to create webdriver: %w", err)
	}

	defer func() {
		if wd != nil {
			if s.debug {
				log.Printf("Closing WebDriver session...")
			}
			wd.Quit()
		}
	}()

	var allProperties []models.ParsedProperty

	for page := 1; page <= maxPages; page++ {
		searchURL := s.buildSearchURL(filters, page)
		
		if s.debug {
			log.Printf("Parsing page %d: %s", page, searchURL)
		}

		// Пробуем загрузить страницу с повторными попытками
		var lastErr error
		maxRetries := 2
		
		for retry := 0; retry <= maxRetries; retry++ {
			if retry > 0 {
				if s.debug {
					log.Printf("Retry %d/%d for page %d", retry, maxRetries, page)
				}
				time.Sleep(time.Duration(retry*2) * time.Second) // Увеличиваем задержку с каждой попыткой
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

		// Убираем задержки полностью для максимальной скорости

		// Ищем карточки объявлений
		propertyCards, err := wd.FindElements(selenium.ByCSSSelector, ".ddl_product")
		if err != nil || len(propertyCards) == 0 {
			// Пробуем альтернативный селектор
			propertyCards, err = wd.FindElements(selenium.ByCSSSelector, ".a-card")
			if err != nil || len(propertyCards) == 0 {
				log.Printf("No property cards found on page %d", page)
				break
			}
		}

		if s.debug {
			log.Printf("Found %d property cards on page %d", len(propertyCards), page)
		}

		// Парсим каждую карточку (максимум 5 для быстрого ответа)
		maxCards := len(propertyCards)
		if maxCards > 3 {
			maxCards = 3 // Уменьшаем до 3 для максимальной скорости
		}

		for i := 0; i < maxCards; i++ {
			if s.debug {
				log.Printf("Parsing property card %d/%d", i+1, maxCards)
			}
			
			// Попытка парсинга с таймаутом
			property, err := s.parsePropertyCard(propertyCards[i])
			if err != nil {
				log.Printf("Error parsing property card %d: %v", i, err)
				continue
			}
			if property != nil {
				allProperties = append(allProperties, *property)
			}
		}

		// Проверяем наличие следующей страницы
		nextButtons, err := wd.FindElements(selenium.ByCSSSelector, ".paging .next")
		if err != nil || len(nextButtons) == 0 {
			break
		}

		// Проверяем активность кнопки "Далее"
		if len(nextButtons) > 0 {
			isEnabled, err := nextButtons[0].IsEnabled()
			if err != nil || !isEnabled {
				break
			}
		}
	}

	return allProperties, nil
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

	// Изображения - ищем картинки с любого домена
	imageElement, err := card.FindElement(selenium.ByCSSSelector, "img")
	if err == nil {
		src, err := imageElement.GetAttribute("src")
		if err == nil && src != "" && (strings.Contains(src, "alakcell-photos") || strings.Contains(src, "krisha")) {
			if s.debug {
				log.Printf("Found image: %s", src)
			}
			// Улучшаем качество фото до 750x470
			betterSrc := s.enhanceImageQuality(src)
			property.Images = append(property.Images, betterSrc)
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
						"--headless",
						"--no-sandbox",
						"--disable-gpu",
						"--disable-dev-shm-usage",
						"--disable-blink-features=AutomationControlled",
						"--window-size=1280,720",
						"--disable-web-security",
						"--disable-features=VizDisplayCompositor",
					},
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