---
title: "Production Deployment"
type: "how-to"
audience: "developers"
estimated_time: "20 minutes"
prerequisites:
  - "Completed scaffolding a project"
  - "Basic familiarity with your chosen platform"
related_docs:
  - "../tutorial/getting-started.md"
  - "../tutorial/create-scaffold.md"
  - "../reference/cli-reference.md"
  - "../guides/troubleshooting.md"
last_updated: "2025-11-12"
---

# Production Deployment

This guide shows you how to deploy scaffolded projects to production on Cloudflare Workers and Linode VPS. Deployment is a post-development activity that ensures your application runs reliably in production environments.

## Overview

After scaffolding and developing your application, deployment involves:

1. **Platform-agnostic setup**: Build optimization and environment configuration
2. **Platform-specific deployment**: Commands and configuration for your target platform
3. **Infrastructure integration**: Database and service connections
4. **Verification**: Ensuring the deployed application works correctly

## Platform-Agnostic Production Setup

Before deploying to any platform, prepare your application for production.

### Environment Configuration

Create production environment variables:

```bash
# Copy environment template
cp .env.example .env.production

# Edit with production values
nano .env.production
```

**Common production environment variables:**
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=your_production_database_url
SESSION_SECRET=your_secure_random_secret
```

### Build Optimization

Ensure your application is optimized for production:

```bash
# Install production dependencies only
npm ci --production=false

# Run build process (if applicable)
npm run build

# Verify build output
ls -la dist/  # or build/ or out/
```

### Security Checklist

Before deployment, verify security basics:

- [ ] No sensitive data in source code (API keys, passwords)
- [ ] Environment variables properly configured
- [ ] HTTPS enabled (automatic on most platforms)
- [ ] CORS configured for your domains
- [ ] Rate limiting implemented (if needed)

## Cloudflare Workers + D1 Deployment

Deploy to Cloudflare's edge network with D1 database integration.

### Prerequisites

- Cloudflare account with Workers enabled
- Wrangler CLI installed: `npm install -g wrangler`
- D1 database created (if using database features)

### Step 1: Configure Wrangler

Ensure `wrangler.toml` exists in your project root:

```toml
name = "my-app"
main = "dist/index.js"
compatibility_date = "2024-01-01"

[build]
command = "npm run build"

[vars]
NODE_ENV = "production"

[[d1_databases]]
binding = "DB"
database_name = "my-app-db"
database_id = "your-database-id"
```

### Step 2: Authenticate with Cloudflare

```bash
# Login to Cloudflare
wrangler auth login

# Verify authentication
wrangler whoami
```

### Step 3: Deploy to Production

```bash
# Deploy to production (creates/updates the worker)
wrangler deploy

