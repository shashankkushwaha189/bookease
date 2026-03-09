# 🎯 **HOW TO CHECK YOUR MULTI-TENANT SYSTEM**

## 📋 **QUICK VERIFICATION STEPS**

### **🔧 STEP 1: START YOUR SERVERS**

#### **Backend Server (Terminal 1)**
```bash
cd apps/api
npm run dev
```
**Expected**: Server starts on `http://localhost:3000`

#### **Frontend Server (Terminal 2)**  
```bash
cd apps/web
npm run dev
```
**Expected**: Server starts on `http://localhost:5173`

---

### **🧪 STEP 2: TEST BACKEND API**

Open browser or use curl to test these URLs:

#### **Health Check**
```bash
curl http://localhost:3000/health
```
**Expected**: `{"status": "ok", "timestamp": "..."}`

#### **Tenant Endpoints**
```bash
# Get all public tenants
curl http://localhost:3000/api/tenants/public

# Get tenant by slug
curl http://localhost:3000/api/tenants/public/slug/demo-clinic

# Search tenants
curl "http://localhost:3000/api/tenants/public/search?q=clinic"
```

#### **Business Profile Endpoints**
```bash
# Get public business profile
curl http://localhost:3000/api/business-profile/public/slug/demo-clinic

# Get all public profiles
curl http://localhost:3000/api/business-profile/public/all
```

#### **Booking Endpoints**
```bash
# Get public services
curl http://localhost:3000/api/public/services

# Get public staff
curl http://localhost:3000/api/public/staff

# Get availability
curl "http://localhost:3000/api/public/availability?serviceId=1c77d539-076a-4d06-8a1f-a70d277858a4&date=2026-03-10"
```

---

### **🌐 STEP 3: TEST FRONTEND**

Open these URLs in your browser:

#### **Main Page**
```
http://localhost:5173
```
**Expected**: React app loads with default tenant

#### **Multi-Tenant URLs**
```
http://localhost:5173/demo-clinic/book
```
**Expected**: Booking page with "demo-clinic" tenant

```
http://localhost:5173/book?tenant=demo-clinic
```
**Expected**: Booking page with "demo-clinic" tenant

---

### **🎨 STEP 4: VERIFY MULTI-TENANT FEATURES**

#### **Check Tenant Detection**
1. Open `http://localhost:5173/demo-clinic/book`
2. Open browser dev tools (F12)
3. Check Console for tenant detection logs
4. Verify tenant data is loaded

#### **Check Theme Application**
1. In browser dev tools, go to Elements tab
2. Check `<html>` element for CSS custom properties:
   - `--primary-color` should be set
   - `--accent-color` should be set
3. Verify page title includes tenant name

#### **Check Booking Flow**
1. Click through the 5-step booking process
2. Verify services load for the tenant
3. Verify staff loads for the tenant
4. Verify availability checking works
5. Complete a test booking

---

### **🧪 STEP 5: RUN AUTOMATED TESTS**

#### **Test Backend Only**
```bash
powershell -ExecutionPolicy Bypass -File "test-backend-only.ps1"
```

#### **Test Complete Integration**
```bash
powershell -ExecutionPolicy Bypass -File "test-complete-integration.ps1"
```

---

## 🔍 **TROUBLESHOOTING**

### **❌ Backend Not Starting**
```bash
# Check database connection
cd apps/api
npx prisma db push

# Check environment variables
printenv | grep DATABASE_URL

# Check for compilation errors
npm run build
```

### **❌ Frontend Not Loading**
```bash
# Check API URL configuration
cat apps/web/.env.local

# Check for build errors
cd apps/web
npm run build

# Clear cache
rm -rf node_modules/.cache
npm install
```

### **❌ Tenant Detection Not Working**
1. Check browser console for errors
2. Verify API is responding
3. Check URL format is correct
4. Try different detection methods

### **❌ Theme Not Applied**
1. Check CSS custom properties in dev tools
2. Verify API returns profile data
3. Check for JavaScript errors
4. Clear browser cache

---

## 📊 **EXPECTED RESULTS**

### **✅ Working System**
- Backend responds to all API calls
- Frontend loads with tenant detection
- Different URLs show different tenant data
- Theme colors change per tenant
- Booking flow works end-to-end
- All automated tests pass

### **❌ Issues Found**
- Backend errors: Check database and environment
- Frontend errors: Check API connection and build
- Tenant detection: Check URL format and API response
- Theme issues: Check CSS and API data

---

## 🎯 **SUCCESS CHECKLIST**

### **Backend ✅**
- [ ] Health check returns 200
- [ ] Public tenants endpoint works
- [ ] Business profile endpoint works
- [ ] Services endpoint works
- [ ] Staff endpoint works
- [ ] Availability endpoint works

### **Frontend ✅**
- [ ] Main page loads
- [ ] Tenant detection works
- [ ] Multi-tenant URLs work
- [ ] Theme colors are applied
- [ ] Booking flow works
- [ ] No console errors

### **Integration ✅**
- [ ] Data isolation works
- [ ] API calls include tenant headers
- [ ] Public endpoints work without auth
- [ ] Protected endpoints require tenant ID
- [ ] Performance is acceptable (< 2 seconds)

---

## 🚀 **NEXT STEPS**

### **If Everything Works ✅**
1. **Deploy to Staging**: Test in production-like environment
2. **Add More Tenants**: Use the multi-tenant guide
3. **Customize Branding**: Update business profiles
4. **Performance Testing**: Load test the system
5. **Production Deployment**: Follow deployment guide

### **If Issues Found ❌**
1. **Fix Backend Issues**: Check database and API
2. **Fix Frontend Issues**: Check build and API connection
3. **Run Tests Again**: Verify fixes work
4. **Check Documentation**: Review implementation guides
5. **Get Help**: Check error logs and debug

---

## 📚 **REFERENCE GUIDES**

### **📖 Available Documentation**
- `MULTI-TENANT-GUIDE.md` - How to add and manage tenants
- `FRONTEND-INTEGRATION-GUIDE.md` - Frontend setup and customization
- `TESTING-AND-DEPLOYMENT-GUIDE.md` - Production deployment
- `PROJECT-COMPLETION-SUMMARY.md` - Complete project overview

### **🧪 Testing Scripts**
- `test-backend-only.ps1` - Backend API tests
- `test-complete-integration.ps1` - Full integration tests

### **🔧 Configuration Files**
- `apps/api/.env` - Backend environment variables
- `apps/web/.env.local` - Frontend environment variables
- `apps/api/prisma/schema.prisma` - Database schema

---

## 🎉 **YOUR SYSTEM IS READY!**

**Follow these steps to verify your multi-tenant BookEase system is working correctly:**

1. **Start both servers** (Backend + Frontend)
2. **Test API endpoints** with curl or browser
3. **Test frontend URLs** for tenant detection
4. **Verify booking flow** works end-to-end
5. **Run automated tests** for comprehensive validation

**🚀 Your enterprise-grade multi-tenant appointment booking system is ready to use!**
