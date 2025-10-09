#!/bin/bash

# =============================================================================
# Docker Deployment Script for Golang MCP Project
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
PROJECT_NAME="golangmcp"
COMPOSE_FILE="docker-compose.yml"

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

# Function to check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
}

# Function to install Docker
install_docker() {
    print_header "Installing Docker"
    
    # Update package list
    sudo apt-get update -y
    
    # Install required packages
    sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
    
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    
    # Install Docker Compose
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    print_success "Docker installed successfully"
    print_warning "Please log out and log back in for Docker group changes to take effect"
}

# Function to build and start services
deploy() {
    print_header "Deploying with Docker"
    
    check_docker
    
    # Stop existing containers
    print_status "Stopping existing containers..."
    docker-compose -f $COMPOSE_FILE down 2>/dev/null || true
    
    # Build and start services
    print_status "Building and starting services..."
    docker-compose -f $COMPOSE_FILE up --build -d
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 30
    
    # Check service status
    print_status "Checking service status..."
    docker-compose -f $COMPOSE_FILE ps
    
    print_success "Deployment completed successfully!"
}

# Function to show status
show_status() {
    print_header "Docker Deployment Status"
    
    echo -e "${CYAN}Container Status:${NC}"
    docker-compose -f $COMPOSE_FILE ps
    
    echo -e "\n${CYAN}Service Health:${NC}"
    
    # Check backend health
    if curl -f http://localhost:8080/api/health >/dev/null 2>&1; then
        print_success "Backend is healthy"
    else
        print_error "Backend is not responding"
    fi
    
    # Check frontend health
    if curl -f http://localhost:3000 >/dev/null 2>&1; then
        print_success "Frontend is healthy"
    else
        print_error "Frontend is not responding"
    fi
    
    # Check nginx health
    if curl -f http://localhost >/dev/null 2>&1; then
        print_success "Nginx is healthy"
    else
        print_error "Nginx is not responding"
    fi
    
    echo -e "\n${CYAN}Application URLs:${NC}"
    echo -e "Frontend: ${GREEN}http://$(curl -s ifconfig.me)${NC}"
    echo -e "Backend API: ${GREEN}http://$(curl -s ifconfig.me)/api${NC}"
}

# Function to show logs
show_logs() {
    local service=${1:-"all"}
    
    case $service in
        "backend")
            docker-compose -f $COMPOSE_FILE logs -f backend
            ;;
        "frontend")
            docker-compose -f $COMPOSE_FILE logs -f frontend
            ;;
        "nginx")
            docker-compose -f $COMPOSE_FILE logs -f nginx
            ;;
        "all"|*)
            docker-compose -f $COMPOSE_FILE logs -f
            ;;
    esac
}

# Function to restart services
restart() {
    print_header "Restarting Services"
    
    docker-compose -f $COMPOSE_FILE restart
    
    print_success "Services restarted"
}

# Function to stop services
stop() {
    print_header "Stopping Services"
    
    docker-compose -f $COMPOSE_FILE down
    
    print_success "Services stopped"
}

# Function to update services
update() {
    print_header "Updating Services"
    
    # Pull latest changes
    print_status "Pulling latest changes..."
    git pull origin main
    
    # Rebuild and restart
    print_status "Rebuilding and restarting services..."
    docker-compose -f $COMPOSE_FILE up --build -d
    
    print_success "Services updated"
}

# Function to clean up
cleanup() {
    print_header "Cleaning Up"
    
    # Stop and remove containers
    docker-compose -f $COMPOSE_FILE down
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes
    docker volume prune -f
    
    print_success "Cleanup completed"
}

# Function to backup
backup() {
    print_header "Creating Backup"
    
    local backup_dir="backup-$(date +%Y%m%d_%H%M%S)"
    mkdir -p $backup_dir
    
    # Backup docker-compose file
    cp $COMPOSE_FILE $backup_dir/
    
    # Backup nginx configuration
    cp nginx.conf $backup_dir/
    
    # Backup uploads directory
    if [ -d "backend/uploads" ]; then
        cp -r backend/uploads $backup_dir/
    fi
    
    # Create backup archive
    tar -czf ${backup_dir}.tar.gz $backup_dir
    rm -rf $backup_dir
    
    print_success "Backup created: ${backup_dir}.tar.gz"
}

# Main function
main() {
    case "${1:-deploy}" in
        "install-docker")
            install_docker
            ;;
        "deploy")
            deploy
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs "$2"
            ;;
        "restart")
            restart
            ;;
        "stop")
            stop
            ;;
        "update")
            update
            ;;
        "cleanup")
            cleanup
            ;;
        "backup")
            backup
            ;;
        "help"|"-h"|"--help")
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  install-docker    Install Docker and Docker Compose"
            echo "  deploy           Deploy the application (default)"
            echo "  status           Show deployment status"
            echo "  logs             Show logs [backend|frontend|nginx|all]"
            echo "  restart          Restart the application"
            echo "  stop             Stop the application"
            echo "  update           Update and redeploy the application"
            echo "  cleanup          Clean up unused Docker resources"
            echo "  backup           Create a backup"
            echo "  help             Show this help message"
            ;;
        *)
            print_error "Unknown command: $1"
            echo "Use '$0 help' for available commands"
            exit 1
            ;;
    esac
}

main "$@"
