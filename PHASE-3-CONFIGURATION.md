# Phase 3 - Configuration Engine (VERSIONED)

## Overview
The Configuration Engine provides a comprehensive, versioned tenant configuration system with feature flags, booking policies, staff permissions, and performance optimization.

## Features Implemented

### ✅ JSON-based Tenant Configuration
- **Schema**: Comprehensive configuration structure with booking, cancellation, features, staff, notifications, and business hours
- **Validation**: Zod schema validation with strict type checking and reasonable limits
- **Defaults**: Sensible default values for all configuration options

### ✅ Config Version History
- **Auto-versioning**: Each configuration change increments version number
- **History tracking**: Complete audit trail with creator, timestamp, and notes
- **Metadata**: Version information stored with each configuration change

### ✅ Config Rollback
- **Safe rollback**: Restore any previous version as a new version
- **Integrity**: Maintains version history during rollback operations
- **Audit trail**: Rollback operations are logged with reasons

### ✅ Feature Flags System
- **Dynamic flags**: Enable/disable features without deployment
- **Available flags**:
  - `aiSummaryEnabled`: AI-powered appointment summaries
  - `loadBalancingEnabled`: Automatic staff load balancing
  - `recurringEnabled`: Recurring appointments
  - `waitlistEnabled`: Waitlist functionality
  - `smsNotificationsEnabled`: SMS notifications
  - `emailNotificationsEnabled`: Email notifications
  - `onlinePaymentsEnabled`: Online payment processing
  - `customerPortalEnabled`: Customer self-service portal

### ✅ Booking Limits and Policies
- **Daily limits**: Configurable maximum bookings per day
- **Advance booking**: Minimum and maximum advance booking windows
- **Slot locking**: Configurable slot lock duration to prevent conflicts
- **Guest booking**: Optional guest booking functionality
- **Phone confirmation**: Optional phone confirmation requirements
- **Auto-cancellation**: Automatic cancellation of unconfirmed appointments

### ✅ Cancellation Policies
- **Time limits**: Configurable cancellation deadline (hours before appointment)
- **Reschedule limits**: Maximum number of reschedules allowed
- **No-show grace**: Grace period for no-show handling
- **Cancellation fees**: Optional cancellation fee percentage
- **Staff permissions**: Staff cancellation and override capabilities
- **Reason requirements**: Optional cancellation reason requirements

### ✅ Staff Permission Configuration
- ** granular permissions**: Fine-grained control over staff capabilities
- **Available permissions**:
  - `canCancelAppointments`: Cancel appointments
  - `canRescheduleAppointments`: Reschedule appointments
  - `canOverridePolicies`: Override booking policies
  - `canManageCustomers`: Manage customer records
  - `canViewReports`: Access reporting features
  - `canManageServices`: Manage service catalog
  - `canManageStaff`: Manage other staff members
  - `maxConcurrentAppointments`: Maximum concurrent appointments

### ✅ Notification Configuration
- **Reminder schedules**: Configurable reminder times before appointments
- **Event notifications**: Control notifications for cancellations, reschedules, confirmations
- **Channel control**: Enable/disable SMS and email channels separately

### ✅ Business Hours Configuration
- **Weekly schedule**: Individual day configuration with open/close times
- **Flexible hours**: Different hours for different days
- **Closed days**: Easy configuration for non-working days

## API Endpoints

### Core Configuration
- `GET /api/config/current` - Get current configuration
- `GET /api/config/history` - Get configuration history
- `POST /api/config` - Save new configuration
- `POST /api/config/rollback/:version` - Rollback to specific version

### Feature Flags
- `GET /api/config/features` - Get all feature flags
- `POST /api/config/features/enable` - Enable a feature
- `POST /api/config/features/disable` - Disable a feature

### Permissions
- `GET /api/config/permissions/:permission` - Check specific permission

### Policy Validation
- `POST /api/config/validate/booking-window` - Validate booking time window
- `POST /api/config/validate/cancellation` - Validate cancellation policy
- `POST /api/config/validate/business-hours` - Check business hours

### Performance & Monitoring
- `GET /api/config/metrics` - Get performance metrics
- `GET /api/config/health` - Health check
- `DELETE /api/config/cache` - Clear cache

## Performance Requirements Met

### ✅ Config fetch < 50ms
- **Caching**: 30-second TTL cache with intelligent invalidation
- **Metrics**: Performance tracking with cache hit rates
- **Optimization**: In-memory caching for frequently accessed configurations

### ✅ Config cached per tenant
- **Isolation**: Separate cache entries per tenant
- **TTL management**: Automatic cache expiration and refresh
- **Memory efficient**: Configurable cache size limits

### ✅ No invalid config state allowed
- **Validation**: Comprehensive Zod schema validation
- **Fallbacks**: Default configuration fallback for invalid states
- **Runtime validation**: Continuous validation of cached configurations

## Database Schema

### TenantConfig Model
```sql
model TenantConfig {
  id        String   @id @default(uuid())
  tenantId  String
  version   Int      @default(1)
  config    Json     // Complete configuration object
  createdBy String
  note      String?
  isActive  Boolean  @default(false)
  createdAt DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, version])
  @@index([tenantId, version])
}
```

