package models

import (
	"errors"
	"regexp"
	"strings"
)

// Validation errors
var (
	ErrInvalidUsername = errors.New("username must be 3-50 characters and contain only letters, numbers, and underscores")
	ErrInvalidEmail    = errors.New("invalid email format")
	ErrInvalidPassword = errors.New("password must be at least 8 characters")
	ErrInvalidRole     = errors.New("invalid role")
)

// ValidRoles defines the allowed user roles
var ValidRoles = []string{"admin", "user", "moderator"}

// ValidateUser validates a user struct
func ValidateUser(u *User) error {
	if err := ValidateUsername(u.Username); err != nil {
		return err
	}
	
	if err := ValidateEmail(u.Email); err != nil {
		return err
	}
	
	if err := ValidatePassword(u.Password); err != nil {
		return err
	}
	
	if err := ValidateRole(u.Role); err != nil {
		return err
	}
	
	return nil
}

// ValidateUsername validates the username field
func ValidateUsername(username string) error {
	if len(username) < 3 || len(username) > 50 {
		return ErrInvalidUsername
	}
	
	// Check if username contains only letters, numbers, and underscores
	matched, _ := regexp.MatchString(`^[a-zA-Z0-9_]+$`, username)
	if !matched {
		return ErrInvalidUsername
	}
	
	return nil
}

// ValidateEmail validates the email field
func ValidateEmail(email string) error {
	if email == "" {
		return ErrInvalidEmail
	}
	
	// Basic email regex validation
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(email) {
		return ErrInvalidEmail
	}
	
	return nil
}

// ValidatePassword validates the password field
func ValidatePassword(password string) error {
	if len(password) < 8 {
		return ErrInvalidPassword
	}
	
	return nil
}

// ValidateRole validates the role field
func ValidateRole(role string) error {
	if role == "" {
		role = "user" // Default role
		return nil
	}
	
	for _, validRole := range ValidRoles {
		if role == validRole {
			return nil
		}
	}
	
	return ErrInvalidRole
}

// SanitizeUser sanitizes user input
func SanitizeUser(u *User) {
	u.Username = strings.TrimSpace(u.Username)
	u.Email = strings.ToLower(strings.TrimSpace(u.Email))
	u.Role = strings.ToLower(strings.TrimSpace(u.Role))
}
