package handlers

import (
	"crypto/md5"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// FileUpload represents a file upload record
type FileUpload struct {
	ID          uint      `json:"id"`
	UserID      uint      `json:"user_id"`
	Filename    string    `json:"filename"`
	OriginalName string   `json:"original_name"`
	FilePath    string    `json:"file_path"`
	FileSize    int64     `json:"file_size"`
	MimeType    string    `json:"mime_type"`
	MD5Hash     string    `json:"md5_hash"`
	SHA256Hash  string    `json:"sha256_hash"`
	IsScanned   bool      `json:"is_scanned"`
	IsSafe      bool      `json:"is_safe"`
	UploadedAt  time.Time `json:"uploaded_at"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
}

// UploadRequest represents a file upload request
type UploadRequest struct {
	FileType    string `form:"file_type" binding:"required"`    // avatar, document, image
	Description string `form:"description"`
	ExpiresIn   int    `form:"expires_in"` // hours, 0 = never expires
}

// FileValidationResult represents file validation result
type FileValidationResult struct {
	IsValid     bool     `json:"is_valid"`
	Errors      []string `json:"errors"`
	Warnings    []string `json:"warnings"`
	FileInfo    FileInfo `json:"file_info"`
}

// FileInfo represents file information
type FileInfo struct {
	Size        int64  `json:"size"`
	MimeType    string `json:"mime_type"`
	Extension   string `json:"extension"`
	MD5Hash     string `json:"md5_hash"`
	SHA256Hash  string `json:"sha256_hash"`
	IsExecutable bool  `json:"is_executable"`
}

const (
	// File size limits by type
	MaxAvatarSize    = 5 * 1024 * 1024   // 5MB
	MaxImageSize     = 10 * 1024 * 1024  // 10MB
	MaxDocumentSize  = 50 * 1024 * 1024  // 50MB
	
	// Allowed file types
	AllowedImageTypesSecure    = "image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
	AllowedDocumentTypes = "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
	
	// Upload directories
	AvatarDirSecure    = "./uploads/avatars"
	ImageDir     = "./uploads/images"
	DocumentDir  = "./uploads/documents"
	QuarantineDir = "./uploads/quarantine"
)

// SecureUploadHandler handles secure file uploads
func SecureUploadHandler(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req UploadRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get the uploaded file
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}
	defer file.Close()

	// Validate file
	validation := validateSecureFile(file, header, req.FileType)
	if !validation.IsValid {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "File validation failed",
			"details": validation.Errors,
			"warnings": validation.Warnings,
		})
		return
	}

	// Create appropriate upload directory
	uploadDir := getUploadDirectory(req.FileType)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	// Generate secure filename
	filename := generateSecureFilename(header.Filename, userID.(uint))
	filepath := filepath.Join(uploadDir, filename)

	// Save file
	if err := saveSecureFile(file, filepath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Calculate expiration time
	var expiresAt *time.Time
	if req.ExpiresIn > 0 {
		exp := time.Now().Add(time.Duration(req.ExpiresIn) * time.Hour)
		expiresAt = &exp
	}

	// Create file upload record
	fileUpload := FileUpload{
		UserID:       userID.(uint),
		Filename:     filename,
		OriginalName: header.Filename,
		FilePath:     filepath,
		FileSize:     header.Size,
		MimeType:     header.Header.Get("Content-Type"),
		MD5Hash:      validation.FileInfo.MD5Hash,
		SHA256Hash:   validation.FileInfo.SHA256Hash,
		IsScanned:    false, // Will be scanned by background process
		IsSafe:       false, // Assume unsafe until scanned
		UploadedAt:   time.Now(),
		ExpiresAt:    expiresAt,
	}

	// Save to database (you would need to create a FileUpload model)
	// For now, we'll just return the file info
	c.JSON(http.StatusOK, gin.H{
		"message": "File uploaded successfully",
		"file":    fileUpload,
		"url":     fmt.Sprintf("/uploads/%s/%s", req.FileType, filename),
	})
}

// validateSecureFile validates uploaded file for security
func validateSecureFile(file multipart.File, header *multipart.FileHeader, fileType string) FileValidationResult {
	result := FileValidationResult{
		IsValid:  true,
		Errors:   []string{},
		Warnings: []string{},
	}

	// Check file size based on type
	maxSize := getMaxFileSize(fileType)
	if header.Size > maxSize {
		result.IsValid = false
		result.Errors = append(result.Errors, fmt.Sprintf("File size exceeds maximum allowed size of %d bytes", maxSize))
	}

	// Check file type
	contentType := header.Header.Get("Content-Type")
	if !isAllowedFileType(contentType, fileType) {
		result.IsValid = false
		result.Errors = append(result.Errors, fmt.Sprintf("File type %s is not allowed for %s uploads", contentType, fileType))
	}

	// Read file content for analysis
	content, err := io.ReadAll(file)
	if err != nil {
		result.IsValid = false
		result.Errors = append(result.Errors, "Failed to read file content")
		return result
	}

	// Reset file pointer
	file.Seek(0, 0)

	// Calculate hashes
	md5Hash := md5.Sum(content)
	sha256Hash := sha256.Sum256(content)

	// Check for executable content
	isExecutable := containsExecutableContent(content)

	result.FileInfo = FileInfo{
		Size:         header.Size,
		MimeType:     contentType,
		Extension:    strings.ToLower(filepath.Ext(header.Filename)),
		MD5Hash:      hex.EncodeToString(md5Hash[:]),
		SHA256Hash:   hex.EncodeToString(sha256Hash[:]),
		IsExecutable: isExecutable,
	}

	// Additional security checks
	if isExecutable {
		result.IsValid = false
		result.Errors = append(result.Errors, "File contains executable content")
	}

	// Check for suspicious patterns
	if containsSuspiciousPatterns(content) {
		result.Warnings = append(result.Warnings, "File contains potentially suspicious patterns")
	}

	// Check file extension matches MIME type
	if !isValidMimeTypeExtension(contentType, header.Filename) {
		result.Warnings = append(result.Warnings, "File extension doesn't match MIME type")
	}

	return result
}

// getMaxFileSize returns maximum file size for file type
func getMaxFileSize(fileType string) int64 {
	switch fileType {
	case "avatar":
		return MaxAvatarSize
	case "image":
		return MaxImageSize
	case "document":
		return MaxDocumentSize
	default:
		return MaxImageSize
	}
}

// isAllowedFileType checks if file type is allowed
func isAllowedFileType(contentType, fileType string) bool {
	switch fileType {
	case "avatar", "image":
		return strings.Contains(AllowedImageTypesSecure, contentType)
	case "document":
		return strings.Contains(AllowedDocumentTypes, contentType)
	default:
		return false
	}
}

// getUploadDirectory returns upload directory for file type
func getUploadDirectory(fileType string) string {
	switch fileType {
	case "avatar":
		return AvatarDirSecure
	case "image":
		return ImageDir
	case "document":
		return DocumentDir
	default:
		return ImageDir
	}
}

// generateSecureFilename generates a secure filename
func generateSecureFilename(originalName string, userID uint) string {
	ext := filepath.Ext(originalName)
	timestamp := time.Now().Unix()
	hash := md5.Sum([]byte(fmt.Sprintf("%d_%s_%d", userID, originalName, timestamp)))
	return fmt.Sprintf("file_%d_%d_%s%s", userID, timestamp, hex.EncodeToString(hash[:8]), ext)
}

// saveSecureFile saves file securely
func saveSecureFile(file multipart.File, filepath string) error {
	dst, err := os.Create(filepath)
	if err != nil {
		return err
	}
	defer dst.Close()

	// Set restrictive permissions
	if err := os.Chmod(filepath, 0644); err != nil {
		return err
	}

	_, err = io.Copy(dst, file)
	return err
}

// containsExecutableContent checks for executable content
func containsExecutableContent(content []byte) bool {
	// Check for common executable signatures
	executableSignatures := [][]byte{
		{0x4D, 0x5A}, // PE executable
		{0x7F, 0x45, 0x4C, 0x46}, // ELF executable
		{0xFE, 0xED, 0xFA, 0xCE}, // Mach-O executable
		{0xCA, 0xFE, 0xBA, 0xBE}, // Java class file
	}

	for _, sig := range executableSignatures {
		if len(content) >= len(sig) {
			for i := 0; i <= len(content)-len(sig); i++ {
				if bytesEqual(content[i:i+len(sig)], sig) {
					return true
				}
			}
		}
	}

	return false
}

// containsSuspiciousPatterns checks for suspicious patterns
func containsSuspiciousPatterns(content []byte) bool {
	contentStr := string(content)
	
	// Check for script tags
	suspiciousPatterns := []string{
		"<script",
		"javascript:",
		"vbscript:",
		"onload=",
		"onerror=",
		"eval(",
		"exec(",
		"system(",
	}

	for _, pattern := range suspiciousPatterns {
		if strings.Contains(strings.ToLower(contentStr), pattern) {
			return true
		}
	}

	return false
}

// isValidMimeTypeExtension validates MIME type against file extension
func isValidMimeTypeExtension(mimeType, filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	
	mimeTypeMap := map[string][]string{
		"image/jpeg": {".jpg", ".jpeg"},
		"image/png":  {".png"},
		"image/gif":  {".gif"},
		"image/webp": {".webp"},
		"image/svg+xml": {".svg"},
		"application/pdf": {".pdf"},
		"text/plain": {".txt"},
	}

	validExts, exists := mimeTypeMap[mimeType]
	if !exists {
		return false
	}

	for _, validExt := range validExts {
		if ext == validExt {
			return true
		}
	}

	return false
}

// bytesEqual compares two byte slices
func bytesEqual(a, b []byte) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

// GetSecureUploadStatsHandler returns secure upload statistics
func GetSecureUploadStatsHandler(c *gin.Context) {
	stats := gin.H{
		"file_limits": gin.H{
			"avatar_max_size_mb":    MaxAvatarSize / (1024 * 1024),
			"image_max_size_mb":     MaxImageSize / (1024 * 1024),
			"document_max_size_mb":  MaxDocumentSize / (1024 * 1024),
		},
		"allowed_types": gin.H{
			"images":    strings.Split(AllowedImageTypesSecure, ","),
			"documents": strings.Split(AllowedDocumentTypes, ","),
		},
		"upload_directories": gin.H{
			"avatars":    AvatarDirSecure,
			"images":     ImageDir,
			"documents":  DocumentDir,
			"quarantine": QuarantineDir,
		},
		"security_features": []string{
			"File type validation",
			"Size limits",
			"Executable content detection",
			"Suspicious pattern detection",
			"MIME type validation",
			"Secure filename generation",
			"Hash calculation",
		},
	}

	c.JSON(http.StatusOK, stats)
}

// ScanFileHandler scans a file for malware (placeholder)
func ScanFileHandler(c *gin.Context) {
	fileID := c.Param("fileId")
	if fileID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File ID required"})
		return
	}

	// This would integrate with a real malware scanning service
	// For now, we'll simulate the scan
	c.JSON(http.StatusOK, gin.H{
		"file_id":    fileID,
		"scan_status": "completed",
		"is_safe":    true,
		"threats":    []string{},
		"scan_time":  time.Now(),
	})
}
