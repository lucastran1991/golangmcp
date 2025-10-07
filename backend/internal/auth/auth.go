package auth

import (
	"errors"
	"time"

	"github.com/dgrijalva/jwt-go"
	"golang.org/x/crypto/bcrypt"
	"golangmcp/internal/models"
	"gorm.io/gorm"
)

// JWT Claims structure
type Claims struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.StandardClaims
}

// LoginRequest represents the login request payload
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// RegisterRequest represents the registration request payload
type RegisterRequest struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
	Role     string `json:"role"`
}

// AuthResponse represents the authentication response
type AuthResponse struct {
	Token      string      `json:"token"`
	User       models.User `json:"user"`
	ExpiresAt  time.Time   `json:"expires_at"`
	SessionID  string      `json:"session_id"`
}

var (
	ErrInvalidCredentials = errors.New("invalid username or password")
	ErrUserNotFound      = errors.New("user not found")
	ErrUserExists        = errors.New("user already exists")
)

// HashPassword hashes a password using bcrypt
func HashPassword(password string) (string, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashedPassword), nil
}

// VerifyPassword verifies a password against its hash
func VerifyPassword(password, hashedPassword string) error {
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
}

// GenerateJWT generates a JWT token for a user
func GenerateJWT(user *models.User, secretKey []byte) (string, time.Time, error) {
	expirationTime := time.Now().Add(24 * time.Hour) // Token expires in 24 hours
	
	claims := &Claims{
		UserID:   user.ID,
		Username: user.Username,
		Role:     user.Role,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: expirationTime.Unix(),
			IssuedAt:  time.Now().Unix(),
			Issuer:    "golangmcp",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(secretKey)
	if err != nil {
		return "", time.Time{}, err
	}

	return tokenString, expirationTime, nil
}

// ValidateJWT validates a JWT token and returns the claims
func ValidateJWT(tokenString string, secretKey []byte) (*Claims, error) {
	claims := &Claims{}
	
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return secretKey, nil
	})
	
	if err != nil {
		return nil, err
	}
	
	if !token.Valid {
		return nil, errors.New("invalid token")
	}
	
	return claims, nil
}

// RegisterUser registers a new user
func RegisterUser(db *gorm.DB, req *RegisterRequest) (*models.User, error) {
	// Check if user already exists
	var existingUser models.User
	err := db.Where("username = ? OR email = ?", req.Username, req.Email).First(&existingUser).Error
	if err == nil {
		return nil, ErrUserExists
	}

	// Validate user input
	user := &models.User{
		Username: req.Username,
		Email:    req.Email,
		Password: req.Password,
		Role:     req.Role,
	}

	if err := models.ValidateUser(user); err != nil {
		return nil, err
	}

	// Sanitize user input
	models.SanitizeUser(user)

	// Hash password
	hashedPassword, err := HashPassword(user.Password)
	if err != nil {
		return nil, err
	}
	user.Password = hashedPassword

	// Create user
	err = user.Create(db)
	if err != nil {
		return nil, err
	}

	// Clear password from response
	user.Password = ""

	return user, nil
}

// LoginUser authenticates a user and returns JWT token
func LoginUser(db *gorm.DB, req *LoginRequest, secretKey []byte) (*AuthResponse, error) {
	// Find user by username
	var user models.User
	err := user.GetByUsername(db, req.Username)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	// Verify password
	err = VerifyPassword(req.Password, user.Password)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	// Generate JWT token
	token, expiresAt, err := GenerateJWT(&user, secretKey)
	if err != nil {
		return nil, err
	}

	// Clear password from response
	user.Password = ""

	return &AuthResponse{
		Token:     token,
		User:      user,
		ExpiresAt: expiresAt,
	}, nil
}

// GetUserFromToken retrieves user information from JWT token
func GetUserFromToken(db *gorm.DB, tokenString string, secretKey []byte) (*models.User, error) {
	claims, err := ValidateJWT(tokenString, secretKey)
	if err != nil {
		return nil, err
	}

	var user models.User
	err = user.GetByID(db, claims.UserID)
	if err != nil {
		return nil, err
	}

	// Clear password from response
	user.Password = ""

	return &user, nil
}
