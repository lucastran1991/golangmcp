# Task Master AI MCP Server for Cursor

This setup enables **Task Master AI** integration with **Cursor** via the **Model Context Protocol (MCP)**.

## ✅ Installation Complete!

### What's Installed:
- ✅ **Task Master AI v0.27.3** - Main task management system
- ✅ **Custom MCP Server** - Bridge between Cursor and Task Master AI
- ✅ **Cursor Configuration** - MCP server registered in `~/.cursor/mcp.json`

## 🔧 Configuration

### MCP Configuration (`~/.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "task-master-ai": {
      "command": "node",
      "args": ["/Users/mac/studio/golangmcp/task-master-mcp-server.js"],
      "type": "stdio",
      "env": {
        "PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
        "TASK_MASTER_PATH": "/opt/homebrew/bin/task-master"
      }
    }
  }
}
```

## 🚀 How to Use in Cursor

### 1. **Open Cursor**
- Make sure Cursor is closed and restart it to load the new MCP server

### 2. **Available Commands in Cursor AI Chat:**

#### **📋 List Tasks**
```
@task-master-ai list all my tasks
```
Or with filtering:
```
@task-master-ai list tasks with status pending
```

#### **🔍 Show Task Details**
```
@task-master-ai show me details for task 12.3
```

#### **➡️ Get Next Task**
```
@task-master-ai what should I work on next?
```

#### **✅ Update Task Status**
```
@task-master-ai mark task 12.3 as in-progress
```

### 3. **Integration Workflow:**

1. **Start in Terminal:**
   ```bash
   tm list        # See available tasks
   tm next        # Get next task to work on
   ```

2. **Work in Cursor:**
   - Open Cursor AI chat
   - Ask: `@task-master-ai what should I work on next?`
   - Get task details: `@task-master-ai show me task 12.3`
   - Use Cursor AI to implement the task

3. **Update Status:**
   - In Cursor: `@task-master-ai mark task 12.3 as done`
   - Or in Terminal: `tm set-status --id=12.3 --status=done`

## 🛠️ Available MCP Tools

The MCP server provides these tools to Cursor:

| Tool | Description | Example Usage |
|------|-------------|---------------|
| `task_master_list` | List all tasks | Filter by status |
| `task_master_show` | Show task details | Get implementation details |
| `task_master_next` | Get next task | Find what to work on |
| `task_master_set_status` | Update task status | Mark as done/in-progress |

## ✨ Benefits

### **🎯 Seamless Integration**
- No context switching between Terminal and Cursor
- AI understands your current task progress
- Automatic task dependency tracking

### **🤖 AI-Powered Development**
- Cursor AI knows your project tasks
- Can suggest implementations based on task requirements
- Maintains context across development sessions

### **📊 Progress Tracking**
- Real-time task status updates
- Dependency-aware task ordering
- Comprehensive project overview

## 🧪 Testing

Test the MCP server independently:
```bash
node test-mcp-server.js
```

## 🐛 Troubleshooting

### **MCP Server Not Loading in Cursor:**
1. Check Cursor logs in Developer Tools
2. Verify the path in `mcp.json` is correct
3. Restart Cursor completely

### **Task Master Commands Not Working:**
1. Verify Task Master AI is installed: `task-master --version`
2. Check if you're in a Task Master project directory
3. Initialize if needed: `task-master init`

### **Permission Issues:**
```bash
chmod +x /Users/mac/studio/golangmcp/task-master-mcp-server.js
```

## 📁 Files Created

- `task-master-mcp-server.js` - Custom MCP server implementation
- `test-mcp-server.js` - Testing script
- `TASK_MASTER_MCP_README.md` - This documentation
- Updated `~/.cursor/mcp.json` - Cursor MCP configuration

## 🎉 You're All Set!

Your Task Master AI MCP server is now ready to use with Cursor! 

**Next Steps:**
1. Restart Cursor
2. Open AI chat in Cursor
3. Try: `@task-master-ai what should I work on next?`
4. Start coding with AI assistance that knows your tasks!

---

*For more Task Master AI commands, run `task-master --help` in your terminal.*