package models

import (
	"time"
	"gorm.io/gorm"
)

// User represents a user in the system
type User struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	Username  string         `json:"username" gorm:"uniqueIndex;not null;size:50"`
	Email     string         `json:"email" gorm:"uniqueIndex;not null;size:100"`
	Password  string         `json:"password" gorm:"not null;size:255"` // Password field for input
	Role      string         `json:"role" gorm:"default:'user';size:20"`
	Avatar    string         `json:"avatar" gorm:"size:255"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

// TableName returns the table name for the User model
func (User) TableName() string {
	return "users"
}

// Create creates a new user in the database
func (u *User) Create(db *gorm.DB) error {
	return db.Create(u).Error
}

// GetByID retrieves a user by ID
func (u *User) GetByID(db *gorm.DB, id uint) error {
	return db.First(u, id).Error
}

// GetByUsername retrieves a user by username
func (u *User) GetByUsername(db *gorm.DB, username string) error {
	return db.Where("username = ?", username).First(u).Error
}

// GetByEmail retrieves a user by email
func (u *User) GetByEmail(db *gorm.DB, email string) error {
	return db.Where("email = ?", email).First(u).Error
}

// Update updates an existing user
func (u *User) Update(db *gorm.DB) error {
	return db.Save(u).Error
}

// Delete soft deletes a user
func (u *User) Delete(db *gorm.DB) error {
	return db.Delete(u).Error
}

// GetAll retrieves all users with pagination
func GetAll(db *gorm.DB, limit, offset int) ([]User, error) {
	var users []User
	err := db.Limit(limit).Offset(offset).Find(&users).Error
	return users, err
}

// Count returns the total number of users
func Count(db *gorm.DB) (int64, error) {
	var count int64
	err := db.Model(&User{}).Count(&count).Error
	return count, err
}
