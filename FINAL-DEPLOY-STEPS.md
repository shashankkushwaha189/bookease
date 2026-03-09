# 🎉 Final Deployment Steps - Backend Live!

## ✅ Current Status
- **Backend**: https://bookease-api.onrender.com ✅ LIVE
- **Frontend**: Need your Vercel URL
- **Database**: Need to set up

## 🔗 Step 1: Connect Frontend to Backend

### Update Vercel Environment Variables
Go to your Vercel project dashboard and add:
```
VITE_API_URL=https://bookease-api.onrender.com
VITE_APP_NAME=BookEase
VITE_APP_URL=https://your-vercel-url.vercel.app
```

### Redeploy Frontend
```bash
cd apps/web
vercel --prod
```

## 🔧 Step 2: Update Backend CORS

Update `apps/api/src/app.ts` line 38:
```typescript
// Change this to your actual Vercel URL
'https://your-vercel-url.vercel.app',
```

Then push and redeploy backend:
```bash
git add .
git commit -m "Update CORS for production"
git push origin main
```

## 🗄️ Step 3: Set Up Database on Render

### Create PostgreSQL Database
1. Go to your Render dashboard
2. Click "New +"
3. Select "PostgreSQL"
4. Configure:
   ```
   Database Name: bookease
   User: bookease_user
   Plan: Free
   ```
5. Click "Create Database"

### Connect Database to API
1. Go to your bookease-api service
2. Click "Environment"
3. Add environment variable:
   ```
   DATABASE_URL=postgresql://bookease_user:password@host:5432/bookease
   ```
   (Copy the connection string from your database page)

## 🚀 Step 4: Run Database Migrations

In Render Shell for your API:
```bash
npx prisma migrate deploy
npx prisma db seed
```

## ✅ Step 5: Final Testing

### Test Backend
```bash
curl https://bookease-api.onrender.com/health
curl https://bookease-api.onrender.com/api/tenants/public/slug/demo-clinic
curl https://bookease-api.onrender.com/api/business-profile/public/slug/demo-clinic
```

### Test Frontend
Open your Vercel URL and test:
- Tenant detection
- Business profile loading
- API calls working

## 🎯 Expected Final URLs

- **Frontend**: https://your-vercel-url.vercel.app
- **Backend**: https://bookease-api.onrender.com ✅
- **Database**: Managed by Render

## 🔍 Troubleshooting

### If CORS Errors:
Update backend CORS and redeploy

### If Database Issues:
Check connection string and run migrations

### If Frontend API Calls Fail:
Check Vercel environment variables

---

**🎉 Almost there! Just need to connect the frontend and set up the database!**
