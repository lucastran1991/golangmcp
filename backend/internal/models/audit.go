package models

import (
	"time"
	"gorm.io/gorm"
)

// SecurityAuditLog represents a security audit log entry
type SecurityAuditLog struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	UserID      *uint     `json:"user_id" gorm:"index:idx_audit_user_id"`
	User        *User     `json:"user" gorm:"foreignKey:UserID"`
	EventType   string    `json:"event_type" gorm:"not null;index:idx_audit_event_type"`
	EventAction string    `json:"event_action" gorm:"not null;index:idx_audit_event_action"`
	Resource    string    `json:"resource" gorm:"index:idx_audit_resource"`
	ResourceID  *uint     `json:"resource_id"`
	IPAddress   string    `json:"ip_address" gorm:"index:idx_audit_ip_address"`
	UserAgent   string    `json:"user_agent"`
	RequestID   string    `json:"request_id" gorm:"index:idx_audit_request_id"`
	SessionID   string    `json:"session_id" gorm:"index:idx_audit_session_id"`
	Details     string    `json:"details" gorm:"type:text"`
	Severity    string    `json:"severity" gorm:"not null;index:idx_audit_severity"` // low, medium, high, critical
	Status      string    `json:"status" gorm:"not null;index:idx_audit_status"`     // success, failure, error
	CreatedAt   time.Time `json:"created_at" gorm:"index:idx_audit_logs_created_at"`
}

// TableName returns the table name for the SecurityAuditLog model
func (SecurityAuditLog) TableName() string {
	return "security_audit_logs"
}

// AuditEvent represents different types of audit events
type AuditEvent struct {
	Type        string `json:"type"`
	Action      string `json:"action"`
	Description string `json:"description"`
	Severity    string `json:"severity"`
}

// GetAuditEvents returns predefined audit events
func GetAuditEvents() map[string]AuditEvent {
	return map[string]AuditEvent{
		"login_success": {
			Type:        "authentication",
			Action:      "login",
			Description: "User successfully logged in",
			Severity:    "low",
		},
		"login_failure": {
			Type:        "authentication",
			Action:      "login",
			Description: "User failed to log in",
			Severity:    "medium",
		},
		"logout": {
			Type:        "authentication",
			Action:      "logout",
			Description: "User logged out",
			Severity:    "low",
		},
		"register": {
			Type:        "authentication",
			Action:      "register",
			Description: "New user registered",
			Severity:    "low",
		},
		"password_change": {
			Type:        "authentication",
			Action:      "password_change",
			Description: "User changed password",
			Severity:    "medium",
		},
		"file_upload": {
			Type:        "file_operation",
			Action:      "upload",
			Description: "File uploaded",
			Severity:    "low",
		},
		"file_download": {
			Type:        "file_operation",
			Action:      "download",
			Description: "File downloaded",
			Severity:    "low",
		},
		"file_delete": {
			Type:        "file_operation",
			Action:      "delete",
			Description: "File deleted",
			Severity:    "medium",
		},
		"command_execute": {
			Type:        "command_execution",
			Action:      "execute",
			Description: "Command executed",
			Severity:    "high",
		},
		"permission_denied": {
			Type:        "authorization",
			Action:      "deny",
			Description: "Permission denied",
			Severity:    "high",
		},
		"rate_limit_exceeded": {
			Type:        "rate_limiting",
			Action:      "exceed",
			Description: "Rate limit exceeded",
			Severity:    "medium",
		},
		"csrf_token_invalid": {
			Type:        "security",
			Action:      "csrf_invalid",
			Description: "Invalid CSRF token",
			Severity:    "high",
		},
		"session_expired": {
			Type:        "session",
			Action:      "expire",
			Description: "Session expired",
			Severity:    "low",
		},
		"admin_action": {
			Type:        "admin",
			Action:      "action",
			Description: "Administrative action performed",
			Severity:    "medium",
		},
		"system_error": {
			Type:        "system",
			Action:      "error",
			Description: "System error occurred",
			Severity:    "high",
		},
	}
}

// CreateSecurityAuditLog creates a new security audit log entry
func CreateSecurityAuditLog(db *gorm.DB, log *SecurityAuditLog) error {
	return db.Create(log).Error
}

// GetSecurityAuditLogs retrieves security audit logs with filtering
func GetSecurityAuditLogs(db *gorm.DB, filters map[string]interface{}, limit, offset int) ([]SecurityAuditLog, error) {
	var logs []SecurityAuditLog
	query := db.Preload("User")
	
	// Apply filters
	if userID, exists := filters["user_id"]; exists {
		query = query.Where("user_id = ?", userID)
	}
	if eventType, exists := filters["event_type"]; exists {
		query = query.Where("event_type = ?", eventType)
	}
	if severity, exists := filters["severity"]; exists {
		query = query.Where("severity = ?", severity)
	}
	if status, exists := filters["status"]; exists {
		query = query.Where("status = ?", status)
	}
	if ipAddress, exists := filters["ip_address"]; exists {
		query = query.Where("ip_address = ?", ipAddress)
	}
	if startDate, exists := filters["start_date"]; exists {
		query = query.Where("created_at >= ?", startDate)
	}
	if endDate, exists := filters["end_date"]; exists {
		query = query.Where("created_at <= ?", endDate)
	}
	
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}
	
	err := query.Order("created_at DESC").Find(&logs).Error
	return logs, err
}

// GetSecurityAuditStats returns security audit statistics
func GetSecurityAuditStats(db *gorm.DB) (map[string]interface{}, error) {
	stats := make(map[string]interface{})
	
	// Total logs
	var totalLogs int64
	err := db.Model(&SecurityAuditLog{}).Count(&totalLogs).Error
	if err != nil {
		return nil, err
	}
	stats["total_logs"] = totalLogs
	
	// Logs by severity
	var severityStats []struct {
		Severity string
		Count    int64
	}
	err = db.Model(&SecurityAuditLog{}).Select("severity, COUNT(*) as count").Group("severity").Scan(&severityStats).Error
	if err != nil {
		return nil, err
	}
	stats["by_severity"] = severityStats
	
	// Logs by event type
	var eventTypeStats []struct {
		EventType string
		Count     int64
	}
	err = db.Model(&SecurityAuditLog{}).Select("event_type, COUNT(*) as count").Group("event_type").Scan(&eventTypeStats).Error
	if err != nil {
		return nil, err
	}
	stats["by_event_type"] = eventTypeStats
	
	// Logs by status
	var statusStats []struct {
		Status string
		Count  int64
	}
	err = db.Model(&SecurityAuditLog{}).Select("status, COUNT(*) as count").Group("status").Scan(&statusStats).Error
	if err != nil {
		return nil, err
	}
	stats["by_status"] = statusStats
	
	// Recent high severity events
	var recentHighSeverity []SecurityAuditLog
	err = db.Where("severity IN ?", []string{"high", "critical"}).
		Order("created_at DESC").
		Limit(10).
		Find(&recentHighSeverity).Error
	if err != nil {
		return nil, err
	}
	stats["recent_high_severity"] = recentHighSeverity
	
	return stats, nil
}

// CleanupOldAuditLogs removes old audit logs
func CleanupOldAuditLogs(db *gorm.DB, olderThanDays int) error {
	cutoffDate := time.Now().AddDate(0, 0, -olderThanDays)
	result := db.Where("created_at < ?", cutoffDate).Delete(&SecurityAuditLog{})
	return result.Error
}
