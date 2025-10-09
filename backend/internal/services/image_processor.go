package services

import (
	"bytes"
	"fmt"
	"image"
	"image/gif"
	"image/jpeg"
	"image/png"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/nfnt/resize"
)

// ImageProcessor handles image processing and optimization
type ImageProcessor struct {
	MaxWidth     uint
	MaxHeight    uint
	Quality      int
	MaxFileSize  int64 // in bytes
	AllowedTypes []string
}

// NewImageProcessor creates a new image processor with default settings
func NewImageProcessor() *ImageProcessor {
	return &ImageProcessor{
		MaxWidth:     1920,
		MaxHeight:    1080,
		Quality:      85,
		MaxFileSize:  5 * 1024 * 1024, // 5MB
		AllowedTypes: []string{"image/jpeg", "image/png", "image/gif"},
	}
}

// ProcessImage processes and optimizes an uploaded image
func (ip *ImageProcessor) ProcessImage(file multipart.File, header *multipart.FileHeader) (*ProcessedImage, error) {
	// Validate file type
	if !ip.isAllowedType(header.Header.Get("Content-Type")) {
		return nil, fmt.Errorf("file type not allowed: %s", header.Header.Get("Content-Type"))
	}

	// Read file content
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	// Check file size
	if int64(len(fileBytes)) > ip.MaxFileSize {
		return nil, fmt.Errorf("file size exceeds limit: %d bytes (max: %d)", len(fileBytes), ip.MaxFileSize)
	}

	// Decode image
	img, format, err := image.Decode(bytes.NewReader(fileBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to decode image: %w", err)
	}

	// Get original dimensions
	bounds := img.Bounds()
	originalWidth := bounds.Dx()
	originalHeight := bounds.Dy()

	// Calculate new dimensions maintaining aspect ratio
	newWidth, newHeight := ip.calculateDimensions(uint(originalWidth), uint(originalHeight))

	// Resize image if needed
	var processedImg image.Image = img
	if newWidth != uint(originalWidth) || newHeight != uint(originalHeight) {
		processedImg = resize.Resize(newWidth, newHeight, img, resize.Lanczos3)
	}

	// Encode with optimization
	optimizedBytes, err := ip.encodeImage(processedImg, format)
	if err != nil {
		return nil, fmt.Errorf("failed to encode optimized image: %w", err)
	}

	// Generate unique filename
	filename := ip.generateFilename(header.Filename, format)

	return &ProcessedImage{
		OriginalFilename: header.Filename,
		Filename:         filename,
		Format:           format,
		OriginalSize:     int64(len(fileBytes)),
		OptimizedSize:    int64(len(optimizedBytes)),
		OriginalWidth:    originalWidth,
		OriginalHeight:   originalHeight,
		OptimizedWidth:   int(newWidth),
		OptimizedHeight:  int(newHeight),
		Data:             optimizedBytes,
		CompressionRatio: float64(len(optimizedBytes)) / float64(len(fileBytes)),
	}, nil
}

// ProcessedImage represents a processed image
type ProcessedImage struct {
	OriginalFilename string
	Filename         string
	Format           string
	OriginalSize     int64
	OptimizedSize    int64
	OriginalWidth    int
	OriginalHeight   int
	OptimizedWidth   int
	OptimizedHeight  int
	Data             []byte
	CompressionRatio float64
}

// isAllowedType checks if the file type is allowed
func (ip *ImageProcessor) isAllowedType(contentType string) bool {
	for _, allowedType := range ip.AllowedTypes {
		if contentType == allowedType {
			return true
		}
	}
	return false
}

// calculateDimensions calculates new dimensions maintaining aspect ratio
func (ip *ImageProcessor) calculateDimensions(width, height uint) (uint, uint) {
	if width <= ip.MaxWidth && height <= ip.MaxHeight {
		return width, height
	}

	// Calculate scaling factor
	widthRatio := float64(ip.MaxWidth) / float64(width)
	heightRatio := float64(ip.MaxHeight) / float64(height)
	ratio := widthRatio
	if heightRatio < widthRatio {
		ratio = heightRatio
	}

	newWidth := uint(float64(width) * ratio)
	newHeight := uint(float64(height) * ratio)

	return newWidth, newHeight
}

// encodeImage encodes the image with optimization
func (ip *ImageProcessor) encodeImage(img image.Image, format string) ([]byte, error) {
	var buf bytes.Buffer

	switch format {
	case "jpeg":
		err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: ip.Quality})
		if err != nil {
			return nil, err
		}
	case "png":
		err := png.Encode(&buf, img)
		if err != nil {
			return nil, err
		}
	case "gif":
		err := gif.Encode(&buf, img, nil)
		if err != nil {
			return nil, err
		}
	default:
		return nil, fmt.Errorf("unsupported image format: %s", format)
	}

	return buf.Bytes(), nil
}

// generateFilename generates a unique filename
func (ip *ImageProcessor) generateFilename(originalFilename, format string) string {
	ext := strings.ToLower(filepath.Ext(originalFilename))
	if ext == "" {
		switch format {
		case "jpeg":
			ext = ".jpg"
		case "png":
			ext = ".png"
		case "gif":
			ext = ".gif"
		default:
			ext = ".jpg"
		}
	}

	// Generate unique filename (in production, use UUID or similar)
	timestamp := fmt.Sprintf("%d", os.Getpid()) // Simple unique identifier
	return fmt.Sprintf("optimized_%s%s", timestamp, ext)
}

// SaveImage saves the processed image to disk
func (ip *ImageProcessor) SaveImage(processedImg *ProcessedImage, uploadDir string) (string, error) {
	// Create upload directory if it doesn't exist
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create upload directory: %w", err)
	}

	// Create file path
	filePath := filepath.Join(uploadDir, processedImg.Filename)

	// Save file
	file, err := os.Create(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to create file: %w", err)
	}
	defer file.Close()

	_, err = file.Write(processedImg.Data)
	if err != nil {
		return "", fmt.Errorf("failed to write file: %w", err)
	}

	return filePath, nil
}

// GetImageStats returns statistics about image processing
func (ip *ImageProcessor) GetImageStats() map[string]interface{} {
	return map[string]interface{}{
		"max_width":      ip.MaxWidth,
		"max_height":     ip.MaxHeight,
		"quality":        ip.Quality,
		"max_file_size":  ip.MaxFileSize,
		"allowed_types":  ip.AllowedTypes,
		"max_file_size_mb": ip.MaxFileSize / (1024 * 1024),
	}
}

// UpdateSettings updates the image processor settings
func (ip *ImageProcessor) UpdateSettings(maxWidth, maxHeight uint, quality int, maxFileSize int64) {
	ip.MaxWidth = maxWidth
	ip.MaxHeight = maxHeight
	ip.Quality = quality
	ip.MaxFileSize = maxFileSize
}

// ValidateImage validates an image file without processing
func (ip *ImageProcessor) ValidateImage(file multipart.File, header *multipart.FileHeader) error {
	// Check file type
	if !ip.isAllowedType(header.Header.Get("Content-Type")) {
		return fmt.Errorf("file type not allowed: %s", header.Header.Get("Content-Type"))
	}

	// Check file size
	if header.Size > ip.MaxFileSize {
		return fmt.Errorf("file size exceeds limit: %d bytes (max: %d)", header.Size, ip.MaxFileSize)
	}

	// Try to decode image to validate it's a valid image
	_, _, err := image.Decode(file)
	if err != nil {
		return fmt.Errorf("invalid image file: %w", err)
	}

	return nil
}
