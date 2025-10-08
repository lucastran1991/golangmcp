package handlers

import (
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"golangmcp/internal/db"
	"golangmcp/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const (
	// File upload directories
	FileUploadDir = "uploads/files"
	MaxFileSizeFiles = 50 * 1024 * 1024 // 50MB
)

// Allowed file types
var AllowedFileTypes = map[string][]string{
	"txt":  {"text/plain"},
	"xlsx": {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
	"csv":  {"text/csv", "application/csv"},
}

// GetFilesHandler retrieves files with pagination and filtering
func GetFilesHandler(c *gin.Context) {
	userID, _ := c.Get("user_id")
	fileType := c.Query("type")
	search := c.Query("search")
	limitStr := c.DefaultQuery("limit", "20")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 0 {
		limit = 20
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	var files []models.File

	userIDUint := userID.(uint)
	if search != "" {
		// Search files
		files, err = models.SearchFiles(db.DB, search, &userIDUint, limit, offset)
	} else if fileType != "" {
		// Filter by type
		files, err = models.GetFilesByType(db.DB, fileType, limit, offset)
	} else {
		// Get user's files
		files, err = models.GetFilesByUser(db.DB, userIDUint, limit, offset)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve files",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    files,
		"pagination": gin.H{
			"limit":  limit,
			"offset": offset,
			"count":  len(files),
		},
	})
}

// GetFileHandler retrieves a specific file by ID
func GetFileHandler(c *gin.Context) {
	fileIDStr := c.Param("id")
	fileID, err := strconv.ParseUint(fileIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid file ID",
		})
		return
	}

	userID, _ := c.Get("user_id")
	userIDUint := userID.(uint)
	file, err := models.GetFileByID(db.DB, uint(fileID))
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "File not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to retrieve file",
				"details": err.Error(),
			})
		}
		return
	}

	// Check if user owns the file or file is public
	if file.UserID != userIDUint && !file.IsPublic {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Access denied",
		})
		return
	}

	// Log file access
	accessLog := &models.FileAccessLog{
		FileID:    file.ID,
		UserID:    userIDUint,
		Action:    "view",
		IPAddress: c.ClientIP(),
		UserAgent: c.GetHeader("User-Agent"),
	}
	models.LogFileAccess(db.DB, accessLog)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    file,
	})
}

// UploadFileHandler handles file uploads
func UploadFileHandler(c *gin.Context) {
	userID, _ := c.Get("user_id")
	userIDUint := userID.(uint)

	// Parse multipart form
	err := c.Request.ParseMultipartForm(MaxFileSize)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Failed to parse form",
			"details": err.Error(),
		})
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "No file provided",
		})
		return
	}
	defer file.Close()

	// Validate file size
	if header.Size > MaxFileSizeFiles {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "File too large",
			"max_size": MaxFileSizeFiles,
		})
		return
	}

	// Get file extension
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == "" {
		ext = ".txt" // Default for files without extension
	}
	ext = strings.TrimPrefix(ext, ".")

	// Validate file type
	_, exists := AllowedFileTypes[ext]
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "File type not allowed",
			"allowed_types": []string{"txt", "xlsx", "csv"},
		})
		return
	}

	// Read file content
	fileContent, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to read file",
		})
		return
	}

	// Calculate file hash
	hash := md5.Sum(fileContent)
	hashStr := hex.EncodeToString(hash[:])

	// Check if file already exists
	existingFile, err := models.GetFileByHash(db.DB, hashStr)
	if err == nil {
		// File already exists, return existing file info
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "File already exists",
			"data":    existingFile,
		})
		return
	}

	// Create upload directory if it doesn't exist
	err = os.MkdirAll(FileUploadDir, 0755)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create upload directory",
		})
		return
	}

	// Generate unique filename
	timestamp := time.Now().Unix()
	filename := fmt.Sprintf("%d_%s_%s", timestamp, hashStr[:8], header.Filename)
	filePath := filepath.Join(FileUploadDir, filename)

	// Save file to disk
	err = os.WriteFile(filePath, fileContent, 0644)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to save file",
		})
		return
	}

	// Get additional form data
	description := c.PostForm("description")
	tags := c.PostForm("tags")
	isPublic := c.PostForm("is_public") == "true"

	// Create file record
	newFile := &models.File{
		Filename:     filename,
		OriginalName: header.Filename,
		FileType:     ext,
		MimeType:     header.Header.Get("Content-Type"),
		Size:         header.Size,
		Path:         filePath,
		Hash:         hashStr,
		UserID:       userIDUint,
		IsPublic:     isPublic,
		Description:  description,
		Tags:         tags,
	}

	err = models.CreateFile(db.DB, newFile)
	if err != nil {
		// Clean up saved file
		os.Remove(filePath)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create file record",
			"details": err.Error(),
		})
		return
	}

	// Log file upload
	accessLog := &models.FileAccessLog{
		FileID:    newFile.ID,
		UserID:    userIDUint,
		Action:    "upload",
		IPAddress: c.ClientIP(),
		UserAgent: c.GetHeader("User-Agent"),
	}
	models.LogFileAccess(db.DB, accessLog)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "File uploaded successfully",
		"data":    newFile,
	})
}

