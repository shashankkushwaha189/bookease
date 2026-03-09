# 🚀 Vercel + Render Deployment Guide

## 📋 Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │    Database     │
│   (Vercel)      │◄──►│   (Render)      │◄──►│   (Render)      │
│                 │    │                 │    │                 │
│ React/Vite App  │    │ Node.js/Express │    │ PostgreSQL      │
│ Static Hosting  │    │ REST API        │    │ Database        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🌐 Step 1: Frontend Deployment on Vercel

### 1.1 Prepare Frontend for Vercel

#### Update Vercel Configuration
File: `apps/web/vercel.json`
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
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "VITE_API_URL": "@api_url",
    "VITE_APP_NAME": "BookEase",
    "VITE_APP_URL": "@site_url"
  }
}
```

#### Create Production Environment File
File: `apps/web/.env.production`
```env
VITE_API_URL=https://your-app-name.onrender.com
VITE_APP_NAME=BookEase
VITE_APP_URL=https://your-app-name.vercel.app
```

### 1.2 Deploy to Vercel

#### Option A: Vercel CLI (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to web app
cd apps/web

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Follow the prompts:
# ✓ Link to existing Vercel account
# ✓ Set up and deploy "apps-web"
# ✓ Configure project settings
# ✓ Deploy! 🎉
```

#### Option B: Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `pnpm install`
5. Add Environment Variables:
   - `VITE_API_URL`: `https://your-app-name.onrender.com`
   - `VITE_APP_NAME`: `BookEase`
6. Click "Deploy"

### 1.3 Configure Custom Domain (Optional)
```bash
# Add custom domain
vercel domains add yourdomain.com

# Or in Vercel dashboard:
# Settings → Domains → Add custom domain
```

## 🗄️ Step 2: Backend Deployment on Render

### 2.1 Prepare Backend for Render

#### Create Render Configuration File
File: `render.yaml`
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
    autoDeploy: true
    plan: free
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: JWT_SECRET
        generateValue: true
      - key: CORS_ORIGIN
        value: https://your-app-name.vercel.app
      - fromDatabase:
          name: bookease-db
          property: DATABASE_URL

databases:
  - name: bookease-db
    databaseName: bookease
    user: bookease_user
    plan: free
```

#### Update CORS for Production
File: `apps/api/src/app.ts`
```typescript
// Update CORS configuration
app.use(cors({ 
  origin: [
    'http://localhost:5173',
    'https://your-app-name.vercel.app',
    'https://yourdomain.com'  // If using custom domain
  ],
  credentials: true
}));
```

#### Create Production Start Script
File: `apps/api/package.json` (update scripts section)
```json
{
  "scripts": {
    "start": "node dist/index.js",
    "build": "node build-minimal.js",
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts"
  }
}
```

### 2.2 Deploy to Render

#### Option A: Automatic via GitHub (Recommended)
1. Push your code to GitHub
2. Go to [render.com](https://render.com)
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: `bookease-api`
   - **Environment**: Node
   - **Root Directory**: `apps/api`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
6. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `JWT_SECRET`: (Generate a secure secret)
   - `CORS_ORIGIN`: `https://your-app-name.vercel.app`
7. Click "Create Web Service"

#### Option B: Manual via Render Dashboard
1. Follow the same steps as above but manually configure
2. Set up database separately (see step 2.3)

### 2.3 Set Up Database on Render

#### Option A: Use Render PostgreSQL (Recommended)
1. In Render dashboard, click "New +"
2. Select "PostgreSQL"
3. Configure:
   - **Database Name**: `bookease`
   - **User**: `bookease_user`
   - **Plan**: Free (to start)
4. Click "Create Database"
5. Once created, go to your web service
6. Add environment variable:
   - `DATABASE_URL`: (Copy from database page)

#### Option B: Use External Database
```bash
# For Supabase, ElephantSQL, etc.
# Get connection string and add as environment variable
DATABASE_URL=postgresql://user:password@host:5432/database
```

### 2.4 Run Database Migrations

#### Option A: Render Shell
```bash
# In Render dashboard, go to your web service
# Click "Shell" tab
# Run migrations:
npx prisma migrate deploy
npx prisma db seed
```

#### Option B: Build Script Integration
Update `apps/api/package.json`:
```json
{
  "scripts": {
    "build": "node build-minimal.js && npx prisma generate",
    "postbuild": "npx prisma migrate deploy"
  }
}
```

## 🔗 Step 3: Connect Frontend and Backend

### 3.1 Update Frontend API Configuration

#### Create API Client
File: `apps/web/src/lib/api.ts`:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const apiClient = {
  get: async (url: string) => {
    const response = await fetch(`${API_BASE_URL}${url}`);
    if (!response.ok) throw new Error('API request failed');
    return response.json();
  },
  
  post: async (url: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('API request failed');
    return response.json();
  },
  
  // Add other methods as needed
};

