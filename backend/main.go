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
	r.GET("/ws/metrics", websocket.HandleWebSocket)

	// File management endpoints
	r.GET("/api/files", handlers.AuthMiddleware(), handlers.GetFilesHandler)
	r.GET("/api/files/:id", handlers.AuthMiddleware(), handlers.GetFileHandler)
	r.POST("/api/files/upload", handlers.AuthMiddleware(), handlers.UploadFileHandler)
	r.GET("/api/files/:id/download", handlers.AuthMiddleware(), handlers.DownloadFileHandler)
	r.DELETE("/api/files/:id", handlers.AuthMiddleware(), handlers.DeleteFileHandler)
	r.GET("/api/files/stats", handlers.AuthMiddleware(), handlers.GetFileStatsHandler)
	r.GET("/api/files/:id/logs", handlers.AuthMiddleware(), handlers.GetFileAccessLogsHandler)

	// Optimized endpoints for better performance
	optimizedHandlers := handlers.NewOptimizedHandlers()
	r.GET("/api/optimized/users", handlers.AuthMiddleware(), optimizedHandlers.GetUsersOptimizedHandler)
	r.GET("/api/optimized/files", handlers.AuthMiddleware(), optimizedHandlers.GetFilesOptimizedHandler)
	r.GET("/api/optimized/files/search", handlers.AuthMiddleware(), optimizedHandlers.SearchFilesOptimizedHandler)
	r.GET("/api/optimized/files/stats", handlers.AuthMiddleware(), optimizedHandlers.GetFileStatsOptimizedHandler)
	r.GET("/api/optimized/files/:id/logs", handlers.AuthMiddleware(), optimizedHandlers.GetFileAccessLogsOptimizedHandler)
	r.POST("/api/optimized/files/batch-upload", handlers.AuthMiddleware(), optimizedHandlers.BatchUploadFilesHandler)
	r.GET("/api/optimized/database/stats", handlers.AuthMiddleware(), optimizedHandlers.GetDatabasePerformanceStatsHandler)
	r.POST("/api/optimized/database/cleanup", handlers.AuthMiddleware(), optimizedHandlers.CleanupOldDataHandler)

	// Command execution endpoints
	commandHandlers := handlers.NewCommandHandlers()
	r.POST("/api/commands/execute", handlers.AuthMiddleware(), commandHandlers.ExecuteCommandHandler)
	r.GET("/api/commands", handlers.AuthMiddleware(), commandHandlers.GetCommandHistoryHandler)
	r.GET("/api/commands/:id", handlers.AuthMiddleware(), commandHandlers.GetCommandHandler)
	r.GET("/api/commands/stats", handlers.AuthMiddleware(), commandHandlers.GetCommandStatsHandler)
	r.GET("/api/commands/whitelist", handlers.AuthMiddleware(), commandHandlers.GetCommandWhitelistHandler)
	r.POST("/api/commands/whitelist", handlers.AuthMiddleware(), commandHandlers.AddToWhitelistHandler)
	r.DELETE("/api/commands/whitelist/:command", handlers.AuthMiddleware(), commandHandlers.RemoveFromWhitelistHandler)
	r.POST("/api/commands/whitelist/initialize", handlers.AuthMiddleware(), commandHandlers.InitializeWhitelistHandler)

	// Image processing endpoints
	imageHandlers := handlers.NewImageHandlers()
	r.POST("/api/images/upload", handlers.AuthMiddleware(), imageHandlers.UploadOptimizedImageHandler)
	r.POST("/api/images/validate", handlers.AuthMiddleware(), imageHandlers.ValidateImageHandler)
	r.GET("/api/images/stats", handlers.AuthMiddleware(), imageHandlers.GetImageStatsHandler)
	r.PUT("/api/images/settings", handlers.AuthMiddleware(), imageHandlers.UpdateImageSettingsHandler)
	r.GET("/api/images/:id", handlers.AuthMiddleware(), imageHandlers.GetImageFileHandler)
	r.POST("/api/images/batch-optimize", handlers.AuthMiddleware(), imageHandlers.BatchOptimizeImagesHandler)

	// Performance optimization endpoints
	performanceHandlers := handlers.NewPerformanceHandlers()
	r.GET("/api/performance/users", handlers.AuthMiddleware(), performanceHandlers.GetUsersWithCacheHandler)
	r.GET("/api/performance/files", handlers.AuthMiddleware(), performanceHandlers.GetFilesWithCacheHandler)
	r.GET("/api/performance/cache/stats", handlers.AuthMiddleware(), performanceHandlers.GetCacheStatsHandler)
	r.POST("/api/performance/cache/clear", handlers.AuthMiddleware(), performanceHandlers.ClearCacheHandler)
	r.GET("/api/performance/rate-limit/stats", handlers.AuthMiddleware(), performanceHandlers.GetRateLimitStatsHandler)
	r.GET("/api/performance/rate-limit/configs", handlers.AuthMiddleware(), performanceHandlers.GetRateLimitConfigsHandler)
	r.PUT("/api/performance/rate-limit/config", handlers.AuthMiddleware(), performanceHandlers.UpdateRateLimitConfigHandler)
	r.GET("/api/performance/pagination/stats", handlers.AuthMiddleware(), performanceHandlers.GetPaginationStatsHandler)
	r.GET("/api/performance/test", handlers.AuthMiddleware(), performanceHandlers.PerformanceTestHandler)

	// Security audit logging endpoints
	auditHandlers := handlers.NewAuditHandlers()
	r.GET("/api/audit/logs", handlers.AuthMiddleware(), auditHandlers.GetAuditLogsHandler)
	r.GET("/api/audit/logs/:id", handlers.AuthMiddleware(), auditHandlers.GetAuditLogHandler)
	r.GET("/api/audit/stats", handlers.AuthMiddleware(), auditHandlers.GetAuditStatsHandler)
	r.GET("/api/audit/config", handlers.AuthMiddleware(), auditHandlers.GetAuditConfigHandler)
	r.PUT("/api/audit/config", handlers.AuthMiddleware(), auditHandlers.UpdateAuditConfigHandler)
	r.POST("/api/audit/cleanup", handlers.AuthMiddleware(), auditHandlers.CleanupAuditLogsHandler)
	r.GET("/api/audit/events", handlers.AuthMiddleware(), auditHandlers.GetAuditEventsHandler)
	r.GET("/api/audit/export", handlers.AuthMiddleware(), auditHandlers.ExportAuditLogsHandler)
	r.GET("/api/audit/alerts", handlers.AuthMiddleware(), auditHandlers.GetSecurityAlertsHandler)
	r.POST("/api/audit/test", handlers.AuthMiddleware(), auditHandlers.AuditTestHandler)

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
