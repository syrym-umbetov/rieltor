# Selenium WebDriver Setup для SmartEstate

Этот документ содержит инструкции по установке и настройке Selenium WebDriver для работы парсера недвижимости.

## Быстрая установка (macOS)

### Установка через Homebrew

```bash
# Установить Chrome и ChromeDriver
brew install --cask google-chrome
brew install chromedriver

# Или установить Firefox и GeckoDriver  
brew install --cask firefox
brew install geckodriver

# Проверить установку
chromedriver --version
geckodriver --version
```

### Запуск Selenium Standalone Server

```bash
# Скачать Selenium Server
wget https://github.com/SeleniumHQ/selenium/releases/download/selenium-4.15.0/selenium-server-4.15.0.jar

# Запустить Selenium Hub
java -jar selenium-server-4.15.0.jar standalone --port 4444
```

## Docker (рекомендуется)

### Запуск через Docker Compose

```bash
# В корне проекта smartestate-backend
docker-compose -f docker-selenium.yml up -d
```

### Файл docker-selenium.yml

```yaml
version: '3.8'
services:
  selenium-hub:
    image: selenium/hub:4.15.0
    container_name: selenium-hub
    ports:
      - "4444:4444"
    environment:
      - GRID_MAX_SESSION=16
      - GRID_BROWSER_TIMEOUT=300
      - GRID_TIMEOUT=300

  chrome:
    image: selenium/node-chrome:4.15.0
    shm_size: 2gb
    depends_on:
      - selenium-hub
    environment:
      - HUB_HOST=selenium-hub
      - NODE_MAX_INSTANCES=5
      - NODE_MAX_SESSION=5

  firefox:
    image: selenium/node-firefox:4.15.0
    shm_size: 2gb
    depends_on:
      - selenium-hub
    environment:
      - HUB_HOST=selenium-hub
      - NODE_MAX_INSTANCES=5
      - NODE_MAX_SESSION=5
```

## Ручная установка

### Chrome + ChromeDriver

1. Установить Google Chrome
2. Скачать ChromeDriver с https://chromedriver.chromium.org/
3. Поместить chromedriver в PATH (`/usr/local/bin/`)
4. Дать права на выполнение: `chmod +x /usr/local/bin/chromedriver`

### Firefox + GeckoDriver

1. Установить Firefox
2. Скачать GeckoDriver с https://github.com/mozilla/geckodriver/releases
3. Поместить geckodriver в PATH (`/usr/local/bin/`)
4. Дать права на выполнение: `chmod +x /usr/local/bin/geckodriver`

## Проверка работы

### Проверка Selenium Hub

```bash
curl http://localhost:4444/wd/hub/status
```

### Тестирование парсера

```bash
# Тест через API
curl "http://localhost:8080/api/parser/test?city=Алматы&rooms=2"

# Или через Swagger UI
open http://localhost:8080/swagger/index.html
```

## Настройка парсера

Парсер в `internal/services/parser_service.go` настроен на использование:

1. **Локальный WebDriver** (для разработки)
2. **Selenium Grid** на `localhost:4444` (рекомендуется)

### Переменные окружения

```bash
# В .env файле
SELENIUM_HUB_URL=http://localhost:4444/wd/hub
WEBDRIVER_HEADLESS=true
WEBDRIVER_TIMEOUT=30
```

## Troubleshooting

### Ошибка "connection refused"

```bash
# Проверить, запущен ли Selenium Hub
netstat -an | grep 4444

# Запустить заново
docker-compose -f docker-selenium.yml restart
```

### Ошибка "chromedriver not found"

```bash
# Проверить PATH
which chromedriver

# Переустановить
brew reinstall chromedriver
```

### Ошибка прав доступа на macOS

```bash
# Снять блокировку системы безопасности
xattr -d com.apple.quarantine /usr/local/bin/chromedriver
```

## Мониторинг

### Selenium Grid Console

Откройте http://localhost:4444/grid/console для просмотра активных сессий и узлов.

### Логи Docker

```bash
# Просмотр логов
docker-compose -f docker-selenium.yml logs -f

# Логи конкретного сервиса  
docker-compose -f docker-selenium.yml logs chrome
```

## Production

Для production рекомендуется:

1. Использовать Kubernetes с Selenium Grid
2. Настроить автомасштабирование узлов
3. Использовать внешний Redis для кеширования результатов
4. Настроить мониторинг производительности