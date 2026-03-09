# 🧪 TESTING & DEPLOYMENT GUIDE

## 📋 **OVERVIEW**

This guide provides complete instructions for testing and deploying your BookEase multi-tenant system.

---

## 🚀 **QUICK START**

### **1. Start Backend Server**
```bash
cd apps/api
npm run dev
```
**Expected**: Server starts on `http://localhost:3000`

### **2. Start Frontend Server**
```bash
cd apps/web
npm run dev
```
**Expected**: Server starts on `http://localhost:5173`

### **3. Run Integration Tests**
```powershell
# Test backend only
powershell -ExecutionPolicy Bypass -File "test-backend-only.ps1"

# Test complete integration
powershell -ExecutionPolicy Bypass -File "test-complete-integration.ps1"
```

---

## 🧪 **TESTING SCENARIOS**

### **✅ Backend API Tests**

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

# Search profiles
curl "http://localhost:3000/api/business-profile/public/search?q=health"
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

### **✅ Frontend Tests**

#### **Basic Accessibility**
```bash
# Test main page
curl http://localhost:5173

# Expected: HTML content with React app
```

#### **Tenant Detection**
```bash
# URL-based detection
curl http://localhost:5173/demo-clinic/book

# Query parameter detection
curl "http://localhost:5173/book?tenant=demo-clinic"

# Expected: Tenant-specific booking page
```

#### **Theme Application**
1. Open `http://localhost:5173/demo-clinic/book`
2. Check browser dev tools for CSS custom properties:
   - `--primary-color` should be set
   - `--accent-color` should be set
3. Check page title for tenant-specific SEO

---

## 🔧 **MANUAL TESTING CHECKLIST**

### **✅ Backend Functionality**
- [ ] Health check returns 200
- [ ] Public tenants endpoint works
- [ ] Tenant by slug endpoint works
- [ ] Business profile endpoint works
- [ ] Services endpoint works
- [ ] Staff endpoint works
- [ ] Availability endpoint works
- [ ] Booking creation works

### **✅ Frontend Functionality**
- [ ] Main page loads
- [ ] Tenant detection works (URL slug)
- [ ] Tenant detection works (query params)
- [ ] Theme colors are applied
- [ ] Business name appears
- [ ] Logo appears (if configured)
- [ ] Booking flow loads services
- [ ] Booking flow loads staff
- [ ] Booking flow shows availability
- [ ] Booking can be completed

### **✅ Multi-Tenant Features**
- [ ] Different tenants show different data
- [ ] Branding changes per tenant
- [ ] Data isolation works
- [ ] Public endpoints don't require auth
- [ ] Protected endpoints require tenant headers

---

## 🚀 **DEPLOYMENT STEPS**

### **1. Backend Deployment**

#### **Environment Setup**
```bash
# Production environment variables
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:port/database
JWT_SECRET=your-jwt-secret
DEFAULT_TENANT=demo-clinic
```

#### **Database Migration**
```bash
cd apps/api
npx prisma migrate deploy
npx prisma generate
npm run build
```

#### **Start Production Server**
```bash
npm start
```

#### **Verify Deployment**
```bash
curl https://your-api-domain.com/health
```

### **2. Frontend Deployment**

#### **Build Production Bundle**
```bash
cd apps/web
npm run build
```

#### **Environment Configuration**
```bash
# .env.production
REACT_APP_API_URL=https://your-api-domain.com
NODE_ENV=production
```

#### **Deploy to Static Hosting**
```bash
# Deploy dist/ folder to your hosting provider
# Examples: Vercel, Netlify, AWS S3, etc.
```

#### **Configure Domain**
```nginx
server {
    listen 80;
    server_name *.your-domain.com your-domain.com;
    
    location / {
        root /var/www/bookease;
        try_files $uri $uri/ /index.html;
    }
}
```

### **3. Multi-Tenant Domain Setup**

#### **DNS Configuration**
```
# Wildcard subdomain
*.your-domain.com -> YOUR_SERVER_IP

# Specific subdomains
tenant1.your-domain.com -> YOUR_SERVER_IP
tenant2.your-domain.com -> YOUR_SERVER_IP
```

#### **SSL Certificate**
```bash
# Use Let's Encrypt for free SSL
certbot --wildcard -d *.your-domain.com
```

---

## 🔍 **TROUBLESHOOTING**

### **Common Issues**

