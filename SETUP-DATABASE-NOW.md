# 🗄️ Setup Database Now - You Have the Connection String!

## 🔗 Your Supabase Connection String:
```
postgresql://postgres:[xLKnG5BXU9q4nO0t]@db.wodturfrycltutermepm.supabase.co:5432/postgres
```

## ⚙️ Step 1: Update Render Environment

### 1. Go to Render Dashboard
1. Go to [render.com](https://render.com)
2. Click on your `bookease-api` service
3. Click "Environment" tab

### 2. Add DATABASE_URL
1. Click "Add Environment Variable"
2. **Name**: `DATABASE_URL`
3. **Value**: `postgresql://postgres:xLKnG5BXU9q4nO0t@db.wodturfrycltutermepm.supabase.co:5432/postgres`
4. Click "Save"

### 3. Add JWT_SECRET
1. Click "Add Environment Variable"  
2. **Name**: `JWT_SECRET`
3. **Value**: `your-super-secret-jwt-key-change-this-in-production`
4. Click "Save"

### 4. Add Other Environment Variables
```
NODE_ENV=production
PORT=10000
CORS_ORIGIN=https://bookease-ashen.vercel.app
APP_NAME=BookEase
APP_URL=https://bookease-ashen.vercel.app
```

## 🔄 Step 2: Wait for Redeploy

Render will automatically redeploy your service with the new environment variables. This usually takes 1-2 minutes.

## 🚀 Step 3: Run Migrations

Once the deployment is complete, run this command:

```bash
curl -X POST https://bookease-api.onrender.com/api/migrate/run-migrations
```

### Expected Response:
```json
{
  "success": true,
  "message": "Migrations completed successfully",
  "tenantCount": 1
}
```

## ✅ Step 4: Test Database

Check if database is working:

```bash
# Check database status
curl https://bookease-api.onrender.com/api/migrate/status

# Expected response:
{
  "success": true,
  "connected": true,
  "tenantCount": 1,
  "profileCount": 1,
  "message": "Database is ready"
}
```

## 🎯 Step 5: Test Full Application

### Test Backend APIs:
```bash
# Test business profile API
curl https://bookease-api.onrender.com/api/business-profile/public/slug/demo-clinic

# Expected response:
{
  "success": true,
  "data": {
    "businessName": "HealthFirst Clinic",
    "brandColor": "#1A56DB",
    "accentColor": "#7C3AED",
    ...
  }
}
```

### Test Frontend:
Open your browser and go to: `https://bookease-ashen.vercel.app`

## 🎉 Expected Final Result

If everything works, you'll have:
- ✅ **Frontend**: Loading correctly at https://bookease-ashen.vercel.app
- ✅ **Backend**: Responding correctly at https://bookease-api.onrender.com
- ✅ **Database**: Connected and populated with demo data
- ✅ **Integration**: Frontend successfully calling backend APIs
- ✅ **Business Profiles**: Loading correctly
- ✅ **Tenant Detection**: Working properly

## 🔧 If Something Goes Wrong

### Migration Fails:
```bash
# Check error details
curl -X POST https://bookease-api.onrender.com/api/migrate/run-migrations
```

### Database Not Connected:
```bash
# Check database status
curl https://bookease-api.onrender.com/api/migrate/status
```

### Frontend Not Loading:
- Check browser console for errors
- Verify Vercel environment variables
- Check if backend API is responding

---

**You're just a few steps away from having a fully deployed BookEase application!** 🚀
