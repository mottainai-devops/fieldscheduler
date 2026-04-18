# Field Worker Scheduler - AWS Deployment Guide

**Version:** 1.0.0  
**Last Updated:** November 8, 2025

## Overview

This guide provides step-by-step instructions for deploying the Field Worker Scheduler to AWS. We'll use a combination of services:

- **EC2:** Application server
- **RDS:** Managed MySQL database
- **S3:** File storage
- **CloudFront:** CDN for static assets
- **Route 53:** DNS management
- **ACM:** SSL certificates
- **CloudWatch:** Monitoring and logging

---

## Prerequisites

### AWS Account Setup
1. Create an AWS account at https://aws.amazon.com
2. Set up billing alerts
3. Create an IAM user with appropriate permissions
4. Generate AWS Access Key ID and Secret Access Key
5. Install AWS CLI: `pip install awscli`

### Local Setup
```bash
# Install AWS CLI
pip install awscli

# Configure AWS credentials
aws configure
# Enter: Access Key ID
# Enter: Secret Access Key
# Enter: Default region (e.g., us-east-1)
# Enter: Default output format (json)

# Verify configuration
aws sts get-caller-identity
```

### Required Tools
- Node.js 22.x
- Docker (for containerization)
- Git
- AWS CLI v2

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Route 53 (DNS)                       │
│              your-domain.com → CloudFront               │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│              CloudFront (CDN)                           │
│        Cache static assets globally                     │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│         Application Load Balancer (ALB)                 │
│         Distribute traffic to EC2 instances             │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│              EC2 Instances (Auto Scaling)               │
│         Run Node.js application (2-4 instances)         │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│         RDS MySQL (Multi-AZ for HA)                     │
│         Managed database with automatic backups         │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│              S3 (File Storage)                          │
│         Store photos, documents, backups                │
└─────────────────────────────────────────────────────────┘
```

---

## Step 1: Prepare Application for Deployment

### 1.1 Create Docker Image

Create `Dockerfile`:

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

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["pnpm", "start"]
```

### 1.2 Create .dockerignore

```
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.env.local
dist
build
.next
.nuxt
coverage
.nyc_output
```

### 1.3 Build and Test Docker Image Locally

```bash
# Build image
docker build -t field-worker-scheduler:1.0.0 .

# Run container locally
docker run -p 3000:3000 \
  -e DATABASE_URL=mysql://user:pass@host:3306/db \
  -e JWT_SECRET=your-secret \
  field-worker-scheduler:1.0.0

# Test application
curl http://localhost:3000
```

---

## Step 2: Set Up AWS Infrastructure

### 2.1 Create RDS MySQL Database

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier field-worker-scheduler-db \
  --db-instance-class db.t3.micro \
  --engine mysql \
  --engine-version 8.0.35 \
  --master-username admin \
  --master-user-password YourSecurePassword123! \
  --allocated-storage 100 \
  --storage-type gp3 \
  --multi-az \
  --backup-retention-period 30 \
  --enable-cloudwatch-logs-exports error,general,slowquery \
  --enable-iam-database-authentication \
  --region us-east-1

# Wait for database to be available (5-10 minutes)
aws rds describe-db-instances \
  --db-instance-identifier field-worker-scheduler-db \
  --query 'DBInstances[0].DBInstanceStatus'

# Get database endpoint
aws rds describe-db-instances \
  --db-instance-identifier field-worker-scheduler-db \
  --query 'DBInstances[0].Endpoint.Address'
```

### 2.2 Create Security Group for RDS

```bash
# Create security group
aws ec2 create-security-group \
  --group-name field-worker-scheduler-db-sg \
  --description "Security group for Field Worker Scheduler RDS" \
  --vpc-id vpc-xxxxxxxx

# Allow MySQL from EC2 instances
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxx \
  --protocol tcp \
  --port 3306 \
  --source-security-group-id sg-xxxxxxxx
```

### 2.3 Create S3 Bucket for File Storage

```bash
# Create S3 bucket
aws s3 mb s3://field-worker-scheduler-files-$(date +%s)

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket field-worker-scheduler-files-xxxxx \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket field-worker-scheduler-files-xxxxx \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Block public access
aws s3api put-public-access-block \
  --bucket field-worker-scheduler-files-xxxxx \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### 2.4 Create IAM Role for EC2

```bash
# Create trust policy
cat > trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create role
aws iam create-role \
  --role-name field-worker-scheduler-ec2-role \
  --assume-role-policy-document file://trust-policy.json

# Create policy for S3 access
cat > s3-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::field-worker-scheduler-files-*/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::field-worker-scheduler-files-*"
    }
  ]
}
EOF

# Attach policy
aws iam put-role-policy \
  --role-name field-worker-scheduler-ec2-role \
  --policy-name field-worker-scheduler-s3-policy \
  --policy-document file://s3-policy.json

# Create instance profile
aws iam create-instance-profile \
  --instance-profile-name field-worker-scheduler-profile

aws iam add-role-to-instance-profile \
  --instance-profile-name field-worker-scheduler-profile \
  --role-name field-worker-scheduler-ec2-role
```

