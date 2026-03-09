# 🌐 **FRONTEND INTEGRATION GUIDE**

## 📋 **OVERVIEW**

This guide covers the complete frontend integration for the BookEase multi-tenant system, including tenant detection, theme management, and API integration.

---

## 🏗️ **ARCHITECTURE**

### **Core Components**
```
src/
├── lib/
│   ├── tenant.ts              # Tenant detection & management
│   └── api-client.ts          # Tenant-aware API client
├── components/
│   ├── TenantProvider.tsx     # React context provider
│   └── TenantAwareBookingPage.tsx  # Multi-tenant booking flow
└── App.tsx                    # Main app with tenant integration
```

### **Data Flow**
```
URL/Domain → Tenant Detection → API Client → Theme Application → UI Rendering
```

---

## 🔧 **SETUP INSTRUCTIONS**

### **1. Install Dependencies**
```bash
cd apps/web
npm install
```

### **2. Environment Configuration**
Create `.env.local`:
```bash
REACT_APP_API_URL=http://localhost:3000
VITE_DEMO_MODE=true
```

### **3. Update Main App**
The main `App.tsx` is already configured with:
- `TenantProvider` wrapper
- Tenant-aware API client initialization
- Automatic theme application

---

## 🏢 **TENANT DETECTION**

### **Detection Methods (Priority Order)**

#### **1. URL Parameters**
```typescript
// URL: http://localhost:5173/tenant-slug/book
const slug = window.location.pathname.split('/')[1];
```

#### **2. Domain-Based**
```typescript
// URL: http://tenant-name.localhost:5173
const subdomain = window.location.hostname.split('.')[0];
```

#### **3. Query Parameters**
```typescript
// URL: http://localhost:5173?tenant=tenant-slug
const params = new URLSearchParams(window.location.search);
const tenant = params.get('tenant');
```

#### **4. Default Fallback**
```typescript
// Uses default tenant if no detection method succeeds
const DEFAULT_TENANT = {
  id: 'b18e0808-27d1-4253-aca9-453897585106',
  name: 'HealthFirst Clinic',
  slug: 'demo-clinic',
  timezone: 'Asia/Kolkata',
  isActive: true,
};
```

### **Caching Strategy**
- **Tenant Cache**: 5 minutes TTL
- **Profile Cache**: 10 minutes TTL
- **Auto Cleanup**: Prevents memory leaks

---

## 🎨 **THEME MANAGEMENT**

### **Automatic Theme Application**
```typescript
// Applied automatically when tenant is detected
const root = document.documentElement;
root.style.setProperty('--primary-color', profile.brandColor);
root.style.setProperty('--accent-color', profile.accentColor);
```

### **SEO Meta Tags**
```typescript
// Automatically updated per tenant
document.title = profile.seoTitle || `${profile.businessName} - Book Appointment`;
```

### **CSS Custom Properties**
```css
/* Available in your CSS */
.booking-button {
  background-color: var(--primary-color);
  border-color: var(--accent-color);
}
```

---

## 🌐 **API INTEGRATION**

### **Tenant-Aware API Client**
```typescript
import { apiClient, ServicesApiService } from '../lib/api-client';

// API calls automatically include tenant headers
const services = await ServicesApiService.getPublicServices();
// Headers automatically added:
// X-Tenant-ID: tenant.id
// X-Tenant-Slug: tenant.slug
// X-Tenant-Domain: tenant.domain
```

### **Available API Services**
```typescript
// Tenant services
TenantApiService.getPublicTenants()
TenantApiService.getTenantBySlug(slug)
TenantApiService.searchTenants(query)

// Business profile services
BusinessProfileApiService.getPublicProfile(slug)
BusinessProfileApiService.searchProfiles(query)

// Booking services
ServicesApiService.getPublicServices()
StaffApiService.getPublicStaff()
AvailabilityApiService.getPublicAvailability(params)
BookingApiService.createPublicBooking(data)
```

---

## 🧩 **COMPONENT INTEGRATION**

### **Using Tenant Provider**
```typescript
import { useTenant } from '../components/TenantProvider';

function MyComponent() {
  const { tenant, profile, loading, error } = useTenant();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <h1>{profile?.businessName}</h1>
      <p>Welcome to {tenant?.name}</p>
    </div>
  );
}
```

### **Higher-Order Component**
```typescript
import { withTenant } from '../components/TenantProvider';

const TenantAwareComponent = withTenant(MyComponent);
// Automatically receives tenant and profile as props
```

---

## 📱 **BOOKING FLOW INTEGRATION**

### **Complete Multi-Tenant Booking**
```typescript
import { TenantAwareBookingPage } from '../components/TenantAwareBookingPage';

function BookingPage() {
  return <TenantAwareBookingPage />;
}
```

### **Booking Flow Steps**
1. **Service Selection** - Load tenant-specific services
2. **Staff Selection** - Load tenant-specific staff
3. **Time Selection** - Check availability for tenant
4. **Customer Details** - Collect booking information
5. **Confirmation** - Display tenant-branded confirmation

### **Tenant-Specific Branding**
```typescript
// Automatically applied throughout booking flow
- Header with tenant logo and name
- Tenant-specific colors and styling
- Policy text display
- Contact information
- SEO metadata
```

---

## 🔍 **TESTING SCENARIOS**

