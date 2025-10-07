package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"golangmcp/internal/authorization"
	"golangmcp/internal/db"
	"golangmcp/internal/models"
)

// RequirePermission is a convenience function that wraps authorization.RequirePermission
func RequirePermission(permission string) gin.HandlerFunc {
	return authorization.RequirePermission(permission)
}

// GetRolesHandler returns all available roles
func GetRolesHandler(c *gin.Context) {
	roles := authorization.GetAllRoles()
	c.JSON(http.StatusOK, gin.H{
		"roles": roles,
	})
}

// GetPermissionsHandler returns all available permissions
func GetPermissionsHandler(c *gin.Context) {
	permissions := authorization.GetAllPermissions()
	c.JSON(http.StatusOK, gin.H{
		"permissions": permissions,
	})
}

// GetUserPermissionsHandler returns permissions for the current user
func GetUserPermissionsHandler(c *gin.Context) {
	role, exists := c.Get("role")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User role not found"})
		return
	}

	roleName, ok := role.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid role type"})
		return
	}

	permissions := authorization.GetUserPermissions(roleName)
	roleInfo, err := authorization.GetRoleInfo(roleName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get role info"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"role":        roleName,
		"permissions": permissions,
		"role_info":   roleInfo,
	})
}

// AssignRoleHandler assigns a role to a user (admin only)
func AssignRoleHandler(c *gin.Context) {
	userIDStr := c.Param("userId")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req struct {
		Role string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get current user role
	currentUserRole, exists := c.Get("role")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Current user role not found"})
		return
	}

	currentRoleName, ok := currentUserRole.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid current user role"})
		return
	}

	// Validate role assignment
	if !authorization.ValidateRoleAssignment(currentRoleName, req.Role) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You cannot assign this role"})
		return
	}

	// Check if target role exists
	_, err = authorization.GetRoleInfo(req.Role)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role"})
		return
	}

	// Get user
	var user models.User
	err = user.GetByID(db.DB, uint(userID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Update user role
	user.Role = req.Role
	err = user.Update(db.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user role"})
		return
	}

	// Clear password from response
	user.Password = ""

	c.JSON(http.StatusOK, gin.H{
		"message": "Role assigned successfully",
		"user":    user,
	})
}

// CheckPermissionHandler checks if current user has a specific permission
func CheckPermissionHandler(c *gin.Context) {
	permission := c.Query("permission")
	if permission == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Permission parameter required"})
		return
	}

	role, exists := c.Get("role")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User role not found"})
		return
	}

	roleName, ok := role.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid role type"})
		return
	}

	hasPermission := authorization.HasPermission(roleName, permission)

	c.JSON(http.StatusOK, gin.H{
		"permission":     permission,
		"has_permission": hasPermission,
		"user_role":      roleName,
	})
}

// CheckResourceAccessHandler checks if user can access a specific resource
func CheckResourceAccessHandler(c *gin.Context) {
	resource := c.Query("resource")
	action := c.Query("action")

	if resource == "" || action == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Resource and action parameters required"})
		return
	}

	role, exists := c.Get("role")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User role not found"})
		return
	}

	roleName, ok := role.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid role type"})
		return
	}

	canAccess := authorization.CheckResourceAccess(roleName, resource, action)

	c.JSON(http.StatusOK, gin.H{
		"resource":    resource,
		"action":      action,
		"can_access":  canAccess,
		"user_role":   roleName,
	})
}

// GetRoleStatsHandler returns role statistics (admin only)
func GetRoleStatsHandler(c *gin.Context) {
	// Count users by role
	roleStats := make(map[string]int)
	
	for roleName := range authorization.GetAllRoles() {
		var count int64
		db.DB.Model(&models.User{}).Where("role = ?", roleName).Count(&count)
		roleStats[roleName] = int(count)
	}

	c.JSON(http.StatusOK, gin.H{
		"role_statistics": roleStats,
		"total_roles":     len(authorization.GetAllRoles()),
		"total_permissions": len(authorization.GetAllPermissions()),
	})
}

// BulkRoleAssignmentHandler assigns roles to multiple users (admin only)
func BulkRoleAssignmentHandler(c *gin.Context) {
	var req struct {
		UserIDs []uint `json:"user_ids" binding:"required"`
		Role    string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get current user role
	currentUserRole, exists := c.Get("role")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Current user role not found"})
		return
	}

	currentRoleName, ok := currentUserRole.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid current user role"})
		return
	}

	// Validate role assignment
	if !authorization.ValidateRoleAssignment(currentRoleName, req.Role) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You cannot assign this role"})
		return
	}

	// Check if target role exists
	_, err := authorization.GetRoleInfo(req.Role)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role"})
		return
	}

	// Update users
	var updatedUsers []models.User
	var failedUsers []uint

	for _, userID := range req.UserIDs {
		var user models.User
		err := user.GetByID(db.DB, userID)
		if err != nil {
			failedUsers = append(failedUsers, userID)
			continue
		}

		user.Role = req.Role
		err = user.Update(db.DB)
		if err != nil {
			failedUsers = append(failedUsers, userID)
			continue
		}

		user.Password = "" // Clear password
		updatedUsers = append(updatedUsers, user)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":        "Bulk role assignment completed",
		"updated_users":  updatedUsers,
		"failed_users":   failedUsers,
		"success_count":  len(updatedUsers),
		"failed_count":   len(failedUsers),
	})
}