---

## Step 3: Push Docker Image to ECR

### 3.1 Create ECR Repository

```bash
# Create ECR repository
aws ecr create-repository \
  --repository-name field-worker-scheduler \
  --region us-east-1

# Get login token
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.us-east-1.amazonaws.com
```

### 3.2 Tag and Push Image

```bash
# Tag image
docker tag field-worker-scheduler:1.0.0 \
  123456789.dkr.ecr.us-east-1.amazonaws.com/field-worker-scheduler:1.0.0

# Push to ECR
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/field-worker-scheduler:1.0.0
```

---

## Step 4: Launch EC2 Instances

### 4.1 Create Launch Template

```bash
# Create user data script
cat > user-data.sh << 'EOF'
#!/bin/bash
set -e

# Update system
apt-get update
apt-get upgrade -y

# Install Docker
apt-get install -y docker.io

# Start Docker
systemctl start docker
systemctl enable docker

# Add ubuntu user to docker group
usermod -aG docker ubuntu

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create environment file
cat > /home/ubuntu/.env << 'ENVEOF'
DATABASE_URL=mysql://admin:YourPassword@field-worker-scheduler-db.xxxxx.us-east-1.rds.amazonaws.com:3306/field_worker_scheduler
JWT_SECRET=your-jwt-secret
NODE_ENV=production
PORT=3000
ENVEOF

# Pull and run Docker image
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.us-east-1.amazonaws.com

docker run -d \
  --name field-worker-scheduler \
  -p 3000:3000 \
  --env-file /home/ubuntu/.env \
  --restart always \
  123456789.dkr.ecr.us-east-1.amazonaws.com/field-worker-scheduler:1.0.0

# Setup CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i -E ./amazon-cloudwatch-agent.deb

EOF

# Create launch template
aws ec2 create-launch-template \
  --launch-template-name field-worker-scheduler-template \
  --version-description "Field Worker Scheduler v1.0.0" \
  --launch-template-data '{
    "ImageId": "ami-0c55b159cbfafe1f0",
    "InstanceType": "t3.small",
    "IamInstanceProfile": {
      "Name": "field-worker-scheduler-profile"
    },
    "SecurityGroupIds": ["sg-xxxxxxxx"],
    "UserData": "'$(base64 -w 0 user-data.sh)'",
    "TagSpecifications": [{
      "ResourceType": "instance",
      "Tags": [{"Key": "Name", "Value": "field-worker-scheduler"}]
    }]
  }'
```

### 4.2 Create Auto Scaling Group

```bash
# Create load balancer
aws elbv2 create-load-balancer \
  --name field-worker-scheduler-alb \
  --subnets subnet-xxxxxxxx subnet-yyyyyyyy \
  --security-groups sg-xxxxxxxx \
  --scheme internet-facing \
  --type application

# Create target group
aws elbv2 create-target-group \
  --name field-worker-scheduler-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-xxxxxxxx \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...

# Create Auto Scaling Group
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name field-worker-scheduler-asg \
  --launch-template LaunchTemplateName=field-worker-scheduler-template,Version='$Latest' \
  --min-size 2 \
  --max-size 4 \
  --desired-capacity 2 \
  --target-group-arns arn:aws:elasticloadbalancing:... \
  --availability-zones us-east-1a us-east-1b
```

---

## Step 5: Configure SSL/HTTPS

### 5.1 Request SSL Certificate

```bash
# Request certificate from ACM
aws acm request-certificate \
  --domain-name your-domain.com \
  --subject-alternative-names www.your-domain.com \
  --validation-method DNS \
  --region us-east-1

# Get certificate details
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:123456789:certificate/xxxxx \
  --region us-east-1
```

### 5.2 Add HTTPS Listener

```bash
# Create HTTPS listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:us-east-1:123456789:certificate/xxxxx \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...

# Redirect HTTP to HTTPS
aws elbv2 modify-listener \
  --listener-arn arn:aws:elasticloadbalancing:... \
  --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}'
```

---

## Step 6: Set Up DNS

### 6.1 Create Route 53 Hosted Zone

```bash
# Create hosted zone
aws route53 create-hosted-zone \
  --name your-domain.com \
  --caller-reference $(date +%s)

# Get nameservers
aws route53 get-hosted-zone \
  --id /hostedzone/Z123456789ABC
```

### 6.2 Create Alias Records