### **1. URL-Based Tenant Detection**
```bash
# Test different tenant slugs
http://localhost:5173/demo-clinic/book
http://localhost:5173/second-clinic/book
```

### **2. Query Parameter Detection**
```bash
# Test with query parameters
http://localhost:5173/book?tenant=demo-clinic
http://localhost:5173/book?tenant=second-clinic
```

### **3. Domain-Based Detection**
```bash
# Test with subdomains (requires hosts file configuration)
http://demo-clinic.localhost:5173/book
http://second-clinic.localhost:5173/book
```

### **4. Default Fallback**
```bash
# Test with no tenant specification
http://localhost:5173/book
# Should use default tenant (HealthFirst Clinic)
```

---

## 🚀 **DEPLOYMENT CONSIDERATIONS**

### **Environment Variables**
```bash
# Production
REACT_APP_API_URL=https://api.bookease.com
NODE_ENV=production

# Development
REACT_APP_API_URL=http://localhost:3000
VITE_DEMO_MODE=true
```

### **Domain Configuration**
```bash
# Add to hosts file for testing
127.0.0.1 demo-clinic.localhost
127.0.0.1 second-clinic.localhost
```

### **Nginx Configuration**
```nginx
server {
    listen 80;
    server_name *.bookease.com bookease.com;
    
    location / {
        root /var/www/bookease;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 📊 **PERFORMANCE OPTIMIZATION**

### **Caching Strategy**
- **Tenant Detection**: 5-minute cache
- **Business Profiles**: 10-minute cache
- **API Responses**: Browser caching for public data
- **Theme Application**: CSS custom properties for fast updates

### **Bundle Optimization**
```typescript
// Lazy load tenant-specific components
const TenantAwareBookingPage = React.lazy(() => 
  import('../components/TenantAwareBookingPage')
);
```

### **SEO Optimization**
- **Meta Tags**: Automatic per-tenant SEO
- **Structured Data**: Business information markup
- **Sitemap**: Tenant-specific URLs
- **Canonical URLs**: Proper URL structure

---

## 🔧 **CUSTOMIZATION**

### **Adding New Detection Methods**
```typescript
// In tenant.ts
static async getTenantFromCustomMethod(): Promise<Tenant | null> {
  // Custom detection logic
  return null;
}
```

### **Custom Theme Properties**
```typescript
// In ThemeManager
static applyTheme(profile: BusinessProfile): void {
  // Add custom CSS properties
  root.style.setProperty('--custom-property', profile.customField);
}
```

### **Additional API Services**
```typescript
// Create new service classes
export class CustomApiService {
  static async getCustomData() {
    return apiClient.get<any>('/api/custom-endpoint');
  }
}
```

---

## 🐛 **TROUBLESHOOTING**

### **Common Issues**

#### **Tenant Not Detected**
```typescript
// Check tenant detection methods
console.log('URL slug:', window.location.pathname.split('/')[1]);
console.log('Domain:', window.location.hostname);
console.log('Query params:', new URLSearchParams(window.location.search));
```

#### **Theme Not Applied**
```typescript
// Check CSS custom properties
console.log('Primary color:', getComputedStyle(document.documentElement).getPropertyValue('--primary-color'));
```

#### **API Calls Failing**
```typescript
// Check tenant headers
console.log('Tenant ID:', apiClient.getTenant()?.id);
console.log('Tenant Slug:', apiClient.getTenant()?.slug);
```

### **Debug Mode**
```typescript
// Enable debug logging
localStorage.setItem('debug', 'true');
```

---

## 📈 **MONITORING**

### **Performance Metrics**
- **Tenant Detection Time**: < 100ms
- **Theme Application**: < 50ms
- **API Response Time**: < 200ms
- **Page Load Time**: < 1.5 seconds

### **Error Tracking**
```typescript
// Track tenant detection errors
console.error('Tenant detection failed:', error);
```

### **Analytics Integration**
```typescript
// Track tenant-specific events
analytics.track('booking_started', {
  tenant_id: tenant.id,
  tenant_name: tenant.name,
});
```

---

## 🎯 **BEST PRACTICES**

### **Code Organization**
- Keep tenant logic separate from business logic
- Use TypeScript interfaces for type safety
- Implement proper error boundaries
- Cache tenant data appropriately

### **User Experience**
- Show loading states during tenant detection
- Provide fallback for failed detection
- Maintain consistent branding across pages
- Optimize for mobile devices

### **Security**
- Validate tenant data from API
- Sanitize user inputs
- Use HTTPS in production
- Implement proper CORS policies

---

## 🔄 **NEXT STEPS**

### **Immediate Actions**
1. **Test All Detection Methods**: Verify URL, domain, and query detection
2. **Theme Testing**: Ensure proper color application
3. **API Integration**: Test all tenant-aware API calls
4. **Booking Flow**: Test complete multi-tenant booking process

### **Future Enhancements**
1. **Advanced Caching**: Implement Redis for distributed caching
2. **Real-time Updates**: WebSocket integration for live availability
3. **Progressive Web App**: Offline support for booking
4. **Analytics Dashboard**: Tenant-specific analytics

---

**🎉 Your BookEase frontend is now fully integrated with the multi-tenant backend!**

**Ready for testing and deployment! 🚀**
