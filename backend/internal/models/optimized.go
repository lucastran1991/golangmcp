package models

import (
	"time"
	"gorm.io/gorm"
)

// OptimizedUser represents an optimized user model with better indexing
type OptimizedUser struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	Username  string         `json:"username" gorm:"uniqueIndex:idx_username;not null;size:50"`
	Email     string         `json:"email" gorm:"uniqueIndex:idx_email;not null;size:100"`
	Password  string         `json:"password" gorm:"not null;size:255"`
	Role      string         `json:"role" gorm:"default:'user';size:20;index:idx_role"`
	Avatar    string         `json:"avatar" gorm:"size:255"`
	CreatedAt time.Time      `json:"created_at" gorm:"index:idx_users_created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index:idx_deleted_at"`
}

// TableName returns the table name for the OptimizedUser model
func (OptimizedUser) TableName() string {
	return "users"
}

// OptimizedFile represents an optimized file model with better indexing
type OptimizedFile struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Filename    string         `json:"filename" gorm:"not null;index:idx_filename"`
	OriginalName string        `json:"original_name" gorm:"not null;index:idx_original_name"`
	FileType    string         `json:"file_type" gorm:"not null;index:idx_file_type"`
	MimeType    string         `json:"mime_type" gorm:"not null;index:idx_mime_type"`
	Size        int64          `json:"size" gorm:"not null;index:idx_size"`
	Path        string         `json:"path" gorm:"not null"`
	Hash        string         `json:"hash" gorm:"uniqueIndex:idx_hash;not null"`
	UserID      uint           `json:"user_id" gorm:"not null;index:idx_user_id"`
	User        User           `json:"user" gorm:"foreignKey:UserID"`
	IsPublic    bool           `json:"is_public" gorm:"default:false;index:idx_is_public"`
	Description string         `json:"description" gorm:"type:text"`
	Tags        string         `json:"tags" gorm:"type:text"`
	CreatedAt   time.Time      `json:"created_at" gorm:"index:idx_files_created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"deleted_at" gorm:"index:idx_deleted_at"`
}

// TableName returns the table name for the OptimizedFile model
func (OptimizedFile) TableName() string {
	return "files"
}

// OptimizedFileAccessLog represents an optimized file access log with better indexing
type OptimizedFileAccessLog struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	FileID    uint      `json:"file_id" gorm:"not null;index:idx_file_id"`
	File      File      `json:"file" gorm:"foreignKey:FileID"`
	UserID    uint      `json:"user_id" gorm:"not null;index:idx_user_id"`
	User      User      `json:"user" gorm:"foreignKey:UserID"`
	Action    string    `json:"action" gorm:"not null;index:idx_action"`
	IPAddress string    `json:"ip_address" gorm:"index:idx_ip_address"`
	UserAgent string    `json:"user_agent"`
	CreatedAt time.Time `json:"created_at" gorm:"index:idx_file_access_logs_created_at"`
}

// TableName returns the table name for the OptimizedFileAccessLog model
func (OptimizedFileAccessLog) TableName() string {
	return "file_access_logs"
}

// OptimizedQueryBuilder provides optimized query methods
type OptimizedQueryBuilder struct {
	db *gorm.DB
}

// NewOptimizedQueryBuilder creates a new optimized query builder
func NewOptimizedQueryBuilder(db *gorm.DB) *OptimizedQueryBuilder {
	return &OptimizedQueryBuilder{db: db}
}

// GetUsersWithOptimizedQuery retrieves users with optimized query
func (qb *OptimizedQueryBuilder) GetUsersWithOptimizedQuery(limit, offset int, role string) ([]User, error) {
	var users []User
	query := qb.db.Select("id, username, email, role, avatar, created_at, updated_at")
	
	if role != "" {
		query = query.Where("role = ?", role)
	}
	
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}
	
	err := query.Order("created_at DESC").Find(&users).Error
	return users, err
}

// GetFilesWithOptimizedQuery retrieves files with optimized query
func (qb *OptimizedQueryBuilder) GetFilesWithOptimizedQuery(limit, offset int, fileType string, userID *uint) ([]File, error) {
	var files []File
	query := qb.db.Select("id, filename, original_name, file_type, mime_type, size, user_id, is_public, created_at, updated_at")
	
	if fileType != "" {
		query = query.Where("file_type = ?", fileType)
	}
	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}
	
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}
	
	err := query.Order("created_at DESC").Find(&files).Error
	return files, err
}