## Utility Classes

### FeatureFlags
```typescript
FeatureFlags.isEnabled(config, 'aiSummaryEnabled')
FeatureFlags.enableFeature(config, 'aiSummaryEnabled')
FeatureFlags.disableFeature(config, 'aiSummaryEnabled')
FeatureFlags.getAllFeatures(config)
```

### StaffPermissions
```typescript
StaffPermissions.hasPermission(config, 'canCancelAppointments')
StaffPermissions.canManageBookings(config)
StaffPermissions.canManageBusiness(config)
```

### BookingPolicies
```typescript
BookingPolicies.isWithinAdvanceWindow(config, appointmentTime)
BookingPolicies.canCancel(config, appointmentTime, isStaff)
BookingPolicies.isBusinessOpen(config, date)
```

## Testing

### ✅ Functional Tests
- **Core functionality**: Configuration CRUD operations
- **Versioning**: Version increment and rollback functionality
- **Feature flags**: Enable/disable operations
- **Permissions**: Staff permission checks
- **Policies**: Booking and cancellation policy validation
- **Performance**: Cache performance and metrics
- **Edge cases**: Error handling and validation

### ✅ Performance Tests
- **Cache performance**: Sub-50ms response times on cache hits
- **Utility performance**: Fast execution of policy checks
- **Memory efficiency**: Reasonable memory usage for caching

## Security

### ✅ Access Control
- **Admin-only**: All configuration endpoints require ADMIN role
- **Tenant isolation**: Strict tenant separation
- **Audit logging**: All configuration changes are logged

### ✅ Validation
- **Input validation**: Comprehensive schema validation
- **Type safety**: TypeScript throughout the codebase
- **Sanitization**: Input sanitization and bounds checking

## Monitoring & Observability

### ✅ Metrics
- **Cache hit rates**: Track cache effectiveness
- **Response times**: Performance monitoring
- **Error rates**: Configuration error tracking
- **Health checks**: System health monitoring

### ✅ Logging
- **Configuration changes**: All config changes logged
- **Performance metrics**: Performance data logged
- **Error tracking**: Comprehensive error logging

## Configuration Schema

### Booking Configuration
```typescript
booking: {
  maxBookingsPerDay: number;           // 1-1000, default: 50
  slotLockDurationMinutes: number;       // 1-60, default: 25
  allowGuestBooking: boolean;           // default: true
  minAdvanceBookingHours: number;        // 0-168, default: 1
  maxAdvanceBookingDays: number;        // 1-365, default: 30
  requirePhoneConfirmation: boolean;     // default: false
  autoCancelUnconfirmedMinutes: number;  // 0-1440, default: 15
}
```

### Cancellation Configuration
```typescript
cancellation: {
  allowedUntilHoursBefore: number;      // 0-168, default: 24
  maxReschedules: number;               // 0-10, default: 3
  noShowGracePeriodMinutes: number;     // 0-60, default: 15
  cancellationFeePercentage: number;    // 0-100, default: 0
  allowStaffCancellation: boolean;       // default: true
  requireCancellationReason: boolean;   // default: false
}
```

### Features Configuration
```typescript
features: {
  aiSummaryEnabled: boolean;           // default: false
  loadBalancingEnabled: boolean;       // default: false
  recurringEnabled: boolean;           // default: true
  waitlistEnabled: boolean;            // default: false
  smsNotificationsEnabled: boolean;    // default: false
  emailNotificationsEnabled: boolean;  // default: true
  onlinePaymentsEnabled: boolean;      // default: false
  customerPortalEnabled: boolean;      // default: true
}
```

### Staff Configuration
```typescript
staff: {
  canCancelAppointments: boolean;      // default: true
  canRescheduleAppointments: boolean;   // default: true
  canOverridePolicies: boolean;        // default: false
  canManageCustomers: boolean;         // default: true
  canViewReports: boolean;             // default: false
  canManageServices: boolean;          // default: false
  canManageStaff: boolean;             // default: false
  maxConcurrentAppointments: number;   // 1-10, default: 1
}
```

## Usage Examples

### Enable AI Features
```typescript
await configService.enableFeature(tenantId, userId, 'aiSummaryEnabled', 'Enable AI summaries');
```

### Check Booking Policy
```typescript
const canBook = await configService.isWithinAdvanceWindow(tenantId, appointmentTime);
```

### Validate Cancellation
```typescript
const canCancel = await configService.canCancel(tenantId, appointmentTime, isStaff);
```

### Get Performance Metrics
```typescript
const metrics = configService.getMetrics(tenantId);
const hitRate = configService.getCacheHitRate(tenantId);
```

## Migration Notes

This implementation builds upon the existing `TenantConfig` model and extends it with:
- Enhanced configuration schema
- Performance optimizations
- Comprehensive utility classes
- Extensive testing coverage
- Monitoring and observability features

All existing functionality is preserved while adding new capabilities for Phase 3 requirements.
