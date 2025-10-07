package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golangmcp/internal/security"
)

// GetSecurityStatusHandler returns current security status
func GetSecurityStatusHandler(c *gin.Context) {
	status := security.GetSecurityStatus()
	c.JSON(http.StatusOK, gin.H{
		"security_status": status,
		"timestamp": time.Now(),
	})
}

// GetCSRFTokenHandler generates a CSRF token
func GetCSRFTokenHandler(c *gin.Context) {
	clientIP := c.ClientIP()
	token := security.GlobalCSRFProtection.GenerateToken(clientIP)
	
	c.JSON(http.StatusOK, gin.H{
		"csrf_token": token,
		"expires_in": 3600, // 1 hour
	})
}

// ValidateCSRFTokenHandler validates a CSRF token
func ValidateCSRFTokenHandler(c *gin.Context) {
	var req struct {
		Token string `json:"token" binding:"required"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	clientIP := c.ClientIP()
	valid := security.GlobalCSRFProtection.ValidateToken(clientIP, req.Token)
	
	c.JSON(http.StatusOK, gin.H{
		"valid": valid,
		"token": req.Token,
	})
}

// GetRateLimitStatusHandler returns rate limit status for a client
func GetRateLimitStatusHandler(c *gin.Context) {
	clientIP := c.ClientIP()
	
	// Get current rate limit info (simplified)
	c.JSON(http.StatusOK, gin.H{
		"client_ip": clientIP,
		"rate_limit": gin.H{
			"limit_per_minute": security.DefaultSecurityConfig.RateLimitPerMinute,
			"window_seconds": 60,
		},
		"timestamp": time.Now(),
	})
}

// GetSecurityHeadersHandler returns current security headers configuration
func GetSecurityHeadersHandler(c *gin.Context) {
	headers := security.DefaultSecurityHeaders
	
	c.JSON(http.StatusOK, gin.H{
		"security_headers": gin.H{
			"xss_protection": headers.XSSProtection,
			"content_type_options": headers.ContentTypeOptions,
			"frame_options": headers.FrameOptions,
			"referrer_policy": headers.ReferrerPolicy,
			"permissions_policy": headers.PermissionsPolicy,
			"content_security_policy": headers.ContentSecurityPolicy,
			"strict_transport_security": headers.StrictTransportSecurity,
		},
		"timestamp": time.Now(),
	})
}

// UpdateSecurityConfigHandler updates security configuration (Admin only)
func UpdateSecurityConfigHandler(c *gin.Context) {
	var req struct {
		RateLimitPerMinute *int     `json:"rate_limit_per_minute"`
		MaxRequestSize     *int64   `json:"max_request_size"`
		EnableCORS         *bool    `json:"enable_cors"`
		EnableCSRF         *bool    `json:"enable_csrf"`
		EnableXSSProtection *bool   `json:"enable_xss_protection"`
		EnableHSTS         *bool    `json:"enable_hsts"`
		AllowedOrigins     []string `json:"allowed_origins"`
		TrustedProxies     []string `json:"trusted_proxies"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Update configuration
	if req.RateLimitPerMinute != nil {
		security.DefaultSecurityConfig.RateLimitPerMinute = *req.RateLimitPerMinute
		// Update rate limiter
		security.GlobalRateLimiter = security.NewRateLimiter(*req.RateLimitPerMinute, time.Minute)
	}
	
	if req.MaxRequestSize != nil {
		security.DefaultSecurityConfig.MaxRequestSize = *req.MaxRequestSize
	}
	
	if req.EnableCORS != nil {
		security.DefaultSecurityConfig.EnableCORS = *req.EnableCORS
	}
	
	if req.EnableCSRF != nil {
		security.DefaultSecurityConfig.EnableCSRF = *req.EnableCSRF
	}
	
	if req.EnableXSSProtection != nil {
		security.DefaultSecurityConfig.EnableXSSProtection = *req.EnableXSSProtection
	}
	
	if req.EnableHSTS != nil {
		security.DefaultSecurityConfig.EnableHSTS = *req.EnableHSTS
	}
	
	if req.AllowedOrigins != nil {
		security.DefaultSecurityConfig.AllowedOrigins = req.AllowedOrigins
	}
	
	if req.TrustedProxies != nil {
		security.DefaultSecurityConfig.TrustedProxies = req.TrustedProxies
	}
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Security configuration updated successfully",
		"config": security.DefaultSecurityConfig,
	})
}

