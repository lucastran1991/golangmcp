package services

import (
	"sync"
	"time"
)

// RateLimiter provides rate limiting functionality
type RateLimiter struct {
	requests map[string][]time.Time
	mutex    sync.RWMutex
	limit    int
	window   time.Duration
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		requests: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
	}
}

// Allow checks if a request is allowed
func (rl *RateLimiter) Allow(key string) bool {
	rl.mutex.Lock()
	defer rl.mutex.Unlock()
	
	now := time.Now()
	cutoff := now.Add(-rl.window)
	
	// Get existing requests for this key
	requests, exists := rl.requests[key]
	if !exists {
		requests = []time.Time{}
	}
	
	// Remove old requests outside the window
	var validRequests []time.Time
	for _, reqTime := range requests {
		if reqTime.After(cutoff) {
			validRequests = append(validRequests, reqTime)
		}
	}
	
	// Check if we're under the limit
	if len(validRequests) >= rl.limit {
		return false
	}
	
	// Add current request
	validRequests = append(validRequests, now)
	rl.requests[key] = validRequests
	
	return true
}

// GetRemaining returns the number of remaining requests
func (rl *RateLimiter) GetRemaining(key string) int {
	rl.mutex.RLock()
	defer rl.mutex.RUnlock()
	
	now := time.Now()
	cutoff := now.Add(-rl.window)
	
	requests, exists := rl.requests[key]
	if !exists {
		return rl.limit
	}
	
	// Count valid requests
	validCount := 0
	for _, reqTime := range requests {
		if reqTime.After(cutoff) {
			validCount++
		}
	}
	
	return rl.limit - validCount
}

// GetResetTime returns when the rate limit resets
func (rl *RateLimiter) GetResetTime(key string) time.Time {
	rl.mutex.RLock()
	defer rl.mutex.RUnlock()
	
	requests, exists := rl.requests[key]
	if !exists || len(requests) == 0 {
		return time.Now()
	}
	
	// Find the oldest request
	oldest := requests[0]
	for _, reqTime := range requests {
		if reqTime.Before(oldest) {
			oldest = reqTime
		}
	}
	
	return oldest.Add(rl.window)
}

// Cleanup removes old entries
func (rl *RateLimiter) Cleanup() {
	rl.mutex.Lock()
	defer rl.mutex.Unlock()
	
	now := time.Now()
	cutoff := now.Add(-rl.window * 2) // Keep some buffer
	
	for key, requests := range rl.requests {
		var validRequests []time.Time
		for _, reqTime := range requests {
			if reqTime.After(cutoff) {
				validRequests = append(validRequests, reqTime)
			}
		}
		
		if len(validRequests) == 0 {
			delete(rl.requests, key)
		} else {
			rl.requests[key] = validRequests
		}
	}
}

// RateLimitConfig represents rate limiting configuration
type RateLimitConfig struct {
	Limit  int           `json:"limit"`
	Window time.Duration `json:"window"`
}

// MultiRateLimiter provides multiple rate limiters for different endpoints
type MultiRateLimiter struct {
	limiters map[string]*RateLimiter
	mutex    sync.RWMutex
}

// NewMultiRateLimiter creates a new multi-rate limiter
func NewMultiRateLimiter() *MultiRateLimiter {
	return &MultiRateLimiter{
		limiters: make(map[string]*RateLimiter),
	}
}

// AddLimiter adds a rate limiter for a specific endpoint
func (mrl *MultiRateLimiter) AddLimiter(endpoint string, limit int, window time.Duration) {
	mrl.mutex.Lock()
	defer mrl.mutex.Unlock()
	
	mrl.limiters[endpoint] = NewRateLimiter(limit, window)
}

// Allow checks if a request is allowed for a specific endpoint and key
func (mrl *MultiRateLimiter) Allow(endpoint, key string) bool {
	mrl.mutex.RLock()
	limiter, exists := mrl.limiters[endpoint]
	mrl.mutex.RUnlock()
	
	if !exists {
		return true // No rate limit for this endpoint
	}
	
	return limiter.Allow(key)
}

// GetRemaining returns the number of remaining requests for an endpoint and key
func (mrl *MultiRateLimiter) GetRemaining(endpoint, key string) int {
	mrl.mutex.RLock()
	limiter, exists := mrl.limiters[endpoint]
	mrl.mutex.RUnlock()
	
	if !exists {
		return -1 // No limit
	}
	
	return limiter.GetRemaining(key)
}

