# 🎯 Next Steps After Vercel Deployment

## 📋 What to Do When Vercel Finishes

### 1. Copy Your Vercel URL
Once Vercel completes, you'll get something like:
```
✅ Production: https://bookease-abc123.vercel.app [copied to clipboard]
```

### 2. Update Backend CORS
In `apps/api/src/app.ts`, update line 38:
```typescript
// Change this to your actual Vercel URL
'https://bookease-abc123.vercel.app',
```

### 3. Deploy Backend to Render
1. Push code to GitHub:
```bash
git add .
git commit -m "Update CORS for Vercel deployment"
git push origin main
```

2. Go to render.com and:
   - Connect your GitHub repo
   - Create Web Service
   - Use `render.yaml` configuration
   - Set environment variables

### 4. Set Environment Variables on Render
```
NODE_ENV=production
PORT=10000
JWT_SECRET=your-jwt-secret
CORS_ORIGIN=https://bookease-abc123.vercel.app
APP_NAME=BookEase
APP_URL=https://bookease-abc123.vercel.app
```

### 5. Create Database on Render
- Add PostgreSQL service
- Copy connection string
- Add to environment variables

### 6. Run Migrations
In Render Shell:
```bash
npx prisma migrate deploy
npx prisma db seed
```

## 🎯 Expected URLs
- **Frontend**: https://bookease-abc123.vercel.app
- **Backend**: https://bookease-api.onrender.com

## 🔗 Final Connection
1. Update frontend environment in Vercel:
   - Add `VITE_API_URL=https://bookease-api.onrender.com`

2. Redeploy frontend:
```bash
cd apps/web
vercel --prod
```

---

**Waiting for Vercel to complete deployment...** ⏳
