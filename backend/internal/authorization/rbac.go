package authorization

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Role represents a user role with permissions
type Role struct {
	Name        string   `json:"name"`
	Permissions []string `json:"permissions"`
	Level       int      `json:"level"` // Higher level = more privileges
}

// Permission represents a specific permission
type Permission struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Resource    string `json:"resource"`
	Action      string `json:"action"`
}

// Predefined roles and permissions
var (
	// Role definitions
	Roles = map[string]*Role{
		"admin": {
			Name:        "admin",
			Permissions: []string{"*"}, // Admin has all permissions
			Level:       100,
		},
		"moderator": {
			Name:        "moderator",
			Permissions: []string{"user.read", "user.update", "user.delete", "session.read", "session.delete"},
			Level:       50,
		},
		"user": {
			Name:        "user",
			Permissions: []string{"profile.read", "profile.update", "profile.avatar.upload", "profile.avatar.delete", "session.read", "session.delete.own"},
			Level:       10,
		},
		"guest": {
			Name:        "guest",
			Permissions: []string{"auth.register", "auth.login"},
			Level:       1,
		},
	}

	// Permission definitions
	Permissions = map[string]*Permission{
		"*":                    {"*", "All permissions", "*", "*"},
		"user.read":           {"user.read", "Read user information", "user", "read"},
		"user.create":         {"user.create", "Create new users", "user", "create"},
		"user.update":         {"user.update", "Update user information", "user", "update"},
		"user.delete":         {"user.delete", "Delete users", "user", "delete"},
		"profile.read":        {"profile.read", "Read own profile", "profile", "read"},
		"profile.update":      {"profile.update", "Update own profile", "profile", "update"},
		"profile.avatar.upload": {"profile.avatar.upload", "Upload avatar", "profile", "avatar.upload"},
		"profile.avatar.delete": {"profile.avatar.delete", "Delete avatar", "profile", "avatar.delete"},
		"session.read":        {"session.read", "Read session information", "session", "read"},
		"session.delete":      {"session.delete", "Delete any session", "session", "delete"},
		"session.delete.own":   {"session.delete.own", "Delete own sessions", "session", "delete.own"},
		"auth.register":       {"auth.register", "Register new account", "auth", "register"},
		"auth.login":          {"auth.login", "Login to account", "auth", "login"},
		"admin.stats":         {"admin.stats", "View admin statistics", "admin", "stats"},
		"admin.users":         {"admin.users", "Manage all users", "admin", "users"},
		"admin.sessions":      {"admin.sessions", "Manage all sessions", "admin", "sessions"},
	}

	ErrInsufficientPermissions = errors.New("insufficient permissions")
	ErrRoleNotFound           = errors.New("role not found")
	ErrPermissionDenied       = errors.New("permission denied")
)

// HasPermission checks if a role has a specific permission
func HasPermission(roleName, permission string) bool {
	role, exists := Roles[roleName]
	if !exists {
		return false
	}

	// Admin has all permissions
	if role.Name == "admin" {
		return true
	}

	// Check if role has the specific permission
	for _, perm := range role.Permissions {
		if perm == permission || perm == "*" {
			return true
		}
	}

	return false
}

// RequirePermission middleware that checks if user has required permission
func RequirePermission(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User role not found"})
			c.Abort()
			return
		}

		roleName, ok := role.(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid role type"})
			c.Abort()
			return
		}

		if !HasPermission(roleName, permission) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Insufficient permissions",
				"required_permission": permission,
				"user_role": roleName,
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireRole middleware that checks if user has required role or higher
func RequireRole(requiredRole string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User role not found"})
			c.Abort()
			return
		}

		userRoleName, ok := role.(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid role type"})
			c.Abort()
			return
		}

		userRole, exists := Roles[userRoleName]
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user role"})
			c.Abort()
			return
		}

		requiredRoleObj, exists := Roles[requiredRole]
		if !exists {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid required role"})
			c.Abort()
			return
		}

		if userRole.Level < requiredRoleObj.Level {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Insufficient role level",
				"required_role": requiredRole,
				"user_role": userRoleName,
				"required_level": requiredRoleObj.Level,
				"user_level": userRole.Level,
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireAnyRole middleware that checks if user has any of the required roles
func RequireAnyRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User role not found"})
			c.Abort()
			return
		}

		userRoleName, ok := role.(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid role type"})
			c.Abort()
			return
		}

		for _, requiredRole := range roles {
			if userRoleName == requiredRole {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{
			"error": "Insufficient role",
			"required_roles": roles,
			"user_role": userRoleName,
		})
		c.Abort()
	}
}

// CanAccessResource checks if user can access a specific resource
func CanAccessResource(userRole, resource, action string) bool {
	permission := resource + "." + action
	return HasPermission(userRole, permission)
}

// GetUserPermissions returns all permissions for a role
func GetUserPermissions(roleName string) []string {
	role, exists := Roles[roleName]
	if !exists {
		return []string{}
	}

	return role.Permissions
}

// GetRoleInfo returns role information
func GetRoleInfo(roleName string) (*Role, error) {
	role, exists := Roles[roleName]
	if !exists {
		return nil, ErrRoleNotFound
	}

	return role, nil
}

// GetAllRoles returns all available roles
func GetAllRoles() map[string]*Role {
	return Roles
}

// GetAllPermissions returns all available permissions
func GetAllPermissions() map[string]*Permission {
	return Permissions
}

// CheckResourceAccess checks if user can access a specific resource with action
func CheckResourceAccess(userRole, resource, action string) bool {
	// Admin can access everything
	if userRole == "admin" {
		return true
	}

	// Check specific permission
	permission := resource + "." + action
	if HasPermission(userRole, permission) {
		return true
	}

	// Check wildcard permissions
	if HasPermission(userRole, resource+".*") {
		return true
	}

	return false
}

// ValidateRoleAssignment checks if a role can be assigned to a user
func ValidateRoleAssignment(currentUserRole, targetRole string) bool {
	currentRole, exists := Roles[currentUserRole]
	if !exists {
		return false
	}

	targetRoleObj, exists := Roles[targetRole]
	if !exists {
		return false
	}

	// Users can only assign roles with lower or equal level
	return currentRole.Level >= targetRoleObj.Level
}
