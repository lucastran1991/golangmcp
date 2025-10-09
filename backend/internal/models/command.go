package models

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
	"time"
	"gorm.io/gorm"
)

// Command represents a command execution record
type Command struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Command     string    `json:"command" gorm:"not null;index:idx_cmd_command"`
	Args        string    `json:"args" gorm:"type:text"`
	Output      string    `json:"output" gorm:"type:text"`
	ExitCode    int       `json:"exit_code" gorm:"index:idx_cmd_exit_code"`
	UserID      uint      `json:"user_id" gorm:"not null;index:idx_cmd_user_id"`
	User        User      `json:"user" gorm:"foreignKey:UserID"`
	WorkingDir  string    `json:"working_dir"`
	Environment string    `json:"environment" gorm:"type:text"`
	Duration    int64     `json:"duration"` // in milliseconds
	CreatedAt   time.Time `json:"created_at" gorm:"index:idx_cmd_created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TableName returns the table name for the Command model
func (Command) TableName() string {
	return "commands"
}

// CommandWhitelist represents allowed commands
type CommandWhitelist struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Command     string    `json:"command" gorm:"not null;uniqueIndex:idx_whitelist_command"`
	Description string    `json:"description" gorm:"type:text"`
	AllowedArgs string    `json:"allowed_args" gorm:"type:text"` // JSON array
	MaxDuration int       `json:"max_duration" gorm:"default:30000"` // 30 seconds default
	IsActive    bool      `json:"is_active" gorm:"default:true;index:idx_whitelist_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TableName returns the table name for the CommandWhitelist model
func (CommandWhitelist) TableName() string {
	return "command_whitelist"
}

// CommandExecutor handles command execution with security
type CommandExecutor struct {
	db           *gorm.DB
	queryBuilder *OptimizedQueryBuilder
	whitelist    map[string]*CommandWhitelist
}

// NewCommandExecutor creates a new command executor
func NewCommandExecutor(db *gorm.DB) *CommandExecutor {
	executor := &CommandExecutor{
		db:           db,
		queryBuilder: NewOptimizedQueryBuilder(db),
		whitelist:    make(map[string]*CommandWhitelist),
	}
	
	// Load whitelist into memory for fast access
	executor.loadWhitelist()
	
	return executor
}

// ExecuteCommand executes a command with security validation
func (ce *CommandExecutor) ExecuteCommand(ctx context.Context, command string, args []string, userID uint, workingDir string) (*Command, error) {
	// Validate command against whitelist
	if !ce.isCommandAllowed(command, args) {
		return nil, fmt.Errorf("command '%s' is not allowed", command)
	}

	// Create command record
	cmdRecord := &Command{
		Command:    command,
		Args:       strings.Join(args, " "),
		UserID:     userID,
		WorkingDir: workingDir,
		CreatedAt:  time.Now(),
	}

	// Execute the command
	startTime := time.Now()
	cmd := exec.CommandContext(ctx, command, args...)
	cmd.Dir = workingDir
	
	output, err := cmd.Output()
	endTime := time.Now()
	
	cmdRecord.Duration = endTime.Sub(startTime).Milliseconds()
	cmdRecord.Output = string(output)
	
	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			cmdRecord.ExitCode = exitError.ExitCode()
		} else {
			cmdRecord.ExitCode = -1
		}
		cmdRecord.Output += "\nError: " + err.Error()
	} else {
		cmdRecord.ExitCode = 0
	}

	// Save command record using optimized query
	if err := ce.db.Create(cmdRecord).Error; err != nil {
		return nil, fmt.Errorf("failed to save command record: %w", err)
	}

	return cmdRecord, nil
}

// isCommandAllowed checks if a command is allowed
func (ce *CommandExecutor) isCommandAllowed(command string, args []string) bool {
	whitelistEntry, exists := ce.whitelist[command]
	if !exists || !whitelistEntry.IsActive {
		return false
	}

	// Check if args are allowed (if specified)
	if whitelistEntry.AllowedArgs != "" {
		var allowedArgs []string
		if err := json.Unmarshal([]byte(whitelistEntry.AllowedArgs), &allowedArgs); err != nil {
			return false
		}
		
		for _, arg := range args {
			allowed := false
			for _, allowedArg := range allowedArgs {
				if arg == allowedArg || strings.HasPrefix(arg, allowedArg+"=") {
					allowed = true
					break
				}
			}
			if !allowed {
				return false
			}
		}
	}

	return true
}

