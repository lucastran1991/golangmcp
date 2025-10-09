package handlers

import (
	"net/http"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
	"golangmcp/internal/services"
	"golangmcp/internal/models"
	"golangmcp/internal/db"
)

// ImageHandlers provides handlers for image processing
type ImageHandlers struct {
	processor *services.ImageProcessor
}

// NewImageHandlers creates new image handlers
func NewImageHandlers() *ImageHandlers {
	return &ImageHandlers{
		processor: services.NewImageProcessor(),
	}
}

// UploadOptimizedImageHandler handles optimized image uploads
func (ih *ImageHandlers) UploadOptimizedImageHandler(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Parse multipart form
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse multipart form"})
		return
	}
	defer form.RemoveAll()

	files := form.File["image"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No image file provided"})
		return
	}

	file := files[0]
	
	// Open uploaded file
	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open uploaded file"})
		return
	}
	defer src.Close()

	// Process image
	processedImg, err := ih.processor.ProcessImage(src, file)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Save optimized image
	uploadDir := "uploads/images"
	filePath, err := ih.processor.SaveImage(processedImg, uploadDir)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save optimized image"})
		return
	}

	// Create file record in database
	fileRecord := &models.File{
		Filename:     processedImg.Filename,
		OriginalName: processedImg.OriginalFilename,
		FileType:     "image",
		MimeType:     "image/" + processedImg.Format,
		Size:         processedImg.OptimizedSize,
		Path:         filePath,
		Hash:         ih.generateFileHash(processedImg.Data),
		UserID:       userID.(uint),
		IsPublic:     false,
		Description:  "Optimized image upload",
	}

	if err := models.CreateFile(db.DB, fileRecord); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file record"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Image uploaded and optimized successfully",
		"data": gin.H{
			"file_id":           fileRecord.ID,
			"filename":          processedImg.Filename,
			"original_filename": processedImg.OriginalFilename,
			"format":            processedImg.Format,
			"original_size":     processedImg.OriginalSize,
			"optimized_size":    processedImg.OptimizedSize,
			"compression_ratio": processedImg.CompressionRatio,
			"original_dimensions": gin.H{
				"width":  processedImg.OriginalWidth,
				"height": processedImg.OriginalHeight,
			},
			"optimized_dimensions": gin.H{
				"width":  processedImg.OptimizedWidth,
				"height": processedImg.OptimizedHeight,
			},
			"file_path": filePath,
		},
	})
}

// ValidateImageHandler validates an image without processing
func (ih *ImageHandlers) ValidateImageHandler(c *gin.Context) {
	// Parse multipart form
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse multipart form"})
		return
	}
	defer form.RemoveAll()

	files := form.File["image"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No image file provided"})
		return
	}

	file := files[0]
	
	// Open uploaded file
	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open uploaded file"})
		return
	}
	defer src.Close()

	// Validate image
	if err := ih.processor.ValidateImage(src, file); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Image validation successful",
		"data": gin.H{
			"filename":    file.Filename,
			"size":        file.Size,
			"content_type": file.Header.Get("Content-Type"),
		},
	})
}

// GetImageStatsHandler returns image processing statistics
func (ih *ImageHandlers) GetImageStatsHandler(c *gin.Context) {
	stats := ih.processor.GetImageStats()
	
	// Add database statistics
	var totalImages int64
	var totalSize int64
	var avgSize float64
	
	db.DB.Model(&models.File{}).Where("file_type = ?", "image").Count(&totalImages)
	db.DB.Model(&models.File{}).Where("file_type = ?", "image").Select("SUM(size)").Scan(&totalSize)
	
	if totalImages > 0 {
		avgSize = float64(totalSize) / float64(totalImages)
	}

	stats["database_stats"] = gin.H{
		"total_images": totalImages,
		"total_size":   totalSize,
		"avg_size":     avgSize,
	}

	c.JSON(http.StatusOK, gin.H{
		"data": stats,
	})
}

// UpdateImageSettingsHandler updates image processing settings
func (ih *ImageHandlers) UpdateImageSettingsHandler(c *gin.Context) {
	var request struct {
		MaxWidth    uint   `json:"max_width"`
		MaxHeight   uint   `json:"max_height"`
		Quality     int    `json:"quality"`
		MaxFileSize int64  `json:"max_file_size"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate settings
	if request.MaxWidth == 0 || request.MaxHeight == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Max width and height must be greater than 0"})
		return
	}
	if request.Quality < 1 || request.Quality > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Quality must be between 1 and 100"})
		return
	}
	if request.MaxFileSize <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Max file size must be greater than 0"})
		return
	}

	ih.processor.UpdateSettings(request.MaxWidth, request.MaxHeight, request.Quality, request.MaxFileSize)

	c.JSON(http.StatusOK, gin.H{
		"message": "Image processing settings updated successfully",
		"data": gin.H{
			"max_width":     request.MaxWidth,
			"max_height":    request.MaxHeight,
			"quality":       request.Quality,
			"max_file_size": request.MaxFileSize,
		},
	})
}

// GetImageFileHandler retrieves an image file
func (ih *ImageHandlers) GetImageFileHandler(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

	// Get file record
	file, err := models.GetFileByID(db.DB, uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	// Check if it's an image
	if file.FileType != "image" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File is not an image"})
		return
	}

	// Check if file exists
	if !fileExists(file.Path) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Image file not found on disk"})
		return
	}

	// Set appropriate headers
	c.Header("Content-Type", file.MimeType)
	c.Header("Content-Disposition", "inline; filename="+file.OriginalName)
	c.Header("Cache-Control", "public, max-age=3600")

	// Serve file
	c.File(file.Path)
}

// BatchOptimizeImagesHandler handles batch image optimization
func (ih *ImageHandlers) BatchOptimizeImagesHandler(c *gin.Context) {
	// This would handle multiple image uploads and optimization
	// Implementation would process multiple files in parallel
	c.JSON(http.StatusOK, gin.H{"message": "Batch image optimization endpoint - implementation pending"})
}

// generateFileHash generates a simple hash for the file
func (ih *ImageHandlers) generateFileHash(data []byte) string {
	// Simple hash implementation (in production, use crypto/sha256)
	hash := 0
	for _, b := range data {
		hash = hash*31 + int(b)
	}
	return strconv.Itoa(hash)
}

// fileExists checks if a file exists
func fileExists(path string) bool {
	_, err := filepath.Abs(path)
	return err == nil
}
