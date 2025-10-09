package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"golangmcp/internal/services"
	"golangmcp/internal/models"
	"golangmcp/internal/db"
)

// AuditHandlers provides handlers for audit logging
type AuditHandlers struct {
	auditManager *services.AuditManager
}

// NewAuditHandlers creates new audit handlers
func NewAuditHandlers() *AuditHandlers {
	return &AuditHandlers{
		auditManager: services.NewAuditManager(),
	}
}

// GetAuditLogsHandler retrieves audit logs with filtering
func (ah *AuditHandlers) GetAuditLogsHandler(c *gin.Context) {
	// Parse query parameters
	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")
	
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 50
	}
	
	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}
	
	// Build filters
	filters := make(map[string]interface{})
	
	if userIDStr := c.Query("user_id"); userIDStr != "" {
		if userID, err := strconv.ParseUint(userIDStr, 10, 32); err == nil {
			filters["user_id"] = uint(userID)
		}
	}
	
	if eventType := c.Query("event_type"); eventType != "" {
		filters["event_type"] = eventType
	}
	
	if severity := c.Query("severity"); severity != "" {
		filters["severity"] = severity
	}
	
	if status := c.Query("status"); status != "" {
		filters["status"] = status
	}
	
	if ipAddress := c.Query("ip_address"); ipAddress != "" {
		filters["ip_address"] = ipAddress
	}
	
	if startDate := c.Query("start_date"); startDate != "" {
		filters["start_date"] = startDate
	}
	
	if endDate := c.Query("end_date"); endDate != "" {
		filters["end_date"] = endDate
	}
	
	// Get audit logs
	logs, err := ah.auditManager.GetLogger().GetAuditLogs(filters, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch audit logs"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"data": logs,
		"pagination": gin.H{
			"limit":  limit,
			"offset": offset,
			"count":  len(logs),
		},
	})
}

// GetAuditStatsHandler returns audit statistics
func (ah *AuditHandlers) GetAuditStatsHandler(c *gin.Context) {
	stats, err := ah.auditManager.GetLogger().GetAuditStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch audit statistics"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"data": stats,
	})
}

// GetAuditConfigHandler returns audit configuration
func (ah *AuditHandlers) GetAuditConfigHandler(c *gin.Context) {
	config := ah.auditManager.GetConfig()
	
	c.JSON(http.StatusOK, gin.H{
		"data": config,
	})
}

// UpdateAuditConfigHandler updates audit configuration
func (ah *AuditHandlers) UpdateAuditConfigHandler(c *gin.Context) {
	var config services.AuditConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	ah.auditManager.UpdateConfig(&config)
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Audit configuration updated successfully",
		"data":    config,
	})
}

// CleanupAuditLogsHandler cleans up old audit logs
func (ah *AuditHandlers) CleanupAuditLogsHandler(c *gin.Context) {
	daysStr := c.DefaultQuery("days", "90")
	days, err := strconv.Atoi(daysStr)
	if err != nil || days <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid days parameter"})
		return
	}
	
	err = ah.auditManager.GetLogger().CleanupOldLogs(days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cleanup audit logs"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Audit logs cleanup completed successfully",
		"data": gin.H{
			"days": days,
		},
	})
}

// GetAuditEventsHandler returns available audit events
func (ah *AuditHandlers) GetAuditEventsHandler(c *gin.Context) {
	events := models.GetAuditEvents()
	
	c.JSON(http.StatusOK, gin.H{
		"data": events,
	})
}

// GetAuditLogHandler retrieves a specific audit log by ID
func (ah *AuditHandlers) GetAuditLogHandler(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid audit log ID"})
		return
	}
	
	var log models.SecurityAuditLog
	err = db.DB.Preload("User").First(&log, uint(id)).Error
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Audit log not found"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"data": log,
	})
}

// ExportAuditLogsHandler exports audit logs
func (ah *AuditHandlers) ExportAuditLogsHandler(c *gin.Context) {
	// This would export audit logs to CSV or JSON format
	// For now, return a placeholder response
	c.JSON(http.StatusOK, gin.H{
		"message": "Audit logs export endpoint - implementation pending",
	})
}

// GetSecurityAlertsHandler returns security alerts based on audit logs
func (ah *AuditHandlers) GetSecurityAlertsHandler(c *gin.Context) {
	// Get recent high severity events
	filters := map[string]interface{}{
		"severity": "high",
	}
	
	logs, err := ah.auditManager.GetLogger().GetAuditLogs(filters, 20, 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch security alerts"})
		return
	}
	
	// Filter for recent events (last 24 hours)
	var alerts []models.SecurityAuditLog
	for _, log := range logs {
		// Check if log is from last 24 hours
		if log.CreatedAt.After(time.Now().Add(-24 * time.Hour)) {
			alerts = append(alerts, log)
		}
	}
	
	c.JSON(http.StatusOK, gin.H{
		"data": alerts,
		"count": len(alerts),
	})
}

// AuditTestHandler tests audit logging functionality
func (ah *AuditHandlers) AuditTestHandler(c *gin.Context) {
	testType := c.Query("type")
	
	switch testType {
	case "login_success":
		ah.auditManager.GetLogger().LogLoginSuccess(1, "127.0.0.1", "test-agent", "test-request", "test-session")
	case "login_failure":
		ah.auditManager.GetLogger().LogLoginFailure("testuser", "127.0.0.1", "test-agent", "test-request", map[string]string{"reason": "invalid_password"})
	case "file_upload":
		ah.auditManager.GetLogger().LogFileOperation("upload", 1, 1, "test.txt", "127.0.0.1", "test-agent", "test-request", "success")
	case "command_execute":
		ah.auditManager.GetLogger().LogCommandExecution(1, "ls", []string{"-la"}, 0, "127.0.0.1", "test-agent", "test-request")
	case "permission_denied":
		ah.auditManager.GetLogger().LogPermissionDenied(&[]uint{1}[0], "file", "delete", "127.0.0.1", "test-agent", "test-request")
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid test type. Use: login_success, login_failure, file_upload, command_execute, or permission_denied"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Audit test completed successfully",
		"test_type": testType,
	})
}
