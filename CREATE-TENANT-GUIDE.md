# 🏢 Creating New Tenants in BookEase

## Overview
BookEase supports multiple methods for creating new tenants in your multi-tenant booking system.

## Method 1: API Endpoint (Recommended)

### Prerequisites
- Admin user account with valid credentials
- Valid authentication token

### API Call
```bash
POST http://localhost:3000/api/tenants
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Wellness Spa Center",
  "slug": "wellness-spa", 
  "timezone": "America/New_York"
}
```

### Required Fields
- **name** (string, min 2 chars): Business name
- **slug** (string, min 2 chars): URL-friendly identifier (lowercase, numbers, hyphens only)
- **timezone** (string, optional): Defaults to "UTC"

### Response
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "name": "Wellness Spa Center",
    "slug": "wellness-spa",
    "timezone": "America/New_York",
    "isActive": true,
    "createdAt": "2026-03-12T...",
    "updatedAt": "2026-03-12T..."
  }
}
```

## Method 2: Database Initialization

### Quick Demo Tenant
```bash
POST http://localhost:3000/api/init-database
```

This creates a demo tenant with:
- Name: "HealthFirst Clinic"
- Slug: "demo-clinic"
- Business profile automatically created

## Method 3: Direct Database

### SQL Example
```sql
INSERT INTO "Tenant" (
  id, 
  name, 
  slug, 
  timezone, 
  "isActive", 
  "createdAt", 
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'Your Business Name',
  'your-business-slug',
  'UTC',
  true,
  NOW(),
  NOW()
);
```

## Method 4: Programmatic Creation

### Using the Create Script
```bash
node create-tenant.js
```

### Custom Script Example
```javascript
const axios = require('axios');

async function createTenant(tenantData) {
  // Login as admin
  const login = await axios.post('http://localhost:3000/api/auth/login', {
    email: 'admin@demo.com',
    password: 'demo123456'
  }, {
    headers: { 'X-Tenant-ID': 'existing-tenant-id' }
  });

  // Create new tenant
  const tenant = await axios.post('http://localhost:3000/api/tenants', tenantData, {
    headers: { 
      'Authorization': `Bearer ${login.data.data.token}`,
      'Content-Type': 'application/json'
    }
  });

  return tenant.data;
}
```

## Post-Creation Steps

### 1. Create Business Profile
```bash
POST http://localhost:3000/api/business-profile
X-Tenant-ID: <new-tenant-id>
Authorization: Bearer <admin-token>

{
  "businessName": "Wellness Spa Center",
  "brandColor": "#1A56DB",
  "accentColor": "#7C3AED"
}
```

### 2. Create Admin User
```bash
POST http://localhost:3000/api/users
X-Tenant-ID: <new-tenant-id>
Authorization: Bearer <admin-token>

{
  "email": "admin@wellness-spa.com",
  "password": "securePassword123",
  "firstName": "Admin",
  "lastName": "User",
  "role": "ADMIN"
}
```

### 3. Configure Services
```bash
POST http://localhost:3000/api/services
X-Tenant-ID: <new-tenant-id>
Authorization: Bearer <admin-token>

{
  "name": "Massage Therapy",
  "duration": 60,
  "price": 80.00,
  "description": "Relaxing massage session"
}
```

## Tenant Access Methods

### By Tenant ID
```bash
X-Tenant-ID: 9d6a9a2c-4d64-4167-a9ae-2f0c21f34939
```

### By Tenant Slug
```bash
X-Tenant-Slug: wellness-spa
```

### By Domain (if configured)
```bash
X-Tenant-Domain: wellness-spa.bookease.com
```

## Security Considerations

1. **Admin Authentication**: Only admin users can create tenants
2. **Slug Uniqueness**: Each tenant must have a unique slug
3. **Data Isolation**: All tenant data is automatically isolated
4. **Rate Limiting**: API endpoints are rate-limited for security

## Testing New Tenant

### Verify Creation
```bash
GET http://localhost:3000/api/tenants/<tenant-id>
```

### Test Access
```bash
# Login with new tenant
POST http://localhost:3000/api/auth/login
X-Tenant-ID: <new-tenant-id>
{
  "email": "admin@wellness-spa.com",
  "password": "securePassword123"
}
```

## Troubleshooting

### Common Errors
- **401 Unauthorized**: Check admin credentials
- **403 Forbidden**: Insufficient permissions
- **409 Conflict**: Slug already exists
- **422 Validation**: Invalid slug format or missing fields

### Solutions
1. Verify admin user exists and is active
2. Ensure slug follows regex pattern: `^[a-z0-9-]+$`
3. Check all required fields are provided
4. Verify tenant middleware is properly configured

## Frontend Integration

When implementing the frontend, you can add tenant creation to the admin dashboard:

```typescript
// React Component Example
const CreateTenantForm = () => {
  const [tenantData, setTenantData] = useState({
    name: '',
    slug: '',
    timezone: 'UTC'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tenantData)
      });
      
      const result = await response.json();
      console.log('Tenant created:', result);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
};
```
