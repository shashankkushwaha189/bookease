# 🚀 BookEase Deployment Guide

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- Docker & Docker Compose (optional)
- Domain name (for production)
- SSL certificate (for production)

## 🗂️ Project Structure

```
bookease/
├── apps/
│   ├── api/          # Backend API (Node.js/Express)
│   └── web/          # Frontend (React/Vite)
├── packages/         # Shared packages
├── docker-compose.yml
└── .env.example
```

## 🌍 Environment Setup

### 1. Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Update the `.env` file with your production values:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/bookease"

# API Configuration
NODE_ENV="production"
PORT=3000
CORS_ORIGIN="https://yourdomain.com"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="7d"

# Application
APP_NAME="BookEase"
APP_URL="https://yourdomain.com"
```

### 2. Database Setup

#### Option A: Docker (Recommended)
```bash
# Start PostgreSQL
docker-compose up -d db

# Run migrations
cd apps/api
npx prisma migrate deploy

# Seed database (optional)
npx prisma db seed
```

#### Option B: Manual PostgreSQL
```bash
# Create database
createdb bookease

# Run migrations
cd apps/api
npx prisma migrate deploy

# Seed database
npx prisma db seed
```

## 🏗️ Build Process

### 1. Install Dependencies
```bash
# Install all dependencies
pnpm install
```

### 2. Build Applications
```bash
# Build both API and Web
npm run build

# Or build individually
cd apps/api && npm run build
cd apps/web && npm run build
```

## 🚀 Deployment Options

### Option 1: Docker Deployment (Recommended)

#### Create Dockerfile for API
```dockerfile
# apps/api/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY ../../package*.json ./
COPY ../../pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
```

#### Create Dockerfile for Web
```dockerfile
# apps/web/Dockerfile
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY ../../package*.json ./
COPY ../../pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code and build
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Create nginx.conf for Web
```nginx
# apps/web/nginx.conf
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        location /api {
            proxy_pass http://api:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

#### Update docker-compose.yml
```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    container_name: bookease-db-v15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: bookease
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: [ "CMD-SHELL", "pg_isready -U postgres" ]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    container_name: bookease-api
    environment:
      DATABASE_URL: postgresql://postgres:password@db:5432/bookease
      NODE_ENV: production
      JWT_SECRET: your-jwt-secret
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "3000:3000"

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    container_name: bookease-web
    ports:
      - "80:80"
    depends_on:
      - api

volumes:
  postgres_data:
```

#### Deploy with Docker
```bash
# Build and start all services
docker-compose up -d --build

# Check logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Option 2: Traditional Server Deployment

#### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install Nginx
sudo apt install nginx

# Install PM2 (process manager)
sudo npm install -g pm2
```

#### 2. Database Configuration
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE bookease;
CREATE USER bookease_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE bookease TO bookease_user;
\q
```

#### 3. Deploy API
```bash
# Clone repository
git clone <your-repo-url> bookease
cd bookease

# Install dependencies
pnpm install

# Build applications
npm run build

# Setup database
cd apps/api
npx prisma migrate deploy
npx prisma db seed

# Start API with PM2
pm2 start dist/index.js --name "bookease-api"
pm2 save
pm2 startup
```

#### 4. Deploy Web
```bash
# Configure Nginx
sudo nano /etc/nginx/sites-available/bookease
```

```nginx
# /etc/nginx/sites-available/bookease
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        root /path/to/bookease/apps/web/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/bookease /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Option 3: Cloud Platform Deployment

#### Vercel (Frontend only)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy web app
cd apps/web
vercel --prod
```

#### Railway/Render/Heroku
1. Connect your GitHub repository
2. Set environment variables
3. Configure build command: `npm run build`
4. Configure start command: `npm run start`
5. Deploy!

## 🔒 SSL/HTTPS Setup

### Let's Encrypt (Recommended)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔍 Post-Deployment Checklist

- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] API health check passing: `curl https://yourdomain.com/health`
- [ ] Frontend loading correctly
- [ ] SSL certificate installed
- [ ] Error monitoring setup
- [ ] Backup strategy implemented
- [ ] Performance monitoring configured

## 🚨 Common Issues & Solutions

### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
psql -h localhost -U bookease_user -d bookease
```

### Port Conflicts
```bash
# Check what's using port 3000
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>
```

### Permission Issues
```bash
# Fix file permissions
sudo chown -R $USER:$USER /path/to/bookease
chmod -R 755 /path/to/bookease
```

## 📊 Monitoring & Maintenance

### PM2 Monitoring
```bash
# View process status
pm2 status

# View logs
pm2 logs bookease-api

# Restart application
pm2 restart bookease-api
```

### Database Backups
```bash
# Create backup
pg_dump -h localhost -U bookease_user bookease > backup.sql

# Restore backup
psql -h localhost -U bookease_user bookease < backup.sql
```

### Log Monitoring
```bash
# API logs
tail -f /var/log/bookease/api.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## 🆘 Support

If you encounter issues:

1. Check the logs: `pm2 logs` or `docker-compose logs`
2. Verify environment variables
3. Test database connection
4. Check network connectivity
5. Review this guide for common solutions

---

**🎉 Your BookEase application is now deployed and ready for production!**
