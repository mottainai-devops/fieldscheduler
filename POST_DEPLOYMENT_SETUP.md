# Post-Deployment Setup Guide

## 🔒 SSL/TLS Certificate Setup

After the deployment script completes, setup your SSL certificate:

```bash
# Request SSL certificate from Let's Encrypt
sudo certbot certonly --nginx -d app.fieldscheduler.net

# Follow the prompts:
# - Enter your email address
# - Accept terms of service
# - Choose standalone or webroot validation
```

Certbot will automatically update your Nginx configuration with the certificate paths.

### Verify SSL Certificate

```bash
# Check certificate details
sudo certbot certificates

# Test SSL configuration
curl -I https://app.fieldscheduler.net

# Verify SSL grade (optional)
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=app.fieldscheduler.net
```

### Auto-Renewal Setup

```bash
# Enable auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test renewal (dry-run)
sudo certbot renew --dry-run

# Check renewal status
sudo systemctl status certbot.timer
```

---

## 📝 Environment Configuration

### Update .env File

```bash
nano /home/ubuntu/field-worker-scheduler/.env
```

**Critical Variables to Update:**

```env
# Database Connection
DATABASE_URL=mysql://username:password@your-rds-endpoint:3306/field_worker_db

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your-generated-secret-here-min-32-chars

# OAuth Configuration
VITE_APP_ID=your-manus-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im

# Application Settings
VITE_APP_TITLE=Field Worker Scheduler
VITE_APP_LOGO=https://app.fieldscheduler.net/logo.png

# API Keys
ARCGIS_API_KEY=your-arcgis-api-key
BUILT_IN_FORGE_API_KEY=your-forge-api-key

# Zoho CRM Integration
ZOHO_CLIENT_ID=your-zoho-client-id
ZOHO_CLIENT_SECRET=your-zoho-client-secret
ZOHO_ORGANIZATION_ID=your-zoho-org-id
ZOHO_REFRESH_TOKEN=your-zoho-refresh-token

# AWS S3 Configuration
AWS_S3_BUCKET=field-worker-scheduler-prod
AWS_S3_REGION=eu-west-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

# Owner Information
OWNER_OPEN_ID=your-owner-id
OWNER_NAME=Your Name
```

### Verify Configuration

```bash
# Check if .env is properly formatted
cat /home/ubuntu/field-worker-scheduler/.env | grep -E "^[A-Z_]+=" | wc -l

# Should show count of environment variables
```

---

## 🗄️ Database Setup

### Run Migrations

```bash
cd /home/ubuntu/field-worker-scheduler

# Run database migrations
pnpm db:push

# Expected output:
# ✓ Migrations completed successfully
# ✓ Database schema updated
```

### Verify Database Connection

```bash
# Test database connection
mysql -h your-rds-endpoint -u username -p -e "SELECT 1;"

# Should return: 1
```

### Create Database Backups

```bash
# Create initial backup
mysqldump -h your-rds-endpoint -u username -p field_worker_db > /backups/initial-backup.sql

# Compress backup
gzip /backups/initial-backup.sql

# Upload to S3
aws s3 cp /backups/initial-backup.sql.gz s3://field-worker-scheduler-backups/
```

---

## 🚀 Application Startup

### Start Application

```bash
cd /home/ubuntu/field-worker-scheduler

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup on reboot
pm2 startup
sudo env PATH=$PATH:/usr/local/bin /usr/local/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

### Monitor Application

```bash
# View application logs
pm2 logs field-worker-scheduler

# View real-time status
pm2 monit

# View process list
pm2 list

# Restart application
pm2 restart field-worker-scheduler

# Stop application
pm2 stop field-worker-scheduler

# Delete from PM2
pm2 delete field-worker-scheduler
```

---

## 🌐 Domain & DNS Configuration

### Update DNS Records

In your domain registrar (e.g., Route 53, GoDaddy, Namecheap):

```
Type: A Record
Name: app
Value: 54.194.172.107
TTL: 300

Type: CNAME Record (optional for www)
Name: www.app
Value: app.fieldscheduler.net
TTL: 300
```

### Verify DNS Propagation

```bash
# Check DNS resolution
nslookup app.fieldscheduler.net

# Should return: 54.194.172.107

# Check with dig
dig app.fieldscheduler.net

# Check propagation globally
# Visit: https://www.whatsmydns.net/
```

### Test HTTPS Access

```bash
# Test HTTP redirect to HTTPS
curl -I http://app.fieldscheduler.net

# Should return: 301 Moved Permanently to https://

# Test HTTPS
curl -I https://app.fieldscheduler.net

# Should return: 200 OK
```

---

## 📊 Monitoring & Logging

### Setup CloudWatch Logs

```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb

# Configure agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard

# Start agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -s \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

