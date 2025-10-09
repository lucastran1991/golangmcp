package models

import (
	"gorm.io/gorm"
	"log"
)

// DatabaseOptimizer handles database optimization tasks
type DatabaseOptimizer struct {
	db *gorm.DB
}

// NewDatabaseOptimizer creates a new database optimizer
func NewDatabaseOptimizer(db *gorm.DB) *DatabaseOptimizer {
	return &DatabaseOptimizer{db: db}
}

// OptimizeDatabase performs all database optimizations
func (do *DatabaseOptimizer) OptimizeDatabase() error {
	log.Println("Starting database optimization...")
	
	// Add indexes
	if err := do.AddOptimizedIndexes(); err != nil {
		return err
	}
	
	// Optimize existing tables
	if err := do.OptimizeExistingTables(); err != nil {
		return err
	}
	
	// Analyze tables for query optimization
	if err := do.AnalyzeTables(); err != nil {
		return err
	}
	
	log.Println("Database optimization completed successfully")
	return nil
}

// AddOptimizedIndexes adds optimized indexes to existing tables
func (do *DatabaseOptimizer) AddOptimizedIndexes() error {
	log.Println("Adding optimized indexes...")
	
	// Add indexes to users table
	indexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
		"CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)",
		"CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at)",
	}
	
	// Add indexes to files table
	fileIndexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_files_filename ON files(filename)",
		"CREATE INDEX IF NOT EXISTS idx_files_original_name ON files(original_name)",
		"CREATE INDEX IF NOT EXISTS idx_files_file_type ON files(file_type)",
		"CREATE INDEX IF NOT EXISTS idx_files_mime_type ON files(mime_type)",
		"CREATE INDEX IF NOT EXISTS idx_files_size ON files(size)",
		"CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id)",
		"CREATE INDEX IF NOT EXISTS idx_files_is_public ON files(is_public)",
		"CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at)",
		"CREATE INDEX IF NOT EXISTS idx_files_deleted_at ON files(deleted_at)",
		"CREATE INDEX IF NOT EXISTS idx_files_user_type ON files(user_id, file_type)",
		"CREATE INDEX IF NOT EXISTS idx_files_user_created ON files(user_id, created_at)",
	}
	
	// Add indexes to file_access_logs table
	logIndexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_file_access_logs_file_id ON file_access_logs(file_id)",
		"CREATE INDEX IF NOT EXISTS idx_file_access_logs_user_id ON file_access_logs(user_id)",
		"CREATE INDEX IF NOT EXISTS idx_file_access_logs_action ON file_access_logs(action)",
		"CREATE INDEX IF NOT EXISTS idx_file_access_logs_ip_address ON file_access_logs(ip_address)",
		"CREATE INDEX IF NOT EXISTS idx_file_access_logs_created_at ON file_access_logs(created_at)",
		"CREATE INDEX IF NOT EXISTS idx_file_access_logs_file_action ON file_access_logs(file_id, action)",
		"CREATE INDEX IF NOT EXISTS idx_file_access_logs_user_action ON file_access_logs(user_id, action)",
	}
	
	allIndexes := append(indexes, append(fileIndexes, logIndexes...)...)
	
	for _, indexSQL := range allIndexes {
		if err := do.db.Exec(indexSQL).Error; err != nil {
			log.Printf("Warning: Failed to create index: %v", err)
			// Continue with other indexes even if one fails
		}
	}
	
	log.Println("Optimized indexes added successfully")
	return nil
}

// OptimizeExistingTables optimizes existing table structures
func (do *DatabaseOptimizer) OptimizeExistingTables() error {
	log.Println("Optimizing existing table structures...")
	
	// Optimize users table
	if err := do.db.Exec("VACUUM users").Error; err != nil {
		log.Printf("Warning: Failed to vacuum users table: %v", err)
	}
	
	// Optimize files table
	if err := do.db.Exec("VACUUM files").Error; err != nil {
		log.Printf("Warning: Failed to vacuum files table: %v", err)
	}
	
	// Optimize file_access_logs table
	if err := do.db.Exec("VACUUM file_access_logs").Error; err != nil {
		log.Printf("Warning: Failed to vacuum file_access_logs table: %v", err)
	}
	
	log.Println("Table optimization completed")
	return nil
}

// AnalyzeTables analyzes tables for query optimization
func (do *DatabaseOptimizer) AnalyzeTables() error {
	log.Println("Analyzing tables for query optimization...")
	
	tables := []string{"users", "files", "file_access_logs"}
	
	for _, table := range tables {
		if err := do.db.Exec("ANALYZE " + table).Error; err != nil {
			log.Printf("Warning: Failed to analyze table %s: %v", table, err)
		}
	}
	
	log.Println("Table analysis completed")
	return nil
}

// GetQueryPerformanceStats returns query performance statistics
func (do *DatabaseOptimizer) GetQueryPerformanceStats() (map[string]interface{}, error) {
	stats := make(map[string]interface{})
	
	// Get table sizes
	var tableSizes []struct {
		Name string
		Size int64
	}
	err := do.db.Raw(`
		SELECT name, 
		       (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=main.name) as size
		FROM sqlite_master 
		WHERE type='table' AND name IN ('users', 'files', 'file_access_logs')
	`).Scan(&tableSizes).Error
	
	if err != nil {
		return nil, err
	}
	
	stats["table_sizes"] = tableSizes
	
	// Get index information
	var indexInfo []struct {
		TableName string
		IndexName string
		Unique    bool
	}
	err = do.db.Raw(`
		SELECT name as table_name, 
		       sql as index_name,
		       CASE WHEN sql LIKE '%UNIQUE%' THEN 1 ELSE 0 END as unique
		FROM sqlite_master 
		WHERE type='index' AND name LIKE 'idx_%'
	`).Scan(&indexInfo).Error
	
	if err != nil {
		return nil, err
	}
	
	stats["indexes"] = indexInfo
	
	return stats, nil
}

// CleanupOldData removes old data to improve performance
func (do *DatabaseOptimizer) CleanupOldData() error {
	log.Println("Cleaning up old data...")
	
	// Remove old file access logs (older than 90 days)
	result := do.db.Exec(`
		DELETE FROM file_access_logs 
		WHERE created_at < datetime('now', '-90 days')
	`)
	
	if result.Error != nil {
		log.Printf("Warning: Failed to cleanup old file access logs: %v", result.Error)
	} else {
		log.Printf("Cleaned up %d old file access log entries", result.RowsAffected)
	}
	
	// Remove soft-deleted files older than 30 days
	result = do.db.Exec(`
		DELETE FROM files 
		WHERE deleted_at IS NOT NULL 
		AND deleted_at < datetime('now', '-30 days')
	`)
	
	if result.Error != nil {
		log.Printf("Warning: Failed to cleanup old deleted files: %v", result.Error)
	} else {
		log.Printf("Cleaned up %d old deleted files", result.RowsAffected)
	}
	
	log.Println("Data cleanup completed")
	return nil
}