// GetSecurityLogsHandler returns security logs (Admin only)
func GetSecurityLogsHandler(c *gin.Context) {
	// In a real application, you would retrieve logs from a logging system
	// For now, return a placeholder response
	
	logs := []gin.H{
		{
			"timestamp": time.Now().Add(-time.Hour),
			"event": "rate_limit_exceeded",
			"client_ip": "192.168.1.100",
			"user_agent": "Mozilla/5.0...",
			"path": "/api/users",
			"method": "GET",
		},
		{
			"timestamp": time.Now().Add(-2 * time.Hour),
			"event": "invalid_csrf_token",
			"client_ip": "192.168.1.101",
			"user_agent": "Mozilla/5.0...",
			"path": "/api/profile",
			"method": "PUT",
		},
		{
			"timestamp": time.Now().Add(-3 * time.Hour),
			"event": "suspicious_request",
			"client_ip": "192.168.1.102",
			"user_agent": "curl/7.68.0",
			"path": "/api/admin/users",
			"method": "DELETE",
		},
	}
	
	c.JSON(http.StatusOK, gin.H{
		"security_logs": logs,
		"total_logs": len(logs),
		"timestamp": time.Now(),
	})
}

// TestSecurityFeaturesHandler tests security features
func TestSecurityFeaturesHandler(c *gin.Context) {
	testType := c.Query("type")
	
	switch testType {
	case "rate_limit":
		// This endpoint can be used to test rate limiting
		c.JSON(http.StatusOK, gin.H{
			"message": "Rate limit test endpoint",
			"client_ip": c.ClientIP(),
			"timestamp": time.Now(),
		})
		
	case "csrf":
		// Test CSRF protection
		c.JSON(http.StatusOK, gin.H{
			"message": "CSRF test endpoint",
			"csrf_token": security.GlobalCSRFProtection.GenerateToken(c.ClientIP()),
			"timestamp": time.Now(),
		})
		
	case "headers":
		// Test security headers
		c.JSON(http.StatusOK, gin.H{
			"message": "Security headers test endpoint",
			"headers": c.Request.Header,
			"timestamp": time.Now(),
		})
		
	case "input_sanitization":
		// Test input sanitization
		input := c.Query("input")
		c.JSON(http.StatusOK, gin.H{
			"message": "Input sanitization test",
			"original_input": input,
			"sanitized_input": sanitizeTestInput(input),
			"timestamp": time.Now(),
		})
		
	default:
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid test type. Use: rate_limit, csrf, headers, or input_sanitization",
		})
	}
}

// sanitizeTestInput sanitizes test input
func sanitizeTestInput(input string) string {
	// Simple sanitization for testing
	result := input
	result = strings.ReplaceAll(result, "<", "&lt;")
	result = strings.ReplaceAll(result, ">", "&gt;")
	result = strings.ReplaceAll(result, "\"", "&quot;")
	result = strings.ReplaceAll(result, "'", "&#x27;")
	result = strings.ReplaceAll(result, "&", "&amp;")
	return result
}

// GetSecurityMetricsHandler returns security metrics
func GetSecurityMetricsHandler(c *gin.Context) {
	// In a real application, you would collect metrics from monitoring systems
	metrics := gin.H{
		"rate_limit_hits": 150,
		"csrf_violations": 5,
		"blocked_requests": 25,
		"suspicious_activities": 8,
		"security_events_last_24h": 188,
		"top_blocked_ips": []gin.H{
			{"ip": "192.168.1.100", "count": 45},
			{"ip": "192.168.1.101", "count": 32},
			{"ip": "192.168.1.102", "count": 28},
		},
		"security_score": 85,
		"last_updated": time.Now(),
	}
	
	c.JSON(http.StatusOK, gin.H{
		"security_metrics": metrics,
		"timestamp": time.Now(),
	})
}
