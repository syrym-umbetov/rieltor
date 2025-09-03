# Makefile for SmartEstate Backend

# Variables
BINARY_NAME=smartestate
MAIN_PATH=cmd/server/main.go
DOCKER_IMAGE=smartestate-backend
DOCKER_TAG=latest

# Go commands
GOCMD=go
GOBUILD=$(GOCMD) build
GOCLEAN=$(GOCMD) clean
GOTEST=$(GOCMD) test
GOGET=$(GOCMD) get
GOMOD=$(GOCMD) mod

# Swagger
SWAG=swag

.PHONY: help
help: ## Display this help message
	@echo "SmartEstate Backend - Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

.PHONY: install-tools
install-tools: ## Install required tools (swag, etc.)
	@echo "Installing swag for Swagger documentation..."
	go install github.com/swaggo/swag/cmd/swag@latest
	@echo "Tools installed successfully!"

.PHONY: swagger
swagger: ## Generate Swagger documentation
	@echo "Generating Swagger documentation..."
	$(SWAG) init -g $(MAIN_PATH) --output docs --parseDependency --parseInternal
	@echo "Swagger documentation generated in ./docs"

.PHONY: swagger-fmt
swagger-fmt: ## Format Swagger annotations
	$(SWAG) fmt

.PHONY: build
build: ## Build the application
	@echo "Building $(BINARY_NAME)..."
	$(GOBUILD) -o bin/$(BINARY_NAME) -v $(MAIN_PATH)
	@echo "Build complete!"

.PHONY: run
run: swagger ## Run the application (regenerates Swagger first)
	@echo "Starting application..."
	$(GOCMD) run $(MAIN_PATH)

.PHONY: run-dev
run-dev: ## Run with hot reload (requires air)
	@which air > /dev/null || (echo "Installing air..." && go install github.com/air-verse/air@latest)
	air

.PHONY: test
test: ## Run tests
	@echo "Running tests..."
	$(GOTEST) -v ./...

.PHONY: test-coverage
test-coverage: ## Run tests with coverage
	@echo "Running tests with coverage..."
	$(GOTEST) -v -cover -coverprofile=coverage.out ./...
	$(GOCMD) tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

.PHONY: clean
clean: ## Clean build artifacts and generated files
	@echo "Cleaning..."
	$(GOCLEAN)
	rm -f bin/$(BINARY_NAME)
	rm -f coverage.out coverage.html
	@echo "Clean complete!"

.PHONY: deps
deps: ## Download and verify dependencies
	@echo "Downloading dependencies..."
	$(GOMOD) download
	$(GOMOD) verify
	@echo "Dependencies ready!"

.PHONY: tidy
tidy: ## Tidy and vendor dependencies
	@echo "Tidying dependencies..."
	$(GOMOD) tidy
	@echo "Dependencies tidied!"

.PHONY: lint
lint: ## Run linter (requires golangci-lint)
	@which golangci-lint > /dev/null || (echo "Installing golangci-lint..." && go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest)
	golangci-lint run

.PHONY: migrate-up
migrate-up: ## Run database migrations
	@echo "Running migrations..."
	$(GOCMD) run $(MAIN_PATH) migrate up

.PHONY: migrate-down
migrate-down: ## Rollback database migrations
	@echo "Rolling back migrations..."
	$(GOCMD) run $(MAIN_PATH) migrate down

.PHONY: docker-build
docker-build: ## Build Docker image
	@echo "Building Docker image..."
	docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) .
	@echo "Docker image built: $(DOCKER_IMAGE):$(DOCKER_TAG)"

.PHONY: docker-run
docker-run: ## Run application in Docker
	docker-compose up

.PHONY: docker-down
docker-down: ## Stop Docker containers
	docker-compose down

.PHONY: db-start
db-start: ## Start PostgreSQL and Redis using Docker
	docker-compose up -d postgres redis

.PHONY: db-stop
db-stop: ## Stop database containers
	docker-compose stop postgres redis

.PHONY: db-reset
db-reset: ## Reset database (drop and recreate)
	docker-compose down -v
	docker-compose up -d postgres redis
	@echo "Waiting for database to be ready..."
	@sleep 5
	$(GOCMD) run $(MAIN_PATH) migrate up

.PHONY: seed
seed: ## Seed database with test data
	@echo "Seeding database..."
	$(GOCMD) run $(MAIN_PATH) seed

.PHONY: dev-setup
dev-setup: install-tools deps swagger db-start ## Complete development environment setup
	@echo "Development environment ready!"
	@echo "Run 'make run' to start the application"

.PHONY: check
check: lint test ## Run all checks (lint + test)
	@echo "All checks passed!"

# Default target
.DEFAULT_GOAL := help