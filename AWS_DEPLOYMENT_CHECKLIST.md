# AWS Deployment Checklist - Field Worker Scheduler

## 📋 Phase 1: Pre-Deployment Preparation

### Application Optimization
- [ ] Build production bundle: `pnpm build`
- [ ] Verify build size (target: < 5MB gzipped)
- [ ] Test production build locally: `pnpm preview`
- [ ] Verify all routes work in production build
- [ ] Check for console errors and warnings
- [ ] Optimize images (< 100KB each)
- [ ] Remove debug code and console.logs
- [ ] Verify environment variables are not hardcoded

### Environment Configuration
- [ ] Create `.env.production` file with all required variables
- [ ] Verify DATABASE_URL format (mysql://user:pass@host:3306/db)
- [ ] Test database connection string
- [ ] Generate secure JWT_SECRET (32+ characters)
- [ ] Verify all API keys are valid:
  - [ ] VITE_APP_ID
  - [ ] ARCGIS_API_KEY
  - [ ] ZOHO_CLIENT_ID & ZOHO_CLIENT_SECRET
  - [ ] BUILT_IN_FORGE_API_KEY
- [ ] Setup AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)

### Database Preparation
- [ ] Backup current database
- [ ] Run all migrations: `pnpm db:push`
- [ ] Verify all tables created successfully
- [ ] Test database queries
- [ ] Create database user for production
- [ ] Set database user permissions (least privilege)
- [ ] Test backup/restore process

### Security Review
- [ ] Review CORS configuration
- [ ] Verify JWT token expiration
- [ ] Check password hashing algorithm
- [ ] Verify no secrets in git history: `git log --all --full-history -S "password"`
- [ ] Review API rate limiting
- [ ] Check for SQL injection vulnerabilities
- [ ] Verify XSS protection enabled
- [ ] Review CSRF token implementation

### Documentation
- [ ] Document all environment variables
- [ ] Create deployment runbook
- [ ] Document rollback procedures
- [ ] Create monitoring setup guide
- [ ] Document backup procedures
- [ ] Create incident response guide

---

## 📋 Phase 2: AWS Infrastructure Setup

### AWS Account & IAM
- [ ] Create AWS account (if not exists)
- [ ] Enable MFA on root account
- [ ] Create IAM user for deployment
- [ ] Create IAM roles:
  - [ ] EC2 instance role (RDS, S3 access)
  - [ ] RDS enhanced monitoring role
  - [ ] S3 bucket access role
- [ ] Create access keys for CI/CD
- [ ] Setup AWS CloudTrail for audit logging

### RDS Database Setup
- [ ] Create RDS subnet group
- [ ] Create RDS security group
  - [ ] Allow port 3306 from EC2 security group
  - [ ] Allow port 3306 from your IP (for management)
- [ ] Create RDS instance:
  - [ ] Engine: MySQL 8.0.35
  - [ ] Instance class: db.t3.small (minimum)
  - [ ] Storage: 100GB gp3
  - [ ] Multi-AZ: Yes (production)
  - [ ] Backup retention: 30 days
  - [ ] Encryption: Enabled
  - [ ] Enhanced monitoring: Enabled
- [ ] Create database user (not root)
- [ ] Test RDS connection from local machine
- [ ] Create initial database schema
- [ ] Setup automated backups to S3

### EC2 Instance Setup
- [ ] Create VPC (or use default)
- [ ] Create security group:
  - [ ] Allow HTTP (80) from 0.0.0.0/0
  - [ ] Allow HTTPS (443) from 0.0.0.0/0
  - [ ] Allow SSH (22) from your IP only
  - [ ] Allow RDS (3306) to RDS security group
- [ ] Create key pair and save securely
- [ ] Launch EC2 instance:
  - [ ] AMI: Ubuntu 22.04 LTS
  - [ ] Instance type: t3.medium
  - [ ] Storage: 50GB gp3
  - [ ] Assign Elastic IP
  - [ ] Add IAM instance role
  - [ ] Enable detailed monitoring
  - [ ] Enable termination protection
- [ ] Connect to instance and verify

### S3 Bucket Setup
- [ ] Create S3 bucket
  - [ ] Name: field-worker-scheduler-prod
  - [ ] Region: Same as EC2/RDS
  - [ ] Block public access: Yes
  - [ ] Versioning: Enabled
  - [ ] Encryption: Enabled (SSE-S3)
