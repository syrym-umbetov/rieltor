// internal/database/performance.go
package database

import (
	"context"
	"log"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// PerformanceMonitor мониторит производительность запросов к базе данных
type PerformanceMonitor struct {
	db *gorm.DB
}

// NewPerformanceMonitor создает новый монитор производительности
func NewPerformanceMonitor(db *gorm.DB) *PerformanceMonitor {
	return &PerformanceMonitor{db: db}
}

// SlowQueryLogger кастомный логгер для медленных запросов
type SlowQueryLogger struct {
	logger.Interface
	slowThreshold time.Duration
}

// NewSlowQueryLogger создает логгер для медленных запросов
func NewSlowQueryLogger(slowThreshold time.Duration) *SlowQueryLogger {
	return &SlowQueryLogger{
		Interface:     logger.Default.LogMode(logger.Info),
		slowThreshold: slowThreshold,
	}
}

// Trace логирует медленные запросы с деталями
func (l *SlowQueryLogger) Trace(ctx context.Context, begin time.Time, fc func() (string, int64), err error) {
	elapsed := time.Since(begin)
	
	if elapsed >= l.slowThreshold {
		sql, rows := fc()
		log.Printf("🐌 SLOW QUERY [%v] [rows:%v] %s", elapsed, rows, sql)
		
		// Дополнительная информация для очень медленных запросов
		if elapsed >= 5*time.Second {
			log.Printf("🔥 VERY SLOW QUERY: Consider optimization for: %s", sql)
		}
	}
}

// EnableSlowQueryLogging включает логирование медленных запросов
func EnableSlowQueryLogging(db *gorm.DB, threshold time.Duration) {
	db.Logger = NewSlowQueryLogger(threshold)
}

// GetDatabaseStats получает статистику базы данных
func (pm *PerformanceMonitor) GetDatabaseStats() map[string]interface{} {
	stats := make(map[string]interface{})
	
	// Статистика подключений
	sqlDB, err := pm.db.DB()
	if err == nil {
		dbStats := sqlDB.Stats()
		stats["open_connections"] = dbStats.OpenConnections
		stats["in_use"] = dbStats.InUse
		stats["idle"] = dbStats.Idle
		// stats["max_open_connections"] = dbStats.MaxOpenConns
		// stats["max_idle_connections"] = dbStats.MaxIdleConns
	}
	
	// Размеры таблиц
	tableSizes := pm.getTableSizes()
	if len(tableSizes) > 0 {
		stats["table_sizes"] = tableSizes
	}
	
	// Статистика индексов
	indexStats := pm.getIndexStats()
	if len(indexStats) > 0 {
		stats["index_usage"] = indexStats
	}
	
	return stats
}

// getTableSizes возвращает размеры основных таблиц
func (pm *PerformanceMonitor) getTableSizes() map[string]int64 {
	sizes := make(map[string]int64)
	tables := []string{"users", "chat_sessions", "chat_messages", "properties", "parse_requests"}
	
	for _, table := range tables {
		var count int64
		if err := pm.db.Table(table).Count(&count).Error; err == nil {
			sizes[table] = count
		}
	}
	
	return sizes
}

// getIndexStats возвращает статистику использования индексов
func (pm *PerformanceMonitor) getIndexStats() []map[string]interface{} {
	var stats []map[string]interface{}
	
	// Запрос для получения статистики индексов (PostgreSQL)
	rows, err := pm.db.Raw(`
		SELECT 
			schemaname,
			tablename,
			indexname,
			idx_scan as scans,
			idx_tup_read as tuples_read,
			idx_tup_fetch as tuples_fetched
		FROM pg_stat_user_indexes 
		WHERE idx_scan > 0 
		ORDER BY idx_scan DESC 
		LIMIT 10
	`).Rows()
	
	if err != nil {
		return stats
	}
	defer rows.Close()
	
	for rows.Next() {
		var schema, table, index string
		var scans, tuplesRead, tuplesFetched int64
		
		if err := rows.Scan(&schema, &table, &index, &scans, &tuplesRead, &tuplesFetched); err == nil {
			stats = append(stats, map[string]interface{}{
				"schema":          schema,
				"table":           table,
				"index":           index,
				"scans":           scans,
				"tuples_read":     tuplesRead,
				"tuples_fetched":  tuplesFetched,
			})
		}
	}
	
	return stats
}

// OptimizeDatabase выполняет базовую оптимизацию базы данных
func (pm *PerformanceMonitor) OptimizeDatabase() error {
	log.Println("🔧 Starting database optimization...")
	
	// Обновляем статистику для планировщика запросов
	if err := pm.db.Exec("ANALYZE").Error; err != nil {
		log.Printf("Failed to analyze database: %v", err)
		return err
	}
	
	// Получаем рекомендации по неиспользуемым индексам
	unusedIndexes := pm.findUnusedIndexes()
	if len(unusedIndexes) > 0 {
		log.Printf("📊 Found %d potentially unused indexes:", len(unusedIndexes))
		for _, index := range unusedIndexes {
			log.Printf("   - %s.%s (scans: %d)", index["table"], index["index"], index["scans"])
		}
	}
	
	log.Println("✅ Database optimization completed")
	return nil
}

// findUnusedIndexes находит потенциально неиспользуемые индексы
func (pm *PerformanceMonitor) findUnusedIndexes() []map[string]interface{} {
	var indexes []map[string]interface{}
	
	rows, err := pm.db.Raw(`
		SELECT 
			schemaname,
			tablename,
			indexname,
			idx_scan as scans
		FROM pg_stat_user_indexes 
		WHERE idx_scan < 10  -- Менее 10 сканирований может указывать на неиспользуемый индекс
		AND indexname NOT LIKE '%_pkey'  -- Исключаем первичные ключи
		ORDER BY idx_scan ASC
	`).Rows()
	
	if err != nil {
		return indexes
	}
	defer rows.Close()
	
	for rows.Next() {
		var schema, table, index string
		var scans int64
		
		if err := rows.Scan(&schema, &table, &index, &scans); err == nil {
			indexes = append(indexes, map[string]interface{}{
				"schema": schema,
				"table":  table,
				"index":  index,
				"scans":  scans,
			})
		}
	}
	
	return indexes
}

// LogDatabaseHealth выводит информацию о здоровье базы данных
func (pm *PerformanceMonitor) LogDatabaseHealth() {
	stats := pm.GetDatabaseStats()
	
	log.Println("📊 Database Health Report:")
	
	if connections, ok := stats["open_connections"]; ok {
		log.Printf("   Connections: %v open, %v in use, %v idle", 
			connections, stats["in_use"], stats["idle"])
	}
	
	if sizes, ok := stats["table_sizes"].(map[string]int64); ok {
		log.Printf("   Table sizes:")
		for table, count := range sizes {
			log.Printf("     - %s: %d rows", table, count)
		}
	}
}