# Expected output:
# Uploaded my-app (1.00 sec)
# Published my-app (0.50 sec)
# https://my-app.your-subdomain.workers.dev
```

### Step 4: Configure Custom Domain (Optional)

```bash
# Add custom domain
wrangler routes put yourdomain.com/* --script=my-app

# Or use wrangler.toml:
# [routes]
# patterns = ["yourdomain.com/*"]
```

### Step 5: Database Setup (if using D1)

```bash
# Create D1 database (one-time setup)
wrangler d1 create my-app-db

# Run migrations (if you have them)
wrangler d1 execute my-app-db --file=./migrations/init.sql

# Verify database connection
wrangler tail  # Check for database errors
```

### Step 6: Verify Deployment

```bash
# Test the deployed application
curl https://my-app.your-subdomain.workers.dev

# Check worker logs
wrangler tail

# Monitor performance
wrangler tail --format=pretty
```

## Linode VPS Deployment

Deploy to a Linode VPS for full server control.

### Prerequisites

- Linode account and VPS instance
- SSH access to your VPS
- Node.js installed on the VPS
- Domain name (optional but recommended)

### Step 1: Server Preparation

Connect to your VPS and prepare the environment:

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Update system packages
apt update && apt upgrade -y

# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2 for process management
npm install -g pm2

# Install nginx for reverse proxy
apt install nginx -y
```

### Step 2: Application Deployment

Upload and configure your application:

```bash
# On your local machine, create deployment archive
tar -czf my-app.tar.gz -C /path/to/your/project .

# Upload to VPS
scp my-app.tar.gz root@your-vps-ip:~/

# On VPS, extract and setup
cd ~
tar -xzf my-app.tar.gz
cd my-app

# Install dependencies
npm ci --production

# Create production environment file
cp .env.example .env.production
nano .env.production  # Configure production variables
```

### Step 3: Configure PM2

Create PM2 ecosystem file for process management:

```bash
# Create ecosystem.config.js
nano ecosystem.config.js
```

**ecosystem.config.js content:**
```javascript
module.exports = {
  apps: [{
    name: 'my-app',
    script: 'dist/index.js',  // or 'src/index.js' if no build step
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

Start the application with PM2:

```bash
# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# (Follow the instructions provided by the command)

# Verify application is running
pm2 status
pm2 logs my-app
```

### Step 4: Configure Nginx

Set up reverse proxy and SSL:

```bash
# Create nginx configuration
nano /etc/nginx/sites-available/my-app
```

**nginx configuration:**
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
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
# Enable site
ln -s /etc/nginx/sites-available/my-app /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Reload nginx
systemctl reload nginx
```

### Step 5: SSL Configuration (Let's Encrypt)

```bash
# Install certbot
apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
certbot --nginx -d your-domain.com -d www.your-domain.com

# Verify SSL
curl -I https://your-domain.com
```

### Step 6: Database Setup (if applicable)

For applications using databases:

```bash
# Install PostgreSQL (example)
apt install postgresql postgresql-contrib -y

# Create database and user
sudo -u postgres psql
# In psql:
# CREATE DATABASE myapp;
# CREATE USER myappuser WITH PASSWORD 'securepassword';
# GRANT ALL PRIVILEGES ON DATABASE myapp TO myappuser;
# \q

# Update your .env.production with database URL
# DATABASE_URL=postgresql://myappuser:securepassword@localhost:5432/myapp
```

### Step 7: Verify Deployment

```bash
# Test the application
curl http://localhost:3000  # Internal test
curl https://your-domain.com  # External test

# Check PM2 status
pm2 status

# View application logs
pm2 logs my-app

# Monitor system resources
htop  # or top
```

## Troubleshooting Deployment Issues

### Cloudflare Workers Issues

**"Script too large" error:**
```bash
# Check bundle size
wrangler deploy --dry-run

# Optimize bundle:
# - Remove unused dependencies
# - Use dynamic imports for large libraries
# - Consider code splitting
```

**D1 database connection fails:**
```bash
# Verify database exists
wrangler d1 list

# Check database permissions
wrangler d1 execute your-db-name --command="SELECT 1;"

# Verify wrangler.toml binding
cat wrangler.toml
```

### Linode VPS Issues

**Application won't start:**
```bash
# Check PM2 logs
pm2 logs my-app

# Check application logs
tail -f ~/.pm2/logs/my-app-out.log

# Test manually
cd /path/to/app
npm start
```

**nginx proxy errors:**
```bash
# Check nginx error logs
tail -f /var/log/nginx/error.log

# Test nginx configuration
nginx -t

# Check if application is running on correct port
netstat -tlnp | grep :3000
```

**SSL certificate issues:**
```bash
# Renew certificates
certbot renew

# Check certificate status
certbot certificates
```

## Deployment Dimension Impact

When you scaffold with deployment dimensions, deployment may require additional steps:

### Cloudflare D1 Integration

If your template uses `deployment: "cloudflare-d1"`:

```bash
# Database is already configured in wrangler.toml
# Just ensure migrations are run
wrangler d1 execute my-app-db --file=./migrations/init.sql
```

### No Deployment (`deployment: "none"`)

Standard deployment without database dependencies.

## Next Steps

After successful deployment:

1. **Monitor performance** using platform-specific tools
2. **Set up logging** and error tracking
3. **Configure backups** for databases
4. **Set up CI/CD** for automated deployments
5. **Monitor costs** and resource usage

## Related Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [PM2 Process Manager](https://pm2.keymetrics.io/)
- [nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Certbot](https://certbot.eff.org/)