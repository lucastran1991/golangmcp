package handlers

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"golangmcp/internal/models"
	"golangmcp/internal/db"
)

// CommandHandlers provides handlers for command execution
type CommandHandlers struct {
	executor *models.CommandExecutor
}

// NewCommandHandlers creates new command handlers
func NewCommandHandlers() *CommandHandlers {
	return &CommandHandlers{
		executor: models.NewCommandExecutor(db.DB),
	}
}

// ExecuteCommandHandler handles command execution requests
func (ch *CommandHandlers) ExecuteCommandHandler(c *gin.Context) {
	var request struct {
		Command    string   `json:"command" binding:"required"`
		Args       []string `json:"args"`
		WorkingDir string   `json:"working_dir"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Set default working directory
	if request.WorkingDir == "" {
		request.WorkingDir = "/tmp"
	}

	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Execute command
	cmdRecord, err := ch.executor.ExecuteCommand(ctx, request.Command, request.Args, userID.(uint), request.WorkingDir)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": cmdRecord,
		"message": "Command executed successfully",
	})
}

// GetCommandHistoryHandler retrieves command history
func (ch *CommandHandlers) GetCommandHistoryHandler(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")
	userIDStr := c.Query("user_id")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 50
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	var userID *uint
	if userIDStr != "" {
		if id, err := strconv.ParseUint(userIDStr, 10, 32); err == nil {
			uid := uint(id)
			userID = &uid
		}
	}

	commands, err := ch.executor.GetCommandHistory(userID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch command history"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": commands,
		"pagination": gin.H{
			"limit":  limit,
			"offset": offset,
			"count":  len(commands),
		},
	})
}

// GetCommandStatsHandler retrieves command execution statistics
func (ch *CommandHandlers) GetCommandStatsHandler(c *gin.Context) {
	stats, err := ch.executor.GetCommandStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch command statistics"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": stats,
	})
}

// GetCommandWhitelistHandler retrieves the command whitelist
func (ch *CommandHandlers) GetCommandWhitelistHandler(c *gin.Context) {
	var whitelist []models.CommandWhitelist
	err := db.DB.Where("is_active = ?", true).Find(&whitelist).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch command whitelist"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": whitelist,
	})
}

// AddToWhitelistHandler adds a command to the whitelist
func (ch *CommandHandlers) AddToWhitelistHandler(c *gin.Context) {
	var request struct {
		Command     string   `json:"command" binding:"required"`
		Description string   `json:"description"`
		AllowedArgs []string `json:"allowed_args"`
		MaxDuration int      `json:"max_duration"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if request.MaxDuration == 0 {
		request.MaxDuration = 30000 // 30 seconds default
	}

	err := ch.executor.AddToWhitelist(request.Command, request.Description, request.AllowedArgs, request.MaxDuration)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add command to whitelist"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Command added to whitelist successfully",
	})
}

// RemoveFromWhitelistHandler removes a command from the whitelist
func (ch *CommandHandlers) RemoveFromWhitelistHandler(c *gin.Context) {
	command := c.Param("command")
	if command == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Command parameter is required"})
		return
	}

	err := ch.executor.RemoveFromWhitelist(command)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove command from whitelist"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Command removed from whitelist successfully",
	})
}

// InitializeWhitelistHandler initializes the default command whitelist
func (ch *CommandHandlers) InitializeWhitelistHandler(c *gin.Context) {
	err := ch.executor.InitializeDefaultWhitelist()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize whitelist"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Default command whitelist initialized successfully",
	})
}

// GetCommandHandler retrieves a specific command by ID
func (ch *CommandHandlers) GetCommandHandler(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid command ID"})
		return
	}

	var command models.Command
	err = db.DB.Preload("User").First(&command, uint(id)).Error
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Command not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": command,
	})
}
