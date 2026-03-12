# 🏢 Where to Enter Tenant Slug on Login

## 📍 Tenant Selection Location

When you visit the login page at `http://localhost:5173`, you will now see:

### **Tenant Selector Dropdown** (NEW!)
Located at the top of the login form, you'll see:

```
🏢 Select Tenant
[Choose a tenant...] ▼

📋 Available Options:
• Demo Clinic (demo-clinic)
• Wellness Spa Center (wellness-spa-v2)  
• Test Spa (test-spa)
```

### **How to Use:**

1. **Click the dropdown** to see all available tenants
2. **Select your desired tenant** from the list
3. **Enter your credentials** for that specific tenant
4. **Click "Sign In"**

## 🔄 Alternative Methods

### **Method 1: URL Parameter**
```
http://localhost:5173/login?tenant=wellness-spa-v2
```

### **Method 2: Direct URLs**
```
http://localhost:5173/login?tenant=demo-clinic     # Demo Clinic
http://localhost:5173/login?tenant=wellness-spa-v2  # Wellness Spa
http://localhost:5173/login?tenant=test-spa         # Test Spa
```

## 🔐 Tenant-Specific Credentials

### **Demo Clinic** (`demo-clinic`)
- **Admin**: admin@demo.com / demo123456
- **Staff**: staff@demo.com / demo123456
- **Customer**: customer@demo.com / demo123456

### **Wellness Spa Center** (`wellness-spa-v2`)
- **Admin**: spa-admin@wellness-spa.com / SpaAdmin123!
- **Staff**: sarah.therapist@wellness-spa.com / Staff123!

### **Test Spa** (`test-spa`)
- **Admin**: test@test.com / test123

## 🎯 Step-by-Step Login

1. **Open Browser**: Go to `http://localhost:5173`
2. **Select Tenant**: Choose from dropdown or use URL parameter
3. **Enter Email**: Use the email for that tenant
4. **Enter Password**: Use the password for that tenant
5. **Click Sign In**: You'll be redirected to your role's dashboard

## 🛠️ What Happens Behind the Scenes

When you select a tenant:
1. **Tenant slug** is stored in application state
2. **API requests** include `X-Tenant-Slug` header
3. **Data isolation** ensures you only see that tenant's data
4. **Role-based access** determines what you can do

## 🚨 Important Notes

- **Each tenant has separate users** - you can't use demo credentials for spa tenant
- **Tenant selection is required** - you must select a tenant before logging in
- **Wrong tenant = login error** - credentials must match the selected tenant
- **Default tenant** is `demo-clinic` if none selected

## 📱 Mobile View

On mobile devices, the tenant selector appears as a full-width dropdown at the top of the login form for easy access.

Your login page now has a **visible tenant selector** making it easy to choose which tenant to access!
