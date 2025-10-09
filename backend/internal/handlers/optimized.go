package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"golangmcp/internal/models"
	"golangmcp/internal/db"
)

// OptimizedHandlers provides optimized handlers for better performance
type OptimizedHandlers struct {
	queryBuilder *models.OptimizedQueryBuilder
}

// NewOptimizedHandlers creates new optimized handlers
func NewOptimizedHandlers() *OptimizedHandlers {
	return &OptimizedHandlers{
		queryBuilder: models.NewOptimizedQueryBuilder(db.DB),
	}
}

// GetUsersOptimizedHandler handles optimized user retrieval
func (oh *OptimizedHandlers) GetUsersOptimizedHandler(c *gin.Context) {
	// Parse query parameters
	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")
	role := c.Query("role")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 50
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	// Use optimized query
	users, err := oh.queryBuilder.GetUsersWithOptimizedQuery(limit, offset, role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": users,
		"pagination": gin.H{
			"limit":  limit,
			"offset": offset,
			"count":  len(users),
		},
	})
}

// GetFilesOptimizedHandler handles optimized file retrieval
func (oh *OptimizedHandlers) GetFilesOptimizedHandler(c *gin.Context) {
	// Parse query parameters
	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")
	fileType := c.Query("type")
	userIDStr := c.Query("user_id")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 50
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	var userID *uint
	if userIDStr != "" {
		if id, err := strconv.ParseUint(userIDStr, 10, 32); err == nil {
			uid := uint(id)
			userID = &uid
		}
	}

	// Use optimized query
	files, err := oh.queryBuilder.GetFilesWithOptimizedQuery(limit, offset, fileType, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch files"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": files,
		"pagination": gin.H{
			"limit":  limit,
			"offset": offset,
			"count":  len(files),
		},
	})
}

// SearchFilesOptimizedHandler handles optimized file search
func (oh *OptimizedHandlers) SearchFilesOptimizedHandler(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Search query is required"})
		return
	}

	limitStr := c.DefaultQuery("limit", "20")
	offsetStr := c.DefaultQuery("offset", "0")
	userIDStr := c.Query("user_id")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 20
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	var userID *uint
	if userIDStr != "" {
		if id, err := strconv.ParseUint(userIDStr, 10, 32); err == nil {
			uid := uint(id)
			userID = &uid
		}
	}

	// Use optimized search
	files, err := oh.queryBuilder.SearchFilesOptimized(query, userID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search files"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": files,
		"query": query,
		"pagination": gin.H{
			"limit":  limit,
			"offset": offset,
			"count":  len(files),
		},
	})
}

// GetFileStatsOptimizedHandler handles optimized file statistics
func (oh *OptimizedHandlers) GetFileStatsOptimizedHandler(c *gin.Context) {
	stats, err := oh.queryBuilder.GetFileStatsOptimized()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch file statistics"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": stats,
	})
}

// GetFileAccessLogsOptimizedHandler handles optimized file access logs
func (oh *OptimizedHandlers) GetFileAccessLogsOptimizedHandler(c *gin.Context) {
	fileIDStr := c.Param("id")
	fileID, err := strconv.ParseUint(fileIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

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

	logs, err := oh.queryBuilder.GetFileAccessLogsOptimized(uint(fileID), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch file access logs"})
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

// BatchUploadFilesHandler handles batch file uploads for better performance
func (oh *OptimizedHandlers) BatchUploadFilesHandler(c *gin.Context) {
	// This would handle multiple file uploads in a single request
	// Implementation would parse multipart form and process files in batches
	c.JSON(http.StatusOK, gin.H{"message": "Batch upload endpoint - implementation pending"})
}

// GetDatabasePerformanceStatsHandler returns database performance statistics
func (oh *OptimizedHandlers) GetDatabasePerformanceStatsHandler(c *gin.Context) {
	optimizer := models.NewDatabaseOptimizer(db.DB)
	stats, err := optimizer.GetQueryPerformanceStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch performance stats"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": stats,
	})
}

// CleanupOldDataHandler handles cleanup of old data
func (oh *OptimizedHandlers) CleanupOldDataHandler(c *gin.Context) {
	optimizer := models.NewDatabaseOptimizer(db.DB)
	err := optimizer.CleanupOldData()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cleanup old data"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Old data cleanup completed successfully"})
}
