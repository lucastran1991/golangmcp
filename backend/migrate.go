package main

import (
	"log"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// User model for migration
type User struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Username  string    `gorm:"unique;not null;size:50" json:"username" validate:"required,min=3,max=50"`
	Email     string    `gorm:"unique;not null;size:100" json:"email" validate:"required,email"`
	Password  string    `gorm:"not null" json:"-" validate:"required,min=8"`
	Role      string    `gorm:"not null;default:'user';size:20" json:"role" validate:"oneof=admin user moderator"`
	Avatar    string    `gorm:"size:255" json:"avatar"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func main() {
	// Connect to database
	dsn := "./golangmcp.db"
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Run migration
	err = db.AutoMigrate(&User{})
	if err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	log.Println("Database migration completed successfully!")
}