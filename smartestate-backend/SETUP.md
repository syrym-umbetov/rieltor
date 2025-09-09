# SmartEstate Backend Setup

## 🚀 Быстрый старт

### 1. Настройка переменных окружения

Скопируйте `.env` файл и настройте необходимые переменные:

```bash
cp .env .env.local
```

### 2. Обязательные настройки

#### OpenAI API Key (Обязательно!)

Для работы AI-чата необходим OpenAI API ключ:

1. Зайдите на https://platform.openai.com/api-keys
2. Создайте новый API ключ
3. Добавьте в `.env`:
   ```
   OPENAI_API_KEY=sk-proj-ваш-ключ-здесь...
   ```

#### База данных PostgreSQL

Убедитесь, что PostgreSQL запущен и настроен:

```bash
# Создание базы данных
createdb smartestate

# Настройте в .env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smartestate  
DB_USER=postgres
DB_PASSWORD=ваш-пароль
```

#### Redis (для кеширования)

```bash
# Установка через Homebrew (macOS)
brew install redis
brew services start redis

# Настройте в .env
REDIS_URL=redis://localhost:6379
```

### 3. Selenium WebDriver (для парсинга)

Для парсинга недвижимости с krisha.kz нужен Selenium:

```bash
# Быстрая установка через Docker
docker-compose -f docker-selenium.yml up -d

# Или установка локально (смотрите SELENIUM_SETUP.md)
```

### 4. Запуск сервера

```bash
# Установка зависимостей
go mod download

# Запуск в режиме разработки
go run cmd/server/main.go

# Или сборка и запуск
go build -o smartestate cmd/server/main.go
./smartestate
```

## 📋 Проверка работы

1. **API доступен**: http://localhost:8080/api
2. **Swagger документация**: http://localhost:8080/swagger/index.html
3. **Тест парсера**: GET http://localhost:8080/api/parser/test
4. **Тест чата**: POST http://localhost:8080/api/chat/messages

## 🔧 Возможные ошибки

### "Failed to get AI response"
- ✅ **Причина**: Не настроен OPENAI_API_KEY
- ✅ **Решение**: Добавьте валидный OpenAI API ключ в .env

### "connection refused :4444"
- ✅ **Причина**: Selenium WebDriver не запущен
- ✅ **Решение**: Запустите `docker-compose -f docker-selenium.yml up -d`

### "connection to server failed"
- ✅ **Причина**: PostgreSQL не запущен
- ✅ **Решение**: Запустите PostgreSQL и создайте базу данных

## 🏗️ Архитектура

```
smartestate-backend/
├── cmd/server/          # Точка входа приложения
├── internal/
│   ├── api/handlers/    # HTTP handlers
│   ├── services/        # Бизнес-логика
│   ├── models/          # Модели данных
│   └── config/          # Конфигурация
├── migrations/          # Миграции БД
├── docs/               # Swagger документация
└── .env                # Переменные окружения
```

## 🧪 Тестирование

```bash
# Запуск тестов
go test ./...

# Тест конкретного модуля
go test ./internal/services/
```

## 🚀 Production

Для production рекомендуется:

1. Использовать переменные окружения вместо .env файла
2. Настроить HTTPS
3. Использовать managed PostgreSQL (AWS RDS, Google Cloud SQL)
4. Использовать Kubernetes для Selenium Grid
5. Настроить мониторинг и логирование

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи сервера
2. Убедитесь, что все сервисы (PostgreSQL, Redis, Selenium) запущены
3. Проверьте переменные окружения в .env
4. Посмотрите Swagger документацию для правильного формата API запросов