#### **Backend Not Starting**
```bash
# Check database connection
npx prisma db push

# Check environment variables
printenv | grep DATABASE_URL

# Check logs
npm run dev -- --verbose
```

#### **Frontend Not Loading**
```bash
# Check API URL in .env
cat .env.local

# Check build errors
npm run build

# Check console for errors
# Open browser dev tools
```

#### **Tenant Detection Not Working**
```bash
# Check URL structure
http://localhost:5173/tenant-slug/book

# Check query parameters
http://localhost:5173/book?tenant=tenant-slug

# Check browser console for errors
```

#### **Theme Not Applied**
```bash
# Check CSS custom properties
# In browser dev tools:
getComputedStyle(document.documentElement).getPropertyValue('--primary-color')

# Check API response for profile data
curl http://localhost:3000/api/business-profile/public/slug/demo-clinic
```

#### **Booking Not Working**
```bash
# Check services are loaded
curl http://localhost:3000/api/public/services

# Check staff are loaded
curl http://localhost:3000/api/public/staff

# Check availability
curl "http://localhost:3000/api/public/availability?serviceId=SERVICE_ID&date=2026-03-10"
```

---

## 📊 **PERFORMANCE TESTING**

### **Load Testing**
```bash
# Install artillery
npm install -g artillery

# Create test config
cat > load-test.yml << EOF
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Health Check"
    weight: 50
    flow:
      - get:
          url: "/health"
  - name: "Public Tenants"
    weight: 30
    flow:
      - get:
          url: "/api/tenants/public"
  - name: "Business Profile"
    weight: 20
    flow:
      - get:
          url: "/api/business-profile/public/slug/demo-clinic"
EOF

# Run load test
artillery run load-test.yml
```

### **Frontend Performance**
```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run performance audit
lighthouse http://localhost:5173 --output html --output-path ./lighthouse-report.html
```

---

## 🔒 **SECURITY TESTING**

### **API Security**
```bash
# Test that protected endpoints require tenant headers
curl -H "x-tenant-id: invalid-id" http://localhost:3000/api/services

# Expected: 403 Forbidden

# Test that public endpoints work without auth
curl http://localhost:3000/api/public/services

# Expected: 200 OK
```

### **Data Isolation**
```bash
# Create bookings for different tenants
# Verify data doesn't leak between tenants

# Test tenant validation
curl -H "x-tenant-id: b18e0808-27d1-4253-aca9-453897585106" \
     -H "x-tenant-slug: different-slug" \
     http://localhost:3000/api/validate

# Expected: 403 Forbidden (mismatch)
```

---

## 📈 **MONITORING**

### **Health Monitoring**
```bash
# Create health check endpoint
curl http://localhost:3000/health

# Monitor with uptime robot
# Set up alerts for downtime
```

### **Performance Monitoring**
```bash
# Log response times
# Monitor database queries
# Track error rates
```

### **Business Metrics**
```bash
# Track booking conversion rates
# Monitor tenant activity
# Analyze user behavior
```

---

## 🎯 **PRODUCTION CHECKLIST**

### **Pre-Deployment**
- [ ] All tests passing
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] DNS configured
- [ ] Load balancer configured
- [ ] Monitoring set up
- [ ] Backup strategy in place

### **Post-Deployment**
- [ ] Health checks passing
- [ ] User testing completed
- [ ] Performance benchmarks met
- [ ] Security scan completed
- [ ] Documentation updated
- [ ] Team trained
- [ ] Support processes ready

---

## 🚨 **ROLLBACK PLAN**

### **Backend Rollback**
```bash
# Revert to previous database schema
npx prisma migrate reset

# Restore previous code version
git checkout previous-tag

# Restart services
npm restart
```

### **Frontend Rollback**
```bash
# Restore previous build
git checkout previous-tag
npm run build

# Redeploy static files
# Update CDN
```

---

## 🎉 **SUCCESS METRICS**

### **Technical Metrics**
- **Uptime**: > 99.9%
- **Response Time**: < 200ms
- **Error Rate**: < 0.1%
- **Load Time**: < 1.5 seconds

### **Business Metrics**
- **Booking Conversion**: > 80%
- **User Satisfaction**: > 4.5/5
- **Tenant Onboarding**: < 5 minutes
- **Support Tickets**: < 1% of users

---

**🚀 Your BookEase system is ready for production deployment!**

**Follow this guide to ensure a smooth and successful deployment!**
