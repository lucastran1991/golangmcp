package services

import (
	"fmt"
	"math"
	"strconv"
	"sync"
)

// PaginationRequest represents a pagination request
type PaginationRequest struct {
	Page     int `json:"page"`
	PageSize int `json:"page_size"`
	Offset   int `json:"offset"`
	Limit    int `json:"limit"`
}

// PaginationResponse represents a pagination response
type PaginationResponse struct {
	Page       int   `json:"page"`
	PageSize   int   `json:"page_size"`
	TotalItems int64 `json:"total_items"`
	TotalPages int   `json:"total_pages"`
	Offset     int   `json:"offset"`
	Limit      int   `json:"limit"`
	HasNext    bool  `json:"has_next"`
	HasPrev    bool  `json:"has_prev"`
}

// PaginationService provides pagination functionality
type PaginationService struct {
	defaultPageSize int
	maxPageSize     int
}

// NewPaginationService creates a new pagination service
func NewPaginationService(defaultPageSize, maxPageSize int) *PaginationService {
	return &PaginationService{
		defaultPageSize: defaultPageSize,
		maxPageSize:     maxPageSize,
	}
}

// ParsePaginationRequest parses pagination parameters from query parameters
func (ps *PaginationService) ParsePaginationRequest(pageStr, pageSizeStr string) *PaginationRequest {
	page := 1
	pageSize := ps.defaultPageSize
	
	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}
	
	if pageSizeStr != "" {
		if parsedPageSize, err := strconv.Atoi(pageSizeStr); err == nil && parsedPageSize > 0 {
			if parsedPageSize <= ps.maxPageSize {
				pageSize = parsedPageSize
			} else {
				pageSize = ps.maxPageSize
			}
		}
	}
	
	offset := (page - 1) * pageSize
	
	return &PaginationRequest{
		Page:     page,
		PageSize: pageSize,
		Offset:   offset,
		Limit:    pageSize,
	}
}

// CalculatePagination calculates pagination metadata
func (ps *PaginationService) CalculatePagination(req *PaginationRequest, totalItems int64) *PaginationResponse {
	totalPages := int(math.Ceil(float64(totalItems) / float64(req.PageSize)))
	
	return &PaginationResponse{
		Page:       req.Page,
		PageSize:   req.PageSize,
		TotalItems: totalItems,
		TotalPages: totalPages,
		Offset:     req.Offset,
		Limit:      req.Limit,
		HasNext:    req.Page < totalPages,
		HasPrev:    req.Page > 1,
	}
}

// ValidatePagination validates pagination parameters
func (ps *PaginationService) ValidatePagination(req *PaginationRequest) error {
	if req.Page < 1 {
		return fmt.Errorf("page must be greater than 0")
	}
	
	if req.PageSize < 1 {
		return fmt.Errorf("page size must be greater than 0")
	}
	
	if req.PageSize > ps.maxPageSize {
		return fmt.Errorf("page size cannot exceed %d", ps.maxPageSize)
	}
	
	return nil
}

// GetDefaultPagination returns default pagination settings
func (ps *PaginationService) GetDefaultPagination() *PaginationRequest {
	return &PaginationRequest{
		Page:     1,
		PageSize: ps.defaultPageSize,
		Offset:   0,
		Limit:    ps.defaultPageSize,
	}
}

// PaginatedResult represents a paginated result
type PaginatedResult struct {
	Data       interface{}        `json:"data"`
	Pagination *PaginationResponse `json:"pagination"`
}

// NewPaginatedResult creates a new paginated result
func NewPaginatedResult(data interface{}, pagination *PaginationResponse) *PaginatedResult {
	return &PaginatedResult{
		Data:       data,
		Pagination: pagination,
	}
}

// PaginationConfig represents pagination configuration
type PaginationConfig struct {
	DefaultPageSize int `json:"default_page_size"`
	MaxPageSize     int `json:"max_page_size"`
}

// DefaultPaginationConfig returns default pagination configuration
func DefaultPaginationConfig() *PaginationConfig {
	return &PaginationConfig{
		DefaultPageSize: 20,
		MaxPageSize:     100,
	}
}

// PaginationMiddleware provides pagination middleware for HTTP handlers
type PaginationMiddleware struct {
	service *PaginationService
}

// NewPaginationMiddleware creates a new pagination middleware
func NewPaginationMiddleware(service *PaginationService) *PaginationMiddleware {
	return &PaginationMiddleware{service: service}
}

// ParseRequest parses pagination request from query parameters
func (pm *PaginationMiddleware) ParseRequest(pageStr, pageSizeStr string) (*PaginationRequest, error) {
	req := pm.service.ParsePaginationRequest(pageStr, pageSizeStr)
	
	if err := pm.service.ValidatePagination(req); err != nil {
		return nil, err
	}
	
	return req, nil
}

// CreateResponse creates a paginated response
func (pm *PaginationMiddleware) CreateResponse(data interface{}, req *PaginationRequest, totalItems int64) *PaginatedResult {
	pagination := pm.service.CalculatePagination(req, totalItems)
	return NewPaginatedResult(data, pagination)
}

// PaginationStats represents pagination statistics
type PaginationStats struct {
	TotalRequests    int64   `json:"total_requests"`
	AveragePageSize  float64 `json:"average_page_size"`
	MostUsedPageSize int     `json:"most_used_page_size"`
	TotalPages       int64   `json:"total_pages"`
}

// PaginationAnalyzer analyzes pagination usage patterns
type PaginationAnalyzer struct {
	stats map[string]int64
	mutex sync.RWMutex
}

// NewPaginationAnalyzer creates a new pagination analyzer
func NewPaginationAnalyzer() *PaginationAnalyzer {
	return &PaginationAnalyzer{
		stats: make(map[string]int64),
	}
}

// RecordRequest records a pagination request
func (pa *PaginationAnalyzer) RecordRequest(pageSize int) {
	pa.mutex.Lock()
	defer pa.mutex.Unlock()
	
	key := strconv.Itoa(pageSize)
	pa.stats[key]++
}

// GetStats returns pagination statistics
func (pa *PaginationAnalyzer) GetStats() *PaginationStats {
	pa.mutex.RLock()
	defer pa.mutex.RUnlock()
	
	var totalRequests int64
	var totalPageSize int64
	var mostUsedPageSize int
	var maxCount int64
	
	for pageSizeStr, count := range pa.stats {
		pageSize, _ := strconv.Atoi(pageSizeStr)
		
		totalRequests += count
		totalPageSize += int64(pageSize) * count
		
		if count > maxCount {
			maxCount = count
			mostUsedPageSize = pageSize
		}
	}
	
	var averagePageSize float64
	if totalRequests > 0 {
		averagePageSize = float64(totalPageSize) / float64(totalRequests)
	}
	
	return &PaginationStats{
		TotalRequests:    totalRequests,
		AveragePageSize:  averagePageSize,
		MostUsedPageSize: mostUsedPageSize,
		TotalPages:       totalRequests,
	}
}