// API Endpoints
export const API_ENDPOINTS = {
  TENANTS: `${API_BASE_URL}/api/tenants`,
  BUSINESS_PROFILE: `${API_BASE_URL}/api/business-profile`,
  HEALTH: `${API_BASE_URL}/health`
};
```

### 3.2 Update Tenant Management
File: `apps/web/src/lib/tenant.ts`:
```typescript
// Update the fetch calls to use the API client
import { apiClient, API_ENDPOINTS } from './api';

export class BusinessProfileManager {
  static async getProfile(tenantSlug: string) {
    try {
      const response = await apiClient.get(`/api/business-profile/public/slug/${tenantSlug}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching business profile:', error);
      return DEFAULT_THEME as BusinessProfile;
    }
  }
}
```

## ✅ Step 4: Testing and Verification

### 4.1 Test Backend
```bash
# Test health endpoint
curl https://your-app-name.onrender.com/health

# Test tenant endpoint
curl https://your-app-name.onrender.com/api/tenants/public/slug/demo-clinic

# Test business profile endpoint
curl https://your-app-name.onrender.com/api/business-profile/public/slug/demo-clinic
```

### 4.2 Test Frontend
```bash
# Test frontend loads
curl https://your-app-name.vercel.app

# Test API calls from frontend
# Open browser and navigate through the app
```

### 4.3 Integration Testing
1. Open your Vercel frontend
2. Check browser console for any API errors
3. Test tenant detection
4. Test business profile loading
5. Test booking functionality

## 🔧 Step 5: Troubleshooting

### 5.1 Common Issues

#### CORS Errors
```bash
# Test CORS preflight
curl -H "Origin: https://your-app-name.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://your-app-name.onrender.com/api/tenants/public
```

Fix: Update CORS in `apps/api/src/app.ts`:
```typescript
app.use(cors({ 
  origin: ['https://your-app-name.vercel.app'],
  credentials: true
}));
```

#### Environment Variables
```bash
# Check Vercel env vars
vercel env ls

# Check Render env vars (in dashboard)
# Web Service → Environment → Add Environment Variable
```

#### Database Connection
```bash
# Test database connection in Render Shell
npx prisma db pull
npx prisma generate
```

### 5.2 Debug Tips

#### Frontend Debugging
```javascript
// Add to frontend for debugging
console.log('API URL:', import.meta.env.VITE_API_URL);
console.log('Environment:', import.meta.env.MODE);
```

#### Backend Debugging
```javascript
// Add to API for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});
```

## 📊 Step 6: Monitoring and Maintenance

### 6.1 Vercel Analytics
- Built-in analytics in Vercel dashboard
- Page views, unique visitors, performance metrics
- Real-time logs

### 6.2 Render Monitoring
- Built-in logs and metrics
- Health checks
- Error tracking
- Performance monitoring

### 6.3 Database Monitoring
- Render PostgreSQL dashboard
- Query performance
- Connection limits
- Storage usage

## 🔄 Step 7: CI/CD Pipeline

### Automatic Deployments
Both platforms support automatic deployment:

1. **Push to main branch**:
   - Vercel: Auto-deploy frontend
   - Render: Auto-deploy backend

2. **Pull requests**:
   - Vercel: Preview deployments
   - Render: Preview deployments

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
      - uses: actions/checkout@v3
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
      - uses: actions/checkout@v3
      - name: Deploy to Render
        uses: render-inc/render-action@v1
        with:
          service-id: ${{ secrets.RENDER_SERVICE_ID }}
          api-key: ${{ secrets.RENDER_API_KEY }}
          working-directory: ./apps/api
```

## 🎯 Step 8: Production Checklist

### Frontend (Vercel)
- [ ] Deployed successfully
- [ ] Environment variables configured
- [ ] Custom domain set (if needed)
- [ ] Analytics enabled
- [ ] Error monitoring setup

### Backend (Render)
- [ ] Deployed successfully
- [ ] Database connected
- [ ] Migrations applied
- [ ] CORS configured
- [ ] Health checks passing
- [ ] Environment variables set
- [ ] SSL enabled (automatic)

### Integration
- [ ] API calls working
- [ ] Tenant detection working
- [ ] Business profiles loading
- [ ] No CORS errors
- [ ] Error handling working

---

## 🎉 You're Live!

Your BookEase application is now deployed:
- **Frontend**: `https://your-app-name.vercel.app`
- **Backend**: `https://your-app-name.onrender.com`
- **Database**: Managed by Render

Users can now access your booking system from anywhere! 🚀
