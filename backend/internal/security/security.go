package security

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// RateLimiter represents a rate limiter
type RateLimiter struct {
	requests map[string][]time.Time
	mutex    sync.RWMutex
	limit    int
	window   time.Duration
}

// SecurityConfig represents security configuration
type SecurityConfig struct {
	RateLimitPerMinute int
	MaxRequestSize     int64
	EnableCORS         bool
	EnableCSRF         bool
	EnableXSSProtection bool
	EnableHSTS         bool
	AllowedOrigins     []string
	TrustedProxies     []string
}

// SecurityHeaders represents security headers
type SecurityHeaders struct {
	XSSProtection       string
	ContentTypeOptions  string
	FrameOptions        string
	ReferrerPolicy      string
	PermissionsPolicy   string
	StrictTransportSecurity string
	ContentSecurityPolicy string
}

// CSRFProtection represents CSRF protection
type CSRFProtection struct {
	tokens map[string]string
	mutex  sync.RWMutex
}

var (
	// Default security configuration
	DefaultSecurityConfig = SecurityConfig{
		RateLimitPerMinute: 120,
		MaxRequestSize:     10 * 1024 * 1024, // 10MB
		EnableCORS:         true,
		EnableCSRF:         true,
		EnableXSSProtection: true,
		EnableHSTS:         true,
		AllowedOrigins:     []string{"http://localhost:3000", "http://localhost:8080"},
		TrustedProxies:     []string{"127.0.0.1", "::1"},
	}

	// Default security headers
	DefaultSecurityHeaders = SecurityHeaders{
		XSSProtection:       "1; mode=block",
		ContentTypeOptions:  "nosniff",
		FrameOptions:        "DENY",
		ReferrerPolicy:      "strict-origin-when-cross-origin",
		PermissionsPolicy:   "geolocation=(), microphone=(), camera=()",
		StrictTransportSecurity: "max-age=31536000; includeSubDomains",
		ContentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';",
	}

	// Global instances
	GlobalRateLimiter = NewRateLimiter(DefaultSecurityConfig.RateLimitPerMinute, time.Minute)
	GlobalCSRFProtection = NewCSRFProtection()
)

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		requests: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
	}
}

// NewCSRFProtection creates a new CSRF protection
func NewCSRFProtection() *CSRFProtection {
	return &CSRFProtection{
		tokens: make(map[string]string),
	}
}

// RateLimitMiddleware implements rate limiting
func RateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		clientIP := c.ClientIP()
		
		if !GlobalRateLimiter.Allow(clientIP) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded",
				"retry_after": 60,
			})
			c.Abort()
			return
		}
		
		c.Next()
	}
}

// Allow checks if a request is allowed based on rate limiting
func (rl *RateLimiter) Allow(clientIP string) bool {
	rl.mutex.Lock()
	defer rl.mutex.Unlock()

	now := time.Now()
	cutoff := now.Add(-rl.window)

	// Clean old requests
	if requests, exists := rl.requests[clientIP]; exists {
		var validRequests []time.Time
		for _, reqTime := range requests {
			if reqTime.After(cutoff) {
				validRequests = append(validRequests, reqTime)
			}
		}
		rl.requests[clientIP] = validRequests
	}

	// Check if limit exceeded
	if len(rl.requests[clientIP]) >= rl.limit {
		return false
	}

	// Add current request
	rl.requests[clientIP] = append(rl.requests[clientIP], now)
	return true
}

// SecurityHeadersMiddleware adds security headers
func SecurityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		headers := DefaultSecurityHeaders
		
		c.Header("X-XSS-Protection", headers.XSSProtection)
		c.Header("X-Content-Type-Options", headers.ContentTypeOptions)
		c.Header("X-Frame-Options", headers.FrameOptions)
		c.Header("Referrer-Policy", headers.ReferrerPolicy)
		c.Header("Permissions-Policy", headers.PermissionsPolicy)
		c.Header("Content-Security-Policy", headers.ContentSecurityPolicy)
		
		// Add HSTS header for HTTPS
		if c.Request.TLS != nil {
			c.Header("Strict-Transport-Security", headers.StrictTransportSecurity)
		}
		
		c.Next()
	}
}

// CORSMiddleware implements CORS
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		
		// Check if origin is allowed
		allowed := false
		for _, allowedOrigin := range DefaultSecurityConfig.AllowedOrigins {
			if origin == allowedOrigin {
				allowed = true
				break
			}
		}
		
		if allowed {
			c.Header("Access-Control-Allow-Origin", origin)
		}
		
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-CSRF-Token")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Max-Age", "86400")
		
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		
		c.Next()
	}
}

// CSRFMiddleware implements CSRF protection
func CSRFMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip CSRF for safe methods
		if c.Request.Method == "GET" || c.Request.Method == "HEAD" || c.Request.Method == "OPTIONS" {
			c.Next()
			return
		}
		
		// Get CSRF token from header or form
		token := c.GetHeader("X-CSRF-Token")
		if token == "" {
			token = c.PostForm("csrf_token")
		}
		
		if token == "" {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "CSRF token missing",
			})
			c.Abort()
			return
		}
		
		// Validate CSRF token
		if !GlobalCSRFProtection.ValidateToken(c.ClientIP(), token) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Invalid CSRF token",
			})
			c.Abort()
			return
		}
		
		c.Next()
	}
}

