// cmd/server/main.go - Fixed version
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	_ "smartestate/docs" // swagger docs
	"smartestate/internal/api/handlers"
	"smartestate/internal/config"
	"smartestate/internal/database"
	"smartestate/internal/middleware"
	"smartestate/internal/services"
)

// @title SmartEstate API
// @version 1.0
// @description AI-powered Real Estate Platform API for Kazakhstan
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.url http://www.smartestate.kz/support
// @contact.email support@smartestate.kz

// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html

// @host localhost:8080
// @BasePath /api

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Initialize configuration
	cfg := config.New()

	// Initialize database
	db, err := database.InitDB(cfg.Database)
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}

	// Initialize Redis
	redisClient := database.InitRedis(cfg.Redis)

	// Initialize services
	serviceContainer := services.NewContainer(db, redisClient, cfg)

	// Initialize handlers
	handlerContainer := handlers.NewContainer(serviceContainer)

	// Setup Gin router with auth service
	router := setupRouter(cfg, handlerContainer, serviceContainer.Auth)

	// Start server
	srv := &http.Server{
		Addr:    ":" + cfg.Server.Port,
		Handler: router,
	}

	// Graceful shutdown
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	log.Printf("🚀 Server started on port %s", cfg.Server.Port)
	log.Printf("📚 Swagger docs: http://localhost:%s/swagger/index.html", cfg.Server.Port)
	log.Printf("💡 API Health: http://localhost:%s/api/health", cfg.Server.Port)

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exited")
}

func setupRouter(cfg *config.Config, handlersContainer *handlers.Container, authService *services.AuthService) *gin.Engine {
	router := gin.New()

	// Middleware
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:3001", "*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Swagger endpoint
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Create auth middleware instance
	authMiddleware := middleware.AuthMiddleware(authService)

	// API routes
	api := router.Group("/api")
	{
		// Health check - use the standalone function
		api.GET("/health", handlers.Health)

		// Auth routes
		auth := api.Group("/auth")
		{
			auth.POST("/register", handlersContainer.Auth.Register)
			auth.POST("/login", handlersContainer.Auth.Login)
			auth.POST("/refresh", handlersContainer.Auth.RefreshToken)
			auth.POST("/logout", authMiddleware, handlersContainer.Auth.Logout)
			auth.GET("/profile", authMiddleware, handlersContainer.Auth.GetProfile)
		}

		// Properties routes
		properties := api.Group("/properties")
		{
			properties.GET("", handlersContainer.Property.List)
			properties.GET("/:id", handlersContainer.Property.Get)
			properties.GET("/search", handlersContainer.Property.Search)
			properties.GET("/recommendations", authMiddleware, handlersContainer.Property.GetRecommendations)

			// Protected routes
			protected := properties.Group("")
			protected.Use(authMiddleware)
			{
				protected.POST("", handlersContainer.Property.Create)
				protected.PUT("/:id", handlersContainer.Property.Update)
				protected.DELETE("/:id", handlersContainer.Property.Delete)
				protected.POST("/:id/images", handlersContainer.Property.UploadImages)
				protected.POST("/:id/view", handlersContainer.Property.RecordView)
			}
		}

		// AI Chat routes
		chat := api.Group("/chat")
		chat.Use(authMiddleware)
		{
			chat.POST("/sessions", handlersContainer.Chat.CreateSession)
			chat.GET("/sessions/:id", handlersContainer.Chat.GetSession)
			chat.POST("/messages", handlersContainer.Chat.SendMessage)
			chat.GET("/sessions/:id/messages", handlersContainer.Chat.GetMessages)
		}

		// AI Targeting routes
		targeting := api.Group("/targeting")
		targeting.Use(authMiddleware)
		{
			targeting.POST("/campaigns", handlersContainer.Targeting.CreateCampaign)
			targeting.GET("/campaigns", handlersContainer.Targeting.ListCampaigns)
			targeting.GET("/campaigns/:id", handlersContainer.Targeting.GetCampaign)
			targeting.POST("/campaigns/:id/launch", handlersContainer.Targeting.LaunchCampaign)
			targeting.GET("/campaigns/:id/metrics", handlersContainer.Targeting.GetMetrics)
			targeting.POST("/generate-creatives", handlersContainer.Targeting.GenerateCreatives)
		}

		// Analytics routes
		analytics := api.Group("/analytics")
		analytics.Use(authMiddleware)
		{
			analytics.GET("/properties/:id", handlersContainer.Analytics.PropertyAnalytics)
			analytics.GET("/campaigns/:id", handlersContainer.Analytics.CampaignAnalytics)
			analytics.GET("/market-trends", handlersContainer.Analytics.MarketTrends)
		}

		// Parser routes
		parser := api.Group("/parser")
		{
			parser.POST("/properties", handlersContainer.Parser.ParseProperties)
			parser.GET("/requests/:id", handlersContainer.Parser.GetParseRequest)
			parser.GET("/test", handlersContainer.Parser.TestParse)
		}

		// WebSocket for real-time chat
		api.GET("/ws/chat", authMiddleware, handlersContainer.Chat.HandleWebSocket)
	}

	// Static files for uploaded images
	router.Static("/uploads", "./uploads")

	return router
}
