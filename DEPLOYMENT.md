# Golang MCP Project Deployment Guide

This guide provides comprehensive instructions for deploying the Golang MCP project on AWS EC2 using PM2 for process management and Nginx as a reverse proxy.

## Prerequisites

- AWS EC2 instance (Ubuntu 20.04+ recommended)
- SSH access to the EC2 instance
- Domain name (optional, for production)

## Quick Start

1. **Clone the repository on your EC2 instance:**
   ```bash
   git clone <your-repository-url>
   cd golangmcp
   ```

2. **Make the deployment script executable:**
   ```bash
   chmod +x deploy.sh
   ```

3. **Run the deployment:**
   ```bash
   ./deploy.sh deploy
   ```

## Deployment Script Commands

The `deploy.sh` script provides several commands for managing your deployment:

### Main Commands

- `./deploy.sh deploy` - Full deployment (installs dependencies, builds, and starts the application)
- `./deploy.sh status` - Show current deployment status
- `./deploy.sh logs [service]` - View logs (backend, frontend, or all)
- `./deploy.sh restart` - Restart the application
- `./deploy.sh stop` - Stop the application
- `./deploy.sh update` - Update and redeploy the application
- `./deploy.sh help` - Show help message

### Examples

```bash
# Deploy the application
./deploy.sh deploy

# Check status
./deploy.sh status

# View backend logs
./deploy.sh logs backend

# View all logs
./deploy.sh logs

# Restart the application
./deploy.sh restart

# Update the application
./deploy.sh update
```

## Manual Deployment Steps

If you prefer to deploy manually, follow these steps:

### 1. Install System Dependencies

```bash
# Update package list
sudo apt-get update -y

# Install essential packages
sudo apt-get install -y curl wget git build-essential software-properties-common

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Go
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
export PATH=$PATH:/usr/local/go/bin
rm go1.21.5.linux-amd64.tar.gz

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt-get install -y nginx
```

### 2. Setup Project

```bash
# Create project directory
sudo mkdir -p /opt/golangmcp
sudo chown -R $USER:$USER /opt/golangmcp

# Copy project files
cp -r . /opt/golangmcp/
cd /opt/golangmcp
```

### 3. Build Applications

```bash
# Build backend
cd backend
go mod tidy
go mod download
CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .
chmod +x main

# Build frontend
cd ../frontend
npm ci --production
npm run build
```

### 4. Configure PM2

```bash
# Start applications with PM2
cd /opt/golangmcp
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
```

### 5. Configure Nginx

```bash
# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/golangmcp
sudo ln -sf /etc/nginx/sites-available/golangmcp /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Architecture Overview

```
Internet → Nginx (Port 80) → Frontend (Port 3000) + Backend API (Port 8080)
```

- **Nginx**: Reverse proxy handling HTTP requests and serving static files
- **Frontend**: Next.js application running on port 3000
- **Backend**: Go application running on port 8080
- **PM2**: Process manager ensuring applications stay running

## Configuration Files

### PM2 Ecosystem (`ecosystem.config.js`)

- Manages both frontend and backend processes
- Configures logging, memory limits, and restart policies
- Sets up environment variables for production

### Nginx Configuration (`nginx.conf`)

- Reverse proxy configuration
- Static file serving with caching
- WebSocket support for real-time features
- Security headers and CORS configuration

## Environment Variables

### Backend Environment Variables

- `PORT`: Backend port (default: 8080)
- `GIN_MODE`: Go Gin mode (production)
- `NODE_ENV`: Environment (production)

### Frontend Environment Variables

- `PORT`: Frontend port (default: 3000)
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NODE_ENV`: Environment (production)

## Monitoring and Maintenance

### PM2 Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs

# Restart all processes
pm2 restart all

# Stop all processes
pm2 stop all

# Monitor in real-time
pm2 monit
```

### Nginx Commands

```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo nginx -s reload

# Restart nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx
```

### Log Files

- PM2 logs: `/var/log/pm2/`
- Nginx logs: `/var/log/nginx/`
- Application logs: Check PM2 logs for detailed application logs

## Security Considerations

1. **Firewall Configuration:**
   ```bash
   # Allow SSH, HTTP, and HTTPS
   sudo ufw allow 22
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw enable
   ```

2. **SSL Certificate (Optional):**
   ```bash
   # Install Certbot
   sudo apt-get install -y certbot python3-certbot-nginx
   
   # Get SSL certificate
   sudo certbot --nginx -d yourdomain.com
   ```

3. **Regular Updates:**
   ```bash
   # Update system packages
   sudo apt-get update && sudo apt-get upgrade -y
   
   # Update application
   ./deploy.sh update
   ```

## Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   # Check what's using the port
   sudo lsof -i :8080
   sudo lsof -i :3000
   
   # Kill the process
   sudo kill -9 <PID>
   ```

2. **PM2 processes not starting:**
   ```bash
   # Check PM2 logs
   pm2 logs
   
   # Restart PM2
   pm2 kill
   pm2 start ecosystem.config.js
   ```

3. **Nginx configuration errors:**
   ```bash
   # Test nginx configuration
   sudo nginx -t
   
   # Check nginx error logs
   sudo tail -f /var/log/nginx/error.log
   ```

4. **Application build errors:**
   ```bash
   # Check Go version
   go version
   
   # Check Node.js version
   node --version
   
   # Rebuild applications
   cd backend && go build .
   cd frontend && npm run build
   ```

### Health Checks

- Frontend: `http://your-server-ip/`
- Backend API: `http://your-server-ip/api/health`
- Health check: `http://your-server-ip/health`

## Performance Optimization

1. **Enable Nginx caching for static files**
2. **Configure PM2 cluster mode for better performance**
3. **Use a CDN for static assets**
4. **Implement database connection pooling**
5. **Add Redis for session storage and caching**

## Backup and Recovery

1. **Backup application code:**
   ```bash
   tar -czf golangmcp-backup-$(date +%Y%m%d).tar.gz /opt/golangmcp
   ```

2. **Backup PM2 configuration:**
   ```bash
   pm2 save
   cp ~/.pm2/dump.pm2 /opt/golangmcp/
   ```

3. **Backup nginx configuration:**
   ```bash
   cp /etc/nginx/sites-available/golangmcp /opt/golangmcp/
   ```

## Support

For issues and questions:
1. Check the logs: `./deploy.sh logs`
2. Verify status: `./deploy.sh status`
3. Review this documentation
4. Check the application repository for updates
