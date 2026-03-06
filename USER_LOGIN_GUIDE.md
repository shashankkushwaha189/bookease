# BookEase User Login Guide

## User Roles & Login Credentials

### 🔐 Available User Types:
1. **ADMIN** - Full system access
2. **STAFF** - Limited to appointments and services
3. **USER/CUSTOMER** - Can book appointments

### 📝 Default Login Credentials:

#### 1. ADMIN User
- **Email:** `admin@demo.com`
- **Password:** `demo123456`
- **Role:** `ADMIN`
- **Access:** Full dashboard, all features, user management

#### 2. STAFF User  
- **Email:** `staff@demo.com`
- **Password:** `demo123456`
- **Role:** `STAFF`
- **Access:** Appointments, services, limited dashboard

#### 3. CUSTOMER User
- **Email:** `customer@demo.com`
- **Password:** `demo123456`
- **Role:** `USER`
- **Access:** Book appointments, view own bookings

## 🚀 How to Login:

### Step 1: Navigate to Login
1. Open browser: `http://localhost:5173`
2. Click "Login" or go to `http://localhost:5173/login`

### Step 2: Enter Credentials
1. **Email:** Enter the appropriate email based on role
2. **Password:** Enter `demo123456`
3. **Tenant ID:** Auto-set to `b18e0808-27d1-4253-aca9-453897585106`

### Step 3: Access Dashboard
- **Admin:** Full dashboard with sidebar navigation
- **Staff:** Limited dashboard features
- **Customer:** Booking interface

## 🎯 Role-Based Access:

### 👑 ADMIN Features:
- ✅ Full dashboard access
- ✅ User management
- ✅ Staff management
- ✅ Service management
- ✅ Business settings
- ✅ Reports and analytics
- ✅ All appointments view

### 👥 STAFF Features:
- ✅ Dashboard overview
- ✅ Manage own appointments
- ✅ View services
- ✅ Customer management
- ❌ No user management
- ❌ No business settings

### 🛍️ CUSTOMER Features:
- ✅ Book appointments
- ✅ View own bookings
- ✅ Manage profile
- ❌ No dashboard access
- ❌ No management features

## 🔧 Creating New Users:

### Method 1: Via Database (Development)
```sql
-- Create Admin User
INSERT INTO "User" (id, email, passwordHash, role, tenantId, isActive, createdAt, updatedAt)
VALUES (
  gen_random_uuid(),
  'new-admin@demo.com',
  '$2b$12$hashedpassword...',
  'ADMIN',
  'b18e0808-27d1-4253-aca9-453897585106',
  true,
  NOW(),
  NOW()
);

-- Create Staff User
INSERT INTO "User" (id, email, passwordHash, role, tenantId, isActive, createdAt, updatedAt)
VALUES (
  gen_random_uuid(),
  'new-staff@demo.com',
  '$2b$12$hashedpassword...',
  'STAFF',
  'b18e0808-27d1-4253-aca9-453897585106',
  true,
  NOW(),
  NOW()
);

-- Create Customer User
INSERT INTO "User" (id, email, passwordHash, role, tenantId, isActive, createdAt, updatedAt)
VALUES (
  gen_random_uuid(),
  'new-customer@demo.com',
  '$2b$12$hashedpassword...',
  'USER',
  'b18e0808-27d1-4253-aca9-453897585106',
  true,
  NOW(),
  NOW()
);
```

### Method 2: Via API (Production)
```bash
# Create new user (Admin only)
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "X-Tenant-ID: b18e0808-27d1-4253-aca9-453897585106" \
  -d '{
    "email": "new-user@demo.com",
    "password": "newpassword123",
    "role": "STAFF"
  }'
```

## 🔍 Testing Different Roles:

### 1. Test Admin Login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: b18e0808-27d1-4253-aca9-453897585106" \
  -d '{
    "email": "admin@demo.com",
    "password": "demo123456"
  }'
```

### 2. Test Staff Login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: b18e0808-27d1-4253-aca9-453897585106" \
  -d '{
    "email": "staff@demo.com",
    "password": "demo123456"
  }'
```

### 3. Test Customer Login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: b18e0808-27d1-4253-aca9-453897585106" \
  -d '{
    "email": "customer@demo.com",
    "password": "demo123456"
  }'
```

## 🎨 Frontend Role-Based UI:

### Admin Dashboard:
- Full sidebar navigation
- All sections accessible
- User management tools
- Business settings

### Staff Dashboard:
- Limited sidebar options
- Appointment management
- Service management
- No admin settings

### Customer Interface:
- Booking page
- Profile management
- Appointment history
- No dashboard access

## 🔒 Security Features:

- ✅ JWT Token Authentication
- ✅ Role-Based Access Control
- ✅ Tenant Isolation
- ✅ Password Hashing (bcrypt)
- ✅ Session Management
- ✅ Auto-logout on token expiry

## 📱 Mobile Access:

All users can access the system via mobile browsers with responsive design optimized for each role type.
