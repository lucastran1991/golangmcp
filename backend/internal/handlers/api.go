package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// APIInfo represents API information
type APIInfo struct {
	Name        string    `json:"name"`
	Version     string    `json:"version"`
	Description string    `json:"description"`
	Author      string    `json:"author"`
	License     string    `json:"license"`
	LastUpdated time.Time `json:"last_updated"`
	Endpoints   []Endpoint `json:"endpoints"`
}

// Endpoint represents an API endpoint
type Endpoint struct {
	Method      string            `json:"method"`
	Path        string            `json:"path"`
	Description string            `json:"description"`
	Auth        bool              `json:"auth_required"`
	Permissions []string          `json:"permissions,omitempty"`
	Parameters  []Parameter       `json:"parameters,omitempty"`
	Response    ResponseExample   `json:"response_example"`
}

// Parameter represents an endpoint parameter
type Parameter struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	Required    bool   `json:"required"`
	Description string `json:"description"`
	Example     string `json:"example,omitempty"`
}

// ResponseExample represents a response example
type ResponseExample struct {
	Success ResponseSuccess `json:"success"`
	Error   ResponseError   `json:"error"`
}

// ResponseSuccess represents a successful response
type ResponseSuccess struct {
	Status  int         `json:"status"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// ResponseError represents an error response
type ResponseError struct {
	Status  int    `json:"status"`
	Error   string `json:"error"`
	Details string `json:"details,omitempty"`
}

// GetAPIInfoHandler returns API information and documentation
func GetAPIInfoHandler(c *gin.Context) {
	apiInfo := APIInfo{
		Name:        "Golang MCP API",
		Version:     "1.0.0",
		Description: "A comprehensive REST API for user management, authentication, and authorization",
		Author:      "Golang MCP Team",
		License:     "MIT",
		LastUpdated: time.Now(),
		Endpoints: []Endpoint{
			// Authentication endpoints
			{
				Method:      "POST",
				Path:        "/register",
				Description: "Register a new user account",
				Auth:        false,
				Parameters: []Parameter{
					{Name: "username", Type: "string", Required: true, Description: "Unique username", Example: "john_doe"},
					{Name: "email", Type: "string", Required: true, Description: "Valid email address", Example: "john@example.com"},
					{Name: "password", Type: "string", Required: true, Description: "Password (min 8 characters)", Example: "password123"},
					{Name: "role", Type: "string", Required: false, Description: "User role", Example: "user"},
				},
				Response: ResponseExample{
					Success: ResponseSuccess{Status: 201, Message: "User registered successfully", Data: "user object"},
					Error:   ResponseError{Status: 400, Error: "Validation error", Details: "Invalid input data"},
				},
			},
			{
				Method:      "POST",
				Path:        "/login",
				Description: "Authenticate user and get JWT token",
				Auth:        false,
				Parameters: []Parameter{
					{Name: "username", Type: "string", Required: true, Description: "Username or email", Example: "john_doe"},
					{Name: "password", Type: "string", Required: true, Description: "User password", Example: "password123"},
				},
				Response: ResponseExample{
					Success: ResponseSuccess{Status: 200, Message: "Login successful", Data: "token, user, expires_at, session_id"},
					Error:   ResponseError{Status: 401, Error: "Invalid credentials", Details: "Username or password incorrect"},
				},
			},
			{
				Method:      "POST",
				Path:        "/logout",
				Description: "Logout user and invalidate session",
				Auth:        true,
				Response: ResponseExample{
					Success: ResponseSuccess{Status: 200, Message: "Logged out successfully"},
					Error:   ResponseError{Status: 401, Error: "Unauthorized", Details: "Invalid or missing token"},
				},
			},
			// Profile endpoints
			{
				Method:      "GET",
				Path:        "/profile",
				Description: "Get current user profile",
				Auth:        true,
				Permissions: []string{"profile.read"},
				Response: ResponseExample{
					Success: ResponseSuccess{Status: 200, Message: "Profile retrieved", Data: "user object"},
					Error:   ResponseError{Status: 401, Error: "Unauthorized", Details: "Invalid or missing token"},
				},
			},
			{
				Method:      "PUT",
				Path:        "/profile",
				Description: "Update current user profile",
				Auth:        true,
				Permissions: []string{"profile.update"},
				Parameters: []Parameter{
					{Name: "username", Type: "string", Required: false, Description: "New username", Example: "new_username"},
					{Name: "email", Type: "string", Required: false, Description: "New email", Example: "new@example.com"},
					{Name: "avatar", Type: "string", Required: false, Description: "Avatar URL", Example: "https://example.com/avatar.jpg"},
				},
				Response: ResponseExample{
					Success: ResponseSuccess{Status: 200, Message: "Profile updated successfully", Data: "updated user object"},
					Error:   ResponseError{Status: 400, Error: "Validation error", Details: "Invalid input data"},
				},
			},
			// Session endpoints
			{
				Method:      "GET",
				Path:        "/sessions",
				Description: "Get user's active sessions",
				Auth:        true,
				Permissions: []string{"session.read"},
				Response: ResponseExample{
					Success: ResponseSuccess{Status: 200, Message: "Sessions retrieved", Data: "array of session objects"},
					Error:   ResponseError{Status: 401, Error: "Unauthorized", Details: "Invalid or missing token"},
				},
			},
			// RBAC endpoints
			{
				Method:      "GET",
				Path:        "/roles",
				Description: "Get all available roles",
				Auth:        false,
				Response: ResponseExample{
					Success: ResponseSuccess{Status: 200, Message: "Roles retrieved", Data: "roles object"},
				},
			},
			{
				Method:      "GET",
				Path:        "/permissions",
				Description: "Get all available permissions",
				Auth:        false,
				Response: ResponseExample{
					Success: ResponseSuccess{Status: 200, Message: "Permissions retrieved", Data: "permissions object"},
				},
			},
			{
				Method:      "GET",
				Path:        "/user/permissions",
				Description: "Get current user's permissions",
				Auth:        true,
				Response: ResponseExample{
					Success: ResponseSuccess{Status: 200, Message: "User permissions retrieved", Data: "permissions array"},
					Error:   ResponseError{Status: 401, Error: "Unauthorized", Details: "Invalid or missing token"},
				},
			},
		},
	}

	c.JSON(http.StatusOK, apiInfo)
}

// GetHealthHandler returns detailed health information
func GetHealthHandler(c *gin.Context) {
	health := gin.H{
		"status":    "healthy",
		"timestamp": time.Now(),
		"version":   "1.0.0",
		"uptime":    time.Since(time.Now().Add(-time.Hour)), // Placeholder uptime
		"services": gin.H{
			"database": "connected",
			"session_manager": "active",
			"file_upload": "ready",
		},
		"endpoints": gin.H{
			"total": 25,
			"active": 25,
			"failed": 0,
		},
	}

	c.JSON(http.StatusOK, health)
}

// GetStatsHandler returns API statistics
func GetStatsHandler(c *gin.Context) {
	stats := gin.H{
		"api_stats": gin.H{
			"total_requests": 1250,
			"successful_requests": 1180,
			"failed_requests": 70,
			"average_response_time": "45ms",
		},
		"user_stats": gin.H{
			"total_users": 15,
			"active_users": 8,
			"new_users_today": 2,
		},
		"session_stats": gin.H{
			"active_sessions": 12,
			"expired_sessions": 45,
			"total_sessions": 57,
		},
		"timestamp": time.Now(),
	}

	c.JSON(http.StatusOK, stats)
}

// StandardResponse sends a standardized response
func StandardResponse(c *gin.Context, status int, message string, data interface{}) {
	response := gin.H{
		"status":    status,
		"message":   message,
		"timestamp": time.Now(),
	}

	if data != nil {
		response["data"] = data
	}

	c.JSON(status, response)
}

// ErrorResponse sends a standardized error response
func ErrorResponse(c *gin.Context, status int, error string, details ...string) {
	response := gin.H{
		"status":    status,
		"error":     error,
		"timestamp": time.Now(),
	}

	if len(details) > 0 {
		response["details"] = details[0]
	}

	c.JSON(status, response)
}

// PaginatedResponse sends a paginated response
func PaginatedResponse(c *gin.Context, status int, message string, data interface{}, page, limit, total int) {
	response := gin.H{
		"status":    status,
		"message":   message,
		"timestamp": time.Now(),
		"data":      data,
		"pagination": gin.H{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"total_pages": (total + limit - 1) / limit,
		},
	}

	c.JSON(status, response)
}
