# Field Worker Scheduler - Deployment Guide

## Pre-Deployment Checklist

### 1. Server Requirements
- [ ] **Operating System**: Ubuntu 20.04+ or similar Linux distribution
- [ ] **Node.js**: Version 22.x or higher
- [ ] **PostgreSQL**: Version 14+ database server
- [ ] **Memory**: Minimum 2GB RAM (4GB recommended)
- [ ] **Storage**: Minimum 20GB available disk space
- [ ] **Domain**: Custom domain name (optional but recommended)
- [ ] **SSL Certificate**: For HTTPS (Let's Encrypt recommended)

### 2. Required Credentials & API Keys
- [ ] **Zoho Books API Credentials**
  - Client ID
  - Client Secret
  - Organization ID
  - Refresh Token (generate using `/zoho/token-generator`)
  
- [ ] **ArcGIS API Key**
  - For geocoding and mapping features
  - Get from: https://developers.arcgis.com/
  
- [ ] **Database Credentials**
  - PostgreSQL database URL
  - Format: `postgresql://username:password@host:port/database?sslmode=require`

- [ ] **JWT Secret**
  - Generate a secure random string (32+ characters)
  - Command: `openssl rand -base64 32`

- [ ] **OAuth Configuration**
  - OAuth Server URL (if using external auth)
  - OAuth Portal URL

### 3. Environment Variables Required

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# Zoho Books Integration
ZOHO_CLIENT_ID=your_client_id
ZOHO_CLIENT_SECRET=your_client_secret
ZOHO_ORGANIZATION_ID=your_org_id
ZOHO_REFRESH_TOKEN=your_refresh_token

# ArcGIS
ARCGIS_API_KEY=your_arcgis_api_key

# Authentication
JWT_SECRET=your_jwt_secret
OAUTH_SERVER_URL=your_oauth_server_url
OAUTH_PORTAL_URL=your_oauth_portal_url

# Application
NODE_ENV=production
PORT=3000
OWNER_NAME=your_name
OWNER_OPEN_ID=your_open_id

# Built-in APIs (if applicable)
BUILT_IN_FORGE_API_KEY=your_forge_key
BUILT_IN_FORGE_API_URL=your_forge_url

# Frontend
VITE_APP_ID=field-worker-scheduler
VITE_APP_TITLE=Field Worker Scheduler
VITE_APP_LOGO=/logo.png
VITE_ANALYTICS_ENDPOINT=your_analytics_endpoint
VITE_ANALYTICS_WEBSITE_ID=your_website_id
VITE_OAUTH_PORTAL_URL=your_oauth_portal_url
```

---

## Deployment Methods

### Option 1: Deploy on Manus Platform (Recommended - Easiest)

**Advantages:**
- One-click deployment
- Automatic SSL certificates
- Built-in database management
- Automatic backups
- No server management required

**Steps:**
1. Click the **Publish** button in the Manus UI header (top-right)
2. Configure your domain (optional)
3. Add environment variables in Settings → Secrets
4. Your app will be live at `https://your-app.manus.space`

**Cost:** Check Manus pricing at https://manus.im/pricing

---

### Option 2: Deploy on Your Own VPS (DigitalOcean, AWS, Linode, etc.)

#### Step 1: Server Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx (reverse proxy)
sudo apt install -y nginx

# Install Certbot (SSL certificates)
sudo apt install -y certbot python3-certbot-nginx

# Install PM2 (process manager)
sudo npm install -g pm2 pnpm
```

#### Step 2: Database Setup

```bash
# Create PostgreSQL database and user
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE field_worker_scheduler;
CREATE USER scheduler_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE field_worker_scheduler TO scheduler_user;
\q
```

#### Step 3: Deploy Application

```bash
# Create application directory
sudo mkdir -p /var/www/field-worker-scheduler
sudo chown $USER:$USER /var/www/field-worker-scheduler
cd /var/www/field-worker-scheduler

# Clone or upload your application files
# (You can download from Manus: Code panel → Download All Files)

# Install dependencies
pnpm install

# Create .env file
nano .env
# (Paste your environment variables from checklist above)

# Run database migrations
pnpm db:push

# Build the application
pnpm build

# Start with PM2
pm2 start npm --name "field-worker-scheduler" -- start
pm2 save
pm2 startup
```

#### Step 4: Configure Nginx Reverse Proxy

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/field-worker-scheduler
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/field-worker-scheduler /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL with Let's Encrypt
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

#### Step 5: Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

### Option 3: Deploy on Heroku

#### Prerequisites
- Heroku account
- Heroku CLI installed

```bash
# Login to Heroku
heroku login

# Create new app
heroku create your-app-name

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set ZOHO_CLIENT_ID=your_client_id
heroku config:set ZOHO_CLIENT_SECRET=your_client_secret
# ... (set all other environment variables)

# Deploy
git push heroku main

# Run migrations
heroku run pnpm db:push

# Open app
heroku open
```

---

### Option 4: Deploy with Docker

#### Create Dockerfile

```dockerfile
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy application files
COPY . .

# Build application
RUN pnpm build

# Expose port
EXPOSE 3000

# Start application
CMD ["pnpm", "start"]
```

#### Create docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/scheduler
      - NODE_ENV=production
      # Add other environment variables
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_DB=scheduler
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

```bash
# Deploy with Docker Compose
docker-compose up -d
```

---

## Post-Deployment Checklist

### 1. Initial Configuration
- [ ] Access the application at your domain
- [ ] Complete initial setup/admin account creation
- [ ] Add all environment variables in Settings → Secrets (if using Manus)
- [ ] Test Zoho Books integration (sync customers)
- [ ] Verify ArcGIS geocoding is working
- [ ] Create test workers and vehicles

### 2. Data Setup
- [ ] Sync customers from Zoho Books
- [ ] Verify customer coordinates are populated
- [ ] Set up building groups (if applicable)
- [ ] Configure violation types
- [ ] Create test routes to verify optimization

### 3. Security
- [ ] Change default admin password
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Review and restrict API access
- [ ] Enable rate limiting (if needed)

### 4. Monitoring & Maintenance
- [ ] Set up application monitoring (PM2, New Relic, etc.)
- [ ] Configure log rotation
- [ ] Set up automated backups
- [ ] Create backup/restore procedures
- [ ] Document deployment process
- [ ] Set up alerts for errors/downtime

### 5. Mobile Worker Setup
- [ ] Share worker mobile URL: `https://your-domain.com/worker-mobile`
- [ ] Create worker accounts
- [ ] Test GPS tracking on mobile devices
- [ ] Verify offline functionality
- [ ] Test violation reporting with photo upload

### 6. Testing
- [ ] Test route creation and optimization
- [ ] Test worker mobile app on actual devices
- [ ] Test GPS tracking
- [ ] Test offline mode and sync
- [ ] Test compliance reporting
- [ ] Test PDF generation
- [ ] Verify Zoho data sync
- [ ] Test building group management

---

## Troubleshooting Common Issues

### Database Connection Errors
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check database exists
sudo -u postgres psql -l

# Test connection
psql "postgresql://username:password@host:port/database"
```

### Application Won't Start
```bash
# Check logs
pm2 logs field-worker-scheduler

# Check environment variables
pm2 env 0

# Restart application
pm2 restart field-worker-scheduler
```

### Zoho Integration Not Working
- Verify `ZOHO_REFRESH_TOKEN` is set correctly
- Check token hasn't expired (regenerate if needed)
- Verify Organization ID matches your Zoho Books account
- Check API rate limits

### GPS Tracking Not Working
- Ensure HTTPS is enabled (required for geolocation API)
- Check browser permissions for location access
- Verify worker mobile app is accessed via HTTPS

---

## Backup & Restore

### Database Backup
```bash
# Backup database
pg_dump -U username -h host database_name > backup_$(date +%Y%m%d).sql

# Restore database
psql -U username -h host database_name < backup_20240127.sql
```

### Application Files Backup
```bash
# Backup application directory
tar -czf app_backup_$(date +%Y%m%d).tar.gz /var/www/field-worker-scheduler

# Restore
tar -xzf app_backup_20240127.tar.gz -C /
```

---

## Performance Optimization

### 1. Database Optimization
```sql
-- Create indexes for frequently queried fields
CREATE INDEX idx_customers_zoho_contact_id ON customers(zoho_contact_id);
CREATE INDEX idx_routes_worker_id ON routes(worker_id);
CREATE INDEX idx_violations_customer_id ON compliance_violations(customer_id);
CREATE INDEX idx_worker_locations_worker_id ON worker_locations(worker_id);
```

### 2. Nginx Caching
Add to Nginx configuration:
```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. PM2 Cluster Mode
```bash
# Use all CPU cores
pm2 start npm --name "field-worker-scheduler" -i max -- start
```

---

## Support & Documentation

- **Application Documentation**: See `SYSTEM_REVIEW.md` for feature overview
- **API Documentation**: Available at `/api/docs` (if enabled)
- **Manus Support**: https://help.manus.im
- **Issues**: Report bugs in project todo.md

---

## Estimated Deployment Time

- **Manus Platform**: 10-15 minutes
- **VPS (Manual)**: 1-2 hours
- **Docker**: 30-45 minutes
- **Heroku**: 20-30 minutes

---

## Monthly Cost Estimates

### Manus Platform
- Check current pricing at https://manus.im/pricing

### Self-Hosted VPS
- **DigitalOcean Droplet** (2GB RAM): $12/month
- **AWS Lightsail** (2GB RAM): $10/month
- **Linode** (2GB RAM): $10/month
- **Domain**: $10-15/year
- **Total**: ~$10-15/month

### Heroku
- **Hobby Plan**: $7/month (app)
- **PostgreSQL Mini**: $5/month
- **Total**: ~$12/month

---

## Next Steps

1. Choose your deployment method
2. Gather all required credentials
3. Follow the deployment steps for your chosen method
4. Complete post-deployment checklist
5. Test thoroughly before going live
6. Train field workers on mobile app usage

**Need help?** I can assist with any step of the deployment process!

