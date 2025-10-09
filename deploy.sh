#!/bin/bash

# =============================================================================
# Golang MCP Project Deployment Script for AWS EC2 with PM2
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="golangmcp"
BACKEND_PORT=8080
FRONTEND_PORT=3000
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
PM2_APP_NAME="golangmcp"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}================================${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    print_warning "Killing process on port $port..."
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Function to install system dependencies
install_dependencies() {
    print_header "Installing System Dependencies"
    
    # Update package list
    print_status "Updating package list..."
    sudo apt-get update -y
    
    # Install essential packages
    print_status "Installing essential packages..."
    sudo apt-get install -y curl wget git build-essential software-properties-common
    
    # Install Node.js 18.x
    if ! command_exists node; then
        print_status "Installing Node.js 18.x..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        print_status "Node.js already installed: $(node --version)"
    fi
    
    # Install Go
    if ! command_exists go; then
        print_status "Installing Go..."
        wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
        sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
        echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
        export PATH=$PATH:/usr/local/go/bin
        rm go1.21.5.linux-amd64.tar.gz
    else
        print_status "Go already installed: $(go version)"
    fi
    
    # Install PM2 globally
    if ! command_exists pm2; then
        print_status "Installing PM2..."
        sudo npm install -g pm2
    else
        print_status "PM2 already installed: $(pm2 --version)"
    fi
    
    # Install nginx (optional, for reverse proxy)
    if ! command_exists nginx; then
        print_status "Installing nginx..."
        sudo apt-get install -y nginx
    else
        print_status "Nginx already installed"
    fi
    
    print_success "System dependencies installed successfully"
}

# Function to setup project
setup_project() {
    print_header "Setting Up Project"
    
    # Create project directory
    PROJECT_DIR="/opt/$PROJECT_NAME"
    print_status "Setting up project directory: $PROJECT_DIR"
    
    if [ -d "$PROJECT_DIR" ]; then
        print_warning "Project directory already exists. Backing up..."
        sudo mv "$PROJECT_DIR" "${PROJECT_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
    fi
    
    sudo mkdir -p "$PROJECT_DIR"
    sudo chown -R $USER:$USER "$PROJECT_DIR"
    
    # Copy project files
    print_status "Copying project files..."
    cp -r . "$PROJECT_DIR/"
    cd "$PROJECT_DIR"
    
    print_success "Project setup completed"
}

# Function to build backend
build_backend() {
    print_header "Building Backend"
    
    cd "$PROJECT_DIR/$BACKEND_DIR"
    
    # Install Go dependencies
    print_status "Installing Go dependencies..."
    go mod tidy
    go mod download
    
    # Build the application
    print_status "Building Go application..."
    CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .
    
    # Make executable
    chmod +x main
    
    print_success "Backend built successfully"
}

# Function to build frontend
build_frontend() {
    print_header "Building Frontend"
    
    cd "$PROJECT_DIR/$FRONTEND_DIR"
    
    # Install Node.js dependencies
    print_status "Installing Node.js dependencies..."
    npm ci --production
    
    # Build the application
    print_status "Building Next.js application..."
    npm run build
    
    print_success "Frontend built successfully"
}

# Function to create PM2 ecosystem file
create_pm2_config() {
    print_header "Creating PM2 Configuration"
    
    cat > "$PROJECT_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [
    {
      name: '${PM2_APP_NAME}-backend',
      cwd: '$PROJECT_DIR/$BACKEND_DIR',
      script: './main',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: $BACKEND_PORT,
        GIN_MODE: 'release'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: $BACKEND_PORT,
        GIN_MODE: 'release'
      },
      log_file: '/var/log/pm2/${PM2_APP_NAME}-backend.log',
      out_file: '/var/log/pm2/${PM2_APP_NAME}-backend-out.log',
      error_file: '/var/log/pm2/${PM2_APP_NAME}-backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: '${PM2_APP_NAME}-frontend',
      cwd: '$PROJECT_DIR/$FRONTEND_DIR',
      script: 'npm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: $FRONTEND_PORT,
        NEXT_PUBLIC_API_URL: 'http://localhost:$BACKEND_PORT'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: $FRONTEND_PORT,
        NEXT_PUBLIC_API_URL: 'http://localhost:$BACKEND_PORT'
      },
      log_file: '/var/log/pm2/${PM2_APP_NAME}-frontend.log',
      out_file: '/var/log/pm2/${PM2_APP_NAME}-frontend-out.log',
      error_file: '/var/log/pm2/${PM2_APP_NAME}-frontend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
EOF
    
    print_success "PM2 configuration created"
}

