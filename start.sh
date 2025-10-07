#!/bin/bash

# Start Backend and Frontend Services
# This script starts both the Golang backend and NextJS frontend

set -e

echo "🚀 Starting Golang MCP Full-Stack Application..."

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

# Function to start backend
start_backend() {
    echo -e "${BLUE}📦 Starting Backend (Golang API)...${NC}"
    
    if check_port 8080; then
        echo -e "${YELLOW}⚠️  Port 8080 is already in use. Backend might already be running.${NC}"
    else
        cd backend
        echo -e "${GREEN}🔧 Building Go application...${NC}"
        go build -o main main.go
        
        echo -e "${GREEN}🌐 Starting backend server on http://localhost:8080${NC}"
        nohup ./main > ../logs/backend.log 2>&1 &
        echo $! > ../backend.pid
        cd ..
        
        # Wait a moment for backend to start
        sleep 2
        
        if check_port 8080; then
            echo -e "${GREEN}✅ Backend started successfully!${NC}"
        else
            echo -e "${RED}❌ Failed to start backend. Check logs/backend.log${NC}"
            exit 1
        fi
    fi
}

# Function to start frontend
start_frontend() {
    echo -e "${BLUE}🎨 Starting Frontend (NextJS)...${NC}"
    
    if check_port 3000; then
        echo -e "${YELLOW}⚠️  Port 3000 is already in use. Frontend might already be running.${NC}"
    else
        cd frontend
        
        # Check if node_modules exists
        if [ ! -d "node_modules" ]; then
            echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
            npm install
        fi
        
        # Create .env.local if it doesn't exist
        if [ ! -f ".env.local" ]; then
            echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > .env.local
            echo -e "${GREEN}📝 Created .env.local file${NC}"
        fi
        
        echo -e "${GREEN}🌐 Starting frontend server on http://localhost:3000${NC}"
        nohup npm run dev > ../logs/frontend.log 2>&1 &
        echo $! > ../frontend.pid
        cd ..
        
        # Wait a moment for frontend to start
        sleep 3
        
        if check_port 3000; then
            echo -e "${GREEN}✅ Frontend started successfully!${NC}"
        else
            echo -e "${RED}❌ Failed to start frontend. Check logs/frontend.log${NC}"
            exit 1
        fi
    fi
}

# Create logs directory if it doesn't exist
mkdir -p logs

# Start services
start_backend
start_frontend

echo ""
echo -e "${GREEN}🎉 Full-Stack Application Started Successfully!${NC}"
echo ""
echo -e "${BLUE}📱 Frontend:${NC} http://localhost:3000"
echo -e "${BLUE}🔧 Backend API:${NC} http://localhost:8080"
echo -e "${BLUE}📚 API Documentation:${NC} http://localhost:8080/api"
echo -e "${BLUE}🔒 Security Status:${NC} http://localhost:8080/security/status"
echo ""
echo -e "${YELLOW}📋 To stop the services, run: ./stop.sh${NC}"
echo -e "${YELLOW}📋 To view logs, check: logs/backend.log and logs/frontend.log${NC}"
echo ""