// DownloadFileHandler handles file downloads
func DownloadFileHandler(c *gin.Context) {
	fileIDStr := c.Param("id")
	fileID, err := strconv.ParseUint(fileIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid file ID",
		})
		return
	}

	userID, _ := c.Get("user_id")
	userIDUint := userID.(uint)
	file, err := models.GetFileByID(db.DB, uint(fileID))
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "File not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to retrieve file",
			})
		}
		return
	}

	// Check if user owns the file or file is public
	if file.UserID != userIDUint && !file.IsPublic {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Access denied",
		})
		return
	}

	// Check if file exists on disk
	if _, err := os.Stat(file.Path); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "File not found on disk",
		})
		return
	}

	// Log file download
	accessLog := &models.FileAccessLog{
		FileID:    file.ID,
		UserID:    userIDUint,
		Action:    "download",
		IPAddress: c.ClientIP(),
		UserAgent: c.GetHeader("User-Agent"),
	}
	models.LogFileAccess(db.DB, accessLog)

	// Set headers for file download
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", file.OriginalName))
	c.Header("Content-Type", file.MimeType)
	c.Header("Content-Length", strconv.FormatInt(file.Size, 10))

	// Serve file
	c.File(file.Path)
}

// DeleteFileHandler handles file deletion
func DeleteFileHandler(c *gin.Context) {
	fileIDStr := c.Param("id")
	fileID, err := strconv.ParseUint(fileIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid file ID",
		})
		return
	}

	userID, _ := c.Get("user_id")
	userIDUint := userID.(uint)
	file, err := models.GetFileByID(db.DB, uint(fileID))
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "File not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to retrieve file",
			})
		}
		return
	}

	// Check if user owns the file
	if file.UserID != userIDUint {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Access denied",
		})
		return
	}

	// Delete file from disk
	if err := os.Remove(file.Path); err != nil {
		log.Printf("Warning: Failed to delete file from disk: %v", err)
	}

	// Delete file record
	err = models.DeleteFile(db.DB, uint(fileID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete file",
			"details": err.Error(),
		})
		return
	}

	// Log file deletion
	accessLog := &models.FileAccessLog{
		FileID:    file.ID,
		UserID:    userIDUint,
		Action:    "delete",
		IPAddress: c.ClientIP(),
		UserAgent: c.GetHeader("User-Agent"),
	}
	models.LogFileAccess(db.DB, accessLog)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "File deleted successfully",
	})
}

// GetFileStatsHandler returns file statistics
func GetFileStatsHandler(c *gin.Context) {
	stats, err := models.GetFileStats(db.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve file statistics",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// GetFileAccessLogsHandler returns file access logs
func GetFileAccessLogsHandler(c *gin.Context) {
	fileIDStr := c.Param("id")
	fileID, err := strconv.ParseUint(fileIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid file ID",
		})
		return
	}

	userID, _ := c.Get("user_id")
	userIDUint := userID.(uint)
	file, err := models.GetFileByID(db.DB, uint(fileID))
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "File not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to retrieve file",
			})
		}
		return
	}

	// Check if user owns the file
	if file.UserID != userIDUint {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Access denied",
		})
		return
	}

	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 0 {
		limit = 50
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	logs, err := models.GetFileAccessLogs(db.DB, uint(fileID), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve access logs",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    logs,
		"pagination": gin.H{
			"limit":  limit,
			"offset": offset,
			"count":  len(logs),
		},
	})
}