```bash
# Create alias record for ALB
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456789ABC \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "your-domain.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "field-worker-scheduler-alb-123456.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

---

## Step 7: Configure CloudFront CDN

### 7.1 Create CloudFront Distribution

```bash
# Create distribution
aws cloudfront create-distribution \
  --distribution-config '{
    "CallerReference": "'$(date +%s)'",
    "DefaultRootObject": "index.html",
    "Origins": {
      "Quantity": 1,
      "Items": [{
        "Id": "myALB",
        "DomainName": "field-worker-scheduler-alb-123456.us-east-1.elb.amazonaws.com",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "https-only"
        }
      }]
    },
    "DefaultCacheBehavior": {
      "TargetOriginId": "myALB",
      "ViewerProtocolPolicy": "redirect-to-https",
      "TrustedSigners": {
        "Enabled": false,
        "Quantity": 0
      },
      "ForwardedValues": {
        "QueryString": true,
        "Cookies": {"Forward": "all"},
        "Headers": {
          "Quantity": 0
        }
      },
      "MinTTL": 0
    },
    "Enabled": true
  }'
```

---

## Step 8: Set Up Monitoring

### 8.1 Create CloudWatch Alarms

```bash
# CPU utilization alarm
aws cloudwatch put-metric-alarm \
  --alarm-name field-worker-scheduler-high-cpu \
  --alarm-description "Alert when CPU is high" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# Application health alarm
aws cloudwatch put-metric-alarm \
  --alarm-name field-worker-scheduler-unhealthy-hosts \
  --alarm-description "Alert when hosts are unhealthy" \
  --metric-name UnHealthyHostCount \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 60 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 2
```

### 8.2 Enable Logging

```bash
# Enable ALB access logs
aws elbv2 modify-load-balancer-attributes \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --attributes Key=access_logs.s3.enabled,Value=true \
    Key=access_logs.s3.bucket,Value=field-worker-scheduler-logs \
    Key=access_logs.s3.prefix,Value=alb
```

---

## Step 9: Deploy Database Migrations

```bash
# SSH into EC2 instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Run migrations
docker exec field-worker-scheduler pnpm db:push

# Verify database
docker exec field-worker-scheduler pnpm db:verify
```

---

## Step 10: Verify Deployment

```bash
# Check application health
curl https://your-domain.com/health

# Check database connectivity
curl https://your-domain.com/api/health

# View logs
aws logs tail /aws/ec2/field-worker-scheduler --follow

# Monitor metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --start-time 2025-11-08T00:00:00Z \
  --end-time 2025-11-08T23:59:59Z \
  --period 3600 \
  --statistics Average
```

---

## Backup & Disaster Recovery

### Automated RDS Backups
- Automatic daily backups (30-day retention)
- Multi-AZ for high availability
- Point-in-time recovery

### Manual Backup
```bash
# Create snapshot
aws rds create-db-snapshot \
  --db-instance-identifier field-worker-scheduler-db \
  --db-snapshot-identifier field-worker-scheduler-backup-$(date +%Y%m%d)

# List snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier field-worker-scheduler-db
```

### Restore from Backup
```bash
# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier field-worker-scheduler-db-restored \
  --db-snapshot-identifier field-worker-scheduler-backup-20251108
```

---

## Cost Optimization

### Recommendations
1. Use t3.small for development, t3.medium for production
2. Enable RDS auto-scaling for storage
3. Use CloudFront to reduce data transfer costs
4. Set up S3 lifecycle policies for old backups
5. Use Reserved Instances for predictable workloads

### Estimated Monthly Costs
- EC2 (2x t3.small): $30
- RDS (db.t3.micro): $35
- S3 (100GB): $2.30
- CloudFront (1TB): $85
- Data Transfer: $0-50
- **Total: ~$150-200/month**

---

## Troubleshooting

### Application Won't Start
```bash
# Check logs
docker logs field-worker-scheduler

# Check environment variables
docker inspect field-worker-scheduler | grep Env

# Restart container
docker restart field-worker-scheduler
```

### Database Connection Failed
```bash
# Check RDS status
aws rds describe-db-instances \
  --db-instance-identifier field-worker-scheduler-db

# Test connection
mysql -h field-worker-scheduler-db.xxxxx.rds.amazonaws.com \
  -u admin -p field_worker_scheduler
```

### High CPU Usage
```bash
# Check running processes
docker top field-worker-scheduler

# Scale up instances
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name field-worker-scheduler-asg \
  --desired-capacity 4
```

---

## Support & Documentation

- AWS EC2: https://docs.aws.amazon.com/ec2/
- AWS RDS: https://docs.aws.amazon.com/rds/
- AWS S3: https://docs.aws.amazon.com/s3/
- AWS CloudFront: https://docs.aws.amazon.com/cloudfront/
- AWS Route 53: https://docs.aws.amazon.com/route53/

---

**Last Updated:** November 8, 2025  
**Status:** Production Ready  
**Next Review:** November 15, 2025

