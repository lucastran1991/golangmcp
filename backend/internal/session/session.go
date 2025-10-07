package session

import (
	"errors"
	"sync"
	"time"

	"golangmcp/internal/auth"
	"golangmcp/internal/models"
)

// Session represents an active user session
type Session struct {
	ID        string    `json:"id"`
	UserID    uint      `json:"user_id"`
	Username  string    `json:"username"`
	Role      string    `json:"role"`
	Token     string    `json:"token"`
	CreatedAt time.Time `json:"created_at"`
	ExpiresAt time.Time `json:"expires_at"`
	LastSeen  time.Time `json:"last_seen"`
	IPAddress string    `json:"ip_address"`
	UserAgent string    `json:"user_agent"`
	IsActive  bool      `json:"is_active"`
}

// SessionManager manages user sessions
type SessionManager struct {
	sessions map[string]*Session
	blacklist map[string]bool
	mutex    sync.RWMutex
}

// NewSessionManager creates a new session manager
func NewSessionManager() *SessionManager {
	return &SessionManager{
		sessions:  make(map[string]*Session),
		blacklist: make(map[string]bool),
	}
}

var (
	ErrSessionNotFound = errors.New("session not found")
	ErrSessionExpired  = errors.New("session expired")
	ErrTokenBlacklisted = errors.New("token is blacklisted")
	ErrInvalidToken    = errors.New("invalid token")
)

// CreateSession creates a new session for a user
func (sm *SessionManager) CreateSession(user *models.User, token string, ipAddress, userAgent string) (*Session, error) {
	sm.mutex.Lock()
	defer sm.mutex.Unlock()

	// Parse token to get expiration time
	claims, err := auth.ValidateJWT(token, []byte("my_secret_key"))
	if err != nil {
		return nil, err
	}

	sessionID := generateSessionID()
	session := &Session{
		ID:        sessionID,
		UserID:    user.ID,
		Username:  user.Username,
		Role:      user.Role,
		Token:     token,
		CreatedAt: time.Now(),
		ExpiresAt: time.Unix(claims.ExpiresAt, 0),
		LastSeen:  time.Now(),
		IPAddress: ipAddress,
		UserAgent: userAgent,
		IsActive:  true,
	}

	sm.sessions[sessionID] = session
	return session, nil
}

// GetSession retrieves a session by ID
func (sm *SessionManager) GetSession(sessionID string) (*Session, error) {
	sm.mutex.RLock()
	defer sm.mutex.RUnlock()

	session, exists := sm.sessions[sessionID]
	if !exists {
		return nil, ErrSessionNotFound
	}

	if !session.IsActive {
		return nil, ErrSessionNotFound
	}

	if time.Now().After(session.ExpiresAt) {
		session.IsActive = false
		return nil, ErrSessionExpired
	}

	return session, nil
}

// GetSessionByToken retrieves a session by JWT token
func (sm *SessionManager) GetSessionByToken(token string) (*Session, error) {
	sm.mutex.RLock()
	defer sm.mutex.RUnlock()

	// Check if token is blacklisted
	if sm.blacklist[token] {
		return nil, ErrTokenBlacklisted
	}

	// Find session by token
	for _, session := range sm.sessions {
		if session.Token == token && session.IsActive {
			if time.Now().After(session.ExpiresAt) {
				session.IsActive = false
				continue
			}
			return session, nil
		}
	}

	return nil, ErrSessionNotFound
}

// UpdateSessionLastSeen updates the last seen time for a session
func (sm *SessionManager) UpdateSessionLastSeen(sessionID string) error {
	sm.mutex.Lock()
	defer sm.mutex.Unlock()

	session, exists := sm.sessions[sessionID]
	if !exists {
		return ErrSessionNotFound
	}

	if !session.IsActive {
		return ErrSessionNotFound
	}

	if time.Now().After(session.ExpiresAt) {
		session.IsActive = false
		return ErrSessionExpired
	}

	session.LastSeen = time.Now()
	return nil
}

// InvalidateSession invalidates a session
func (sm *SessionManager) InvalidateSession(sessionID string) error {
	sm.mutex.Lock()
	defer sm.mutex.Unlock()

	session, exists := sm.sessions[sessionID]
	if !exists {
		return ErrSessionNotFound
	}

	session.IsActive = false
	sm.blacklist[session.Token] = true
	return nil
}

// InvalidateUserSessions invalidates all sessions for a user
func (sm *SessionManager) InvalidateUserSessions(userID uint) error {
	sm.mutex.Lock()
	defer sm.mutex.Unlock()

	for _, session := range sm.sessions {
		if session.UserID == userID && session.IsActive {
			session.IsActive = false
			sm.blacklist[session.Token] = true
		}
	}

	return nil
}

// BlacklistToken adds a token to the blacklist
func (sm *SessionManager) BlacklistToken(token string) {
	sm.mutex.Lock()
	defer sm.mutex.Unlock()

	sm.blacklist[token] = true
}

// GetUserSessions returns all active sessions for a user
func (sm *SessionManager) GetUserSessions(userID uint) []*Session {
	sm.mutex.RLock()
	defer sm.mutex.RUnlock()

	var userSessions []*Session
	for _, session := range sm.sessions {
		if session.UserID == userID && session.IsActive && time.Now().Before(session.ExpiresAt) {
			userSessions = append(userSessions, session)
		}
	}

	return userSessions
}

// GetAllSessions returns all active sessions (admin only)
func (sm *SessionManager) GetAllSessions() []*Session {
	sm.mutex.RLock()
	defer sm.mutex.RUnlock()

	var activeSessions []*Session
	for _, session := range sm.sessions {
		if session.IsActive && time.Now().Before(session.ExpiresAt) {
			activeSessions = append(activeSessions, session)
		}
	}

	return activeSessions
}

// CleanupExpiredSessions removes expired sessions
func (sm *SessionManager) CleanupExpiredSessions() {
	sm.mutex.Lock()
	defer sm.mutex.Unlock()

	now := time.Now()
	for sessionID, session := range sm.sessions {
		if now.After(session.ExpiresAt) {
			session.IsActive = false
			sm.blacklist[session.Token] = true
			delete(sm.sessions, sessionID)
		}
	}
}

// GetSessionStats returns session statistics
func (sm *SessionManager) GetSessionStats() map[string]interface{} {
	sm.mutex.RLock()
	defer sm.mutex.RUnlock()

	activeCount := 0
	expiredCount := 0
	blacklistedCount := len(sm.blacklist)

	for _, session := range sm.sessions {
		if session.IsActive && time.Now().Before(session.ExpiresAt) {
			activeCount++
		} else {
			expiredCount++
		}
	}

	return map[string]interface{}{
		"active_sessions":    activeCount,
		"expired_sessions":   expiredCount,
		"blacklisted_tokens": blacklistedCount,
		"total_sessions":     len(sm.sessions),
	}
}

// generateSessionID generates a unique session ID
func generateSessionID() string {
	return "sess_" + time.Now().Format("20060102150405") + "_" + randomString(8)
}

// randomString generates a random string of specified length
func randomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}
	return string(b)
}

// Global session manager instance
var GlobalSessionManager = NewSessionManager()

// StartSessionCleanup starts a goroutine to clean up expired sessions
func StartSessionCleanup() {
	go func() {
		ticker := time.NewTicker(5 * time.Minute) // Clean up every 5 minutes
		defer ticker.Stop()

		for range ticker.C {
			GlobalSessionManager.CleanupExpiredSessions()
		}
	}()
}
