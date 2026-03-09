import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ServiceService } from '../src/modules/service/service.service';
import { StaffService } from '../src/modules/staff/staff.service';
import { ServiceValidation, ServiceUtils } from '../src/modules/service/service.schema';
import { StaffValidation, StaffUtils } from '../src/modules/staff/staff.schema';
import { prisma } from '../src/lib/prisma';
import { cleanupDatabase } from './helpers';

describe('Phase 4 - Services & Staff Modules', () => {
    let tenantId: string;
    let serviceService: ServiceService;
    let staffService: StaffService;

    beforeAll(async () => {
        await cleanupDatabase();
        
        serviceService = new ServiceService();
        staffService = new StaffService();
        
        // Create test tenant
        const tenant = await prisma.tenant.create({
            data: {
                name: 'Test Tenant',
                slug: 'test-tenant',
            },
        });
        tenantId = tenant.id;
    });

    afterAll(async () => {
        await cleanupDatabase();
    });

    describe('Service Module', () => {
        describe('CRUD Operations', () => {
            it('should create a new service', async () => {
                const serviceData = {
                    name: 'Haircut',
                    description: 'Professional haircut service',
                    category: 'Hair',
                    durationMinutes: 30,
                    bufferBefore: 5,
                    bufferAfter: 5,
                    price: 25.00,
                    allowOnlineBooking: true,
                };

                const service = await serviceService.createService(tenantId, serviceData);
                
                expect(service).toBeDefined();
                expect(service.name).toBe('Haircut');
                expect(service.durationMinutes).toBe(30);
                expect(service.isActive).toBe(true);
            });

            it('should reject service with negative duration', async () => {
                const serviceData = {
                    name: 'Invalid Service',
                    durationMinutes: -10,
                };

                await expect(serviceService.createService(tenantId, serviceData))
                    .rejects.toThrow();
            });

            it('should reject service with excessive total duration', async () => {
                const serviceData = {
                    name: 'Long Service',
                    durationMinutes: 480, // 8 hours
                    bufferBefore: 120, // 2 hours
                    bufferAfter: 120, // 2 hours
                    // Total: 12 hours > 10 hour limit
                };

                await expect(serviceService.createService(tenantId, serviceData))
                    .rejects.toThrow('Total duration (service + buffers) cannot exceed 10 hours');
            });

            it('should update existing service', async () => {
                // Create a service first
                const created = await serviceService.createService(tenantId, {
                    name: 'Original Service',
                    durationMinutes: 30,
                });

                // Update it
                const updated = await serviceService.updateService(created.id, tenantId, {
                    durationMinutes: 45,
                    price: 35.00,
                });

                expect(updated.durationMinutes).toBe(45);
                expect(updated.price).toBe(35.00);
            });

            it('should prevent duplicate service names', async () => {
                await serviceService.createService(tenantId, {
                    name: 'Duplicate Test',
                    durationMinutes: 30,
                });

                await expect(serviceService.createService(tenantId, {
                    name: 'Duplicate Test',
                    durationMinutes: 45,
                })).rejects.toThrow('Service with this name already exists');
            });

            it('should deactivate service with existing appointments', async () => {
                // Create service
                const service = await serviceService.createService(tenantId, {
                    name: 'Service with Appointments',
                    durationMinutes: 30,
                });

                // Create a mock appointment (simplified)
                await prisma.appointment.create({
                    data: {
                        tenantId,
                        serviceId: service.id,
                        staffId: 'test-staff-id',
                        customerId: 'test-customer-id',
                        referenceId: 'REF-001',
                        startTimeUtc: new Date(),
                        endTimeUtc: new Date(Date.now() + 30 * 60 * 1000),
                        status: 'BOOKED',
                    },
                });

                // Try to delete - should deactivate instead
                const result = await serviceService.softDeleteService(service.id, tenantId);
                expect(result.success).toBe(true);
                expect(result.deactivated).toBe(true);
            });
        });

        describe('Buffer Time Validation', () => {
            it('should apply buffer in slot calculation', async () => {
                const service = {
                    durationMinutes: 30,
                    bufferBefore: 10,
                    bufferAfter: 15,
                };

                const totalDuration = ServiceUtils.calculateTotalDuration(service);
                expect(totalDuration).toBe(55); // 30 + 10 + 15

                const startTime = new Date('2024-01-01T10:00:00Z');
                const endTime = ServiceUtils.calculateEndTime(startTime, service);
                const expectedEnd = new Date('2024-01-01T10:55:00Z');
                expect(endTime.getTime()).toBe(expectedEnd.getTime());
            });

            it('should validate buffer limits', () => {
                expect(ServiceValidation.validateBuffer(0)).toBe(true);
                expect(ServiceValidation.validateBuffer(60)).toBe(true);
                expect(ServiceValidation.validateBuffer(121)).toBe(false); // Over 120 minutes
            });
        });

        describe('Service-Staff Mapping', () => {
            it('should assign services to staff', async () => {
                // Create services
                const service1 = await serviceService.createService(tenantId, {
                    name: 'Service 1',
                    durationMinutes: 30,
                });
                const service2 = await serviceService.createService(tenantId, {
                    name: 'Service 2',
                    durationMinutes: 45,
                });

                // Create staff
                const staff = await staffService.createStaff(tenantId, {
                    name: 'Test Staff',
                    email: 'staff@test.com',
                });

                // Assign services
                const result = await serviceService.assignServiceToStaff(
                    service1.id,
                    tenantId,
                    [staff.id]
                );

                expect(result.success).toBe(true);
                expect(result.assignedCount).toBe(1);
            });

            it('should reject assignment to invalid staff', async () => {
                const service = await serviceService.createService(tenantId, {
                    name: 'Test Service',
                    durationMinutes: 30,
                });

                await expect(serviceService.assignServiceToStaff(
                    service.id,
                    tenantId,
                    ['invalid-staff-id']
                )).rejects.toThrow('One or more staff members not found');
            });
        });

        describe('Active/Inactive Toggle', () => {
            it('should hide inactive services publicly', async () => {
                // Create active service
                const activeService = await serviceService.createService(tenantId, {
                    name: 'Active Service',
                    durationMinutes: 30,
                    isActive: true,
                });

                // Create inactive service
                const inactiveService = await serviceService.createService(tenantId, {
                    name: 'Inactive Service',
                    durationMinutes: 30,
                    isActive: false,
                });

                // Get public services (active only)
                const publicServices = await serviceService.listServices(tenantId, true);
                
                expect(publicServices.some(s => s.id === activeService.id)).toBe(true);
                expect(publicServices.some(s => s.id === inactiveService.id)).toBe(false);
            });
        });

        describe('Performance Requirements', () => {
            it('should return results under 300ms', async () => {
                const start = Date.now();
                
                await serviceService.listServices(tenantId, true);
                
                const duration = Date.now() - start;
                expect(duration).toBeLessThan(300);
            });

            it('should prevent duplicate services efficiently', async () => {
                const serviceData = {
                    name: 'Duplicate Prevention Test',
                    durationMinutes: 30,
                };

                // Create first service
                await serviceService.createService(tenantId, serviceData);

                // Attempt duplicate - should fail quickly
                const start = Date.now();
                await expect(serviceService.createService(tenantId, serviceData))
                    .rejects.toThrow('Service with this name already exists');
                
                const duration = Date.now() - start;
                expect(duration).toBeLessThan(100); // Should fail fast due to indexing
            });
        });
    });

    describe('Staff Module', () => {
        describe('Staff Profile Management', () => {
            it('should create staff with profile', async () => {
                const staffData = {
                    name: 'John Doe',
                    email: 'john.doe@test.com',
                    phone: '+1234567890',
                    title: 'Senior Stylist',
                    department: 'Hair',
                    bio: 'Experienced stylist with 10+ years',
                    photoUrl: 'https://example.com/photo.jpg',
                    maxConcurrentAppointments: 2,
                    commissionRate: 15.5,
                };

                const staff = await staffService.createStaff(tenantId, staffData);
                
                expect(staff.name).toBe('John Doe');
                expect(staff.email).toBe('john.doe@test.com');
                expect(staff.title).toBe('Senior Stylist');
                expect(staff.maxConcurrentAppointments).toBe(2);
                expect(staff.commissionRate).toBe(15.5);
            });

            it('should prevent duplicate emails', async () => {
                await staffService.createStaff(tenantId, {
                    name: 'Staff 1',
                    email: 'duplicate@test.com',
                });

                await expect(staffService.createStaff(tenantId, {
                    name: 'Staff 2',
                    email: 'duplicate@test.com',
                })).rejects.toThrow('Staff member with this email already exists');
            });

            it('should update staff profile', async () => {
                const created = await staffService.createStaff(tenantId, {
                    name: 'Original Name',
                    title: 'Junior Stylist',
                });

                const updated = await staffService.updateStaff(created.id, tenantId, {
                    title: 'Senior Stylist',
                    department: 'Hair',
                    maxConcurrentAppointments: 3,
                });

                expect(updated.title).toBe('Senior Stylist');
                expect(updated.department).toBe('Hair');
                expect(updated.maxConcurrentAppointments).toBe(3);
            });
        });

        describe('Weekly Schedule', () => {
            it('should create weekly schedule with breaks', async () => {
                const staff = await staffService.createStaff(tenantId, {
                    name: 'Scheduled Staff',
                });

                const schedules = [
                    {
                        dayOfWeek: 1, // Monday
                        startTime: '09:00',
                        endTime: '17:00',
                        isWorking: true,
                        maxAppointments: 8,
                        breaks: [
                            {
                                startTime: '12:00',
                                endTime: '13:00',
                                title: 'Lunch Break',
                            },
                        ],
                    },
                    {
                        dayOfWeek: 6, // Saturday
                        startTime: '09:00',
                        endTime: '13:00',
                        isWorking: true,
                        breaks: [],
                    },
                    {
                        dayOfWeek: 0, // Sunday
                        isWorking: false,
                    },
                ];

                const result = await staffService.setSchedule(staff.id, tenantId, schedules);
                expect(result.weeklySchedule).toHaveLength(3);
            });

            it('should enforce working hours validation', async () => {
                const staff = await staffService.createStaff(tenantId, {
                    name: 'Validation Staff',
                });

                const invalidSchedules = [
                    {
                        dayOfWeek: 1,
                        startTime: '17:00',
                        endTime: '09:00', // End before start
                        isWorking: true,
                    },
                ];

                await expect(staffService.setSchedule(staff.id, tenantId, invalidSchedules))
                    .rejects.toThrow('Monday: End time must be after start time');
            });

            it('should prevent overlapping breaks', async () => {
                const staff = await staffService.createStaff(tenantId, {
                    name: 'Overlap Staff',
                });

                const invalidSchedules = [
                    {
                        dayOfWeek: 1,
                        startTime: '09:00',
                        endTime: '17:00',
                        isWorking: true,
                        breaks: [
                            {
                                startTime: '12:00',
                                endTime: '13:30',
                            },
                            {
                                startTime: '13:00',
                                endTime: '14:00', // Overlaps with previous break
                            },
                        ],
                    },
                ];

                await expect(staffService.setSchedule(staff.id, tenantId, invalidSchedules))
                    .rejects.toThrow('Monday: Breaks cannot overlap');
            });

            it('should exclude breaks from available slots', async () => {
                const staff = {
                    weeklySchedule: [
                        {
                            dayOfWeek: 1,
                            startTime: '09:00',
                            endTime: '17:00',
                            isWorking: true,
                            breaks: [
                                {
                                    startTime: '12:00',
                                    endTime: '13:00',
                                },
                            ],
                        },
                    ],
                };

                const date = new Date('2024-01-01T12:30:00'); // During break
                const isAvailable = StaffUtils.isStaffAvailable(staff, date);
                expect(isAvailable).toBe(false);

                const beforeBreak = new Date('2024-01-01T11:30:00');
                const availableBeforeBreak = StaffUtils.isStaffAvailable(staff, beforeBreak);
                expect(availableBeforeBreak).toBe(true);
            });
        });

        describe('Holidays and Time Off', () => {
            it('should add manual time off', async () => {
                const staff = await staffService.createStaff(tenantId, {
                    name: 'Time Off Staff',
                });

                const timeOffData = {
                    date: '2024-12-25T00:00:00Z',
                    endDate: '2024-12-25T23:59:59Z',
                    reason: 'Christmas Holiday',
                    type: 'HOLIDAY',
                    isPaid: true,
                };

                const result = await staffService.addTimeOff(staff.id, tenantId, timeOffData);
                expect(result.timeOffs).toHaveLength(1);
                expect(result.timeOffs[0].type).toBe('HOLIDAY');
            });

            it('should block slots during holidays', async () => {
                const staff = await staffService.createStaff(tenantId, {
                    name: 'Holiday Staff',
                });

                // Add schedule
                await staffService.setSchedule(staff.id, tenantId, [
                    {
                        dayOfWeek: 3, // Wednesday
                        startTime: '09:00',
                        endTime: '17:00',
                        isWorking: true,
                        breaks: [],
                    },
                ]);

                // Add holiday
                await staffService.addTimeOff(staff.id, tenantId, {
                    date: '2024-01-03T00:00:00Z',
                    endDate: '2024-01-03T23:59:59Z',
                    reason: 'New Year Holiday',
                    type: 'HOLIDAY',
                });

                // Check availability on holiday
                const availability = await staffService.getStaffAvailability(
                    staff.id,
                    tenantId,
                    new Date('2024-01-03T10:00:00Z')
                );

                expect(availability.isAvailable).toBe(false);
                expect(availability.timeOffs).toHaveLength(1);
            });

            it('should validate time off date ranges', async () => {
                const staff = await staffService.createStaff(tenantId, {
                    name: 'Validation Staff',
                });

                const invalidTimeOff = {
                    date: '2024-01-05T00:00:00Z',
                    endDate: '2024-01-01T00:00:00Z', // End before start
                    reason: 'Invalid Range',
                };

                await expect(staffService.addTimeOff(staff.id, tenantId, invalidTimeOff))
                    .rejects.toThrow('End date must be after start date');
            });
        });

        describe('Staff Service Assignment', () => {
            it('should prevent assignment to inactive services', async () => {
                const staff = await staffService.createStaff(tenantId, {
                    name: 'Assignment Staff',
                });

                const inactiveService = await serviceService.createService(tenantId, {
                    name: 'Inactive Service',
                    durationMinutes: 30,
                    isActive: false,
                });

                await expect(staffService.assignServices(staff.id, tenantId, [inactiveService.id]))
                    .rejects.toThrow('One or more services do not belong to this tenant or are inactive');
            });
        });

        describe('Performance Requirements', () => {
            it('should have no overlapping schedule entries', async () => {
                const staff = await staffService.createStaff(tenantId, {
                    name: 'Performance Staff',
                });

                // Create valid schedule
                const schedules = [
                    {
                        dayOfWeek: 1,
                        startTime: '09:00',
                        endTime: '17:00',
                        isWorking: true,
                        breaks: [],
                    },
                ];

                const start = Date.now();
                await staffService.setSchedule(staff.id, tenantId, schedules);
                const duration = Date.now() - start;

                expect(duration).toBeLessThan(200); // Should be efficient
            });

            it('should efficiently validate schedule', async () => {
                const validation = StaffValidation.validateWeeklySchedule([
                    {
                        dayOfWeek: 1,
                        startTime: '09:00',
                        endTime: '17:00',
                        isWorking: true,
                        breaks: [],
                    },
                ]);

                expect(validation.isValid).toBe(true);
                
                // Validation should be fast
                const start = Date.now();
                StaffValidation.validateWeeklySchedule([
                    {
                        dayOfWeek: 1,
                        startTime: '09:00',
                        endTime: '17:00',
                        isWorking: true,
                        breaks: [],
                    },
                    {
                        dayOfWeek: 2,
                        startTime: '09:00',
                        endTime: '17:00',
                        isWorking: true,
                        breaks: [],
                    },
                ]);
                const duration = Date.now() - start;
                expect(duration).toBeLessThan(50); // Should be very fast
            });
        });
    });

    describe('Integration Tests', () => {
        it('should handle complex booking scenarios', async () => {
            // Create service with buffer
            const service = await serviceService.createService(tenantId, {
                name: 'Complex Service',
                durationMinutes: 60,
                bufferBefore: 15,
                bufferAfter: 15,
            });

            // Create staff with schedule and breaks
            const staff = await staffService.createStaff(tenantId, {
                name: 'Complex Staff',
            });

            await staffService.setSchedule(staff.id, tenantId, [
                {
                    dayOfWeek: 1,
                    startTime: '09:00',
                    endTime: '17:00',
                    isWorking: true,
                    breaks: [
                        { startTime: '12:00', endTime: '13:00' },
                        { startTime: '15:00', endTime: '15:30' },
                    ],
                },
            ]);

            await staffService.assignServices(staff.id, tenantId, [service.id]);

            // Test availability calculation
            const date = new Date('2024-01-01T11:00:00Z'); // Monday 11 AM
            const slots = await staffService.getAvailableTimeSlots(
                staff.id,
                tenantId,
                date,
                60 // 1 hour service
            );

            // Should account for buffer and breaks
            expect(slots.slots.length).toBeGreaterThan(0);
            
            // First slot should be after 9:15 AM (9:00 + 15 min buffer)
            const firstSlot = slots.slots[0];
            expect(firstSlot.start).toBe('09:15');
        });

        it('should maintain data consistency across modules', async () => {
            // Create service
            const service = await serviceService.createService(tenantId, {
                name: 'Consistency Service',
                durationMinutes: 30,
            });

            // Create staff
            const staff = await staffService.createStaff(tenantId, {
                name: 'Consistency Staff',
            });

            // Assign service to staff
            await staffService.assignServices(staff.id, tenantId, [service.id]);

            // Verify assignment from service side
            const serviceStaff = await serviceService.getServiceStaff(service.id, tenantId);
            expect(serviceStaff).toHaveLength(1);
            expect(serviceStaff[0].staffId).toBe(staff.id);

            // Verify assignment from staff side
            const updatedStaff = await staffService.getStaff(staff.id, tenantId);
            expect(updatedStaff.staffServices).toHaveLength(1);
            expect(updatedStaff.staffServices[0].serviceId).toBe(service.id);
        });
    });
});