# Function to setup nginx reverse proxy
setup_nginx() {
    print_header "Setting Up Nginx Reverse Proxy"
    
    # Create nginx configuration
    sudo tee /etc/nginx/sites-available/$PROJECT_NAME << EOF
server {
    listen 80;
    server_name _;
    
    # Frontend
    location / {
        proxy_pass http://localhost:$FRONTEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:$BACKEND_PORT/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # WebSocket support
    location /ws/ {
        proxy_pass http://localhost:$BACKEND_PORT/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    
    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/$PROJECT_NAME /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test nginx configuration
    sudo nginx -t
    
    # Restart nginx
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    
    print_success "Nginx reverse proxy configured"
}

# Function to setup PM2 startup script
setup_pm2_startup() {
    print_header "Setting Up PM2 Startup"
    
    # Generate startup script
    pm2 startup
    
    # Create log directory
    sudo mkdir -p /var/log/pm2
    sudo chown -R $USER:$USER /var/log/pm2
    
    print_success "PM2 startup configured"
}

# Function to deploy application
deploy_app() {
    print_header "Deploying Application"
    
    # Stop existing PM2 processes
    print_status "Stopping existing PM2 processes..."
    pm2 stop $PM2_APP_NAME-backend 2>/dev/null || true
    pm2 stop $PM2_APP_NAME-frontend 2>/dev/null || true
    pm2 delete $PM2_APP_NAME-backend 2>/dev/null || true
    pm2 delete $PM2_APP_NAME-frontend 2>/dev/null || true
    
    # Kill processes on ports
    kill_port $BACKEND_PORT
    kill_port $FRONTEND_PORT
    
    # Start applications with PM2
    print_status "Starting applications with PM2..."
    cd "$PROJECT_DIR"
    pm2 start ecosystem.config.js --env production
    
    # Save PM2 configuration
    pm2 save
    
    print_success "Application deployed successfully"
}

# Function to show status
show_status() {
    print_header "Deployment Status"
    
    echo -e "${CYAN}PM2 Process Status:${NC}"
    pm2 status
    
    echo -e "\n${CYAN}Port Status:${NC}"
    if check_port $BACKEND_PORT; then
        print_success "Backend running on port $BACKEND_PORT"
    else
        print_error "Backend not running on port $BACKEND_PORT"
    fi
    
    if check_port $FRONTEND_PORT; then
        print_success "Frontend running on port $FRONTEND_PORT"
    else
        print_error "Frontend not running on port $FRONTEND_PORT"
    fi
    
    echo -e "\n${CYAN}Nginx Status:${NC}"
    sudo systemctl status nginx --no-pager -l
    
    echo -e "\n${CYAN}Application URLs:${NC}"
    echo -e "Frontend: ${GREEN}http://$(curl -s ifconfig.me)${NC}"
    echo -e "Backend API: ${GREEN}http://$(curl -s ifconfig.me)/api${NC}"
}

# Function to show logs
show_logs() {
    local service=${1:-"all"}
    
    case $service in
        "backend")
            pm2 logs $PM2_APP_NAME-backend
            ;;
        "frontend")
            pm2 logs $PM2_APP_NAME-frontend
            ;;
        "all"|*)
            pm2 logs
            ;;
    esac
}

# Function to restart application
restart_app() {
    print_header "Restarting Application"
    
    pm2 restart $PM2_APP_NAME-backend
    pm2 restart $PM2_APP_NAME-frontend
    
    print_success "Application restarted"
}

# Function to stop application
stop_app() {
    print_header "Stopping Application"
    
    pm2 stop $PM2_APP_NAME-backend
    pm2 stop $PM2_APP_NAME-frontend
    
    print_success "Application stopped"
}

# Function to update application
update_app() {
    print_header "Updating Application"
    
    # Pull latest changes
    print_status "Pulling latest changes..."
    git pull origin main
    
    # Rebuild and redeploy
    build_backend
    build_frontend
    deploy_app
    
    print_success "Application updated successfully"
}

# Main deployment function
main_deploy() {
    print_header "Starting Golang MCP Project Deployment"
    
    install_dependencies
    setup_project
    build_backend
    build_frontend
    create_pm2_config
    setup_nginx
    setup_pm2_startup
    deploy_app
    show_status
    
    print_success "Deployment completed successfully!"
    echo -e "\n${GREEN}Your application is now running at:${NC}"
    echo -e "Frontend: ${CYAN}http://$(curl -s ifconfig.me)${NC}"
    echo -e "Backend API: ${CYAN}http://$(curl -s ifconfig.me)/api${NC}"
    echo -e "\n${YELLOW}Useful commands:${NC}"
    echo -e "  pm2 status                    # Check application status"
    echo -e "  pm2 logs                     # View logs"
    echo -e "  pm2 restart all              # Restart applications"
    echo -e "  pm2 stop all                 # Stop applications"
    echo -e "  ./deploy.sh status           # Show deployment status"
    echo -e "  ./deploy.sh logs [service]   # View specific logs"
}

# Parse command line arguments
case "${1:-deploy}" in
    "deploy")
        main_deploy
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs "$2"
        ;;
    "restart")
        restart_app
        ;;
    "stop")
        stop_app
        ;;
    "update")
        update_app
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  deploy    Deploy the application (default)"
        echo "  status    Show deployment status"
        echo "  logs      Show logs [backend|frontend|all]"
        echo "  restart   Restart the application"
        echo "  stop      Stop the application"
        echo "  update    Update and redeploy the application"
        echo "  help      Show this help message"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' for available commands"
        exit 1
        ;;
esac