#!/bin/bash

# Stop Backend and Frontend Services
# This script stops both the Golang backend and NextJS frontend

set -e

echo "🛑 Stopping Golang MCP Full-Stack Application..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 0
    else
        return 1
    fi
}

# Function to stop backend
stop_backend() {
    echo -e "${BLUE}📦 Stopping Backend (Golang API)...${NC}"
    
    if [ -f "backend.pid" ]; then
        local pid=$(cat backend.pid)
        if ps -p $pid > /dev/null 2>&1; then
            echo -e "${GREEN}🔧 Stopping backend process (PID: $pid)...${NC}"
            kill $pid
            rm backend.pid
            echo -e "${GREEN}✅ Backend stopped successfully!${NC}"
        else
            echo -e "${YELLOW}⚠️  Backend process not found (PID: $pid)${NC}"
            rm -f backend.pid
        fi
    else
        echo -e "${YELLOW}⚠️  No backend PID file found${NC}"
    fi
    
    # Kill any remaining processes on port 8080
    if check_port 8080; then
        echo -e "${YELLOW}🔍 Found processes still running on port 8080, killing them...${NC}"
        local pids=$(lsof -ti:8080)
        if [ ! -z "$pids" ]; then
            echo $pids | xargs kill -9
            echo -e "${GREEN}✅ Killed remaining processes on port 8080${NC}"
        fi
    else
        echo -e "${GREEN}✅ Port 8080 is now free${NC}"
    fi
}

# Function to stop frontend
stop_frontend() {
    echo -e "${BLUE}🎨 Stopping Frontend (NextJS)...${NC}"
    
    if [ -f "frontend.pid" ]; then
        local pid=$(cat frontend.pid)
        if ps -p $pid > /dev/null 2>&1; then
            echo -e "${GREEN}🔧 Stopping frontend process (PID: $pid)...${NC}"
            kill $pid
            rm frontend.pid
            echo -e "${GREEN}✅ Frontend stopped successfully!${NC}"
        else
            echo -e "${YELLOW}⚠️  Frontend process not found (PID: $pid)${NC}"
            rm -f frontend.pid
        fi
    else
        echo -e "${YELLOW}⚠️  No frontend PID file found${NC}"
    fi
    
    # Kill any remaining processes on port 3000
    if check_port 3000; then
        echo -e "${YELLOW}🔍 Found processes still running on port 3000, killing them...${NC}"
        local pids=$(lsof -ti:3000)
        if [ ! -z "$pids" ]; then
            echo $pids | xargs kill -9
            echo -e "${GREEN}✅ Killed remaining processes on port 3000${NC}"
        fi
    else
        echo -e "${GREEN}✅ Port 3000 is now free${NC}"
    fi
}

# Function to cleanup
cleanup() {
    echo -e "${BLUE}🧹 Cleaning up...${NC}"
    
    # Remove PID files
    rm -f backend.pid frontend.pid
    
    # Kill any remaining Go processes
    local go_pids=$(pgrep -f "golangmcp\|main" || true)
    if [ ! -z "$go_pids" ]; then
        echo -e "${YELLOW}🔍 Found remaining Go processes, killing them...${NC}"
        echo $go_pids | xargs kill -9 2>/dev/null || true
    fi
    
    # Kill any remaining Node processes related to our project
    local node_pids=$(pgrep -f "next-server\|next dev" || true)
    if [ ! -z "$node_pids" ]; then
        echo -e "${YELLOW}🔍 Found remaining Node processes, killing them...${NC}"
        echo $node_pids | xargs kill -9 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✅ Cleanup completed!${NC}"
}

# Stop services
stop_backend
stop_frontend
cleanup

echo ""
echo -e "${GREEN}🎉 All Services Stopped Successfully!${NC}"
echo ""
echo -e "${YELLOW}📋 To start the services again, run: ./start.sh${NC}"
echo -e "${YELLOW}📋 Logs are available in: logs/backend.log and logs/frontend.log${NC}"
echo ""
