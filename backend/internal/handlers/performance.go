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

// PerformanceHandlers provides handlers for performance optimization features
type PerformanceHandlers struct {
	cacheService      *services.CacheService
	paginationService *services.PaginationService
	rateLimitManager  *services.RateLimitManager
	cacheManager      *services.CacheManager
}

// NewPerformanceHandlers creates new performance handlers
func NewPerformanceHandlers() *PerformanceHandlers {
	// Initialize services
	cacheService := services.NewCacheService(15 * time.Minute)
	paginationService := services.NewPaginationService(20, 100)
	rateLimitManager := services.NewRateLimitManager()
	cacheManager := services.NewCacheManager()
	
	// Set default rate limit configurations
	configs := services.DefaultRateLimitConfigs()
	for endpoint, config := range configs {
		rateLimitManager.SetConfig(endpoint, config.Limit, config.Window)
	}
	
	return &PerformanceHandlers{
		cacheService:      cacheService,
		paginationService: paginationService,
		rateLimitManager:  rateLimitManager,
		cacheManager:      cacheManager,
	}
}

// GetUsersWithCacheHandler retrieves users with caching
func (ph *PerformanceHandlers) GetUsersWithCacheHandler(c *gin.Context) {
	// Parse pagination
	pageStr := c.DefaultQuery("page", "1")
	pageSizeStr := c.DefaultQuery("page_size", "20")
	
	paginationReq := ph.paginationService.ParsePaginationRequest(pageStr, pageSizeStr)
	
	// Generate cache key
	cacheKey := ph.generateCacheKey("users", map[string]string{
		"page":      strconv.Itoa(paginationReq.Page),
		"page_size": strconv.Itoa(paginationReq.PageSize),
	})
	
	// Try to get from cache
	if cachedData, found := ph.cacheService.Get(cacheKey); found {
		c.JSON(http.StatusOK, cachedData)
		return
	}
	
	// Get from database
	users, err := models.GetAll(db.DB, paginationReq.Limit, paginationReq.Offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}
	
	// Get total count
	totalCount, err := models.Count(db.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user count"})
		return
	}
	
	// Create paginated response
	pagination := ph.paginationService.CalculatePagination(paginationReq, totalCount)
	response := gin.H{
		"data":       users,
		"pagination": pagination,
	}
	
	// Cache the response
	ph.cacheService.Set(cacheKey, response, 5*time.Minute)
	
	c.JSON(http.StatusOK, response)
}

// GetFilesWithCacheHandler retrieves files with caching
func (ph *PerformanceHandlers) GetFilesWithCacheHandler(c *gin.Context) {
	// Parse pagination
	pageStr := c.DefaultQuery("page", "1")
	pageSizeStr := c.DefaultQuery("page_size", "20")
	fileType := c.Query("type")
	userIDStr := c.Query("user_id")
	
	paginationReq := ph.paginationService.ParsePaginationRequest(pageStr, pageSizeStr)
	
	// Generate cache key
	cacheKey := ph.generateCacheKey("files", map[string]string{
		"page":      strconv.Itoa(paginationReq.Page),
		"page_size": strconv.Itoa(paginationReq.PageSize),
		"type":      fileType,
		"user_id":   userIDStr,
	})
	
	// Try to get from cache
	if cachedData, found := ph.cacheService.Get(cacheKey); found {
		c.JSON(http.StatusOK, cachedData)
		return
	}
	
	// Get from database
	var files []models.File
	var totalCount int64
	var err error
	
	if userIDStr != "" {
		userID, err := strconv.ParseUint(userIDStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			return
		}
		
		files, err = models.GetFilesByUser(db.DB, uint(userID), paginationReq.Limit, paginationReq.Offset)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch files"})
			return
		}
		
		// Get count for user files
		db.DB.Model(&models.File{}).Where("user_id = ?", uint(userID)).Count(&totalCount)
	} else {
		files, err = models.GetAllFiles(db.DB, paginationReq.Limit, paginationReq.Offset)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch files"})
			return
		}
		
		// Get total count
		db.DB.Model(&models.File{}).Count(&totalCount)
	}
	
	// Create paginated response
	pagination := ph.paginationService.CalculatePagination(paginationReq, totalCount)
	response := gin.H{
		"data":       files,
		"pagination": pagination,
	}
	
	// Cache the response
	ph.cacheService.Set(cacheKey, response, 2*time.Minute)
	
	c.JSON(http.StatusOK, response)
}

// GetCacheStatsHandler returns cache statistics
func (ph *PerformanceHandlers) GetCacheStatsHandler(c *gin.Context) {
	stats := ph.cacheService.GetStats()
	
	c.JSON(http.StatusOK, gin.H{
		"data": stats,
	})
}

