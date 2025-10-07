package models

import (
	"testing"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupTestDB creates a test database
func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}
	
	// Auto-migrate the schema
	err = db.AutoMigrate(&User{})
	if err != nil {
		t.Fatalf("Failed to migrate test database: %v", err)
	}
	
	return db
}

func TestUser_Create(t *testing.T) {
	db := setupTestDB(t)
	
	user := &User{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "password123",
		Role:     "user",
	}
	
	err := user.Create(db)
	if err != nil {
		t.Errorf("Failed to create user: %v", err)
	}
	
	if user.ID == 0 {
		t.Error("User ID should be set after creation")
	}
}

func TestUser_GetByID(t *testing.T) {
	db := setupTestDB(t)
	
	// Create a user first
	user := &User{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "password123",
		Role:     "user",
	}
	
	err := user.Create(db)
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}
	
	// Retrieve the user
	var retrievedUser User
	err = retrievedUser.GetByID(db, user.ID)
	if err != nil {
		t.Errorf("Failed to get user by ID: %v", err)
	}
	
	if retrievedUser.Username != user.Username {
		t.Errorf("Expected username %s, got %s", user.Username, retrievedUser.Username)
	}
}

func TestUser_GetByUsername(t *testing.T) {
	db := setupTestDB(t)
	
	// Create a user first
	user := &User{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "password123",
		Role:     "user",
	}
	
	err := user.Create(db)
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}
	
	// Retrieve the user by username
	var retrievedUser User
	err = retrievedUser.GetByUsername(db, "testuser")
	if err != nil {
		t.Errorf("Failed to get user by username: %v", err)
	}
	
	if retrievedUser.Email != user.Email {
		t.Errorf("Expected email %s, got %s", user.Email, retrievedUser.Email)
	}
}

func TestUser_Update(t *testing.T) {
	db := setupTestDB(t)
	
	// Create a user first
	user := &User{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "password123",
		Role:     "user",
	}
	
	err := user.Create(db)
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}
	
	// Update the user
	user.Email = "updated@example.com"
	err = user.Update(db)
	if err != nil {
		t.Errorf("Failed to update user: %v", err)
	}
	
	// Verify the update
	var retrievedUser User
	err = retrievedUser.GetByID(db, user.ID)
	if err != nil {
		t.Errorf("Failed to get updated user: %v", err)
	}
	
	if retrievedUser.Email != "updated@example.com" {
		t.Errorf("Expected email updated@example.com, got %s", retrievedUser.Email)
	}
}

func TestValidateUser(t *testing.T) {
	tests := []struct {
		name    string
		user    User
		wantErr bool
	}{
		{
			name: "valid user",
			user: User{
				Username: "testuser",
				Email:    "test@example.com",
				Password: "password123",
				Role:     "user",
			},
			wantErr: false,
		},
		{
			name: "invalid username too short",
			user: User{
				Username: "ab",
				Email:    "test@example.com",
				Password: "password123",
				Role:     "user",
			},
			wantErr: true,
		},
		{
			name: "invalid email",
			user: User{
				Username: "testuser",
				Email:    "invalid-email",
				Password: "password123",
				Role:     "user",
			},
			wantErr: true,
		},
		{
			name: "invalid password too short",
			user: User{
				Username: "testuser",
				Email:    "test@example.com",
				Password: "123",
				Role:     "user",
			},
			wantErr: true,
		},
		{
			name: "invalid role",
			user: User{
				Username: "testuser",
				Email:    "test@example.com",
				Password: "password123",
				Role:     "invalidrole",
			},
			wantErr: true,
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateUser(&tt.user)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateUser() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateUsername(t *testing.T) {
	tests := []struct {
		username string
		wantErr  bool
	}{
		{"testuser", false},
		{"test_user", false},
		{"test123", false},
		{"ab", true},           // too short
		{"a" + string(make([]byte, 51)), true}, // too long
		{"test-user", true},    // contains hyphen
		{"test.user", true},    // contains dot
		{"", true},             // empty
	}
	
	for _, tt := range tests {
		t.Run(tt.username, func(t *testing.T) {
			err := ValidateUsername(tt.username)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateUsername(%s) error = %v, wantErr %v", tt.username, err, tt.wantErr)
			}
		})
	}
}

func TestValidateEmail(t *testing.T) {
	tests := []struct {
		email   string
		wantErr bool
	}{
		{"test@example.com", false},
		{"user.name@domain.co.uk", false},
		{"invalid-email", true},
		{"@example.com", true},
		{"test@", true},
		{"", true},
	}
	
	for _, tt := range tests {
		t.Run(tt.email, func(t *testing.T) {
			err := ValidateEmail(tt.email)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateEmail(%s) error = %v, wantErr %v", tt.email, err, tt.wantErr)
			}
		})
	}
}
