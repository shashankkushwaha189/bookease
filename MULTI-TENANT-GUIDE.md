# 🏢 **MULTI-TENANT SETUP GUIDE**

## 📋 **OVERVIEW**

Your BookEase system is designed for multi-tenancy. Here's how to add a second tenant:

---

## 🎯 **STEP 1: DATABASE SETUP**

### **Option A: Update Seed File**
**File**: `apps/api/prisma/seed-demo.ts`

Add a second tenant to the existing seed data:

```typescript
// After existing tenant creation (around line 38)
const tenant2 = await prisma.tenant.create({
    data: {
        id: 'second-tenant-id-here', // New unique UUID
        name: 'Second Clinic',
        slug: 'second-clinic',
        timezone: 'America/New_York',
    }
});

console.log(`Created Second Tenant: ${tenant2.name}`);
```

### **Option B: Manual Database Insert**
```sql
INSERT INTO "Tenant" (id, name, slug, timezone, "isActive", "createdAt", "updatedAt") 
VALUES (
    'second-tenant-id-here', 
    'Second Clinic', 
    'second-clinic', 
    'America/New_York', 
    true, 
    NOW(), 
    NOW()
);
```

---

## 🎯 **STEP 2: RUN SEED**

```bash
cd apps/api
npx prisma db seed
```

---

## 🎯 **STEP 3: FRONTEND CONFIGURATION**

### **Update Tenant Detection**
**File**: `apps/web/src/lib/tenant.ts`

```typescript
export const TENANTS = [
    {
        id: 'b18e0808-27d1-4253-aca9-453897585106',
        name: 'HealthFirst Clinic',
        slug: 'demo-clinic',
        domain: 'demo-clinic.bookease.com',
        theme: {
            primaryColor: '#1A56DB',
            accentColor: '#7C3AED'
        }
    },
    {
        id: 'second-tenant-id-here',
        name: 'Second Clinic',
        slug: 'second-clinic',
        domain: 'second-clinic.bookease.com',
        theme: {
            primaryColor: '#10B981',
            accentColor: '#F59E0B'
        }
    }
];
```

### **Update Tenant Selection**
**File**: `apps/web/src/components/TenantSelector.tsx`

```typescript
import { TENANTS } from '../lib/tenant';

export const TenantSelector = () => {
    const [selectedTenant, setSelectedTenant] = useState(TENANTS[0]);
    
    return (
        <div className="tenant-selector">
            <select 
                value={selectedTenant.id} 
                onChange={(e) => setSelectedTenant(TENANTS.find(t => t.id === e.target.value))}
            >
                {TENANTS.map(tenant => (
                    <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                    </option>
                ))}
            </select>
        </div>
    );
};
```

---

## 🎯 **STEP 4: API CONFIGURATION**

### **Update Tenant Middleware**
**File**: `apps/api/src/middleware/tenant.middleware.ts`

The current middleware already supports multiple tenants. No changes needed.

### **Update Default Tenant Handling**
**File**: `apps/api/src/modules/appointment/public-booking.routes.ts`

Update the default tenant logic:

```typescript
// Add tenant ID middleware for public routes (use default tenant)
publicBookingRouter.use((req, res, next) => {
    const tenantSlug = req.headers['x-tenant-slug'] || 'demo-clinic';
    const tenant = TENANTS.find(t => t.slug === tenantSlug);
    req.tenantId = tenant?.id || "b18e0808-27d1-4253-aca9-453897585106";
    next();
});
```

---

## 🎯 **STEP 5: ROUTING CONFIGURATION**

### **Subdomain Routing (Optional)**
**File**: `apps/web/vite.config.ts`

```typescript
export default defineConfig({
    plugins: [react()],
    server: {
        host: true,
        port: 5173
    }
});
```

### **URL Structure**
- **Tenant 1**: `http://localhost:5173?tenant=demo-clinic`
- **Tenant 2**: `http://localhost:5173?tenant=second-clinic`
- **Subdomains**: `demo-clinic.localhost:5173`, `second-clinic.localhost:5173`

---

## 🎯 **STEP 6: TESTING**

### **Test Both Tenants**
```bash
# Test Tenant 1
curl -H "x-tenant-id: b18e0808-27d1-4253-aca9-453897585106" \
     http://localhost:3000/api/public/services

# Test Tenant 2  
curl -H "x-tenant-id: second-tenant-id-here" \
     http://localhost:3000/api/public/services
```

### **Frontend Testing**
1. Open `http://localhost:5173?tenant=demo-clinic`
2. Open `http://localhost:5173?tenant=second-clinic`
3. Verify tenant-specific data loads correctly

---

## 🎯 **STEP 7: DEPLOYMENT CONSIDERATIONS**

### **Environment Variables**
```bash
# .env
DEFAULT_TENANT=demo-clinic
TENANT_1_ID=b18e0808-27d1-4253-aca9-453897585106
TENANT_2_ID=second-tenant-id-here
```

### **Database Separation**
- Each tenant has separate data
- No data sharing between tenants
- Complete isolation

---

## 🔧 **RECOMMENDED APPROACH**

### **For Development:**
1. **Start with seed file approach** (Option A)
2. **Test with URL parameters** for tenant switching
3. **Use different browser tabs** for each tenant

### **For Production:**
1. **Use subdomains** for each tenant
2. **Implement tenant detection** from domain
3. **Separate databases** if needed

---

## 📊 **TWO-TENANT EXAMPLE**

After setup, you'll have:

```
┌─────────────────────────────────────────┐
│  Tenant 1: HealthFirst Clinic      │
│  ID: b18e0808-27d1-4253-aca9-453897585106 │
│  Slug: demo-clinic                 │
│  Domain: demo-clinic.bookease.com    │
├─────────────────────────────────────────┤
│  Tenant 2: Second Clinic           │
│  ID: second-tenant-id-here         │
│  Slug: second-clinic              │
│  Domain: second-clinic.bookease.com │
└─────────────────────────────────────────┘
```

---

## 🚨 **IMPORTANT NOTES**

1. **Unique IDs**: Each tenant needs a unique UUID
2. **Database Isolation**: Tenants cannot share data
3. **Frontend Context**: Update all tenant-specific UI
4. **API Headers**: All API calls need correct tenant ID
5. **Testing**: Test each tenant separately

---

## 🎯 **NEXT STEPS**

1. **Create second tenant** in seed file
2. **Run database seed**
3. **Update frontend tenant configuration**
4. **Test both tenants work correctly**
5. **Deploy with proper tenant routing**

---

**Need help with any specific step? Let me know which part you'd like me to implement!** 🚀
