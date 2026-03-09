import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG, FeatureFlags, StaffPermissions, BookingPolicies } from '../src/modules/config/config.schema';
import { ConfigService } from '../src/modules/config/config.service';

describe('Configuration Engine - Core Logic Tests', () => {
    describe('Feature Flags Utility', () => {
        it('should check if feature is enabled', () => {
            expect(FeatureFlags.isEnabled(DEFAULT_CONFIG, 'aiSummaryEnabled')).toBe(false);
            expect(FeatureFlags.isEnabled(DEFAULT_CONFIG, 'recurringEnabled')).toBe(true);
        });

        it('should get all features', () => {
            const features = FeatureFlags.getAllFeatures(DEFAULT_CONFIG);
            expect(features).toHaveProperty('aiSummaryEnabled', false);
            expect(features).toHaveProperty('loadBalancingEnabled', false);
            expect(features).toHaveProperty('recurringEnabled', true);
        });

        it('should enable feature', () => {
            const config = FeatureFlags.enableFeature(DEFAULT_CONFIG, 'aiSummaryEnabled');
            expect(config.features.aiSummaryEnabled).toBe(true);
        });

        it('should disable feature', () => {
            const config = FeatureFlags.disableFeature(DEFAULT_CONFIG, 'recurringEnabled');
            expect(config.features.recurringEnabled).toBe(false);
        });
    });

    describe('Staff Permissions Utility', () => {
        it('should check individual permission', () => {
            expect(StaffPermissions.hasPermission(DEFAULT_CONFIG, 'canCancelAppointments')).toBe(true);
            expect(StaffPermissions.hasPermission(DEFAULT_CONFIG, 'canManageStaff')).toBe(false);
        });

        it('should check booking management permissions', () => {
            expect(StaffPermissions.canManageBookings(DEFAULT_CONFIG)).toBe(true);
        });

        it('should check business management permissions', () => {
            expect(StaffPermissions.canManageBusiness(DEFAULT_CONFIG)).toBe(false);
        });
    });

    describe('Booking Policies Utility', () => {
        it('should validate booking window', () => {
            const validTime = new Date();
            validTime.setHours(validTime.getHours() + 2); // 2 hours from now

            const invalidTime = new Date();
            invalidTime.setDate(invalidTime.getDate() + 60); // 60 days from now

            expect(BookingPolicies.isWithinAdvanceWindow(DEFAULT_CONFIG, validTime)).toBe(true);
            expect(BookingPolicies.isWithinAdvanceWindow(DEFAULT_CONFIG, invalidTime)).toBe(false);
        });

        it('should validate cancellation policy', () => {
            const cancellableTime = new Date();
            cancellableTime.setHours(cancellableTime.getHours() + 48); // 48 hours from now

            const nonCancellableTime = new Date();
            nonCancellableTime.setHours(nonCancellableTime.getHours() + 12); // 12 hours from now

            expect(BookingPolicies.canCancel(DEFAULT_CONFIG, cancellableTime, false)).toBe(true);
            expect(BookingPolicies.canCancel(DEFAULT_CONFIG, nonCancellableTime, false)).toBe(false);
        });

        it('should check business hours', () => {
            const monday = new Date('2024-01-01'); // Monday
            const saturday = new Date('2024-01-06'); // Saturday

            expect(BookingPolicies.isBusinessOpen(DEFAULT_CONFIG, monday)).toBe(true);
            expect(BookingPolicies.isBusinessOpen(DEFAULT_CONFIG, saturday)).toBe(false);
        });
    });

    describe('Config Service - Cache and Performance', () => {
        it('should initialize with empty cache', async () => {
            const service = new ConfigService();
            const health = await service.healthCheck();
            
            expect(health.status).toBe('healthy');
            expect(health.cacheSize).toBe(0);
        });

        it('should handle cache operations', () => {
            const service = new ConfigService();
            
            // Clear non-existent cache should not throw
            expect(() => service.clearCache('non-existent')).not.toThrow();
            
            // Clear all cache should not throw
            expect(() => service.clearCache()).not.toThrow();
        });

        it('should return zero metrics for new service', () => {
            const service = new ConfigService();
            
            const metrics = service.getMetrics('test-tenant');
            const hitRate = service.getCacheHitRate('test-tenant');
            const avgTime = service.getAverageFetchTime('test-tenant');
            
            expect(metrics).toBeUndefined();
            expect(hitRate).toBe(0);
            expect(avgTime).toBe(0);
        });
    });

    describe('Configuration Validation', () => {
        it('should have valid default configuration', () => {
            expect(DEFAULT_CONFIG).toBeDefined();
            expect(DEFAULT_CONFIG.booking).toBeDefined();
            expect(DEFAULT_CONFIG.features).toBeDefined();
            expect(DEFAULT_CONFIG.staff).toBeDefined();
            expect(DEFAULT_CONFIG.notifications).toBeDefined();
            expect(DEFAULT_CONFIG.businessHours).toBeDefined();
        });

        it('should have reasonable default values', () => {
            expect(DEFAULT_CONFIG.booking.maxBookingsPerDay).toBeGreaterThan(0);
            expect(DEFAULT_CONFIG.booking.slotLockDurationMinutes).toBeGreaterThan(0);
            expect(DEFAULT_CONFIG.cancellation.allowedUntilHoursBefore).toBeGreaterThanOrEqual(0);
            expect(DEFAULT_CONFIG.cancellation.maxReschedules).toBeGreaterThanOrEqual(0);
        });

        it('should have all required feature flags', () => {
            const features = DEFAULT_CONFIG.features;
            expect(features).toHaveProperty('aiSummaryEnabled');
            expect(features).toHaveProperty('loadBalancingEnabled');
            expect(features).toHaveProperty('recurringEnabled');
            expect(features).toHaveProperty('waitlistEnabled');
            expect(features).toHaveProperty('smsNotificationsEnabled');
            expect(features).toHaveProperty('emailNotificationsEnabled');
            expect(features).toHaveProperty('onlinePaymentsEnabled');
            expect(features).toHaveProperty('customerPortalEnabled');
        });

        it('should have all required staff permissions', () => {
            const staff = DEFAULT_CONFIG.staff;
            expect(staff).toHaveProperty('canCancelAppointments');
            expect(staff).toHaveProperty('canRescheduleAppointments');
            expect(staff).toHaveProperty('canOverridePolicies');
            expect(staff).toHaveProperty('canManageCustomers');
            expect(staff).toHaveProperty('canViewReports');
            expect(staff).toHaveProperty('canManageServices');
            expect(staff).toHaveProperty('canManageStaff');
            expect(staff).toHaveProperty('maxConcurrentAppointments');
        });

        it('should have all business hours configured', () => {
            const hours = DEFAULT_CONFIG.businessHours;
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            
            days.forEach(day => {
                expect(hours).toHaveProperty(day);
                expect(hours[day as keyof typeof hours]).toHaveProperty('isOpen');
                expect(hours[day as keyof typeof hours]).toHaveProperty('openTime');
                expect(hours[day as keyof typeof hours]).toHaveProperty('closeTime');
            });
        });
    });

    describe('Performance Requirements', () => {
        it('should meet performance expectations for utility functions', () => {
            const iterations = 10000;
            
            // Test FeatureFlags performance
            const start = Date.now();
            for (let i = 0; i < iterations; i++) {
                FeatureFlags.isEnabled(DEFAULT_CONFIG, 'aiSummaryEnabled');
            }
            const featureTime = Date.now() - start;
            
            // Test StaffPermissions performance
            const permStart = Date.now();
            for (let i = 0; i < iterations; i++) {
                StaffPermissions.hasPermission(DEFAULT_CONFIG, 'canCancelAppointments');
            }
            const permTime = Date.now() - permStart;
            
            // Test BookingPolicies performance
            const testTime = new Date();
            testTime.setHours(testTime.getHours() + 24);
            const bookingStart = Date.now();
            for (let i = 0; i < iterations; i++) {
                BookingPolicies.isWithinAdvanceWindow(DEFAULT_CONFIG, testTime);
            }
            const bookingTime = Date.now() - bookingStart;
            
            // All should complete quickly (under 100ms for 10k iterations)
            expect(featureTime).toBeLessThan(100);
            expect(permTime).toBeLessThan(100);
            expect(bookingTime).toBeLessThan(100);
        });
    });
});