### View Application Logs

```bash
# PM2 logs
pm2 logs field-worker-scheduler

# Nginx access logs
tail -f /var/log/nginx/field-worker-scheduler_access.log

# Nginx error logs
tail -f /var/log/nginx/field-worker-scheduler_error.log

# System logs
sudo journalctl -u nginx -f
```

### Setup Log Rotation

```bash
# Create logrotate configuration
sudo tee /etc/logrotate.d/field-worker-scheduler > /dev/null << 'EOF'
/home/ubuntu/field-worker-scheduler/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 ubuntu ubuntu
    sharedscripts
    postrotate
        pm2 reload field-worker-scheduler > /dev/null 2>&1 || true
    endscript
}
EOF

# Test logrotate
sudo logrotate -v /etc/logrotate.d/field-worker-scheduler
```

---

## 🔍 Health Checks

### Application Health

```bash
# Check if application is running
curl http://localhost:3000/health

# Check if Nginx is running
sudo systemctl status nginx

# Check PM2 process
pm2 status

# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top -bn1 | head -20
```

### Database Health

```bash
# Check database connection
mysql -h your-rds-endpoint -u username -p -e "SELECT 1;"

# Check database size
mysql -h your-rds-endpoint -u username -p -e "SELECT table_schema, ROUND(SUM(data_length+index_length)/1024/1024,2) FROM information_schema.tables GROUP BY table_schema;"

# Check slow queries
mysql -h your-rds-endpoint -u username -p -e "SHOW PROCESSLIST;"
```

---

## 🔧 Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs field-worker-scheduler --err

# Check if port 3000 is in use
sudo lsof -i :3000

# Kill process on port 3000
sudo kill -9 $(lsof -t -i:3000)

# Restart application
pm2 restart field-worker-scheduler
```

### Nginx Configuration Error

```bash
# Test Nginx configuration
sudo nginx -t

# View Nginx error log
sudo tail -f /var/log/nginx/error.log

# Reload Nginx
sudo systemctl reload nginx
```

### Database Connection Error

```bash
# Test database connection
mysql -h your-rds-endpoint -u username -p -e "SELECT 1;"

# Check security group rules
# Verify RDS security group allows EC2 instance

# Check DATABASE_URL format
cat /home/ubuntu/field-worker-scheduler/.env | grep DATABASE_URL
```

### SSL Certificate Issues

```bash
# Check certificate validity
sudo certbot certificates

# Renew certificate manually
sudo certbot renew --force-renewal

# Check certificate expiration
echo | openssl s_client -servername app.fieldscheduler.net -connect app.fieldscheduler.net:443 2>/dev/null | openssl x509 -noout -dates
```

---

## 📱 Flutter App Integration

Once the web application is running, you can integrate the Flutter mobile app:

### API Endpoints Available

```
Base URL: https://app.fieldscheduler.net/api

Authentication:
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me

Field Manager Routes:
GET /api/field-managers
GET /api/field-managers/:id
POST /api/field-managers/tags
GET /api/field-managers/tags/:managerId

Customer Routes:
GET /api/customers
GET /api/customers/:id
POST /api/customers/filter

Route Management:
GET /api/routes
POST /api/routes
PUT /api/routes/:id
DELETE /api/routes/:id

GPS Tracking:
POST /api/gps/update
GET /api/gps/location/:managerId
GET /api/gps/history/:managerId

Geofencing:
POST /api/geofence/check-in
POST /api/geofence/check-out
GET /api/geofence/events
```

### Flutter App Configuration

```dart
// lib/services/api_service.dart

class ApiService {
  static const String baseUrl = 'https://app.fieldscheduler.net/api';
  
  // API calls will be made to this endpoint
}
```

---

## ✅ Deployment Verification Checklist

- [ ] SSH into EC2 instance successfully
- [ ] Deployment script completed without errors
- [ ] .env file updated with all credentials
- [ ] Database migrations completed
- [ ] SSL certificate installed
- [ ] Nginx configuration tested
- [ ] Application accessible at https://app.fieldscheduler.net
- [ ] PM2 process running
- [ ] Database connection verified
- [ ] Logs being generated
- [ ] Health check endpoints responding
- [ ] DNS records propagated
- [ ] Monitoring configured
- [ ] Backups scheduled

---

## 📞 Support & Maintenance

### Daily Tasks
- Monitor application logs
- Check system health
- Verify database backups

### Weekly Tasks
- Review performance metrics
- Check for security updates
- Test backup restoration

### Monthly Tasks
- Full system review
- Capacity planning
- Security audit

### Quarterly Tasks
- Disaster recovery drill
- Performance optimization
- Cost analysis

---

**Status:** Ready for Production
**Last Updated:** November 2025
**Version:** 1.0.0

