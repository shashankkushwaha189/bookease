# 🚀 Vercel Deployment Guide

## 📋 Overview

Vercel is excellent for frontend deployment. For full-stack BookEase, we'll deploy:
- **Frontend (Web App)** → Vercel
- **Backend (API)** → Railway/Render/Heroku

## 🌐 Vercel Frontend Deployment

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Prepare Frontend for Vercel

#### Update Vercel Configuration
Create `apps/web/vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://your-api-domain.com/api/$1",
      "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "VITE_API_URL": "https://your-api-domain.com"
  }
}
```

#### Update Frontend Environment
Create `apps/web/.env.production`:
```env
VITE_API_URL=https://your-api-domain.com
VITE_APP_NAME=BookEase
VITE_APP_URL=https://your-domain.vercel.app
```

#### Update API Calls in Frontend
Make sure all API calls use the environment variable:
```typescript
// In your API service files
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const apiClient = {
  get: (url: string) => fetch(`${API_BASE_URL}${url}`),
  post: (url: string, data: any) => fetch(`${API_BASE_URL}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  // ... other methods
};
```

### 3. Deploy to Vercel

#### Method 1: Vercel CLI (Recommended)
```bash
cd apps/web

# Login to Vercel
vercel login

# Deploy project
vercel --prod

# Follow the prompts:
# - Set up and deploy new project
# - Link to existing Vercel account
# - Configure project settings
# - Deploy!
```

#### Method 2: Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `pnpm install`
5. Add Environment Variables:
   - `VITE_API_URL`: `https://your-api-domain.com`
6. Click "Deploy"

### 4. Configure Custom Domain (Optional)
```bash
# Add custom domain
vercel domains add yourdomain.com

# Verify DNS configuration
vercel domains inspect yourdomain.com
```

## 🗄️ API Deployment Options

### Option 1: Railway (Recommended)

#### 1. Prepare API for Railway
Create `apps/api/railway.json`:
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health"
  }
}
```

#### 2. Deploy to Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
cd apps/api
railway init

# Set environment variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=your-jwt-secret
railway variables set DATABASE_URL=your-database-url

# Deploy
railway up
```

### Option 2: Render

#### 1. Create `render.yaml`
```yaml
services:
  - type: web
    name: bookease-api
    env: node
    repo: https://github.com/yourusername/bookease
    rootDir: apps/api
    buildCommand: npm run build
    startCommand: npm start
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: JWT_SECRET
        generateValue: true
      - key: DATABASE_URL
        fromDatabase:
          name: bookease-db
          property: connectionString
```

#### 2. Deploy to Render
1. Go to [render.com](https://render.com)
2. Connect your GitHub repository
3. Select "New Web Service"
4. Configure:
   - **Name**: bookease-api
   - **Root Directory**: `apps/api`
   - **Runtime**: Node
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
5. Add environment variables
6. Deploy!

### Option 3: Heroku

#### 1. Create `Procfile`
```
web: npm start
```

#### 2. Deploy to Heroku
```bash
# Install Heroku CLI
# Download from https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Create app
heroku create bookease-api

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-jwt-secret

# Deploy
git subtree push --prefix apps/api heroku main
```

## 🔗 Connecting Frontend and Backend

### 1. Update CORS Settings
In your API (`apps/api/src/app.ts`):
```typescript
app.use(cors({ 
  origin: [
    'http://localhost:5173',
    'https://your-domain.vercel.app',
    'https://yourdomain.com'
  ],
  credentials: true
}));
```

### 2. Update Frontend API Configuration
In `apps/web/src/lib/api.ts`:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const API_ENDPOINTS = {
  TENANTS: `${API_BASE_URL}/api/tenants`,
  BUSINESS_PROFILE: `${API_BASE_URL}/api/business-profile`,
  // ... other endpoints
};
```

## 🗄️ Database Setup

### Option 1: Railway Database
```bash
# Add PostgreSQL to Railway project
railway add postgresql

# Get connection string
railway variables get DATABASE_URL
```

### Option 2: Render Database
1. In Render dashboard, click "New PostgreSQL"
2. Configure database settings
3. Copy connection string to API environment variables

### Option 3: Supabase (Recommended)
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Get connection string
4. Add to API environment variables

### Run Migrations
```bash
# After deploying API, run migrations
railway run npx prisma migrate deploy
# or for Render/Heroku
heroku run npx prisma migrate deploy
```

## ✅ Verification Checklist

### Frontend (Vercel)
- [ ] Deployed successfully
- [ ] Custom domain configured (if needed)
- [ ] Environment variables set
- [ ] API calls working

### Backend (Railway/Render/Heroku)
- [ ] Deployed successfully
- [ ] Database connected
- [ ] Migrations applied
- [ ] Health check passing
- [ ] CORS configured

### Integration
- [ ] Frontend can call backend API
- [ ] Tenant endpoints working
- [ ] Business profile endpoints working
- [ ] Error handling working

## 🚀 Testing Your Deployment

### Test Frontend
```bash
curl https://your-domain.vercel.app
```

### Test API
```bash
curl https://your-api-domain.com/health
curl https://your-api-domain.com/api/tenants/public/slug/demo-clinic
curl https://your-api-domain.com/api/business-profile/public/slug/demo-clinic
```

### Test Integration
1. Open your Vercel frontend
2. Navigate through the application
3. Test tenant detection
4. Test business profile loading
5. Test booking functionality

## 🔧 Troubleshooting

### Common Issues

#### CORS Errors
```bash
# Check API CORS settings
curl -H "Origin: https://your-domain.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://your-api-domain.com/api/tenants/public
```

#### Environment Variables
```bash
# Check Vercel env vars
vercel env ls

# Check Railway env vars
railway variables ls

# Check Render env vars (in dashboard)
```

#### Build Failures
```bash
# Check Vercel build logs
vercel logs

# Check Railway build logs
railway logs

# Check Render build logs (in dashboard)
```

## 📊 Monitoring

### Vercel Analytics
- Built-in analytics in Vercel dashboard
- Page views, unique visitors, performance metrics

### API Monitoring
- Railway: Built-in logs and metrics
- Render: Built-in logs and error tracking
- Heroku: Log tail and metrics

## 🔄 CI/CD Integration

### Automatic Deployment
Both Vercel and Railway/Render support automatic deployment from GitHub:

1. Push to main branch → Auto-deploy to production
2. Push to feature branch → Preview deployments
3. Pull requests → Automatic testing and preview

### GitHub Actions (Optional)
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./apps/web

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Railway
        uses: railway-app/railway-action@v1
        with:
          api-token: ${{ secrets.RAILWAY_TOKEN }}
          working-directory: ./apps/api
```

---

**🎉 Your BookEase application is now live on Vercel!**

Users can access your frontend at `https://your-domain.vercel.app` and it will seamlessly connect to your API backend.