// loadWhitelist loads command whitelist into memory
func (ce *CommandExecutor) loadWhitelist() error {
	var whitelist []CommandWhitelist
	if err := ce.db.Where("is_active = ?", true).Find(&whitelist).Error; err != nil {
		return err
	}

	ce.whitelist = make(map[string]*CommandWhitelist)
	for i := range whitelist {
		ce.whitelist[whitelist[i].Command] = &whitelist[i]
	}

	return nil
}

// GetCommandHistory retrieves command history with optimized query
func (ce *CommandExecutor) GetCommandHistory(userID *uint, limit, offset int) ([]Command, error) {
	var commands []Command
	query := ce.db.Select("id, command, args, output, exit_code, user_id, working_dir, duration, created_at").
		Preload("User", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, username, email, role")
		})

	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}

	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	err := query.Order("created_at DESC").Find(&commands).Error
	return commands, err
}

// GetCommandStats retrieves command execution statistics
func (ce *CommandExecutor) GetCommandStats() (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// Total commands
	var totalCommands int64
	err := ce.db.Model(&Command{}).Count(&totalCommands).Error
	if err != nil {
		return nil, err
	}
	stats["total_commands"] = totalCommands

	// Commands by user
	var userStats []struct {
		UserID uint
		Count  int64
	}
	err = ce.db.Model(&Command{}).Select("user_id, COUNT(*) as count").Group("user_id").Scan(&userStats).Error
	if err != nil {
		return nil, err
	}
	stats["commands_by_user"] = userStats

	// Commands by exit code
	var exitCodeStats []struct {
		ExitCode int
		Count    int64
	}
	err = ce.db.Model(&Command{}).Select("exit_code, COUNT(*) as count").Group("exit_code").Scan(&exitCodeStats).Error
	if err != nil {
		return nil, err
	}
	stats["commands_by_exit_code"] = exitCodeStats

	// Average execution time
	var avgDuration float64
	err = ce.db.Model(&Command{}).Select("AVG(duration)").Scan(&avgDuration).Error
	if err != nil {
		return nil, err
	}
	stats["average_duration_ms"] = avgDuration

	return stats, nil
}

// AddToWhitelist adds a command to the whitelist
func (ce *CommandExecutor) AddToWhitelist(command string, description string, allowedArgs []string, maxDuration int) error {
	argsJSON, err := json.Marshal(allowedArgs)
	if err != nil {
		return err
	}

	whitelistEntry := &CommandWhitelist{
		Command:     command,
		Description: description,
		AllowedArgs: string(argsJSON),
		MaxDuration: maxDuration,
		IsActive:    true,
	}

	if err := ce.db.Create(whitelistEntry).Error; err != nil {
		return err
	}

	// Reload whitelist
	return ce.loadWhitelist()
}

// RemoveFromWhitelist removes a command from the whitelist
func (ce *CommandExecutor) RemoveFromWhitelist(command string) error {
	result := ce.db.Model(&CommandWhitelist{}).Where("command = ?", command).Update("is_active", false)
	if result.Error != nil {
		return result.Error
	}

	// Reload whitelist
	return ce.loadWhitelist()
}

// InitializeDefaultWhitelist creates default allowed commands
func (ce *CommandExecutor) InitializeDefaultWhitelist() error {
	defaultCommands := []struct {
		command     string
		description string
		allowedArgs []string
		maxDuration int
	}{
		{"ls", "List directory contents", []string{"-l", "-a", "-h", "-la", "-lh"}, 5000},
		{"pwd", "Print working directory", []string{}, 1000},
		{"whoami", "Print current user", []string{}, 1000},
		{"date", "Print current date", []string{}, 1000},
		{"echo", "Print text", []string{}, 2000},
		{"cat", "Display file contents", []string{}, 5000},
		{"head", "Display first lines of file", []string{"-n", "-c"}, 5000},
		{"tail", "Display last lines of file", []string{"-n", "-c", "-f"}, 5000},
		{"grep", "Search text in files", []string{"-i", "-n", "-r", "-v"}, 10000},
		{"find", "Find files", []string{"-name", "-type", "-size", "-mtime"}, 15000},
	}

	for _, cmd := range defaultCommands {
		// Check if already exists
		var count int64
		ce.db.Model(&CommandWhitelist{}).Where("command = ?", cmd.command).Count(&count)
		if count == 0 {
			if err := ce.AddToWhitelist(cmd.command, cmd.description, cmd.allowedArgs, cmd.maxDuration); err != nil {
				return err
			}
		}
	}

	return nil
}
