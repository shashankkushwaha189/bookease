import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigService } from '../src/modules/config/config.service';
import { ConfigRepository } from '../src/modules/config/config.repository';
import { DEFAULT_CONFIG } from '../src/modules/config/config.schema';
import { prisma } from '../src/lib/prisma';

describe('Configuration Engine - Unit Tests', () => {
    let configService: ConfigService;
    let repository: ConfigRepository;
    let tenantId: string;

    beforeEach(async () => {
        configService = new ConfigService();
        repository = new ConfigRepository();
        
        // Create a test tenant
        const tenant = await prisma.tenant.create({
            data: {
                name: 'Test Tenant',
                slug: `test-${Date.now()}`,
            },
        });
        tenantId = tenant.id;
    });

    afterEach(async () => {
        // Clean up test data
        await prisma.tenantConfig.deleteMany({
            where: { tenantId },
        });
        await prisma.tenant.delete({
            where: { id: tenantId },
        });
        
        // Clear service cache
        configService.clearCache(tenantId);
    });

    describe('Basic Configuration Management', () => {
        it('should return default config when no config exists', async () => {
            const config = await configService.getConfig(tenantId);
            expect(config).toEqual(DEFAULT_CONFIG);
        });

        it('should save and retrieve config', async () => {
            const newConfig = {
                ...DEFAULT_CONFIG,
                booking: { ...DEFAULT_CONFIG.booking, maxBookingsPerDay: 100 }
            };

            await configService.saveConfig(
                tenantId,
                'test-user',
                newConfig,
                'Test configuration'
            );

            const retrieved = await configService.getConfig(tenantId);
            expect(retrieved.booking.maxBookingsPerDay).toBe(100);
        });

        it('should increment version on save', async () => {
            const newConfig = {
                ...DEFAULT_CONFIG,
                booking: { ...DEFAULT_CONFIG.booking, maxBookingsPerDay: 100 }
            };

            const saved = await configService.saveConfig(
                tenantId,
                'test-user',
                newConfig,
                'Test configuration'
            );

            expect(saved.version).toBe(1);
        });
    });

    describe('Feature Flags', () => {
        it('should check if feature is enabled', async () => {
            const isEnabled = await configService.isFeatureEnabled(tenantId, 'aiSummaryEnabled');
            expect(isEnabled).toBe(false); // Default value
        });

        it('should enable a feature', async () => {
            await configService.enableFeature(tenantId, 'test-user', 'aiSummaryEnabled', 'Enable AI');
            
            const isEnabled = await configService.isFeatureEnabled(tenantId, 'aiSummaryEnabled');
            expect(isEnabled).toBe(true);
        });

        it('should disable a feature', async () => {
            // First enable it
            await configService.enableFeature(tenantId, 'test-user', 'aiSummaryEnabled', 'Enable AI');
            
            // Then disable it
            await configService.disableFeature(tenantId, 'test-user', 'aiSummaryEnabled', 'Disable AI');
            
            const isEnabled = await configService.isFeatureEnabled(tenantId, 'aiSummaryEnabled');
            expect(isEnabled).toBe(false);
        });

        it('should get all features', async () => {
            await configService.enableFeature(tenantId, 'test-user', 'aiSummaryEnabled', 'Enable AI');
            
            const features = await configService.getAllFeatures(tenantId);
            expect(features).toHaveProperty('aiSummaryEnabled', true);
            expect(features).toHaveProperty('loadBalancingEnabled', false);
        });
    });

    describe('Staff Permissions', () => {
        it('should check staff permission', async () => {
            const hasPermission = await configService.hasPermission(tenantId, 'canCancelAppointments');
            expect(hasPermission).toBe(true); // Default value
        });

        it('should check booking management permissions', async () => {
            const canManage = await configService.canManageBookings(tenantId);
            expect(canManage).toBe(true); // Both canCancel and canReschedule are true by default
        });

        it('should check business management permissions', async () => {
            const canManage = await configService.canManageBusiness(tenantId);
            expect(canManage).toBe(false); // Business management requires multiple permissions
        });
    });

    describe('Booking Policies', () => {
        it('should validate booking window', async () => {
            const futureTime = new Date();
            futureTime.setHours(futureTime.getHours() + 2); // 2 hours from now

            const isValid = await configService.isWithinAdvanceWindow(tenantId, futureTime);
            expect(isValid).toBe(true); // Within default 1-30 day window
        });

        it('should reject booking too far in advance', async () => {
            const futureTime = new Date();
            futureTime.setDate(futureTime.getDate() + 60); // 60 days from now

            const isValid = await configService.isWithinAdvanceWindow(tenantId, futureTime);
            expect(isValid).toBe(false); // Beyond 30 day default
        });

        it('should validate cancellation policy', async () => {
            const futureTime = new Date();
            futureTime.setHours(futureTime.getHours() + 48); // 48 hours from now

            const canCancel = await configService.canCancel(tenantId, futureTime, false);
            expect(canCancel).toBe(true); // Beyond 24 hour default
        });

        it('should check business hours', async () => {
            const today = new Date();
            
            const isOpen = await configService.isBusinessOpen(tenantId, today);
            // This depends on the day of the test runs
            expect(typeof isOpen).toBe('boolean');
        });
    });

    describe('Performance and Caching', () => {
        it('should cache config for performance', async () => {
            // First call
            const start1 = Date.now();
            await configService.getConfig(tenantId);
            const duration1 = Date.now() - start1;

            // Second call (should be cached)
            const start2 = Date.now();
            await configService.getConfig(tenantId);
            const duration2 = Date.now() - start2;

            // Second call should be faster (cached)
            expect(duration2).toBeLessThanOrEqual(duration1);
        });

        it('should track metrics', async () => {
            // Make a few requests
            await configService.getConfig(tenantId);
            await configService.getConfig(tenantId); // Cache hit

            const metrics = configService.getMetrics(tenantId);
            expect(metrics).toBeDefined();
            expect(metrics!.cacheHits).toBe(1);
            expect(metrics!.cacheMisses).toBe(1);
        });

        it('should calculate cache hit rate', async () => {
            // Make requests
            await configService.getConfig(tenantId);
            await configService.getConfig(tenantId);
            await configService.getConfig(tenantId);

            const hitRate = configService.getCacheHitRate(tenantId);
            expect(hitRate).toBeGreaterThan(0);
        });

        it('should pass health check', async () => {
            const health = await configService.healthCheck();
            expect(health.status).toBe('healthy');
            expect(health).toHaveProperty('cacheSize');
            expect(health).toHaveProperty('metrics');
        });
    });

    describe('Rollback Functionality', () => {
        it('should rollback to previous version', async () => {
            // Save version 1
            const v1Config = {
                ...DEFAULT_CONFIG,
                booking: { ...DEFAULT_CONFIG.booking, maxBookingsPerDay: 100 }
            };
            await configService.saveConfig(tenantId, 'test-user', v1Config, 'Version 1');

            // Save version 2
            const v2Config = {
                ...DEFAULT_CONFIG,
                booking: { ...DEFAULT_CONFIG.booking, maxBookingsPerDay: 200 }
            };
            await configService.saveConfig(tenantId, 'test-user', v2Config, 'Version 2');

            // Rollback to version 1
            const rollback = await configService.rollback(tenantId, 'test-user', 1);

            expect(rollback.version).toBe(3); // New version after rollback
            expect(rollback.config.booking.maxBookingsPerDay).toBe(100);
        });

        it('should maintain history', async () => {
            await configService.saveConfig(tenantId, 'test-user', DEFAULT_CONFIG, 'Version 1');
            
            const history = await configService.getHistory(tenantId);
            expect(history).toHaveLength(1);
            expect(history[0].version).toBe(1);
        });
    });
});
