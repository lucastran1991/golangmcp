package services

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"golangmcp/internal/models"
	"golangmcp/internal/db"
	"gorm.io/gorm"
)

// AuditLogger provides audit logging functionality
type AuditLogger struct {
	db     *gorm.DB
	events map[string]models.AuditEvent
	mutex  sync.RWMutex
}

// NewAuditLogger creates a new audit logger
func NewAuditLogger() *AuditLogger {
	return &AuditLogger{
		db:     db.DB,
		events: models.GetAuditEvents(),
	}
}

// LogEvent logs a security audit event
func (al *AuditLogger) LogEvent(eventKey string, userID *uint, resource string, resourceID *uint, ipAddress, userAgent, requestID, sessionID string, details interface{}, status string) error {
	al.mutex.RLock()
	event, exists := al.events[eventKey]
	al.mutex.RUnlock()
	
	if !exists {
		return fmt.Errorf("unknown audit event: %s", eventKey)
	}
	
	// Convert details to JSON string
	var detailsStr string
	if details != nil {
		if detailsBytes, err := json.Marshal(details); err == nil {
			detailsStr = string(detailsBytes)
		}
	}
	
	auditLog := &models.SecurityAuditLog{
		UserID:      userID,
		EventType:   event.Type,
		EventAction: event.Action,
		Resource:    resource,
		ResourceID:  resourceID,
		IPAddress:   ipAddress,
		UserAgent:   userAgent,
		RequestID:   requestID,
		SessionID:   sessionID,
		Details:     detailsStr,
		Severity:    event.Severity,
		Status:      status,
		CreatedAt:   time.Now(),
	}
	
	return models.CreateSecurityAuditLog(al.db, auditLog)
}

// LogLoginSuccess logs a successful login
func (al *AuditLogger) LogLoginSuccess(userID uint, ipAddress, userAgent, requestID, sessionID string) error {
	return al.LogEvent("login_success", &userID, "user", &userID, ipAddress, userAgent, requestID, sessionID, nil, "success")
}

// LogLoginFailure logs a failed login attempt
func (al *AuditLogger) LogLoginFailure(username, ipAddress, userAgent, requestID string, details interface{}) error {
	return al.LogEvent("login_failure", nil, "user", nil, ipAddress, userAgent, requestID, "", details, "failure")
}

// LogLogout logs a logout event
func (al *AuditLogger) LogLogout(userID uint, ipAddress, userAgent, requestID, sessionID string) error {
	return al.LogEvent("logout", &userID, "user", &userID, ipAddress, userAgent, requestID, sessionID, nil, "success")
}

// LogFileOperation logs a file operation
func (al *AuditLogger) LogFileOperation(operation string, userID uint, fileID uint, filename string, ipAddress, userAgent, requestID string, status string) error {
	details := map[string]interface{}{
		"filename": filename,
		"file_id":  fileID,
	}
	
	eventKey := fmt.Sprintf("file_%s", operation)
	return al.LogEvent(eventKey, &userID, "file", &fileID, ipAddress, userAgent, requestID, "", details, status)
}

// LogCommandExecution logs a command execution
func (al *AuditLogger) LogCommandExecution(userID uint, command string, args []string, exitCode int, ipAddress, userAgent, requestID string) error {
	details := map[string]interface{}{
		"command":   command,
		"args":      args,
		"exit_code": exitCode,
	}
	
	status := "success"
	if exitCode != 0 {
		status = "failure"
	}
	
	return al.LogEvent("command_execute", &userID, "command", nil, ipAddress, userAgent, requestID, "", details, status)
}

// LogPermissionDenied logs a permission denied event
func (al *AuditLogger) LogPermissionDenied(userID *uint, resource, action, ipAddress, userAgent, requestID string) error {
	details := map[string]interface{}{
		"resource": resource,
		"action":   action,
	}
	
	return al.LogEvent("permission_denied", userID, resource, nil, ipAddress, userAgent, requestID, "", details, "failure")
}

// LogRateLimitExceeded logs a rate limit exceeded event
func (al *AuditLogger) LogRateLimitExceeded(userID *uint, endpoint, ipAddress, userAgent, requestID string) error {
	details := map[string]interface{}{
		"endpoint": endpoint,
	}
	
	return al.LogEvent("rate_limit_exceeded", userID, "api", nil, ipAddress, userAgent, requestID, "", details, "failure")
}

// LogCSRFViolation logs a CSRF token violation
func (al *AuditLogger) LogCSRFViolation(userID *uint, ipAddress, userAgent, requestID string) error {
	return al.LogEvent("csrf_token_invalid", userID, "security", nil, ipAddress, userAgent, requestID, "", nil, "failure")
}

// LogSessionExpired logs a session expiration
func (al *AuditLogger) LogSessionExpired(userID uint, sessionID, ipAddress, userAgent string) error {
	return al.LogEvent("session_expired", &userID, "session", nil, ipAddress, userAgent, "", sessionID, nil, "success")
}

