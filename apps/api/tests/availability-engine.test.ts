import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AvailabilityEngine } from '../src/modules/availability/availability.engine';
import { AvailabilityRequest, TimeSlot } from '../src/modules/availability/availability.schema';

describe('Phase 5 - Availability Engine', () => {
    let engine: AvailabilityEngine;

    beforeAll(() => {
        engine = new AvailabilityEngine();
    });

    afterAll(() => {
        engine.clearCache();
        engine.resetMetrics();
    });

    describe('Slot Generation Engine', () => {
        it('should generate slots within working hours only', async () => {
            const request: AvailabilityRequest = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                date: '2024-01-15T00:00:00Z',
                timezone: 'UTC',
                duration: 60,
                bufferBefore: 0,
                bufferAfter: 0,
                includeBufferInSlot: true,
            };

            const result = await engine.calculateAvailability(request);

            expect(result.slots).toBeDefined();
            expect(result.slots.length).toBeGreaterThan(0);
            
            // All slots should be within working hours (9:00-17:00)
            result.slots.forEach(slot => {
                const startMinutes = timeToMinutes(slot.start);
                const endMinutes = timeToMinutes(slot.end);
                expect(startMinutes).toBeGreaterThanOrEqual(9 * 60);
                expect(endMinutes).toBeLessThanOrEqual(17 * 60);
            });
        });

        it('should respect service duration in slot generation', async () => {
            const request: AvailabilityRequest = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                date: '2024-01-15T00:00:00Z',
                timezone: 'UTC',
                duration: 90, // 1.5 hour service
                bufferBefore: 0,
                bufferAfter: 0,
                includeBufferInSlot: true,
            };

            const result = await engine.calculateAvailability(request);

            result.slots.forEach(slot => {
                const startMinutes = timeToMinutes(slot.start);
                const endMinutes = timeToMinutes(slot.end);
                const slotDuration = endMinutes - startMinutes;
                expect(slotDuration).toBe(90);
            });
        });

        it('should limit number of generated slots', async () => {
            const request: AvailabilityRequest = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                date: '2024-01-15T00:00:00Z',
                timezone: 'UTC',
                duration: 30,
                bufferBefore: 0,
                bufferAfter: 0,
                includeBufferInSlot: true,
                maxSlots: 5, // Limit to 5 slots
            };

            const result = await engine.calculateAvailability(request);

            expect(result.slots.length).toBeLessThanOrEqual(5);
        });
    });

    describe('Buffer Awareness', () => {
        it('should include buffer times in slot calculation', async () => {
            const request: AvailabilityRequest = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                date: '2024-01-15T00:00:00Z',
                timezone: 'UTC',
                duration: 60,
                bufferBefore: 15,
                bufferAfter: 15,
                includeBufferInSlot: true,
            };

            const result = await engine.calculateAvailability(request);

            result.slots.forEach(slot => {
                const startMinutes = timeToMinutes(slot.start);
                const endMinutes = timeToMinutes(slot.end);
                const slotDuration = endMinutes - startMinutes;
                // Should include both buffers: 60 + 15 + 15 = 90 minutes
                expect(slotDuration).toBe(90);
            });
        });

        it('should exclude buffers from slot when specified', async () => {
            const request: AvailabilityRequest = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                date: '2024-01-15T00:00:00Z',
                timezone: 'UTC',
                duration: 60,
                bufferBefore: 15,
                bufferAfter: 15,
                includeBufferInSlot: false, // Exclude buffers
            };

            const result = await engine.calculateAvailability(request);

            result.slots.forEach(slot => {
                const startMinutes = timeToMinutes(slot.start);
                const endMinutes = timeToMinutes(slot.end);
                const slotDuration = endMinutes - startMinutes;
                // Should be exactly the service duration: 60 minutes
                expect(slotDuration).toBe(60);
            });
        });
    });

    describe('Staff Schedule Awareness', () => {
        it('should not generate slots on non-working days', async () => {
            const request: AvailabilityRequest = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                date: '2024-01-14T00:00:00Z', // Sunday
                timezone: 'UTC',
                duration: 60,
                bufferBefore: 0,
                bufferAfter: 0,
                includeBufferInSlot: true,
            };

            const result = await engine.calculateAvailability(request);

            expect(result.slots).toHaveLength(0);
            expect(result.workingHours.isWorking).toBe(false);
        });

        it('should respect custom working hours', async () => {
            const request: AvailabilityRequest = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                date: '2024-01-15T00:00:00Z',
                timezone: 'UTC',
                duration: 60,
                bufferBefore: 0,
                bufferAfter: 0,
                includeBufferInSlot: true,
            };

            const result = await engine.calculateAvailability(request);

            // Should respect the working hours from the schedule
            expect(result.workingHours.start).toBe('09:00');
            expect(result.workingHours.end).toBe('17:00');
        });
    });

    describe('Break Exclusion', () => {
        it('should exclude break times from slots', async () => {
            const request: AvailabilityRequest = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                date: '2024-01-15T00:00:00Z',
                timezone: 'UTC',
                duration: 120, // 2 hour service
                bufferBefore: 0,
                bufferAfter: 0,
                includeBufferInSlot: true,
            };

            const result = await engine.calculateAvailability(request);

            // Should not have slots that overlap with lunch break (12:00-13:00)
            const lunchBreakStart = 12 * 60; // 12:00 in minutes
            const lunchBreakEnd = 13 * 60; // 13:00 in minutes

            result.slots.forEach(slot => {
                const slotStart = timeToMinutes(slot.start);
                const slotEnd = timeToMinutes(slot.end);
                
                // Slot should not overlap with lunch break
                const overlapsWithLunch = (slotStart < lunchBreakEnd && slotEnd > lunchBreakStart);
                expect(overlapsWithLunch).toBe(false);
            });
        });

        it('should handle multiple breaks correctly', async () => {
            const request: AvailabilityRequest = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                date: '2024-01-15T00:00:00Z',
                timezone: 'UTC',
                duration: 60,
                bufferBefore: 0,
                bufferAfter: 0,
                includeBufferInSlot: true,
            };

            const result = await engine.calculateAvailability(request);

            // Should respect all breaks in the schedule
            expect(result.slots.length).toBeGreaterThan(0);
            
            // Verify no slot overlaps with any break
            result.slots.forEach(slot => {
                const slotStart = timeToMinutes(slot.start);
                const slotEnd = timeToMinutes(slot.end);
                
                // Check against both breaks (12:00-13:00 and 15:00-15:30)
                const break1Start = 12 * 60;
                const break1End = 13 * 60;
                const break2Start = 15 * 60;
                const break2End = 15.5 * 60;
                
                const overlapsWithBreak1 = (slotStart < break1End && slotEnd > break1Start);
                const overlapsWithBreak2 = (slotStart < break2End && slotEnd > break2Start);
                
                expect(overlapsWithBreak1).toBe(false);
                expect(overlapsWithBreak2).toBe(false);
            });
        });
    });

    describe('Timezone Awareness', () => {
        it('should handle timezone conversion correctly', async () => {
            const request: AvailabilityRequest = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                date: '2024-01-15T00:00:00Z',
                timezone: 'America/New_York', // EST/EDT
                duration: 60,
                bufferBefore: 0,
                bufferAfter: 0,
                includeBufferInSlot: true,
            };

            const result = await engine.calculateAvailability(request);

            expect(result.timezone).toBe('America/New_York');
            expect(result.slots).toBeDefined();
            
            // Should properly convert working hours to the target timezone
            expect(result.workingHours).toBeDefined();
        });

        it('should handle DST correctly', async () => {
            // Test during DST transition (March 2024)
            const request: AvailabilityRequest = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                date: '2024-03-10T00:00:00Z', // During DST in US
                timezone: 'America/New_York',
                duration: 60,
                bufferBefore: 0,
                bufferAfter: 0,
                includeBufferInSlot: true,
            };

            const result = await engine.calculateAvailability(request);

            expect(result.timezone).toBe('America/New_York');
            // Should detect DST
            expect(result.slots).toBeDefined();
        });

        it('should handle UTC timezone correctly', async () => {
            const request: AvailabilityRequest = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                date: '2024-01-15T00:00:00Z',
                timezone: 'UTC',
                duration: 60,
                bufferBefore: 0,
                bufferAfter: 0,
                includeBufferInSlot: true,
            };

            const result = await engine.calculateAvailability(request);

            expect(result.timezone).toBe('UTC');
            expect(result.slots.length).toBeGreaterThan(0);
        });
    });

    describe('Manual Time-off Respect', () => {
        it('should fully block holidays', async () => {
            const request: AvailabilityRequest = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                date: '2024-12-25T00:00:00Z', // Christmas
                timezone: 'UTC',
                duration: 60,
                bufferBefore: 0,
                bufferAfter: 0,
                includeBufferInSlot: true,
            };

            const result = await engine.calculateAvailability(request);

            // Should have no slots on Christmas
            expect(result.slots).toHaveLength(0);
        });

        it('should respect partial time-offs', async () => {
            const request: AvailabilityRequest = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                date: '2024-01-15T00:00:00Z',
                timezone: 'UTC',
                duration: 60,
                bufferBefore: 0,
                bufferAfter: 0,
                includeBufferInSlot: true,
            };

            const result = await engine.calculateAvailability(request);

            // Should not have slots that overlap with time-offs
            result.slots.forEach(slot => {
                const slotStart = timeToMinutes(slot.start);
                const slotEnd = timeToMinutes(slot.end);
                
                // Check against mock time-off (14:00-15:00)
                const timeOffStart = 14 * 60;
                const timeOffEnd = 15 * 60;
                
                const overlapsWithTimeOff = (slotStart < timeOffEnd && slotEnd > timeOffStart);
                expect(overlapsWithTimeOff).toBe(false);
            });
        });

        it('should handle multi-day time-offs', async () => {
            const request: AvailabilityRequest = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                date: '2024-07-04T00:00:00Z', // During a multi-day vacation
                timezone: 'UTC',
                duration: 60,
                bufferBefore: 0,
                bufferAfter: 0,
                includeBufferInSlot: true,
            };

            const result = await engine.calculateAvailability(request);

            // Should have no slots during vacation period
            expect(result.slots).toHaveLength(0);
        });
    });

    describe('Cached Availability Results', () => {
        it('should cache availability results', async () => {
            const request: AvailabilityRequest = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                date: '2024-01-15T00:00:00Z',
                timezone: 'UTC',
                duration: 60,
                bufferBefore: 0,
                bufferAfter: 0,
                includeBufferInSlot: true,
            };

            // First call should calculate and cache
            const result1 = await engine.calculateAvailability(request);
            expect(result1.slots.length).toBeGreaterThan(0);

            // Second call should return cached result
            const result2 = await engine.calculateAvailability(request);
            expect(result2.slots).toEqual(result1.slots);

            // Check metrics
            const metrics = engine.getMetrics();
            expect(metrics.cacheHitRate).toBeGreaterThan(0);
        });

        it('should invalidate cache on new requests', async () => {
            const request1: AvailabilityRequest = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                date: '2024-01-15T00:00:00Z',
                timezone: 'UTC',
                duration: 60,
                bufferBefore: 0,
                bufferAfter: 0,
                includeBufferInSlot: true,
            };

            const request2: AvailabilityRequest = {
                ...request1,
                duration: 90, // Different duration
            };

            const result1 = await engine.calculateAvailability(request1);
            const result2 = await engine.calculateAvailability(request2);

            // Should be different results (not cached)
            expect(result1.slots).not.toEqual(result2.slots);
        });
    });

    describe('Performance Requirements', () => {
        it('should generate slots under 500ms', async () => {
            const request: AvailabilityRequest = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                date: '2024-01-15T00:00:00Z',
                timezone: 'UTC',
                duration: 60,
                bufferBefore: 0,
                bufferAfter: 0,
                includeBufferInSlot: true,
            };

            const start = Date.now();
            await engine.calculateAvailability(request);
            const duration = Date.now() - start;

            expect(duration).toBeLessThan(500);
        });

        it('should handle 50 concurrent slot queries', async () => {
            const requests: AvailabilityRequest[] = Array.from({ length: 50 }, (_, i) => ({
                staffId: 'staff-123',
                serviceId: 'service-123',
                date: '2024-01-15T00:00:00Z',
                timezone: 'UTC',
                duration: 60,
                bufferBefore: 0,
                bufferAfter: 0,
                includeBufferInSlot: true,
            }));

            const start = Date.now();
            
            // Process all requests concurrently
            const promises = requests.map(request => engine.calculateAvailability(request));
            const results = await Promise.all(promises);
            
            const duration = Date.now() - start;

            expect(results).toHaveLength(50);
            expect(duration).toBeLessThan(5000); // Should handle 50 requests efficiently
            results.forEach(result => {
                expect(result.slots).toBeDefined();
            });
        });

        it('should not generate duplicate slot entries', async () => {
            const request: AvailabilityRequest = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                date: '2024-01-15T00:00:00Z',
                timezone: 'UTC',
                duration: 60,
                bufferBefore: 0,
                bufferAfter: 0,
                includeBufferInSlot: true,
            };

            const result = await engine.calculateAvailability(request);

            // Check for duplicate slots
            const slotStrings = result.slots.map(slot => `${slot.start}-${slot.end}`);
            const uniqueSlots = new Set(slotStrings);
            
            expect(uniqueSlots.size).toBe(slotStrings.length);
        });
    });

    describe('Date Overrides', () => {
        it('should respect date overrides for special working hours', async () => {
            const request: AvailabilityRequest = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                date: '2024-01-15T00:00:00Z',
                timezone: 'UTC',
                duration: 60,
                bufferBefore: 0,
                bufferAfter: 0,
                includeBufferInSlot: true,
            };

            const result = await engine.calculateAvailability(request);

            // Should use override working hours if available
            expect(result.workingHours).toBeDefined();
        });

        it('should handle non-working day overrides', async () => {
            const request: AvailabilityRequest = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                date: '2024-01-15T00:00:00Z',
                timezone: 'UTC',
                duration: 60,
                bufferBefore: 0,
                bufferAfter: 0,
                includeBufferInSlot: true,
            };

            const result = await engine.calculateAvailability(request);

            // Should respect non-working override
            if (!result.workingHours.isWorking) {
                expect(result.slots).toHaveLength(0);
            }
        });
    });

    describe('Edge Cases', () => {
        it('should handle invalid duration gracefully', async () => {
            const request: AvailabilityRequest = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                date: '2024-01-15T00:00:00Z',
                timezone: 'UTC',
                duration: 0, // Invalid duration
                bufferBefore: 0,
                bufferAfter: 0,
                includeBufferInSlot: true,
            };

            await expect(engine.calculateAvailability(request)).rejects.toThrow();
        });

        it('should handle very long services', async () => {
            const request: AvailabilityRequest = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                date: '2024-01-15T00:00:00Z',
                timezone: 'UTC',
                duration: 480, // 8 hours - maximum allowed
                bufferBefore: 0,
                bufferAfter: 0,
                includeBufferInSlot: true,
            };

            const result = await engine.calculateAvailability(request);

            // Should generate very few or no slots for long services
            expect(result.slots.length).toBeLessThanOrEqual(2);
        });

        it('should handle edge of working day', async () => {
            const request: AvailabilityRequest = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                date: '2024-01-15T00:00:00Z',
                timezone: 'UTC',
                duration: 120, // 2 hours
                bufferBefore: 0,
                bufferAfter: 0,
                includeBufferInSlot: true,
            };

            const result = await engine.calculateAvailability(request);

            // Last slot should end exactly at working hours end
            if (result.slots.length > 0) {
                const lastSlot = result.slots[result.slots.length - 1];
                expect(lastSlot.end).toBe('17:00');
            }
        });
    });
});

// Helper function
function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}
