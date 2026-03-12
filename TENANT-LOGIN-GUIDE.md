# 🔑 Multi-Tenant Login Guide

## Understanding Tenant Access

When you initialize a tenant using `/api/init-database`, it automatically creates:
- A new tenant with unique ID and slug
- An admin user for that tenant
- A business profile

## 🏢 Available Tenants

### 1. Demo Clinic (Original)
- **Tenant ID**: `9d6a9a2c-4d64-4167-a9ae-2f0c21f34939`
- **Tenant Slug**: `demo-clinic`
- **Admin Email**: `admin@demo.com`
- **Password**: `demo123456`

### 2. Wellness Spa Center (New)
- **Tenant ID**: `b2934b40-378c-4736-82d1-b56a1d905858`
- **Tenant Slug**: `wellness-spa-v2`
- **Admin Email**: `spa-admin@wellness-spa.com`
- **Password**: `SpaAdmin123!`

### 3. Test Spa (Created during testing)
- **Tenant ID**: `679fb5e6-0de4-4d2c-864a-b7370c28600e`
- **Tenant Slug**: `test-spa`
- **Admin Email**: `test@test.com`
- **Password**: `test123`

## 🔐 Login Methods

### Method 1: API Login with Headers

#### By Tenant ID
```bash
curl -X POST \
  -H "X-Tenant-ID: 9d6a9a2c-4d64-4167-a9ae-2f0c21f34939" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"demo123456"}' \
  http://localhost:3000/api/auth/login
```

#### By Tenant Slug
```bash
curl -X POST \
  -H "X-Tenant-Slug: demo-clinic" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"demo123456"}' \
  http://localhost:3000/api/auth/login
```

#### By Tenant Domain
```bash
curl -X POST \
  -H "X-Tenant-Domain: demo-clinic.bookease.com" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"demo123456"}' \
  http://localhost:3000/api/auth/login
```

### Method 2: Web Application Login

#### Direct Access
1. Open browser: `http://localhost:5173`
2. Enter tenant slug: `demo-clinic` or `wellness-spa-v2`
3. Login with tenant-specific credentials

#### URL with Tenant
```
http://localhost:5173/login?tenant=demo-clinic
http://localhost:5173/login?tenant=wellness-spa-v2
```

### Method 3: Create New Tenant

#### Quick Setup
```bash
node enhanced-tenant-setup.js
```

#### Custom Tenant
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "tenantSlug": "your-business",
    "tenantName": "Your Business Name",
    "businessName": "Your Business",
    "adminEmail": "admin@yourbusiness.com",
    "adminPassword": "YourPassword123!"
  }' \
  http://localhost:3000/api/init-database
```

## 🛠️ Troubleshooting

### Rate Limiting
If you see "Too many login attempts", wait 15 minutes or restart the API server:
```bash
# Stop API server (Ctrl+C) and restart
cd apps/api && npm run dev
```

### Wrong Tenant
Ensure you're using the correct tenant identifier:
- Check tenant ID is correct UUID format
- Verify tenant slug matches exactly
- Use correct credentials for each tenant

### Tenant Not Found
```bash
# List tenants via database
SELECT id, name, slug FROM "Tenant";
```

## 📋 Quick Reference Commands

### Switch Between Tenants
```javascript
// Demo Clinic
const demoLogin = await axios.post('http://localhost:3000/api/auth/login', {
  email: 'admin@demo.com',
  password: 'demo123456'
}, {
  headers: { 'X-Tenant-ID': '9d6a9a2c-4d64-4167-a9ae-2f0c21f34939' }
});

// Wellness Spa
const spaLogin = await axios.post('http://localhost:3000/api/auth/login', {
  email: 'spa-admin@wellness-spa.com',
  password: 'SpaAdmin123!'
}, {
  headers: { 'X-Tenant-ID': 'b2934b40-378c-4736-82d1-b56a1d905858' }
});
```

### Access Tenant Services
```bash
# Demo Clinic Services
curl -H "X-Tenant-Slug: demo-clinic" \
     http://localhost:3000/api/public/services

# Wellness Spa Services  
curl -H "X-Tenant-Slug: wellness-spa-v2" \
     http://localhost:3000/api/public/services
```

## 🎯 Best Practices

1. **Use Tenant Slugs** for web applications (more user-friendly)
2. **Use Tenant IDs** for API access (more reliable)
3. **Store Tenant Context** in your application state
4. **Validate Tenant Access** before making requests
5. **Handle Tenant Not Found** errors gracefully

## 🚀 Production Usage

For production deployment:
1. Configure custom domains for each tenant
2. Use SSL certificates
3. Set up proper DNS records
4. Configure load balancers
5. Monitor tenant-specific metrics

Each tenant operates completely independently with their own users, services, and data!