// LogAdminAction logs an administrative action
func (al *AuditLogger) LogAdminAction(userID uint, action, resource string, resourceID *uint, details interface{}, ipAddress, userAgent, requestID string) error {
	return al.LogEvent("admin_action", &userID, resource, resourceID, ipAddress, userAgent, requestID, "", details, "success")
}

// LogSystemError logs a system error
func (al *AuditLogger) LogSystemError(errorType, resource string, details interface{}, ipAddress, userAgent, requestID string) error {
	return al.LogEvent("system_error", nil, resource, nil, ipAddress, userAgent, requestID, "", details, "error")
}

// GetAuditLogs retrieves audit logs with filtering
func (al *AuditLogger) GetAuditLogs(filters map[string]interface{}, limit, offset int) ([]models.SecurityAuditLog, error) {
	return models.GetSecurityAuditLogs(al.db, filters, limit, offset)
}

// GetAuditStats returns audit statistics
func (al *AuditLogger) GetAuditStats() (map[string]interface{}, error) {
	return models.GetSecurityAuditStats(al.db)
}

// CleanupOldLogs removes old audit logs
func (al *AuditLogger) CleanupOldLogs(olderThanDays int) error {
	return models.CleanupOldAuditLogs(al.db, olderThanDays)
}

// AuditMiddleware provides middleware for automatic audit logging
type AuditMiddleware struct {
	logger *AuditLogger
}

// NewAuditMiddleware creates a new audit middleware
func NewAuditMiddleware() *AuditMiddleware {
	return &AuditMiddleware{
		logger: NewAuditLogger(),
	}
}

// LogRequest logs HTTP request details
func (am *AuditMiddleware) LogRequest(method, path string, userID *uint, ipAddress, userAgent, requestID string, statusCode int) {
	// Determine event type based on path and method
	var eventKey string
	var resource string
	
	switch {
	case path == "/login" && method == "POST":
		if statusCode == 200 {
			eventKey = "login_success"
		} else {
			eventKey = "login_failure"
		}
		resource = "authentication"
	case path == "/logout" && method == "POST":
		eventKey = "logout"
		resource = "authentication"
	case path == "/register" && method == "POST":
		eventKey = "register"
		resource = "authentication"
	case path == "/api/files/upload" && method == "POST":
		eventKey = "file_upload"
		resource = "file"
	case path == "/api/files" && method == "GET":
		eventKey = "file_download"
		resource = "file"
	case path == "/api/commands/execute" && method == "POST":
		eventKey = "command_execute"
		resource = "command"
	default:
		// Skip logging for non-security-relevant endpoints
		return
	}
	
	status := "success"
	if statusCode >= 400 {
		status = "failure"
	}
	
	am.logger.LogEvent(eventKey, userID, resource, nil, ipAddress, userAgent, requestID, "", nil, status)
}

// AuditConfig represents audit logging configuration
type AuditConfig struct {
	Enabled           bool          `json:"enabled"`
	RetentionDays     int           `json:"retention_days"`
	LogLevel          string        `json:"log_level"`
	CleanupInterval   time.Duration `json:"cleanup_interval"`
	MaxLogSize        int64         `json:"max_log_size"`
	CompressOldLogs   bool          `json:"compress_old_logs"`
}

// DefaultAuditConfig returns default audit configuration
func DefaultAuditConfig() *AuditConfig {
	return &AuditConfig{
		Enabled:         true,
		RetentionDays:   90,
		LogLevel:        "medium",
		CleanupInterval: 24 * time.Hour,
		MaxLogSize:      100 * 1024 * 1024, // 100MB
		CompressOldLogs: true,
	}
}

// AuditManager manages audit logging for the entire application
type AuditManager struct {
	logger *AuditLogger
	config *AuditConfig
	mutex  sync.RWMutex
}

// NewAuditManager creates a new audit manager
func NewAuditManager() *AuditManager {
	manager := &AuditManager{
		logger: NewAuditLogger(),
		config: DefaultAuditConfig(),
	}
	
	// Start cleanup goroutine
	go manager.startCleanup()
	
	return manager
}

// GetLogger returns the audit logger
func (am *AuditManager) GetLogger() *AuditLogger {
	return am.logger
}

// UpdateConfig updates audit configuration
func (am *AuditManager) UpdateConfig(config *AuditConfig) {
	am.mutex.Lock()
	defer am.mutex.Unlock()
	am.config = config
}

// GetConfig returns current audit configuration
func (am *AuditManager) GetConfig() *AuditConfig {
	am.mutex.RLock()
	defer am.mutex.RUnlock()
	return am.config
}

// startCleanup starts a goroutine to clean up old audit logs
func (am *AuditManager) startCleanup() {
	ticker := time.NewTicker(am.config.CleanupInterval)
	defer ticker.Stop()
	
	for range ticker.C {
		if am.config.Enabled {
			am.logger.CleanupOldLogs(am.config.RetentionDays)
		}
	}
}
