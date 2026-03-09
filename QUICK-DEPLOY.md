# ⚡ Quick Deploy Guide

## 🐳 Docker Deployment (Fastest)

### 1. Clone & Setup
```bash
git clone <your-repo-url> bookease
cd bookease
cp .env.example .env
```

### 2. Deploy with Docker Compose
```bash
# Build and start all services
docker-compose up -d --build

# Wait for services to be ready (check logs)
docker-compose logs -f

# Check deployment status
curl http://localhost:80          # Frontend
curl http://localhost:3000/health  # API Health
```

### 3. Access Your Application
- **Frontend**: http://localhost:80
- **API**: http://localhost:3000
- **Database**: localhost:5432

### 4. Common Commands
```bash
# View logs
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f db

# Restart services
docker-compose restart api
docker-compose restart web

# Stop all services
docker-compose down

# Update and rebuild
docker-compose down
docker-compose up -d --build
```

## 🌐 Cloud Deployment

### Vercel (Frontend Only)
```bash
cd apps/web
npm install -g vercel
vercel --prod
```

### Railway (Full Stack)
1. Push code to GitHub
2. Connect Railway to your repo
3. Set environment variables
4. Deploy!

### Render (Full Stack)
1. Push code to GitHub
2. Connect Render to your repo
3. Configure Web Service (API) and Static Site (Web)
4. Deploy!

## 🔧 Manual Server Deployment

### Prerequisites
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nodejs postgresql nginx

# Install pnpm
npm install -g pnpm

# Install PM2
npm install -g pm2
```

### Deploy Steps
```bash
# 1. Setup database
sudo -u postgres createdb bookease

# 2. Deploy API
cd apps/api
pnpm install
npm run build
pm2 start dist/index.js --name bookease-api

# 3. Deploy Web
cd ../web
pnpm install
npm run build
sudo cp -r dist/* /var/www/html/

# 4. Configure Nginx
sudo nano /etc/nginx/sites-available/bookease
# (See DEPLOYMENT-GUIDE.md for nginx config)
```

## 📱 Mobile Deployment

### React Native (Future)
```bash
# Not yet implemented
# Will require React Native setup
```

## 🔍 Verification

After deployment, test these endpoints:
```bash
# Health checks
curl http://localhost:3000/health
curl http://localhost/api/tenants/public/slug/demo-clinic
curl http://localhost/api/business-profile/public/slug/demo-clinic

# Frontend
curl http://localhost:80
```

## 🚨 Troubleshooting

### Database Issues
```bash
# Reset database
docker-compose down -v
docker-compose up -d db
```

### Port Conflicts
```bash
# Check ports
sudo lsof -i :80
sudo lsof -i :3000
sudo lsof -i :5432
```

### Build Issues
```bash
# Clean build
docker-compose down
docker system prune -f
docker-compose up -d --build
```

---

**🎉 Choose the deployment method that best fits your needs!**