// GetResetTime returns when the rate limit resets for an endpoint and key
func (mrl *MultiRateLimiter) GetResetTime(endpoint, key string) time.Time {
	mrl.mutex.RLock()
	limiter, exists := mrl.limiters[endpoint]
	mrl.mutex.RUnlock()
	
	if !exists {
		return time.Now()
	}
	
	return limiter.GetResetTime(key)
}

// CleanupAll cleans up all rate limiters
func (mrl *MultiRateLimiter) CleanupAll() {
	mrl.mutex.RLock()
	defer mrl.mutex.RUnlock()
	
	for _, limiter := range mrl.limiters {
		limiter.Cleanup()
	}
}

// RateLimitStats represents rate limiting statistics
type RateLimitStats struct {
	Endpoint     string    `json:"endpoint"`
	Key          string    `json:"key"`
	Remaining    int       `json:"remaining"`
	ResetTime    time.Time `json:"reset_time"`
	Limit        int       `json:"limit"`
	Window       string    `json:"window"`
}

// GetStats returns rate limiting statistics for an endpoint and key
func (mrl *MultiRateLimiter) GetStats(endpoint, key string) *RateLimitStats {
	mrl.mutex.RLock()
	limiter, exists := mrl.limiters[endpoint]
	mrl.mutex.RUnlock()
	
	if !exists {
		return &RateLimitStats{
			Endpoint:  endpoint,
			Key:       key,
			Remaining: -1,
			ResetTime: time.Now(),
			Limit:     -1,
			Window:    "unlimited",
		}
	}
	
	return &RateLimitStats{
		Endpoint:  endpoint,
		Key:       key,
		Remaining: limiter.GetRemaining(key),
		ResetTime: limiter.GetResetTime(key),
		Limit:     limiter.limit,
		Window:    limiter.window.String(),
	}
}

// RateLimitManager manages rate limiting for the entire application
type RateLimitManager struct {
	multiLimiter *MultiRateLimiter
	configs      map[string]*RateLimitConfig
	mutex        sync.RWMutex
}

// NewRateLimitManager creates a new rate limit manager
func NewRateLimitManager() *RateLimitManager {
	manager := &RateLimitManager{
		multiLimiter: NewMultiRateLimiter(),
		configs:      make(map[string]*RateLimitConfig),
	}
	
	// Start cleanup goroutine
	go manager.startCleanup()
	
	return manager
}

// SetConfig sets rate limiting configuration for an endpoint
func (rlm *RateLimitManager) SetConfig(endpoint string, limit int, window time.Duration) {
	rlm.mutex.Lock()
	defer rlm.mutex.Unlock()
	
	rlm.configs[endpoint] = &RateLimitConfig{
		Limit:  limit,
		Window: window,
	}
	
	rlm.multiLimiter.AddLimiter(endpoint, limit, window)
}

// Allow checks if a request is allowed
func (rlm *RateLimitManager) Allow(endpoint, key string) bool {
	return rlm.multiLimiter.Allow(endpoint, key)
}

// GetStats returns rate limiting statistics
func (rlm *RateLimitManager) GetStats(endpoint, key string) *RateLimitStats {
	return rlm.multiLimiter.GetStats(endpoint, key)
}

// GetAllConfigs returns all rate limiting configurations
func (rlm *RateLimitManager) GetAllConfigs() map[string]*RateLimitConfig {
	rlm.mutex.RLock()
	defer rlm.mutex.RUnlock()
	
	configs := make(map[string]*RateLimitConfig)
	for k, v := range rlm.configs {
		configs[k] = v
	}
	
	return configs
}

// startCleanup starts a goroutine to clean up old rate limit entries
func (rlm *RateLimitManager) startCleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	
	for range ticker.C {
		rlm.multiLimiter.CleanupAll()
	}
}

// DefaultRateLimitConfigs returns default rate limiting configurations
func DefaultRateLimitConfigs() map[string]*RateLimitConfig {
	return map[string]*RateLimitConfig{
		"login": {
			Limit:  5,
			Window: 15 * time.Minute,
		},
		"register": {
			Limit:  3,
			Window: 1 * time.Hour,
		},
		"upload": {
			Limit:  10,
			Window: 1 * time.Minute,
		},
		"api": {
			Limit:  100,
			Window: 1 * time.Minute,
		},
		"commands": {
			Limit:  20,
			Window: 1 * time.Minute,
		},
	}
}
