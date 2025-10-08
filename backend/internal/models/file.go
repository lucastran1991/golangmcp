package models

import (
	"time"
	"gorm.io/gorm"
)

// File represents a file in the system
type File struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Filename    string    `json:"filename" gorm:"not null"`
	OriginalName string   `json:"original_name" gorm:"not null"`
	FileType    string    `json:"file_type" gorm:"not null"` // txt, xlsx, csv
	MimeType    string    `json:"mime_type" gorm:"not null"`
	Size        int64     `json:"size" gorm:"not null"`
	Path        string    `json:"path" gorm:"not null"`
	Hash        string    `json:"hash" gorm:"uniqueIndex;not null"`
	UserID      uint      `json:"user_id" gorm:"not null"`
	User        User      `json:"user" gorm:"foreignKey:UserID"`
	IsPublic    bool      `json:"is_public" gorm:"default:false"`
	Description string    `json:"description" gorm:"type:text"`
	Tags        string    `json:"tags" gorm:"type:text"` // JSON array as string
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"deleted_at" gorm:"index"`
}

// FileMetadata represents additional file metadata
type FileMetadata struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	FileID    uint      `json:"file_id" gorm:"not null"`
	File      File      `json:"file" gorm:"foreignKey:FileID"`
	Key       string    `json:"key" gorm:"not null"`
	Value     string    `json:"value" gorm:"type:text"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// FileAccessLog represents file access logging
type FileAccessLog struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	FileID    uint      `json:"file_id" gorm:"not null"`
	File      File      `json:"file" gorm:"foreignKey:FileID"`
	UserID    uint      `json:"user_id" gorm:"not null"`
	User      User      `json:"user" gorm:"foreignKey:UserID"`
	Action    string    `json:"action" gorm:"not null"` // upload, download, delete, view
	IPAddress string    `json:"ip_address"`
	UserAgent string    `json:"user_agent"`
	CreatedAt time.Time `json:"created_at"`
}

// FileStats represents file statistics
type FileStats struct {
	TotalFiles    int64   `json:"total_files"`
	TotalSize     int64   `json:"total_size"`
	FilesByType   map[string]int64 `json:"files_by_type"`
	FilesByUser   map[uint]int64 `json:"files_by_user"`
	AverageSize   float64 `json:"average_size"`
	LargestFile   int64   `json:"largest_file"`
	OldestFile    time.Time `json:"oldest_file"`
	NewestFile    time.Time `json:"newest_file"`
}

// CreateFile creates a new file record
func CreateFile(db *gorm.DB, file *File) error {
	return db.Create(file).Error
}

// GetFileByID retrieves a file by ID
func GetFileByID(db *gorm.DB, id uint) (*File, error) {
	var file File
	err := db.Preload("User").First(&file, id).Error
	return &file, err
}

// GetFileByHash retrieves a file by hash
func GetFileByHash(db *gorm.DB, hash string) (*File, error) {
	var file File
	err := db.Preload("User").Where("hash = ?", hash).First(&file).Error
	return &file, err
}

// GetFilesByUser retrieves all files for a specific user
func GetFilesByUser(db *gorm.DB, userID uint, limit, offset int) ([]File, error) {
	var files []File
	query := db.Preload("User").Where("user_id = ?", userID)
	
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}
	
	err := query.Order("created_at DESC").Find(&files).Error
	return files, err
}

// GetAllFiles retrieves all files with pagination
func GetAllFiles(db *gorm.DB, limit, offset int) ([]File, error) {
	var files []File
	query := db.Preload("User")
	
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}
	
	err := query.Order("created_at DESC").Find(&files).Error
	return files, err
}

// GetFilesByType retrieves files by type
func GetFilesByType(db *gorm.DB, fileType string, limit, offset int) ([]File, error) {
	var files []File
	query := db.Preload("User").Where("file_type = ?", fileType)
	
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}
	
	err := query.Order("created_at DESC").Find(&files).Error
	return files, err
}

// SearchFiles searches files by filename or description
func SearchFiles(db *gorm.DB, query string, userID *uint, limit, offset int) ([]File, error) {
	var files []File
	dbQuery := db.Preload("User").Where("filename LIKE ? OR original_name LIKE ? OR description LIKE ?", 
		"%"+query+"%", "%"+query+"%", "%"+query+"%")
	
	if userID != nil {
		dbQuery = dbQuery.Where("user_id = ?", *userID)
	}
	
	if limit > 0 {
		dbQuery = dbQuery.Limit(limit)
	}
	if offset > 0 {
		dbQuery = dbQuery.Offset(offset)
	}
	
	err := dbQuery.Order("created_at DESC").Find(&files).Error
	return files, err
}

// UpdateFile updates a file record
func UpdateFile(db *gorm.DB, file *File) error {
	return db.Save(file).Error
}

// DeleteFile soft deletes a file
func DeleteFile(db *gorm.DB, id uint) error {
	return db.Delete(&File{}, id).Error
}

// GetFileStats retrieves file statistics
func GetFileStats(db *gorm.DB) (*FileStats, error) {
	stats := &FileStats{
		FilesByType: make(map[string]int64),
		FilesByUser: make(map[uint]int64),
	}

	// Total files
	db.Model(&File{}).Count(&stats.TotalFiles)

	// Total size
	db.Model(&File{}).Select("COALESCE(SUM(size), 0)").Scan(&stats.TotalSize)

	// Files by type
	var typeCounts []struct {
		FileType string
		Count    int64
	}
	db.Model(&File{}).Select("file_type, COUNT(*) as count").Group("file_type").Scan(&typeCounts)
	for _, tc := range typeCounts {
		stats.FilesByType[tc.FileType] = tc.Count
	}

	// Files by user
	var userCounts []struct {
		UserID uint
		Count  int64
	}
	db.Model(&File{}).Select("user_id, COUNT(*) as count").Group("user_id").Scan(&userCounts)
	for _, uc := range userCounts {
		stats.FilesByUser[uc.UserID] = uc.Count
	}

	// Average size
	if stats.TotalFiles > 0 {
		stats.AverageSize = float64(stats.TotalSize) / float64(stats.TotalFiles)
	}

	// Largest file
	db.Model(&File{}).Select("COALESCE(MAX(size), 0)").Scan(&stats.LargestFile)

	// Oldest and newest files
	var oldest, newest time.Time
	db.Model(&File{}).Select("MIN(created_at)").Scan(&oldest)
	db.Model(&File{}).Select("MAX(created_at)").Scan(&newest)
	stats.OldestFile = oldest
	stats.NewestFile = newest

	return stats, nil
}

// LogFileAccess logs file access
func LogFileAccess(db *gorm.DB, log *FileAccessLog) error {
	return db.Create(log).Error
}

// GetFileAccessLogs retrieves file access logs
func GetFileAccessLogs(db *gorm.DB, fileID uint, limit, offset int) ([]FileAccessLog, error) {
	var logs []FileAccessLog
	query := db.Preload("User").Where("file_id = ?", fileID)
	
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}
	
	err := query.Order("created_at DESC").Find(&logs).Error
	return logs, err
}
