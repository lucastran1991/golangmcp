package main

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"golangmcp/internal/db"
	"golangmcp/internal/handlers"
	"golangmcp/internal/models"
	"golangmcp/internal/security"
	"golangmcp/internal/session"
	"golangmcp/internal/websocket"
)

var jwtKey = []byte("my_secret_key")

// InitializeDatabase sets up the database connection and performs migrations
func InitializeDatabase() error {
	// Connect to SQLite database
	dsn := "./golangmcp.db"
	return db.InitDatabase(dsn)
}

// MigrateDatabase performs database migrations
func MigrateDatabase() error {
	return db.AutoMigrate()
}

// SeedDatabase creates initial data if needed
func SeedDatabase(database *gorm.DB) error {
	// Check if admin user already exists
	var count int64
	database.Model(&models.User{}).Where("role = ?", "admin").Count(&count)
	
	if count == 0 {
		// Create default admin user
		adminUser := models.User{
			Username:  "admin",
			Email:     "admin@example.com",
			Password:  "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password: "password"
			Role:      "admin",
			Avatar:    "",
		}
		
		err := adminUser.Create(database)
		if err != nil {
			return err
		}
		
		log.Println("Default admin user created successfully")
	}
	
	return nil
}

func main() {
	// Initialize database
	err := InitializeDatabase()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Seed database with initial data
	err = SeedDatabase(db.DB)
	if err != nil {
		log.Fatalf("Failed to seed database: %v", err)
	}

	// Start session cleanup
	session.StartSessionCleanup()
	log.Println("Session cleanup started")

	// Initialize WebSocket hub
	websocket.InitializeWebSocket()

	// Initialize Gin router
	r := gin.Default()

	// Apply security middleware
	r.Use(security.SecurityHeadersMiddleware())
	r.Use(security.CORSMiddleware())
	r.Use(security.RateLimitMiddleware())
	r.Use(security.RequestSizeMiddleware(security.DefaultSecurityConfig.MaxRequestSize))
	r.Use(security.InputSanitizationMiddleware())
	r.Use(security.AuditLogMiddleware())
	
	// Apply CSRF protection to non-GET requests
	r.Use(security.CSRFMiddleware())

	// API Documentation and Info endpoints
	r.GET("/", handlers.GetAPIInfoHandler)
	r.GET("/api", handlers.GetAPIInfoHandler)
	r.GET("/health", handlers.GetHealthHandler)
	r.GET("/stats", handlers.GetStatsHandler)

	// Authentication endpoints
	r.POST("/register", handlers.RegisterHandler)
	r.POST("/login", handlers.LoginHandler)
	r.POST("/logout", handlers.LogoutHandler)

	// Profile management endpoints
	r.GET("/profile", handlers.AuthMiddleware(), handlers.GetProfileHandler)
	r.PUT("/profile", handlers.AuthMiddleware(), handlers.UpdateProfileHandler)
	r.POST("/profile/change-password", handlers.AuthMiddleware(), handlers.ChangePasswordHandler)

	// Protected endpoints
	r.GET("/protected", handlers.AuthMiddleware(), protectedHandler)

	// Secure file upload endpoints
	r.POST("/upload/:fileType", handlers.AuthMiddleware(), handlers.SecureUploadHandler)
	r.GET("/upload/stats", handlers.AuthMiddleware(), handlers.GetSecureUploadStatsHandler)
	r.POST("/scan/:fileId", handlers.AuthMiddleware(), handlers.ScanFileHandler)

	// Avatar upload endpoints (legacy)
	r.POST("/profile/avatar", handlers.AuthMiddleware(), handlers.UploadAvatarHandler)
	r.DELETE("/profile/avatar", handlers.AuthMiddleware(), handlers.DeleteAvatarHandler)
	r.GET("/uploads/avatars/:filename", handlers.GetAvatarHandler)

	// Admin upload statistics
	r.GET("/admin/uploads/stats", handlers.AuthMiddleware(), handlers.AdminMiddleware(), handlers.GetUploadStatsHandler)

	// Session management endpoints
	r.GET("/sessions", handlers.AuthMiddleware(), handlers.GetUserSessionsHandler)
	r.DELETE("/sessions/:sessionId", handlers.AuthMiddleware(), handlers.InvalidateSessionHandler)
	r.DELETE("/sessions", handlers.AuthMiddleware(), handlers.InvalidateAllSessionsHandler)

	// Admin session management
	r.GET("/admin/sessions", handlers.AuthMiddleware(), handlers.AdminMiddleware(), handlers.GetAllSessionsHandler)
	r.GET("/admin/sessions/stats", handlers.AuthMiddleware(), handlers.AdminMiddleware(), handlers.GetSessionStatsHandler)
	r.DELETE("/admin/sessions/user/:userId", handlers.AuthMiddleware(), handlers.AdminMiddleware(), handlers.InvalidateUserSessionsHandler)

	// Role-based authorization endpoints
	r.GET("/roles", handlers.GetRolesHandler)
	r.GET("/permissions", handlers.GetPermissionsHandler)
	r.GET("/user/permissions", handlers.AuthMiddleware(), handlers.GetUserPermissionsHandler)
	r.GET("/check-permission", handlers.AuthMiddleware(), handlers.CheckPermissionHandler)
	r.GET("/check-access", handlers.AuthMiddleware(), handlers.CheckResourceAccessHandler)

	// Admin RBAC endpoints
	r.POST("/admin/users/:userId/role", handlers.AuthMiddleware(), handlers.RequirePermission("admin.users"), handlers.AssignRoleHandler)
	r.POST("/admin/users/bulk-role", handlers.AuthMiddleware(), handlers.RequirePermission("admin.users"), handlers.BulkRoleAssignmentHandler)
	r.GET("/admin/rbac/stats", handlers.AuthMiddleware(), handlers.RequirePermission("admin.stats"), handlers.GetRoleStatsHandler)

	// User management endpoints
	r.GET("/users", handlers.AuthMiddleware(), getUsersHandler)
	
	// Admin user management endpoints
	r.GET("/admin/users/:id", handlers.AuthMiddleware(), handlers.RequirePermission("admin.users"), handlers.GetUserProfileHandler)
	r.PUT("/admin/users/:id", handlers.AuthMiddleware(), handlers.RequirePermission("admin.users"), handlers.UpdateUserProfileHandler)
	r.DELETE("/admin/users/:id", handlers.AuthMiddleware(), handlers.RequirePermission("admin.users"), handlers.DeleteUserHandler)

	// Security endpoints
	r.GET("/security/status", handlers.GetSecurityStatusHandler)
	r.GET("/security/csrf-token", handlers.GetCSRFTokenHandler)
	r.POST("/security/validate-csrf", handlers.ValidateCSRFTokenHandler)
	r.GET("/security/rate-limit-status", handlers.GetRateLimitStatusHandler)
	r.GET("/security/headers", handlers.GetSecurityHeadersHandler)
	r.GET("/security/test", handlers.TestSecurityFeaturesHandler)
	r.GET("/security/metrics", handlers.AuthMiddleware(), handlers.RequirePermission("admin.stats"), handlers.GetSecurityMetricsHandler)

	// Admin security endpoints
	r.PUT("/admin/security/config", handlers.AuthMiddleware(), handlers.RequirePermission("admin.security"), handlers.UpdateSecurityConfigHandler)
	r.GET("/admin/security/logs", handlers.AuthMiddleware(), handlers.RequirePermission("admin.security"), handlers.GetSecurityLogsHandler)

	// System metrics endpoints
	r.GET("/api/metrics/system", handlers.AuthMiddleware(), handlers.GetSystemMetricsHandler)
	r.GET("/api/metrics/cpu", handlers.AuthMiddleware(), handlers.GetCPUMetricsHandler)
	r.GET("/api/metrics/memory", handlers.AuthMiddleware(), handlers.GetMemoryMetricsHandler)
	r.GET("/api/metrics/disk", handlers.AuthMiddleware(), handlers.GetDiskMetricsHandler)
	r.GET("/api/metrics/network", handlers.AuthMiddleware(), handlers.GetNetworkMetricsHandler)
	r.GET("/api/metrics/history", handlers.AuthMiddleware(), handlers.GetMetricsHistoryHandler)
	r.GET("/api/metrics/config", handlers.AuthMiddleware(), handlers.GetMetricsConfigHandler)

	// WebSocket endpoint for real-time metrics
	r.GET("/ws/metrics", handlers.AuthMiddleware(), websocket.HandleWebSocket)

	// File management endpoints
	r.GET("/api/files", handlers.AuthMiddleware(), handlers.GetFilesHandler)
	r.GET("/api/files/:id", handlers.AuthMiddleware(), handlers.GetFileHandler)
	r.POST("/api/files/upload", handlers.AuthMiddleware(), handlers.UploadFileHandler)
	r.GET("/api/files/:id/download", handlers.AuthMiddleware(), handlers.DownloadFileHandler)
	r.DELETE("/api/files/:id", handlers.AuthMiddleware(), handlers.DeleteFileHandler)
	r.GET("/api/files/stats", handlers.AuthMiddleware(), handlers.GetFileStatsHandler)
	r.GET("/api/files/:id/logs", handlers.AuthMiddleware(), handlers.GetFileAccessLogsHandler)

	// Start server
	r.Run(":8080")
}


// Protected handler (requires authentication)
func protectedHandler(c *gin.Context) {
	userID, _ := c.Get("user_id")
	username, _ := c.Get("username")
	role, _ := c.Get("role")

	c.JSON(http.StatusOK, gin.H{
		"message":  "This is a protected route",
		"user_id":  userID,
		"username": username,
		"role":     role,
		"time":     time.Now(),
	})
}

// Get users handler (demonstrates GORM usage)
func getUsersHandler(c *gin.Context) {
	log.Println("getUsersHandler called")
	users, err := models.GetAll(db.DB, 100, 0) // Get first 100 users
	if err != nil {
		log.Printf("Error fetching users: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	log.Printf("Found %d users", len(users))
	c.JSON(http.StatusOK, users)
}

// Create user handler
func createUserHandler(c *gin.Context) {
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Debug logging
	log.Printf("Received user: %+v", user)
	log.Printf("Password length: %d", len(user.Password))

	// Validate user input
	if err := models.ValidateUser(&user); err != nil {
		log.Printf("Validation error: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Sanitize user input
	models.SanitizeUser(&user)

	// TODO: Hash the password properly (for now using plain text for demo)
	// In production, use bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)

	err := user.Create(db.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, user)
}