// SearchFilesOptimized performs optimized file search
func (qb *OptimizedQueryBuilder) SearchFilesOptimized(query string, userID *uint, limit, offset int) ([]File, error) {
	var files []File
	dbQuery := qb.db.Select("id, filename, original_name, file_type, mime_type, size, user_id, is_public, created_at, updated_at").
		Where("filename LIKE ? OR original_name LIKE ? OR description LIKE ?", 
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

// GetFileStatsOptimized retrieves file statistics with optimized queries
func (qb *OptimizedQueryBuilder) GetFileStatsOptimized() (*FileStats, error) {
	stats := &FileStats{
		FilesByType: make(map[string]int64),
		FilesByUser: make(map[uint]int64),
	}

	// Use raw SQL for better performance on aggregations
	err := qb.db.Raw("SELECT COUNT(*) FROM files WHERE deleted_at IS NULL").Scan(&stats.TotalFiles).Error
	if err != nil {
		return nil, err
	}

	err = qb.db.Raw("SELECT COALESCE(SUM(size), 0) FROM files WHERE deleted_at IS NULL").Scan(&stats.TotalSize).Error
	if err != nil {
		return nil, err
	}

	// Files by type
	var typeCounts []struct {
		FileType string
		Count    int64
	}
	err = qb.db.Raw("SELECT file_type, COUNT(*) as count FROM files WHERE deleted_at IS NULL GROUP BY file_type").Scan(&typeCounts).Error
	if err != nil {
		return nil, err
	}
	for _, tc := range typeCounts {
		stats.FilesByType[tc.FileType] = tc.Count
	}

	// Files by user
	var userCounts []struct {
		UserID uint
		Count  int64
	}
	err = qb.db.Raw("SELECT user_id, COUNT(*) as count FROM files WHERE deleted_at IS NULL GROUP BY user_id").Scan(&userCounts).Error
	if err != nil {
		return nil, err
	}
	for _, uc := range userCounts {
		stats.FilesByUser[uc.UserID] = uc.Count
	}

	// Average size
	if stats.TotalFiles > 0 {
		stats.AverageSize = float64(stats.TotalSize) / float64(stats.TotalFiles)
	}

	// Largest file
	err = qb.db.Raw("SELECT COALESCE(MAX(size), 0) FROM files WHERE deleted_at IS NULL").Scan(&stats.LargestFile).Error
	if err != nil {
		return nil, err
	}

	// Oldest and newest files
	err = qb.db.Raw("SELECT MIN(created_at) FROM files WHERE deleted_at IS NULL").Scan(&stats.OldestFile).Error
	if err != nil {
		return nil, err
	}
	err = qb.db.Raw("SELECT MAX(created_at) FROM files WHERE deleted_at IS NULL").Scan(&stats.NewestFile).Error
	if err != nil {
		return nil, err
	}

	return stats, nil
}

// GetFileAccessLogsOptimized retrieves file access logs with optimized query
func (qb *OptimizedQueryBuilder) GetFileAccessLogsOptimized(fileID uint, limit, offset int) ([]FileAccessLog, error) {
	var logs []FileAccessLog
	query := qb.db.Select("id, file_id, user_id, action, ip_address, user_agent, created_at").
		Where("file_id = ?", fileID)
	
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}
	
	err := query.Order("created_at DESC").Find(&logs).Error
	return logs, err
}

// BatchInsertFiles performs batch insert for better performance
func (qb *OptimizedQueryBuilder) BatchInsertFiles(files []File) error {
	if len(files) == 0 {
		return nil
	}
	
	// Use batch insert for better performance
	return qb.db.CreateInBatches(files, 100).Error
}

// BatchInsertFileAccessLogs performs batch insert for file access logs
func (qb *OptimizedQueryBuilder) BatchInsertFileAccessLogs(logs []FileAccessLog) error {
	if len(logs) == 0 {
		return nil
	}
	
	return qb.db.CreateInBatches(logs, 100).Error
}