// GenerateCSRFToken generates a CSRF token for a client
func (csrf *CSRFProtection) GenerateToken(clientIP string) string {
	csrf.mutex.Lock()
	defer csrf.mutex.Unlock()
	
	token := generateRandomToken()
	csrf.tokens[clientIP] = token
	
	// For localhost development, also store for other localhost variations
	if clientIP == "127.0.0.1" || clientIP == "::1" || clientIP == "localhost" {
		csrf.tokens["127.0.0.1"] = token
		csrf.tokens["::1"] = token
		csrf.tokens["localhost"] = token
	}
	
	return token
}

// ValidateToken validates a CSRF token
func (csrf *CSRFProtection) ValidateToken(clientIP, token string) bool {
	csrf.mutex.RLock()
	defer csrf.mutex.RUnlock()
	
	// For localhost development, be more flexible with IP matching
	if clientIP == "127.0.0.1" || clientIP == "::1" || clientIP == "localhost" {
		// Check all localhost variations
		for ip := range csrf.tokens {
			if ip == "127.0.0.1" || ip == "::1" || ip == "localhost" {
				if csrf.tokens[ip] == token {
					return true
				}
			}
		}
	}
	
	storedToken, exists := csrf.tokens[clientIP]
	return exists && storedToken == token
}

// RequestSizeMiddleware limits request size
func RequestSizeMiddleware(maxSize int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.ContentLength > maxSize {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{
				"error": "Request too large",
				"max_size": maxSize,
			})
			c.Abort()
			return
		}
		
		c.Next()
	}
}

// IPWhitelistMiddleware implements IP whitelisting
func IPWhitelistMiddleware(allowedIPs []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		clientIP := c.ClientIP()
		
		allowed := false
		for _, ip := range allowedIPs {
			if clientIP == ip {
				allowed = true
				break
			}
		}
		
		if !allowed {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "IP not allowed",
			})
			c.Abort()
			return
		}
		
		c.Next()
	}
}

// InputSanitizationMiddleware sanitizes input
func InputSanitizationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Sanitize query parameters
		for key, values := range c.Request.URL.Query() {
			for i, value := range values {
				values[i] = sanitizeInput(value)
			}
			c.Request.URL.RawQuery = strings.ReplaceAll(c.Request.URL.RawQuery, key+"="+values[0], key+"="+sanitizeInput(values[0]))
		}
		
		c.Next()
	}
}

// AuditLogMiddleware logs security events
func AuditLogMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		
		c.Next()
		
		// Log security events
		duration := time.Since(start)
		clientIP := c.ClientIP()
		userAgent := c.GetHeader("User-Agent")
		method := c.Request.Method
		path := c.Request.URL.Path
		status := c.Writer.Status()
		
		// Log suspicious activities
		if status == http.StatusForbidden || status == http.StatusUnauthorized || status == http.StatusTooManyRequests {
			logSecurityEvent(clientIP, userAgent, method, path, status, duration)
		}
	}
}

// generateRandomToken generates a random token
func generateRandomToken() string {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// sanitizeInput sanitizes user input
func sanitizeInput(input string) string {
	// Remove potentially dangerous characters
	input = strings.ReplaceAll(input, "<", "&lt;")
	input = strings.ReplaceAll(input, ">", "&gt;")
	input = strings.ReplaceAll(input, "\"", "&quot;")
	input = strings.ReplaceAll(input, "'", "&#x27;")
	input = strings.ReplaceAll(input, "&", "&amp;")
	
	// Remove script tags
	input = strings.ReplaceAll(input, "<script", "")
	input = strings.ReplaceAll(input, "</script>", "")
	
	return input
}

// logSecurityEvent logs security events
func logSecurityEvent(clientIP, userAgent, method, path string, status int, duration time.Duration) {
	// In a real application, you would log to a security monitoring system
	fmt.Printf("[SECURITY] %s - %s %s %s %d %v\n", clientIP, method, path, userAgent, status, duration)
}

// GetSecurityStatus returns current security status
func GetSecurityStatus() map[string]interface{} {
	return map[string]interface{}{
		"rate_limiting": map[string]interface{}{
			"enabled": true,
			"limit_per_minute": DefaultSecurityConfig.RateLimitPerMinute,
		},
		"cors": map[string]interface{}{
			"enabled": DefaultSecurityConfig.EnableCORS,
			"allowed_origins": DefaultSecurityConfig.AllowedOrigins,
		},
		"csrf": map[string]interface{}{
			"enabled": DefaultSecurityConfig.EnableCSRF,
		},
		"headers": map[string]interface{}{
			"xss_protection": DefaultSecurityConfig.EnableXSSProtection,
			"hsts": DefaultSecurityConfig.EnableHSTS,
		},
		"request_limits": map[string]interface{}{
			"max_size_mb": DefaultSecurityConfig.MaxRequestSize / (1024 * 1024),
		},
	}
}