- [ ] Create bucket policy for app access
- [ ] Setup CORS configuration
- [ ] Create lifecycle policy (delete old versions after 90 days)
- [ ] Enable access logging
- [ ] Setup CloudFront distribution (optional)

### Route 53 / Domain Setup
- [ ] Register domain (or transfer existing)
- [ ] Create hosted zone in Route 53
- [ ] Create A record pointing to Elastic IP
- [ ] Create CNAME for www (optional)
- [ ] Setup MX records for email (if needed)
- [ ] Verify DNS propagation

### Elastic Load Balancer (Optional but Recommended)
- [ ] Create Application Load Balancer
- [ ] Configure target group
- [ ] Setup health checks
- [ ] Create HTTPS listener
- [ ] Create HTTP redirect to HTTPS

---

## 📋 Phase 3: Application Deployment

### EC2 Setup
- [ ] SSH into EC2 instance
- [ ] Update system: `sudo apt update && sudo apt upgrade -y`
- [ ] Install Node.js 18:
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt install -y nodejs
  ```
- [ ] Install pnpm: `npm install -g pnpm`
- [ ] Install Git: `sudo apt install -y git`
- [ ] Install Nginx: `sudo apt install -y nginx`
- [ ] Install PM2: `npm install -g pm2`
- [ ] Install certbot: `sudo apt install -y certbot python3-certbot-nginx`

### Application Deployment
- [ ] Clone repository: `git clone <repo-url>`
- [ ] Navigate to project: `cd field-worker-scheduler-demo`
- [ ] Create `.env` file with production variables
- [ ] Install dependencies: `pnpm install`
- [ ] Build application: `pnpm build`
- [ ] Create logs directory: `mkdir -p logs`
- [ ] Run database migrations: `pnpm db:push`
- [ ] Seed initial data (if needed)

### PM2 Setup
- [ ] Create `ecosystem.config.js`:
  ```javascript
  module.exports = {
    apps: [{
      name: 'field-worker-scheduler',
      script: './dist/server/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: { NODE_ENV: 'production' },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }]
  };
  ```
- [ ] Start application: `pm2 start ecosystem.config.js`
- [ ] Save PM2 config: `pm2 save`
- [ ] Setup startup: `pm2 startup`
- [ ] Verify running: `pm2 list`

---

## 📋 Phase 4: Nginx & SSL Setup

### Nginx Configuration
- [ ] Create `/etc/nginx/sites-available/field-worker-scheduler`:
  ```nginx
  upstream app {
      server 127.0.0.1:3000;
  }
  
  server {
      listen 80;
      server_name your-domain.com www.your-domain.com;
      return 301 https://$server_name$request_uri;
  }
  
  server {
      listen 443 ssl http2;
      server_name your-domain.com www.your-domain.com;
  
      ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
      ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
      ssl_protocols TLSv1.2 TLSv1.3;
      ssl_ciphers HIGH:!aNULL:!MD5;
  
      client_max_body_size 50M;
  
      location / {
          proxy_pass http://app;
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
- [ ] Enable site: `sudo ln -s /etc/nginx/sites-available/field-worker-scheduler /etc/nginx/sites-enabled/`
- [ ] Test config: `sudo nginx -t`
- [ ] Restart Nginx: `sudo systemctl restart nginx`

### SSL Certificate
- [ ] Request certificate: `sudo certbot certonly --nginx -d your-domain.com`
- [ ] Verify certificate: `sudo certbot certificates`
- [ ] Setup auto-renewal: `sudo systemctl enable certbot.timer`
- [ ] Test renewal: `sudo certbot renew --dry-run`

### Nginx Optimization
- [ ] Enable gzip compression
- [ ] Setup caching headers
- [ ] Configure rate limiting
- [ ] Setup access logging
- [ ] Monitor Nginx status

---

## 📋 Phase 5: Monitoring & Backups

### CloudWatch Setup
- [ ] Create CloudWatch dashboard
- [ ] Setup metrics:
  - [ ] CPU utilization
  - [ ] Memory usage
  - [ ] Disk space
  - [ ] Network I/O
  - [ ] RDS connections
- [ ] Create alarms:
  - [ ] CPU > 80%
  - [ ] Memory > 85%
  - [ ] Disk > 90%
  - [ ] RDS connections > 80

### Application Monitoring
- [ ] Setup application logs in CloudWatch
- [ ] Configure error tracking
- [ ] Setup performance monitoring
- [ ] Create custom metrics
- [ ] Setup alerts for errors

### Database Backups
- [ ] Enable automated RDS backups
- [ ] Test backup restoration
- [ ] Setup S3 backup replication
- [ ] Create backup schedule
- [ ] Document recovery procedures

### Log Management
- [ ] Setup CloudWatch Logs agent
- [ ] Configure log retention (30 days)
- [ ] Create log groups:
  - [ ] /aws/ec2/field-worker-scheduler
  - [ ] /aws/rds/field-worker-scheduler
- [ ] Setup log analysis and alerts

---

## 📋 Phase 6: Testing & Verification

### Functionality Testing
- [ ] Test homepage loads
- [ ] Test user login/logout
- [ ] Test all dashboard modules
- [ ] Test customer filtering
- [ ] Test route creation
- [ ] Test geofencing
- [ ] Test real-time tracking
- [ ] Test performance dashboard
- [ ] Test export functionality
- [ ] Test notifications
- [ ] Test theme toggle

### Performance Testing
- [ ] Load test (100 concurrent users)
- [ ] Stress test (1000 concurrent users)
- [ ] Database query performance
- [ ] API response times (target: < 2s)
- [ ] Frontend load time (target: < 3s)
- [ ] Mobile responsiveness

### Security Testing
- [ ] SQL injection test
- [ ] XSS vulnerability test
- [ ] CSRF token verification
- [ ] Authentication bypass test
- [ ] Authorization test
- [ ] SSL/TLS certificate validation
- [ ] CORS policy test
- [ ] Rate limiting test

### Compatibility Testing
- [ ] Chrome browser
- [ ] Firefox browser
- [ ] Safari browser
- [ ] Edge browser
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)
- [ ] Tablet devices

---

## 📋 Phase 7: Documentation & Handoff

### Deployment Documentation
- [ ] Document AWS infrastructure setup
- [ ] Document environment variables
- [ ] Document deployment process
- [ ] Document rollback procedures
- [ ] Document monitoring setup
- [ ] Document backup procedures
- [ ] Create troubleshooting guide
- [ ] Create incident response guide

### Flutter Integration Guide
- [ ] Document API endpoints
- [ ] Document authentication flow
- [ ] Document data models
- [ ] Document error handling
- [ ] Create Flutter setup guide
- [ ] Create API documentation
- [ ] Create testing procedures
- [ ] Create deployment guide for Flutter app

### Team Training
- [ ] Train team on deployment process
- [ ] Train team on monitoring
- [ ] Train team on incident response
- [ ] Train team on backup/restore
- [ ] Create knowledge base articles
- [ ] Setup support procedures

---

## 📋 Phase 8: Post-Deployment

### Monitoring (First 24 Hours)
- [ ] Monitor application logs
- [ ] Monitor system metrics
- [ ] Monitor user activity
- [ ] Monitor error rates
- [ ] Monitor API response times
- [ ] Monitor database performance

### Optimization
- [ ] Identify slow queries
- [ ] Optimize database indexes
- [ ] Optimize API responses
- [ ] Optimize frontend assets
- [ ] Implement caching strategies
- [ ] Setup CDN for static assets

### Maintenance Schedule
- [ ] Daily: Check logs and metrics
- [ ] Weekly: Review performance
- [ ] Weekly: Security updates
- [ ] Monthly: Full system review
- [ ] Quarterly: Capacity planning
- [ ] Annually: Disaster recovery drill

---

## 🎯 Success Criteria

- ✅ Application accessible at your domain
- ✅ HTTPS/SSL working correctly
- ✅ All features functional
- ✅ API response time < 2 seconds
- ✅ Database performing well
- ✅ Monitoring and alerts working
- ✅ Backups running successfully
- ✅ No security vulnerabilities
- ✅ Mobile app can connect to API
- ✅ Documentation complete

---

## 📞 Support & Escalation

- **Critical Issues:** Immediate response
- **High Priority:** Within 1 hour
- **Medium Priority:** Within 4 hours
- **Low Priority:** Within 24 hours

---

**Status:** Ready for AWS Deployment
**Last Updated:** November 2025
**Version:** 1.0.0

