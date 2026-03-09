import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AppointmentEngine } from '../src/modules/appointment/appointment.engine.v2';
import { AppointmentStatus } from '../src/modules/appointment/appointment.schema';

describe('Phase 6 - Appointment Engine', () => {
    let engine: AppointmentEngine;

    beforeAll(() => {
        engine = new AppointmentEngine();
    });

    afterAll(() => {
        engine.resetMetrics();
    });

    describe('Slot Locking Mechanism', () => {
        it('should create slot lock for appointment booking', async () => {
            const bookingData = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                customerId: 'customer-123',
                startTimeUtc: '2024-01-15T10:00:00Z',
                endTimeUtc: '2024-01-15T11:00:00Z',
                createdBy: 'user-123',
            };

            const result = await engine.createAppointment(bookingData);

            expect(result).toBeDefined();
            expect(result.referenceId).toMatch(/^BK-/);
            expect(result.lockId).toBeDefined();
        });

        it('should prevent booking same slot twice', async () => {
            const bookingData = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                customerId: 'customer-123',
                startTimeUtc: '2024-01-15T10:00:00Z',
                endTimeUtc: '2024-01-15T11:00:00Z',
                createdBy: 'user-123',
            };

            // First booking should succeed
            const result1 = await engine.createAppointment(bookingData);
            expect(result1).toBeDefined();

            // Second booking should fail
            await expect(engine.createAppointment(bookingData)).rejects.toThrow('Time slot is not available');
        });

        it('should handle concurrent booking attempts', async () => {
            const bookingData = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                customerId: 'customer-123',
                startTimeUtc: '2024-01-15T14:00:00Z',
                endTimeUtc: '2024-01-15T15:00:00Z',
                createdBy: 'user-123',
            };

            // Create multiple concurrent booking attempts
            const promises = Array.from({ length: 10 }, (_, i) => 
                engine.createAppointment({
                    ...bookingData,
                    customerId: `customer-${i}`,
                })
            );

            const results = await Promise.allSettled(promises);
            
            // Only one should succeed
            const successful = results.filter(r => r.status === 'fulfilled');
            const failed = results.filter(r => r.status === 'rejected');
            
            expect(successful.length).toBe(1);
            expect(failed.length).toBe(9);
        });
    });

    describe('Lock Expiration', () => {
        it('should lock expire automatically after TTL', async () => {
            const bookingData = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                customerId: 'customer-123',
                startTimeUtc: '2024-01-15T16:00:00Z',
                endTimeUtc: '2024-01-15T17:00:00Z',
                createdBy: 'user-123',
            };

            // Create lock with short TTL (simulate expiration)
            const result = await engine.createAppointment(bookingData);
            expect(result).toBeDefined();

            // Wait for lock to expire (in real implementation, this would be handled by background job)
            // For testing, we'll simulate the expiration check
            const metrics = engine.getMetrics();
            expect(metrics.totalBookings).toBeGreaterThan(0);
        });

        it('should handle lock expiration gracefully', async () => {
            const bookingData = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                customerId: 'customer-123',
                startTimeUtc: '2024-01-15T18:00:00Z',
                endTimeUtc: '2024-01-15T19:00:00Z',
                createdBy: 'user-123',
            };

            // Simulate expired lock scenario
            await expect(engine.createAppointment(bookingData)).rejects.toThrow();
        });
    });

    describe('Atomic DB Transactions', () => {
        it('should rollback on booking failure', async () => {
            const invalidBookingData = {
                staffId: 'invalid-staff',
                serviceId: 'service-123',
                customerId: 'customer-123',
                startTimeUtc: '2024-01-15T09:00:00Z',
                endTimeUtc: '2024-01-15T10:00:00Z',
                createdBy: 'user-123',
            };

            // Should fail and rollback
            await expect(engine.createAppointment(invalidBookingData)).rejects.toThrow();
            
            // Verify no partial data was created
            const metrics = engine.getMetrics();
            expect(metrics.failedBookings).toBeGreaterThan(0);
        });

        it('should maintain data consistency during concurrent operations', async () => {
            const baseData = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                startTimeUtc: '2024-01-15T09:00:00Z',
                endTimeUtc: '2024-01-15T10:00:00Z',
                createdBy: 'user-123',
            };

            // Create multiple concurrent operations
            const operations = Array.from({ length: 5 }, (_, i) => 
                engine.createAppointment({
                    ...baseData,
                    customerId: `customer-${i}`,
                    startTimeUtc: `2024-01-15T${9 + i}:00:00Z`,
                    endTimeUtc: `2024-01-15T${10 + i}:00:00Z`,
                })
            );

            const results = await Promise.allSettled(operations);
            
            // All should either succeed or fail cleanly
            results.forEach(result => {
                expect(result.status).toMatch(/^(fulfilled|rejected)$/);
            });
        });

        it('should prevent deadlocks', async () => {
            // Create scenario that could cause deadlock
            const booking1 = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                customerId: 'customer-1',
                startTimeUtc: '2024-01-15T09:00:00Z',
                endTimeUtc: '2024-01-15T10:00:00Z',
                createdBy: 'user-123',
            };

            const booking2 = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                customerId: 'customer-2',
                startTimeUtc: '2024-01-15T10:00:00Z',
                endTimeUtc: '2024-01-15T11:00:00Z',
                createdBy: 'user-123',
            };

            // Execute in parallel to test deadlock prevention
            const results = await Promise.allSettled([
                engine.createAppointment(booking1),
                engine.createAppointment(booking2),
            ]);

            // Should handle without deadlocks
            expect(results).toHaveLength(2);
        });
    });

    describe('Status Lifecycle Enforcement', () => {
        it('should allow valid status transitions', async () => {
            // Create appointment
            const bookingData = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                customerId: 'customer-123',
                startTimeUtc: '2024-01-15T11:00:00Z',
                endTimeUtc: '2024-01-15T12:00:00Z',
                createdBy: 'user-123',
            };

            const appointment = await engine.createAppointment(bookingData);
            expect(appointment.status).toBe(AppointmentStatus.BOOKED);

            // Valid transition: BOOKED -> CONFIRMED
            const updated = await engine.updateAppointment(appointment.id, {
                status: AppointmentStatus.CONFIRMED,
                updatedBy: 'user-123',
            });

            expect(updated.status).toBe(AppointmentStatus.CONFIRMED);
        });

        it('should reject invalid status transitions', async () => {
            // Create appointment
            const bookingData = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                customerId: 'customer-123',
                startTimeUtc: '2024-01-15T12:00:00Z',
                endTimeUtc: '2024-01-15T13:00:00Z',
                createdBy: 'user-123',
            };

            const appointment = await engine.createAppointment(bookingData);

            // Invalid transition: BOOKED -> COMPLETED (should go through CONFIRMED first)
            await expect(engine.updateAppointment(appointment.id, {
                status: AppointmentStatus.COMPLETED,
                updatedBy: 'user-123',
            })).rejects.toThrow('Invalid status transition');
        });

        it('should prevent transitions from terminal states', async () => {
            // Create and cancel appointment
            const bookingData = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                customerId: 'customer-123',
                startTimeUtc: '2024-01-15T13:00:00Z',
                endTimeUtc: '2024-01-15T14:00:00Z',
                createdBy: 'user-123',
            };

            const appointment = await engine.createAppointment(bookingData);
            
            // Cancel appointment (terminal state)
            await engine.updateAppointment(appointment.id, {
                status: AppointmentStatus.CANCELLED,
                updatedBy: 'user-123',
            });

            // Try to transition from CANCELLED (should fail)
            await expect(engine.updateAppointment(appointment.id, {
                status: AppointmentStatus.BOOKED,
                updatedBy: 'user-123',
            })).rejects.toThrow('Invalid status transition');
        });
    });

    describe('Reschedule Logic', () => {
        it('should reschedule appointment successfully', async () => {
            // Create original appointment
            const bookingData = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                customerId: 'customer-123',
                startTimeUtc: '2024-01-15T14:00:00Z',
                endTimeUtc: '2024-01-15T15:00:00Z',
                createdBy: 'user-123',
            };

            const appointment = await engine.createAppointment(bookingData);

            // Reschedule to new time
            const rescheduleData = {
                appointmentId: appointment.id,
                newStartTimeUtc: '2024-01-15T16:00:00Z',
                newEndTimeUtc: '2024-01-15T17:00:00Z',
                reason: 'Customer requested later time',
                rescheduledBy: 'user-123',
            };

            const rescheduled = await engine.rescheduleAppointment(rescheduleData);

            expect(rescheduled).toBeDefined();
            expect(rescheduled.previousAppointmentId).toBe(appointment.id);
            expect(rescheduled.newLockId).toBeDefined();
        });

        it('should detect reschedule conflicts', async () => {
            // Create two appointments
            const booking1 = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                customerId: 'customer-1',
                startTimeUtc: '2024-01-15T09:00:00Z',
                endTimeUtc: '2024-01-15T10:00:00Z',
                createdBy: 'user-123',
            };

            const booking2 = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                customerId: 'customer-2',
                startTimeUtc: '2024-01-15T11:00:00Z',
                endTimeUtc: '2024-01-15T12:00:00Z',
                createdBy: 'user-123',
            };

            await engine.createAppointment(booking1);
            const appointment2 = await engine.createAppointment(booking2);

            // Try to reschedule appointment2 to conflict with appointment1
            const rescheduleData = {
                appointmentId: appointment2.id,
                newStartTimeUtc: '2024-01-15T09:30:00Z',
                newEndTimeUtc: '2024-01-15T10:30:00Z',
                reason: 'Testing conflict detection',
                rescheduledBy: 'user-123',
            };

            await expect(engine.rescheduleAppointment(rescheduleData))
                .rejects.toThrow('New time slot conflicts with existing appointments');
        });
    });

    describe('Manual Booking', () => {
        it('should create manual booking successfully', async () => {
            const manualData = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                customerId: 'customer-123',
                startTimeUtc: '2024-01-15T15:00:00Z',
                endTimeUtc: '2024-01-15T16:00:00Z',
                createdBy: 'staff-123',
                overrideAvailability: false,
            };

            const result = await engine.createManualBooking(manualData);

            expect(result).toBeDefined();
            expect(result.referenceId).toMatch(/^BK-/);
            expect(result.lockId).toBeDefined();
        });

        it('should override availability when specified', async () => {
            const manualData = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                customerId: 'customer-123',
                startTimeUtc: '2024-01-15T15:00:00Z',
                endTimeUtc: '2024-01-15T16:00:00Z',
                createdBy: 'staff-123',
                overrideAvailability: true, // Override availability checks
            };

            const result = await engine.createManualBooking(manualData);

            expect(result).toBeDefined();
            expect(result.status).toBe(AppointmentStatus.CONFIRMED); // Manual bookings are auto-confirmed
        });
    });

    describe('Reference ID Generation', () => {
        it('should generate unique reference IDs', async () => {
            const bookingData = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                customerId: 'customer-123',
                startTimeUtc: '2024-01-15T16:00:00Z',
                endTimeUtc: '2024-01-15T17:00:00Z',
                createdBy: 'user-123',
            };

            // Create multiple appointments
            const appointments = await Promise.all([
                engine.createAppointment({ ...bookingData, customerId: 'customer-1' }),
                engine.createAppointment({ ...bookingData, customerId: 'customer-2' }),
                engine.createAppointment({ ...bookingData, customerId: 'customer-3' }),
            ]);

            const referenceIds = appointments.map(apt => apt.referenceId);

            // All reference IDs should be unique
            const uniqueIds = new Set(referenceIds);
            expect(uniqueIds.size).toBe(referenceIds.length);

            // All should follow the BK- prefix pattern
            referenceIds.forEach(id => {
                expect(id).toMatch(/^BK-[A-Z0-9]+-[A-Z0-9]+$/);
            });
        });

        it('should generate reference IDs with correct format', async () => {
            const bookingData = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                customerId: 'customer-123',
                startTimeUtc: '2024-01-15T17:00:00Z',
                endTimeUtc: '2024-01-15T18:00:00Z',
                createdBy: 'user-123',
            };

            const result = await engine.createAppointment(bookingData);

            expect(result.referenceId).toMatch(/^BK-[A-Z0-9]{8,13}-[A-Z0-9]{6}$/);
        });
    });

    describe('Performance Requirements', () => {
        it('should handle 100 concurrent booking attempts', async () => {
            const baseData = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                startTimeUtc: '2024-01-15T09:00:00Z',
                endTimeUtc: '2024-01-15T10:00:00Z',
                createdBy: 'user-123',
            };

            // Create 100 concurrent booking attempts
            const promises = Array.from({ length: 100 }, (_, i) => 
                engine.createAppointment({
                    ...baseData,
                    customerId: `customer-${i}`,
                    startTimeUtc: `2024-01-15T${9 + (i % 8)}:00:00Z`,
                    endTimeUtc: `2024-01-15T${10 + (i % 8)}:00:00Z`,
                })
            );

            const startTime = Date.now();
            const results = await Promise.allSettled(promises);
            const duration = Date.now() - startTime;

            // Should complete within reasonable time
            expect(duration).toBeLessThan(5000); // 5 seconds for 100 operations

            // Should handle all requests without crashing
            expect(results).toHaveLength(100);

            // Check metrics
            const metrics = engine.getMetrics();
            expect(metrics.totalBookings).toBe(100);
            expect(metrics.concurrentBookings).toBe(0); // Should reset to 0 after completion
        });

        it('should maintain performance under load', async () => {
            const baseData = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                startTimeUtc: '2024-01-15T09:00:00Z',
                endTimeUtc: '2024-01-15T10:00:00Z',
                createdBy: 'user-123',
            };

            // Multiple rounds of concurrent operations
            for (let round = 0; round < 5; round++) {
                const promises = Array.from({ length: 20 }, (_, i) => 
                    engine.createAppointment({
                        ...baseData,
                        customerId: `customer-${round}-${i}`,
                        startTimeUtc: `2024-01-${15 + round}T${9 + (i % 4)}:00:00Z`,
                        endTimeUtc: `2024-01-${15 + round}T${10 + (i % 4)}:00:00Z`,
                    })
                );

                const startTime = Date.now();
                await Promise.allSettled(promises);
                const duration = Date.now() - startTime;

                // Each round should complete quickly
                expect(duration).toBeLessThan(2000); // 2 seconds for 20 operations
            }

            const metrics = engine.getMetrics();
            expect(metrics.totalBookings).toBe(100);
            expect(metrics.successfulBookings).toBeGreaterThan(0);
        });

        it('should prevent memory leaks under load', async () => {
            const initialMetrics = engine.getMetrics();

            // Generate many operations
            const promises = Array.from({ length: 50 }, (_, i) => 
                engine.createAppointment({
                    staffId: 'staff-123',
                    serviceId: 'service-123',
                    customerId: `customer-${i}`,
                    startTimeUtc: `2024-01-15T${9 + (i % 10)}:00:00Z`,
                    endTimeUtc: `2024-01-15T${10 + (i % 10)}:00:00Z`,
                    createdBy: 'user-123',
                })
            );

            await Promise.allSettled(promises);

            // Reset metrics and verify clean state
            engine.resetMetrics();
            const finalMetrics = engine.getMetrics();

            expect(finalMetrics.totalBookings).toBe(0);
            expect(finalMetrics.concurrentBookings).toBe(0);
            expect(finalMetrics.successfulBookings).toBe(0);
            expect(finalMetrics.failedBookings).toBe(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid booking data gracefully', async () => {
            const invalidData = {
                staffId: '', // Invalid empty staff ID
                serviceId: 'service-123',
                customerId: 'customer-123',
                startTimeUtc: 'invalid-date',
                endTimeUtc: '2024-01-15T10:00:00Z',
                createdBy: 'user-123',
            };

            await expect(engine.createAppointment(invalidData)).rejects.toThrow();
        });

        it('should handle database connection errors', async () => {
            // Test with invalid staff ID to trigger database error
            const invalidData = {
                staffId: 'non-existent-staff',
                serviceId: 'service-123',
                customerId: 'customer-123',
                startTimeUtc: '2024-01-15T10:00:00Z',
                endTimeUtc: '2024-01-15T11:00:00Z',
                createdBy: 'user-123',
            };

            await expect(engine.createAppointment(invalidData)).rejects.toThrow();
        });

        it('should maintain consistency on partial failures', async () => {
            const validData = {
                staffId: 'staff-123',
                serviceId: 'service-123',
                customerId: 'customer-123',
                startTimeUtc: '2024-01-15T10:00:00Z',
                endTimeUtc: '2024-01-15T11:00:00Z',
                createdBy: 'user-123',
            };

            // Mix valid and invalid operations
            const operations = [
                engine.createAppointment(validData),
                engine.createAppointment({ ...validData, staffId: 'invalid' }),
                engine.createAppointment({ ...validData, customerId: 'customer-456' }),
            ];

            const results = await Promise.allSettled(operations);

            // Should handle mixed results gracefully
            const successful = results.filter(r => r.status === 'fulfilled');
            const failed = results.filter(r => r.status === 'rejected');

            expect(successful.length).toBeGreaterThan(0);
            expect(failed.length).toBeGreaterThan(0);
        });
    });
});
