#!/bin/bash

# Field Worker Scheduler - AWS EC2 Deployment Script
# This script automates the deployment of the application to EC2

set -e  # Exit on error

echo "🚀 Starting Field Worker Scheduler Deployment..."
echo "=================================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/your-repo/field-worker-scheduler.git"
APP_DIR="/home/ubuntu/field-worker-scheduler"
APP_USER="ubuntu"
APP_PORT=3000

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Phase 1: System Update
print_info "Phase 1: Updating system packages..."
sudo apt update
sudo apt upgrade -y
print_status "System updated"

# Phase 2: Install Node.js
print_info "Phase 2: Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version
print_status "Node.js installed"

# Phase 3: Install pnpm
print_info "Phase 3: Installing pnpm..."
npm install -g pnpm
pnpm --version
print_status "pnpm installed"

# Phase 4: Install Nginx
print_info "Phase 4: Installing Nginx..."
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
print_status "Nginx installed and started"

# Phase 5: Install PM2
print_info "Phase 5: Installing PM2..."
npm install -g pm2
pm2 --version
print_status "PM2 installed"

# Phase 6: Install Certbot for SSL
print_info "Phase 6: Installing Certbot..."
sudo apt install -y certbot python3-certbot-nginx
print_status "Certbot installed"

# Phase 7: Clone Repository
print_info "Phase 7: Cloning repository..."
if [ -d "$APP_DIR" ]; then
    print_info "Repository already exists, pulling latest changes..."
    cd "$APP_DIR"
    git pull origin main
else
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi
print_status "Repository ready"

# Phase 8: Install Dependencies
print_info "Phase 8: Installing application dependencies..."
pnpm install
print_status "Dependencies installed"

# Phase 9: Build Application
print_info "Phase 9: Building application..."
pnpm build
print_status "Application built"

# Phase 10: Create .env file
print_info "Phase 10: Creating environment configuration..."
if [ ! -f "$APP_DIR/.env" ]; then
    cat > "$APP_DIR/.env" << 'EOF'
# Database Configuration
DATABASE_URL=mysql://user:password@rds-endpoint:3306/field_worker_db

# Authentication
JWT_SECRET=your-secure-jwt-secret-here-min-32-chars
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im

# Application
VITE_APP_ID=your-app-id
VITE_APP_TITLE=Field Worker Scheduler
VITE_APP_LOGO=https://app.fieldscheduler.net/logo.png

# APIs
ARCGIS_API_KEY=your-arcgis-api-key
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your-forge-api-key

# Zoho Integration
ZOHO_CLIENT_ID=your-zoho-client-id
ZOHO_CLIENT_SECRET=your-zoho-client-secret
ZOHO_ORGANIZATION_ID=your-zoho-org-id
ZOHO_REFRESH_TOKEN=your-zoho-refresh-token

# Owner Info
OWNER_OPEN_ID=your-owner-open-id
OWNER_NAME=Your Name

# Email
SMTP_PASSWORD=your-smtp-password

# Analytics
VITE_ANALYTICS_ENDPOINT=https://analytics.fieldscheduler.net
VITE_ANALYTICS_WEBSITE_ID=your-website-id

# S3 Storage
AWS_S3_BUCKET=field-worker-scheduler-prod
AWS_S3_REGION=eu-west-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
EOF
    print_status ".env file created (UPDATE WITH YOUR VALUES)"
else
    print_info ".env file already exists"
fi

# Phase 11: Create PM2 Ecosystem Config
print_info "Phase 11: Creating PM2 configuration..."
cat > "$APP_DIR/ecosystem.config.js" << 'EOF'
module.exports = {
  apps: [{
    name: 'field-worker-scheduler',
    script: './dist/server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
EOF
print_status "PM2 configuration created"

# Phase 12: Create Logs Directory
print_info "Phase 12: Creating logs directory..."
mkdir -p "$APP_DIR/logs"
print_status "Logs directory created"

# Phase 13: Run Database Migrations
print_info "Phase 13: Running database migrations..."
print_info "⚠️  Make sure DATABASE_URL is set in .env before running migrations"
# pnpm db:push  # Uncomment after setting DATABASE_URL
print_status "Database migration step ready (manual execution needed)"

# Phase 14: Create Nginx Configuration
print_info "Phase 14: Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/field-worker-scheduler > /dev/null << 'EOF'
upstream app {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name app.fieldscheduler.net;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name app.fieldscheduler.net;

    # SSL configuration (will be updated by Certbot)
    # ssl_certificate /etc/letsencrypt/live/app.fieldscheduler.net/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/app.fieldscheduler.net/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    client_max_body_size 50M;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json application/javascript;
    gzip_min_length 1000;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Access and error logs
    access_log /var/log/nginx/field-worker-scheduler_access.log;
    error_log /var/log/nginx/field-worker-scheduler_error.log;

    # Main application proxy
    location / {
        proxy_pass http://app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # API routes
    location /api/ {
        proxy_pass http://app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
print_status "Nginx configuration created"

# Phase 15: Enable Nginx Site
print_info "Phase 15: Enabling Nginx site..."
sudo ln -sf /etc/nginx/sites-available/field-worker-scheduler /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
print_status "Nginx site enabled"

# Phase 16: Setup SSL Certificate
print_info "Phase 16: Setting up SSL certificate..."
print_info "⚠️  Run this command manually:"
print_info "sudo certbot certonly --nginx -d app.fieldscheduler.net"
print_status "SSL setup ready (manual execution needed)"

# Phase 17: Start Application with PM2
print_info "Phase 17: Starting application with PM2..."
cd "$APP_DIR"
pm2 start ecosystem.config.js
pm2 save
sudo env PATH=$PATH:/usr/local/bin /usr/local/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
print_status "Application started with PM2"

# Phase 18: Verify Deployment
print_info "Phase 18: Verifying deployment..."
pm2 list
print_status "Deployment verification complete"

echo ""
echo "=================================================="
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo "=================================================="
echo ""
echo "📋 Next Steps:"
echo "1. Update .env file with your configuration:"
echo "   nano $APP_DIR/.env"
echo ""
echo "2. Run database migrations:"
echo "   cd $APP_DIR && pnpm db:push"
echo ""
echo "3. Setup SSL certificate:"
echo "   sudo certbot certonly --nginx -d app.fieldscheduler.net"
echo ""
echo "4. Verify application:"
echo "   curl http://localhost:3000"
echo "   curl https://app.fieldscheduler.net"
echo ""
echo "5. Monitor application:"
echo "   pm2 logs field-worker-scheduler"
echo ""
echo "📊 Application Status:"
pm2 status
echo ""
echo "🌐 Access your application at: https://app.fieldscheduler.net"
echo ""

