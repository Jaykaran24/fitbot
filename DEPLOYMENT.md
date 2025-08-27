# FitBot Production Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Deployment Options](#deployment-options)
5. [Production Checklist](#production-checklist)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- Node.js 18+ (LTS recommended)
- Docker & Docker Compose (for containerized deployment)
- Git
- MongoDB 5.0+ (local or cloud)
- Reverse proxy (Nginx/Apache) for production

### Cloud Platform Support
- **AWS**: EC2, ECS, Lambda
- **Azure**: App Service, Container Instances
- **Google Cloud**: Compute Engine, Cloud Run
- **Digital Ocean**: Droplets, App Platform
- **Heroku**: Web Dynos
- **Railway**: Full-stack deployment

## Environment Setup

### 1. Clone and Install Dependencies
```bash
git clone <your-repository>
cd fitbot
npm install --production
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit with your production values
nano .env
```

### 3. Required Environment Variables
```bash
# Minimum required configuration
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/fitbot
JWT_SECRET=your-super-secure-32-character-secret-key
ALLOWED_ORIGINS=https://yourdomain.com
```

## Database Setup

### MongoDB Atlas (Recommended)
1. Create MongoDB Atlas account
2. Create cluster and database
3. Whitelist your server IP
4. Create database user
5. Get connection string

### Self-Hosted MongoDB
```bash
# Install MongoDB
sudo apt update
sudo apt install -y mongodb

# Start MongoDB service
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Create database and user
mongo
> use fitbot
> db.createUser({
  user: "fitbot",
  pwd: "your-secure-password",
  roles: ["readWrite"]
})
```

## Deployment Options

### Option 1: Docker Deployment (Recommended)

#### Production with Docker Compose
```bash
# Build and start production containers
npm run docker:build
npm run docker:up:prod

# Monitor logs
npm run docker:logs

# Stop containers
npm run docker:down
```

#### Individual Docker Commands
```bash
# Build production image
docker build -f docker/Dockerfile.prod -t fitbot:latest .

# Run production container
docker run -d \
  --name fitbot-app \
  -p 3000:3000 \
  --env-file .env \
  fitbot:latest
```

### Option 2: PM2 Deployment

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
npm run start:pm2

# Monitor processes
pm2 status
pm2 logs fitbot

# Enable startup script
pm2 startup
pm2 save
```

### Option 3: Systemd Service

Create service file:
```bash
sudo nano /etc/systemd/system/fitbot.service
```

```ini
[Unit]
Description=FitBot Application
After=network.target

[Service]
Type=simple
User=fitbot
WorkingDirectory=/home/fitbot/app
Environment=NODE_ENV=production
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable fitbot
sudo systemctl start fitbot
sudo systemctl status fitbot
```

### Option 4: Cloud Platform Deployment

#### Heroku
```bash
# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create your-fitbot-app

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your-mongodb-uri
heroku config:set JWT_SECRET=your-jwt-secret

# Deploy
git push heroku main
```

#### Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway link
railway up
```

#### Digital Ocean App Platform
1. Connect GitHub repository
2. Set environment variables in dashboard
3. Deploy from web interface

## Production Checklist

### Security
- [ ] JWT_SECRET is 32+ characters and cryptographically secure
- [ ] MONGODB_URI uses authentication
- [ ] ALLOWED_ORIGINS restricted to your domain
- [ ] Rate limiting enabled
- [ ] HTTPS/TLS configured
- [ ] Security headers configured in reverse proxy

### Performance
- [ ] NODE_ENV=production
- [ ] Process manager (PM2/Docker) configured
- [ ] Database indexes created
- [ ] Static files served by reverse proxy
- [ ] Gzip compression enabled
- [ ] Redis caching configured (optional)

### Monitoring
- [ ] Health checks responding
- [ ] Metrics endpoint secured
- [ ] Error tracking configured (Sentry)
- [ ] Log aggregation setup
- [ ] Uptime monitoring configured

### Backup & Recovery
- [ ] Database backup strategy
- [ ] Application backup procedures
- [ ] Recovery testing completed
- [ ] Rollback procedures documented

## Monitoring & Maintenance

### Health Checks
```bash
# Application health
curl https://yourdomain.com/health

# Readiness check
curl https://yourdomain.com/ready

# Liveness check
curl https://yourdomain.com/live
```

### Metrics Monitoring
```bash
# View metrics (requires admin access)
curl https://yourdomain.com/metrics \
  -H "Authorization: Bearer your-admin-token"
```

### Log Management
```bash
# View application logs
npm run logs

# Follow logs in real-time
npm run logs:follow

# View error logs only
npm run logs:error
```

### Database Maintenance
```bash
# Backup database
npm run db:backup

# Restore database
npm run db:restore backup-file.gz

# Database health check
npm run health:db
```

### Performance Monitoring
```bash
# System performance
npm run monitor:performance

# Memory usage
npm run monitor:memory

# API response times
npm run monitor:api
```

## Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check environment variables
npm run validate:env

# Verify Node.js version
node --version

# Check dependencies
npm audit
```

#### Database Connection Issues
```bash
# Test MongoDB connection
npm run test:db

# Verify connection string
echo $MONGODB_URI

# Check network connectivity
telnet your-mongodb-host 27017
```

#### High Memory Usage
```bash
# Monitor memory
npm run monitor:memory

# Check for memory leaks
npm run profile:memory

# Restart application
npm run restart
```

#### Slow API Responses
```bash
# Check API performance
npm run monitor:api

# Analyze slow queries
npm run analyze:queries

# Profile application
npm run profile:cpu
```

### Log Analysis
```bash
# Search error logs
npm run logs:error | grep "ERROR"

# Find authentication issues
npm run logs | grep "auth"

# Monitor specific endpoints
npm run logs | grep "POST /api/food"
```

### Emergency Procedures

#### Immediate Rollback
```bash
# Docker rollback
docker tag fitbot:previous fitbot:latest
npm run docker:restart

# PM2 rollback
pm2 restart fitbot --update-env
```

#### Database Recovery
```bash
# Emergency database restore
npm run db:restore emergency-backup.gz
npm run restart
```

## Maintenance Schedule

### Daily
- Monitor application health
- Check error logs
- Verify backup completion

### Weekly
- Review performance metrics
- Update dependencies (if stable)
- Test health check endpoints

### Monthly
- Security audit
- Database optimization
- Performance review
- Backup testing

## Support & Resources

### Documentation
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Docker Documentation](https://docs.docker.com/)

### Monitoring Tools
- Application health checks built-in
- Custom metrics endpoint
- Performance monitoring
- Error tracking integration

### Getting Help
1. Check application logs
2. Verify environment configuration
3. Test database connectivity
4. Review deployment checklist
5. Contact development team

---

**Note**: This deployment guide covers Phase 4 production infrastructure. Ensure all monitoring, health checks, and security measures are properly configured before going live.
