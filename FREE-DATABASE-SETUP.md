# 🆓 Free Database Setup Options

## 🎯 Problem: Render Shell requires payment for free tier

## 🌟 Solution: Use Free External Database Options

### Option 1: Supabase (Recommended - Free Tier)

#### 1. Create Supabase Account
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub
4. Create new project:
   ```
   Project Name: bookease
   Database Password: [create strong password]
   Region: Choose closest to you
   ```

#### 2. Get Database Connection String
1. In Supabase dashboard, go to Settings → Database
2. Copy the "Connection string" (URI)
3. Format: `postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres`

#### 3. Update Render Environment
1. Go to your Render `bookease-api` service
2. Click "Environment" tab
3. Add environment variable:
   ```
   DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
   ```

#### 4. Run Migrations via API
Since we can't use shell, we'll create an API endpoint to run migrations:

Create `apps/api/src/routes/migrate.ts`:
```typescript
import { Router } from 'express';
import { execSync } from 'child_process';

const router = Router();

// Run migrations endpoint (temporary - remove after use)
router.post('/run-migrations', async (req, res) => {
  try {
    console.log('Running database migrations...');
    
    // Run Prisma migrate deploy
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    
    // Run Prisma seed
    execSync('npx prisma db seed', { stdio: 'inherit' });
    
    res.json({ success: true, message: 'Migrations completed successfully' });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;
```

Add to `apps/api/src/app.ts`:
```typescript
import migrateRoutes from './routes/migrate';

// Add this line before other routes
app.use('/migrate', migrateRoutes);
```

#### 5. Trigger Migrations
```bash
curl -X POST https://bookease-api.onrender.com/migrate/run-migrations
```

### Option 2: ElephantSQL (Free Tier)

#### 1. Create ElephantSQL Account
1. Go to [elephantsql.com](https://www.elephantsql.com)
2. Click "Create Free Instance"
3. Sign up
4. Create new instance:
   ```
   Name: bookease
   Plan: Turtle (Free)
   Region: Choose closest
   ```

#### 2. Get Connection Details
1. In dashboard, click on your instance
2. Copy the "Connection URL" from details

#### 3. Update Render Environment
Same as Step 3 in Supabase option

### Option 3: Neon (Free Tier)

#### 1. Create Neon Account
1. Go to [neon.tech](https://neon.tech)
2. Click "Sign up"
3. Create new project:
   ```
   Project name: bookease
   Database name: bookease
   Region: Choose closest
   ```

#### 2. Get Connection String
1. In Neon dashboard, go to Connection Details
2. Copy the connection string

#### 3. Update Render Environment
Same as Step 3 in Supabase option

## 🚀 Quick Setup Steps

### 1. Choose Database Provider
I recommend **Supabase** - it's the most generous free tier and easiest to use.

### 2. Create Database
- Sign up for Supabase
- Create new project
- Copy connection string

### 3. Update Render
- Add DATABASE_URL environment variable
- Redeploy the API (automatic)

### 4. Run Migrations
- Add the migration endpoint (I'll help you)
- Trigger migrations via API call
- Test the application

## 🔄 After Database Setup

Once database is working:
1. ✅ Test business profile API
2. ✅ Test tenant API  
3. ✅ Test frontend integration
4. ✅ Add back all the features

## 🎯 Expected Results

After setup:
- ✅ Free database (no payment needed)
- ✅ Full CRUD operations working
- ✅ Business profiles loading
- ✅ Tenant detection working
- ✅ Ready to add back all features

---

**Choose Supabase for the easiest free setup!** 🚀
