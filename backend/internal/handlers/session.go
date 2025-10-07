package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"golangmcp/internal/session"
)

// GetUserSessionsHandler returns all active sessions for the current user
func GetUserSessionsHandler(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	sessions := session.GlobalSessionManager.GetUserSessions(userID.(uint))
	c.JSON(http.StatusOK, gin.H{
		"sessions": sessions,
		"count":    len(sessions),
	})
}

// InvalidateSessionHandler invalidates a specific session
func InvalidateSessionHandler(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	sessionID := c.Param("sessionId")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Session ID required"})
		return
	}

	// Get session to verify ownership
	sess, err := session.GlobalSessionManager.GetSession(sessionID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	// Check if user owns this session
	if sess.UserID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only invalidate your own sessions"})
		return
	}

	err = session.GlobalSessionManager.InvalidateSession(sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to invalidate session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Session invalidated successfully",
	})
}

// InvalidateAllSessionsHandler invalidates all sessions for the current user
func InvalidateAllSessionsHandler(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	err := session.GlobalSessionManager.InvalidateUserSessions(userID.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to invalidate sessions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "All sessions invalidated successfully",
	})
}

// GetSessionStatsHandler returns session statistics (admin only)
func GetSessionStatsHandler(c *gin.Context) {
	stats := session.GlobalSessionManager.GetSessionStats()
	c.JSON(http.StatusOK, stats)
}

// GetAllSessionsHandler returns all active sessions (admin only)
func GetAllSessionsHandler(c *gin.Context) {
	sessions := session.GlobalSessionManager.GetAllSessions()
	c.JSON(http.StatusOK, gin.H{
		"sessions": sessions,
		"count":    len(sessions),
	})
}

// InvalidateUserSessionsHandler invalidates all sessions for a specific user (admin only)
func InvalidateUserSessionsHandler(c *gin.Context) {
	userIDStr := c.Param("userId")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	err = session.GlobalSessionManager.InvalidateUserSessions(uint(userID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to invalidate user sessions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "All sessions for user invalidated successfully",
	})
}

// SessionMiddleware validates session and updates last seen
func SessionMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		// Check if token starts with "Bearer "
		tokenString := authHeader[7:] // Remove "Bearer " prefix
		if len(authHeader) <= 7 {
			c.Next()
			return
		}

		// Get session by token
		sess, err := session.GlobalSessionManager.GetSessionByToken(tokenString)
		if err != nil {
			c.Next()
			return
		}

		// Update last seen
		session.GlobalSessionManager.UpdateSessionLastSeen(sess.ID)

		// Store session info in context
		c.Set("session_id", sess.ID)
		c.Set("session", sess)

		c.Next()
	}
}
