# 🚀 BOOK-EASE MULTI-TENANT IMPLEMENTATION PLAN

## 📋 **PHASE 1: TENANT & BUSINESS PROFILE FOUNDATION**

### **Objective**
Enable true multi-tenancy with proper tenant isolation and public-facing identity layer.

### **Modules to Update**
1. **Tenant Module** (`apps/api/src/modules/tenant/`)
2. **Business Profile Module** (`apps/api/src/modules/business-profile/`)
3. **Tenant Middleware** (`apps/api/src/middleware/tenant.middleware.ts`)
4. **Frontend Tenant Handling** (`apps/web/src/lib/tenant.ts`)

---

## 🎯 **IMPLEMENTATION STEPS**

### **Step 1: Enhanced Tenant Module**
- [ ] Add tenant resolution by slug
- [ ] Add tenant validation
- [ ] Add soft delete support
- [ ] Add tenant-specific configuration
- [ ] Add tenant status management

### **Step 2: Business Profile Module**
- [ ] Public business profile endpoint (no auth required)
- [ ] Tenant-specific business profile (auth required)
- [ ] Branding configuration per tenant
- [ ] Contact information management
- [ ] Policy text configuration
- [ ] SEO metadata support

### **Step 3: Tenant Middleware Enhancement**
- [ ] Tenant resolution by slug or ID
- [ ] Tenant caching for performance
- [ ] Default tenant fallback
- [ ] Tenant validation middleware
- [ ] Request context enhancement

### **Step 4: Frontend Tenant Integration**
- [ ] Tenant detection from URL/domain
- [ ] Tenant selection component
- [ ] Dynamic theme loading per tenant
- [ ] Tenant-specific API client configuration
- [ ] Public page tenant branding

---

## 🧪 **FUNCTIONAL REQUIREMENTS**

### **Tenant Module**
```typescript
interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  timezone: string;
  isActive: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
  deletedAt?: DateTime;
  businessProfile?: BusinessProfile;
  config?: TenantConfig[];
}

interface TenantConfig {
  key: string;
  value: string;
  isActive: boolean;
}
```

### **Business Profile Module**
```typescript
interface BusinessProfile {
  id: string;
  tenantId: string;
  businessName: string;
  logoUrl?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  brandColor: string;
  accentColor: string;
  policyText?: string;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### **API Endpoints**
```
GET  /api/public/tenants/:slug
GET  /api/public/tenants
GET  /api/public/business-profile/:slug
GET  /api/business-profile (auth required)
PUT  /api/business-profile (auth required)
```

### **Frontend Components**
```typescript
// Tenant detection
export const useTenant = () => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  // ... tenant resolution logic
};

// Business profile
export const useBusinessProfile = (slug: string) => {
  // ... business profile fetching
};

// Theme provider
export const TenantThemeProvider = ({ children, tenant }) => {
  // ... dynamic theme application
};
```

---

## 🎨 **UI/UX REQUIREMENTS**

### **Public Booking Page**
- [ ] Tenant-specific branding
- [ ] Business name display
- [ ] Logo display
- [ ] Contact information
- [ ] Policy text integration
- [ ] Theme colors per tenant
- [ ] SEO metadata per tenant

### **Admin Dashboard**
- [ ] Tenant switcher for admins
- [ ] Tenant-specific data isolation
- [ ] Cross-tenant reporting (admin only)
- [ ] Tenant management interface

---

## 📊 **DATABASE CHANGES**

### **New Tables**
```sql
-- Enhanced tenant table
ALTER TABLE Tenant ADD COLUMN domain VARCHAR(255);
ALTER TABLE Tenant ADD COLUMN deletedAt TIMESTAMP;
ALTER TABLE Tenant ADD COLUMN businessProfileId UUID REFERENCES BusinessProfile(id);

-- Business profile table
CREATE TABLE BusinessProfile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenantId UUID NOT NULL REFERENCES Tenant(id),
  businessName VARCHAR(255) NOT NULL,
  logoUrl TEXT,
  description TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  brandColor VARCHAR(7) DEFAULT '#1A56DB',
  accentColor VARCHAR(7) DEFAULT '#7C3AED',
  policyText TEXT,
  seoTitle VARCHAR(255),
  seoDescription TEXT,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- Tenant configuration table
CREATE TABLE TenantConfig (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenantId UUID NOT NULL REFERENCES Tenant(id),
  key VARCHAR(100) NOT NULL,
  value TEXT NOT NULL,
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

---

## 🔧 **IMPLEMENTATION ORDER**

1. **Database Schema** → 2. **Backend API** → 3. **Frontend** → 4. **Testing**

### **Priority 1: Core Foundation**
- Tenant resolution by slug
- Business profile CRUD operations
- Tenant middleware enhancement

### **Priority 2: Public Facing**
- Public business profile endpoint
- Tenant-specific branding
- SEO optimization

### **Priority 3: Advanced Features**
- Tenant configuration system
- Multi-tenant reporting
- Cross-tenant analytics

---

## 🧪 **TESTING STRATEGY**

### **Unit Tests**
- Tenant resolution logic
- Business profile operations
- Middleware functionality
- API endpoint responses

### **Integration Tests**
- Multi-tenant API calls
- Frontend tenant switching
- End-to-end booking flows per tenant

### **Performance Tests**
- Tenant caching performance
- Database query optimization
- Concurrent tenant access

---

## 📋 **CHECKLIST**

### **Before Implementation**
- [ ] Backup current database
- [ ] Document current tenant structure
- [ ] Plan migration strategy
- [ ] Prepare test data

### **During Implementation**
- [ ] Update database schema
- [ ] Implement backend changes
- [ ] Update frontend components
- [ ] Add comprehensive tests

### **After Implementation**
- [ ] Verify tenant isolation
- [ ] Test public facing features
- [ ] Performance benchmarking
- [ ] Security audit
- [ ] Documentation update

---

**Ready to begin Phase 1 implementation! 🚀**
