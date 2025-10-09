package services

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"
)

// CacheItem represents a cached item
type CacheItem struct {
	Value     interface{} `json:"value"`
	ExpiresAt time.Time   `json:"expires_at"`
	CreatedAt time.Time   `json:"created_at"`
}

// IsExpired checks if the cache item has expired
func (ci *CacheItem) IsExpired() bool {
	return time.Now().After(ci.ExpiresAt)
}

// CacheService provides in-memory caching functionality
type CacheService struct {
	items map[string]*CacheItem
	mutex sync.RWMutex
	ttl   time.Duration
}

// NewCacheService creates a new cache service
func NewCacheService(defaultTTL time.Duration) *CacheService {
	cache := &CacheService{
		items: make(map[string]*CacheItem),
		ttl:   defaultTTL,
	}
	
	// Start cleanup goroutine
	go cache.startCleanup()
	
	return cache
}

// Set stores a value in the cache
func (cs *CacheService) Set(key string, value interface{}, ttl ...time.Duration) {
	cs.mutex.Lock()
	defer cs.mutex.Unlock()
	
	duration := cs.ttl
	if len(ttl) > 0 {
		duration = ttl[0]
	}
	
	cs.items[key] = &CacheItem{
		Value:     value,
		ExpiresAt: time.Now().Add(duration),
		CreatedAt: time.Now(),
	}
}

// Get retrieves a value from the cache
func (cs *CacheService) Get(key string) (interface{}, bool) {
	cs.mutex.RLock()
	defer cs.mutex.RUnlock()
	
	item, exists := cs.items[key]
	if !exists || item.IsExpired() {
		return nil, false
	}
	
	return item.Value, true
}

// Delete removes a value from the cache
func (cs *CacheService) Delete(key string) {
	cs.mutex.Lock()
	defer cs.mutex.Unlock()
	
	delete(cs.items, key)
}

// Clear removes all items from the cache
func (cs *CacheService) Clear() {
	cs.mutex.Lock()
	defer cs.mutex.Unlock()
	
	cs.items = make(map[string]*CacheItem)
}

// GetStats returns cache statistics
func (cs *CacheService) GetStats() map[string]interface{} {
	cs.mutex.RLock()
	defer cs.mutex.RUnlock()
	
	totalItems := len(cs.items)
	expiredItems := 0
	
	for _, item := range cs.items {
		if item.IsExpired() {
			expiredItems++
		}
	}
	
	return map[string]interface{}{
		"total_items":   totalItems,
		"active_items":  totalItems - expiredItems,
		"expired_items": expiredItems,
		"default_ttl":   cs.ttl.String(),
	}
}

// startCleanup starts a goroutine to clean up expired items
func (cs *CacheService) startCleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	
	for range ticker.C {
		cs.cleanupExpired()
	}
}

// cleanupExpired removes expired items from the cache
func (cs *CacheService) cleanupExpired() {
	cs.mutex.Lock()
	defer cs.mutex.Unlock()
	
	for key, item := range cs.items {
		if item.IsExpired() {
			delete(cs.items, key)
		}
	}
}

// CacheableFunc represents a function that can be cached
type CacheableFunc func() (interface{}, error)

// GetOrSet retrieves a value from cache or executes the function and caches the result
func (cs *CacheService) GetOrSet(key string, fn CacheableFunc, ttl ...time.Duration) (interface{}, error) {
	// Try to get from cache first
	if value, found := cs.Get(key); found {
		return value, nil
	}
	
	// Execute function
	value, err := fn()
	if err != nil {
		return nil, err
	}
	
	// Cache the result
	cs.Set(key, value, ttl...)
	
	return value, nil
}

// CacheMiddleware provides caching middleware for HTTP handlers
type CacheMiddleware struct {
	cache *CacheService
}

// NewCacheMiddleware creates a new cache middleware
func NewCacheMiddleware(cache *CacheService) *CacheMiddleware {
	return &CacheMiddleware{cache: cache}
}

// CacheKey generates a cache key from request parameters
func (cm *CacheMiddleware) CacheKey(method, path string, params map[string]string) string {
	key := fmt.Sprintf("%s:%s", method, path)
	
	if len(params) > 0 {
		paramsJSON, _ := json.Marshal(params)
		key += fmt.Sprintf(":%s", string(paramsJSON))
	}
	
	return key
}

// GetCacheKey generates a cache key for a request
func (cm *CacheMiddleware) GetCacheKey(method, path string, queryParams map[string][]string) string {
	key := fmt.Sprintf("%s:%s", method, path)
	
	if len(queryParams) > 0 {
		// Convert query params to a consistent format
		params := make(map[string]string)
		for k, v := range queryParams {
			if len(v) > 0 {
				params[k] = v[0] // Take first value
			}
		}
		paramsJSON, _ := json.Marshal(params)
		key += fmt.Sprintf(":%s", string(paramsJSON))
	}
	
	return key
}

// ResponseCache represents a cached HTTP response
type ResponseCache struct {
	StatusCode int                 `json:"status_code"`
	Headers    map[string][]string `json:"headers"`
	Body       []byte              `json:"body"`
	CachedAt   time.Time           `json:"cached_at"`
}

// CacheResponse caches an HTTP response
func (cm *CacheMiddleware) CacheResponse(key string, statusCode int, headers map[string][]string, body []byte, ttl time.Duration) {
	response := &ResponseCache{
		StatusCode: statusCode,
		Headers:    headers,
		Body:       body,
		CachedAt:   time.Now(),
	}
	
	cm.cache.Set(key, response, ttl)
}

// GetCachedResponse retrieves a cached HTTP response
func (cm *CacheMiddleware) GetCachedResponse(key string) (*ResponseCache, bool) {
	value, found := cm.cache.Get(key)
	if !found {
		return nil, false
	}
	
	response, ok := value.(*ResponseCache)
	return response, ok
}

// CacheConfig represents cache configuration
type CacheConfig struct {
	DefaultTTL    time.Duration `json:"default_ttl"`
	MaxItems      int           `json:"max_items"`
	CleanupInterval time.Duration `json:"cleanup_interval"`
}

// DefaultCacheConfig returns default cache configuration
func DefaultCacheConfig() *CacheConfig {
	return &CacheConfig{
		DefaultTTL:     15 * time.Minute,
		MaxItems:       1000,
		CleanupInterval: 5 * time.Minute,
	}
}

// CacheManager manages multiple cache instances
type CacheManager struct {
	caches map[string]*CacheService
	mutex  sync.RWMutex
}

// NewCacheManager creates a new cache manager
func NewCacheManager() *CacheManager {
	return &CacheManager{
		caches: make(map[string]*CacheService),
	}
}

// GetCache gets or creates a cache instance
func (cm *CacheManager) GetCache(name string, ttl time.Duration) *CacheService {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()
	
	if cache, exists := cm.caches[name]; exists {
		return cache
	}
	
	cache := NewCacheService(ttl)
	cm.caches[name] = cache
	return cache
}

// GetStats returns statistics for all caches
func (cm *CacheManager) GetStats() map[string]interface{} {
	cm.mutex.RLock()
	defer cm.mutex.RUnlock()
	
	stats := make(map[string]interface{})
	for name, cache := range cm.caches {
		stats[name] = cache.GetStats()
	}
	
	return stats
}

// ClearAll clears all caches
func (cm *CacheManager) ClearAll() {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()
	
	for _, cache := range cm.caches {
		cache.Clear()
	}
}
