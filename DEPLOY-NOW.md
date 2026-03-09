# 🚀 Deploy BookEase Now - Step by Step

## 📋 What I'll Help You With

I'll guide you through each step, and you'll do the actual deployments using your accounts.

## 🔧 Step 1: Prepare Your Code

First, let's make sure everything is ready:

```bash
# 1. Install all dependencies
pnpm install

# 2. Build both applications
npm run build

# 3. Test everything locally
curl http://localhost:3000/health
curl http://localhost:3000/api/business-profile/public/slug/demo-clinic
```

## 🌐 Step 2: Deploy Frontend to Vercel

### 2.1 Install Vercel CLI
```bash
npm install -g vercel
```

### 2.2 Login to Vercel
```bash
cd apps/web
vercel login
# This will open your browser to login
```

### 2.3 Deploy to Vercel
```bash
# From the apps/web directory
vercel --prod
```

### 2.4 Follow These Prompts:
```
? Set up and deploy "~/bookease/apps/web"? [Y/n] y
? Which scope do you want to deploy to? Your Name
? Link to existing project? [y/N] n
? What's your project's name? bookease-web
? In which directory is your code located? ./
? Want to override the settings? [y/N] n
🔗  Linked to yourusername/bookease (created .vercel)
🔍  Inspect: https://vercel.com/yourusername/bookease
✅  Production: https://bookease-yourusername.vercel.app [copied to clipboard]
```

### 2.5 Set Environment Variables in Vercel
Go to your Vercel project dashboard and add:
```
VITE_API_URL=https://your-app-name.onrender.com
VITE_APP_NAME=BookEase
VITE_APP_URL=https://bookease-yourusername.vercel.app
```

## 🗄️ Step 3: Deploy Backend to Render

### 3.1 Push Code to GitHub
```bash
# Make sure all changes are committed
git add .
git commit -m "Ready for Vercel + Render deployment"
git push origin main
```

### 3.2 Create Render Account
1. Go to [render.com](https://render.com)
2. Click "Sign up" (free)
3. Sign up with GitHub

### 3.3 Deploy Backend
1. In Render dashboard, click "New +"
2. Select "Web Service"
3. Connect your GitHub repository
4. Configure:
   ```
   Name: bookease-api
   Environment: Node
   Root Directory: apps/api
   Build Command: npm run build
   Start Command: npm start
   Health Check Path: /health
   Instance Type: Free
   ```

### 3.4 Add Environment Variables on Render
```
NODE_ENV=production
PORT=10000
JWT_SECRET=your-super-secret-jwt-key-here
CORS_ORIGIN=https://bookease-yourusername.vercel.app
APP_NAME=BookEase
APP_URL=https://bookease-yourusername.vercel.app
```

### 3.5 Create Database
1. In Render dashboard, click "New +"
2. Select "PostgreSQL"
3. Configure:
   ```
   Database Name: bookease
   User: bookease_user
   Instance Type: Free
   ```
4. Click "Create Database"

### 3.6 Connect Database to API
1. Go back to your web service (bookease-api)
2. Click "Environment"
3. Add environment variable:
   ```
   DATABASE_URL=postgresql://bookease_user:password@host:5432/bookease
   ```
   (Copy the connection string from your database page)

### 3.7 Run Database Migrations
1. Go to your web service dashboard
2. Click "Shell" tab
3. Run these commands:
```bash
npx prisma migrate deploy
npx prisma db seed
```

## 🔗 Step 4: Connect Everything

### 4.1 Update Configuration Files

#### Update CORS in Backend
In `apps/api/src/app.ts`, update line 38:
```typescript
// Change this line to your actual Vercel URL
'https://bookease-yourusername.vercel.app',
```

#### Update Frontend Environment
In Vercel dashboard, update `VITE_API_URL`:
```
VITE_API_URL=https://bookease-api.onrender.com
```

### 4.2 Redeploy Both Services
```bash
# Redeploy frontend
cd apps/web
vercel --prod

# Backend will auto-redeploy when you push changes
git add .
git commit -m "Update CORS for production"
git push origin main
```

## ✅ Step 5: Test Your Live Application

### 5.1 Test Backend
```bash
curl https://bookease-api.onrender.com/health
curl https://bookease-api.onrender.com/api/tenants/public/slug/demo-clinic
curl https://bookease-api.onrender.com/api/business-profile/public/slug/demo-clinic
```

### 5.2 Test Frontend
Open your browser and go to: `https://bookease-yourusername.vercel.app`

### 5.3 Check Browser Console
- Open Developer Tools (F12)
- Check for any API errors
- Verify API calls are working

## 🔧 Troubleshooting

### If API Calls Fail:
1. Check CORS settings in backend
2. Verify environment variables
3. Check Render logs

### If Frontend Doesn't Load:
1. Check Vercel deployment logs
2. Verify build completed successfully
3. Check environment variables

### If Database Issues:
1. Verify connection string
2. Check if migrations ran
3. Test database connection in Render Shell

## 🎉 Step 6: Go Live!

Your application is now live at:
- **Frontend**: https://bookease-yourusername.vercel.app
- **Backend**: https://bookease-api.onrender.com

## 📱 Optional: Add Custom Domain

### Vercel Custom Domain
```bash
vercel domains add yourdomain.com
```

### Render Custom Domain
1. Go to your web service dashboard
2. Click "Custom Domains"
3. Add your domain
4. Update DNS records

## 🔄 Next Steps

1. **Monitor your applications** in both dashboards
2. **Set up error monitoring** (optional)
3. **Configure backups** for your database
4. **Add analytics** (optional)

---

## 🆘 Need Help?

If you get stuck at any step:
1. Check the logs in Vercel/Render dashboards
2. Verify environment variables
3. Test locally first
4. Ask me for specific help with any error messages

**Let me know which step you're on and I'll help you through it!** 🚀