// ClearCacheHandler clears the cache
func (ph *PerformanceHandlers) ClearCacheHandler(c *gin.Context) {
	ph.cacheService.Clear()
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Cache cleared successfully",
	})
}

// GetRateLimitStatsHandler returns rate limiting statistics
func (ph *PerformanceHandlers) GetRateLimitStatsHandler(c *gin.Context) {
	endpoint := c.Query("endpoint")
	key := c.Query("key")
	
	if endpoint == "" || key == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "endpoint and key parameters are required"})
		return
	}
	
	stats := ph.rateLimitManager.GetStats(endpoint, key)
	
	c.JSON(http.StatusOK, gin.H{
		"data": stats,
	})
}

// GetRateLimitConfigsHandler returns rate limiting configurations
func (ph *PerformanceHandlers) GetRateLimitConfigsHandler(c *gin.Context) {
	configs := ph.rateLimitManager.GetAllConfigs()
	
	c.JSON(http.StatusOK, gin.H{
		"data": configs,
	})
}

// UpdateRateLimitConfigHandler updates rate limiting configuration
func (ph *PerformanceHandlers) UpdateRateLimitConfigHandler(c *gin.Context) {
	var request struct {
		Endpoint string `json:"endpoint" binding:"required"`
		Limit    int    `json:"limit" binding:"required"`
		Window   string `json:"window" binding:"required"`
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	window, err := time.ParseDuration(request.Window)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid window duration"})
		return
	}
	
	ph.rateLimitManager.SetConfig(request.Endpoint, request.Limit, window)
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Rate limit configuration updated successfully",
		"data": gin.H{
			"endpoint": request.Endpoint,
			"limit":    request.Limit,
			"window":   request.Window,
		},
	})
}

// GetPaginationStatsHandler returns pagination statistics
func (ph *PerformanceHandlers) GetPaginationStatsHandler(c *gin.Context) {
	// This would return pagination usage statistics
	// For now, return basic configuration
	config := services.DefaultPaginationConfig()
	
	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"default_page_size": config.DefaultPageSize,
			"max_page_size":     config.MaxPageSize,
		},
	})
}

// PerformanceTestHandler tests performance optimization features
func (ph *PerformanceHandlers) PerformanceTestHandler(c *gin.Context) {
	testType := c.Query("type")
	
	switch testType {
	case "cache":
		ph.testCachePerformance(c)
	case "pagination":
		ph.testPaginationPerformance(c)
	case "rate_limit":
		ph.testRateLimitPerformance(c)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid test type. Use: cache, pagination, or rate_limit"})
	}
}

// testCachePerformance tests cache performance
func (ph *PerformanceHandlers) testCachePerformance(c *gin.Context) {
	start := time.Now()
	
	// Test cache operations
	for i := 0; i < 1000; i++ {
		key := "test_key_" + strconv.Itoa(i)
		ph.cacheService.Set(key, "test_value", time.Minute)
		ph.cacheService.Get(key)
	}
	
	duration := time.Since(start)
	
	c.JSON(http.StatusOK, gin.H{
		"test_type": "cache",
		"duration":  duration.String(),
		"operations": 2000, // 1000 sets + 1000 gets
		"ops_per_second": float64(2000) / duration.Seconds(),
	})
}

// testPaginationPerformance tests pagination performance
func (ph *PerformanceHandlers) testPaginationPerformance(c *gin.Context) {
	start := time.Now()
	
	// Test pagination calculations
	for i := 1; i <= 1000; i++ {
		req := &services.PaginationRequest{
			Page:     i,
			PageSize: 20,
			Offset:   (i - 1) * 20,
			Limit:    20,
		}
		ph.paginationService.CalculatePagination(req, 10000)
	}
	
	duration := time.Since(start)
	
	c.JSON(http.StatusOK, gin.H{
		"test_type": "pagination",
		"duration":  duration.String(),
		"operations": 1000,
		"ops_per_second": float64(1000) / duration.Seconds(),
	})
}

// testRateLimitPerformance tests rate limiting performance
func (ph *PerformanceHandlers) testRateLimitPerformance(c *gin.Context) {
	start := time.Now()
	
	// Test rate limiting operations
	for i := 0; i < 1000; i++ {
		key := "test_key_" + strconv.Itoa(i%100) // Use 100 different keys
		ph.rateLimitManager.Allow("api", key)
	}
	
	duration := time.Since(start)
	
	c.JSON(http.StatusOK, gin.H{
		"test_type": "rate_limit",
		"duration":  duration.String(),
		"operations": 1000,
		"ops_per_second": float64(1000) / duration.Seconds(),
	})
}

// generateCacheKey generates a cache key from parameters
func (ph *PerformanceHandlers) generateCacheKey(base string, params map[string]string) string {
	key := base
	for k, v := range params {
		if v != "" {
			key += ":" + k + "=" + v
		}
	}
	return key
}
