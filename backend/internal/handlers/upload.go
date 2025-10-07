package handlers

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golangmcp/internal/db"
	"golangmcp/internal/models"
)

const (
	// Max file size: 5MB
	MaxFileSize = 5 * 1024 * 1024
	// Allowed image types
	AllowedImageTypes = "image/jpeg,image/png,image/gif,image/webp"
	// Upload directory
	UploadDir = "./uploads/avatars"
)

// UploadAvatarHandler handles avatar file upload
func UploadAvatarHandler(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get the uploaded file
	file, header, err := c.Request.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}
	defer file.Close()

	// Validate file
	if err := validateAvatarFile(file, header); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create upload directory if it doesn't exist
	if err := os.MkdirAll(UploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	// Generate unique filename
	ext := filepath.Ext(header.Filename)
	filename := fmt.Sprintf("avatar_%d_%d%s", userID, time.Now().Unix(), ext)
	filepath := filepath.Join(UploadDir, filename)

	// Save file
	if err := saveUploadedFile(file, filepath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Get current user
	var user models.User
	err = user.GetByID(db.DB, userID.(uint))
	if err != nil {
		// Clean up uploaded file if user not found
		os.Remove(filepath)
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Delete old avatar file if exists
	if user.Avatar != "" && strings.HasPrefix(user.Avatar, "/uploads/avatars/") {
		oldPath := strings.TrimPrefix(user.Avatar, "/")
		os.Remove(oldPath)
	}

	// Update user avatar path
	user.Avatar = fmt.Sprintf("/uploads/avatars/%s", filename)
	err = user.Update(db.DB)
	if err != nil {
		// Clean up uploaded file if database update fails
		os.Remove(filepath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update avatar"})
		return
	}

	// Clear password from response
	user.Password = ""

	c.JSON(http.StatusOK, gin.H{
		"message": "Avatar uploaded successfully",
		"user":    user,
		"avatar_url": fmt.Sprintf("http://localhost:8080/uploads/avatars/%s", filename),
	})
}

// DeleteAvatarHandler removes the user's avatar
func DeleteAvatarHandler(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get current user
	var user models.User
	err := user.GetByID(db.DB, userID.(uint))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Delete avatar file if exists
	if user.Avatar != "" && strings.HasPrefix(user.Avatar, "/uploads/avatars/") {
		filePath := strings.TrimPrefix(user.Avatar, "/")
		os.Remove(filePath)
	}

	// Clear avatar from user record
	user.Avatar = ""
	err = user.Update(db.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove avatar"})
		return
	}

	// Clear password from response
	user.Password = ""

	c.JSON(http.StatusOK, gin.H{
		"message": "Avatar removed successfully",
		"user":    user,
	})
}

// GetAvatarHandler serves avatar files
func GetAvatarHandler(c *gin.Context) {
	filename := c.Param("filename")
	if filename == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Filename required"})
		return
	}

	// Security check: ensure filename doesn't contain path traversal
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") || strings.Contains(filename, "\\") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid filename"})
		return
	}

	filepath := filepath.Join(UploadDir, filename)
	
	// Check if file exists
	if _, err := os.Stat(filepath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Avatar not found"})
		return
	}

	// Serve file
	c.File(filepath)
}

// validateAvatarFile validates the uploaded avatar file
func validateAvatarFile(file multipart.File, header *multipart.FileHeader) error {
	// Check file size
	if header.Size > MaxFileSize {
		return fmt.Errorf("file size exceeds maximum allowed size of %d bytes", MaxFileSize)
	}

	// Check file type
	contentType := header.Header.Get("Content-Type")
	if !strings.Contains(AllowedImageTypes, contentType) {
		return fmt.Errorf("invalid file type. Allowed types: %s", AllowedImageTypes)
	}

	// Read first few bytes to verify file type
	buffer := make([]byte, 512)
	_, err := file.Read(buffer)
	if err != nil {
		return fmt.Errorf("failed to read file")
	}

	// Reset file pointer
	file.Seek(0, 0)

	// Check file signature
	fileType := http.DetectContentType(buffer)
	if !strings.HasPrefix(fileType, "image/") {
		return fmt.Errorf("file is not a valid image")
	}

	return nil
}

// saveUploadedFile saves the uploaded file to disk
func saveUploadedFile(file multipart.File, filepath string) error {
	// Create destination file
	dst, err := os.Create(filepath)
	if err != nil {
		return err
	}
	defer dst.Close()

	// Copy file content
	_, err = io.Copy(dst, file)
	if err != nil {
		return err
	}

	return nil
}

// GetUploadStatsHandler returns upload statistics (admin only)
func GetUploadStatsHandler(c *gin.Context) {
	// Count total avatars
	var count int64
	db.DB.Model(&models.User{}).Where("avatar != ''").Count(&count)

	// Get upload directory size
	var totalSize int64
	err := filepath.Walk(UploadDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			totalSize += info.Size()
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate directory size"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"total_avatars": count,
		"total_size_bytes": totalSize,
		"total_size_mb": float64(totalSize) / (1024 * 1024),
		"max_file_size_mb": MaxFileSize / (1024 * 1024),
		"allowed_types": AllowedImageTypes,
	})
}
