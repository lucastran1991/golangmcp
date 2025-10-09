#!/bin/bash

# =============================================================================
# AWS EC2 Setup Script for Golang MCP Project
# Run this script on a fresh Ubuntu EC2 instance
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

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

# Check if running on Ubuntu
if ! grep -q "Ubuntu" /etc/os-release; then
    print_error "This script is designed for Ubuntu. Please use Ubuntu 20.04+ on your EC2 instance."
    exit 1
fi

print_header "AWS EC2 Setup for Golang MCP Project"

# Update system
print_status "Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# Install essential packages
print_status "Installing essential packages..."
sudo apt-get install -y curl wget git build-essential software-properties-common unzip

# Install Node.js 18.x
print_status "Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Go
print_status "Installing Go 1.21.5..."
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
export PATH=$PATH:/usr/local/go/bin
rm go1.21.5.linux-amd64.tar.gz

# Install PM2
print_status "Installing PM2..."
sudo npm install -g pm2

# Install Nginx
print_status "Installing Nginx..."
sudo apt-get install -y nginx

# Configure firewall
print_status "Configuring firewall..."
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Create project directory
print_status "Setting up project directory..."
sudo mkdir -p /opt/golangmcp
sudo chown -R $USER:$USER /opt/golangmcp

# Create log directories
print_status "Creating log directories..."
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

print_success "EC2 setup completed successfully!"

print_header "Next Steps"
echo -e "${YELLOW}1. Clone your repository:${NC}"
echo "   git clone <your-repository-url>"
echo "   cd golangmcp"
echo ""
echo -e "${YELLOW}2. Run the deployment script:${NC}"
echo "   chmod +x deploy.sh"
echo "   ./deploy.sh deploy"
echo ""
echo -e "${YELLOW}3. Check deployment status:${NC}"
echo "   ./deploy.sh status"
echo ""
echo -e "${YELLOW}4. View logs:${NC}"
echo "   ./deploy.sh logs"
echo ""
echo -e "${GREEN}Your EC2 instance is now ready for deployment!${NC}"
