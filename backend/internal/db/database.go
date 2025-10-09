package db

import (
	"fmt"
	"log"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"golangmcp/internal/models"
)

var DB *gorm.DB

// InitDatabase initializes the database connection
func InitDatabase(dsn string) error {
	var err error
	
	// Configure GORM logger
	DB, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	// Auto-migrate the schema
	err = AutoMigrate()
	if err != nil {
		return fmt.Errorf("failed to migrate database: %w", err)
	}

	// Optimize database performance
	err = OptimizeDatabase()
	if err != nil {
		log.Printf("Warning: Database optimization failed: %v", err)
	}

	log.Println("Database connected and migrated successfully")
	return nil
}

// AutoMigrate runs database migrations
func AutoMigrate() error {
	return DB.AutoMigrate(
		&models.User{},
		&models.File{},
		&models.FileMetadata{},
		&models.FileAccessLog{},
		&models.Command{},
		&models.CommandWhitelist{},
		&models.SecurityAuditLog{},
	)
}

// OptimizeDatabase performs database optimization
func OptimizeDatabase() error {
	optimizer := models.NewDatabaseOptimizer(DB)
	return optimizer.OptimizeDatabase()
}

// CloseDatabase closes the database connection
func CloseDatabase() error {
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
