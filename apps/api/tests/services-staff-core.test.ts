import { describe, it, expect } from 'vitest';
import { ServiceValidation, ServiceUtils } from '../src/modules/service/service.schema';
import { StaffValidation, StaffUtils } from '../src/modules/staff/staff.schema';

describe('Phase 4 - Services & Staff Core Validation', () => {
    describe('Service Validation', () => {
        it('should validate service duration correctly', () => {
            expect(ServiceValidation.validateDuration(30)).toBe(true);
            expect(ServiceValidation.validateDuration(5)).toBe(true);
            expect(ServiceValidation.validateDuration(480)).toBe(true);
            
            expect(ServiceValidation.validateDuration(4)).toBe(false); // Too short
            expect(ServiceValidation.validateDuration(481)).toBe(false); // Too long
            expect(ServiceValidation.validateDuration(-10)).toBe(false); // Negative
        });

        it('should validate buffer times correctly', () => {
            expect(ServiceValidation.validateBuffer(0)).toBe(true);
            expect(ServiceValidation.validateBuffer(60)).toBe(true);
            expect(ServiceValidation.validateBuffer(120)).toBe(true);
            
            expect(ServiceValidation.validateBuffer(-1)).toBe(false); // Negative
            expect(ServiceValidation.validateBuffer(121)).toBe(false); // Over limit
        });

        it('should validate total duration correctly', () => {
            expect(ServiceValidation.validateTotalDuration(30, 15, 15)).toBe(true); // 60 min total
            expect(ServiceValidation.validateTotalDuration(480, 60, 60)).toBe(true); // 600 min total
            
            expect(ServiceValidation.validateTotalDuration(480, 120, 120)).toBe(false); // 720 min > 600 limit
        });

        it('should validate advance booking settings correctly', () => {
            expect(ServiceValidation.validateAdvanceBooking(1, 1)).toBe(true);
            expect(ServiceValidation.validateAdvanceBooking(0, 365)).toBe(true);
            expect(ServiceValidation.validateAdvanceBooking(168, 365)).toBe(true);
            
            expect(ServiceValidation.validateAdvanceBooking(-1, 365)).toBe(false); // Negative hours
            expect(ServiceValidation.validateAdvanceBooking(0, 366)).toBe(false); // Over max days
            expect(ServiceValidation.validateAdvanceBooking(169, 1)).toBe(false); // Min > max hours
        });
    });

    describe('Service Utilities', () => {
        it('should calculate total duration correctly', () => {
            const service = {
                durationMinutes: 30,
                bufferBefore: 10,
                bufferAfter: 15,
            };
            
            expect(ServiceUtils.calculateTotalDuration(service)).toBe(55); // 30 + 10 + 15
        });

        it('should calculate end time correctly', () => {
            const service = {
                durationMinutes: 60,
                bufferBefore: 15,
                bufferAfter: 15,
            };
            
            const startTime = new Date('2024-01-01T10:00:00Z');
            const endTime = ServiceUtils.calculateEndTime(startTime, service);
            
            const expectedEnd = new Date('2024-01-01T11:15:00Z'); // 60 + 15 + 15 = 90 min
            expect(endTime.getTime()).toBe(expectedEnd.getTime());
        });

        it('should check service availability correctly', () => {
            const activeService = {
                isActive: true,
                allowOnlineBooking: true,
            };
            
            const inactiveService = {
                isActive: false,
                allowOnlineBooking: true,
            };
            
            const onlineOnlyService = {
                isActive: true,
                allowOnlineBooking: false,
            };
            
            expect(ServiceUtils.isServiceAvailable(activeService)).toBe(true);
            expect(ServiceUtils.isServiceAvailable(inactiveService)).toBe(false);
            expect(ServiceUtils.isServiceAvailable(onlineOnlyService, true)).toBe(false);
            expect(ServiceUtils.isServiceAvailable(onlineOnlyService, false)).toBe(true);
        });

        it('should search services correctly', () => {
            const services = [
                { name: 'Haircut', description: 'Professional haircut', category: 'Hair' },
                { name: 'Massage', description: 'Relaxing massage', category: 'Wellness' },
                { name: 'Styling', description: 'Hair styling service', category: 'Hair' },
            ];
            
            // Search by name
            const nameResults = ServiceUtils.searchServices(services, 'hair');
            expect(nameResults).toHaveLength(2); // Haircut, Styling
            
            // Search by description
            const descResults = ServiceUtils.searchServices(services, 'massage');
            expect(descResults).toHaveLength(1); // Massage
            
            // Search by category
            const catResults = ServiceUtils.searchServices(services, 'hair');
            expect(catResults).toHaveLength(2); // Haircut, Styling
            
            // Empty search
            const emptyResults = ServiceUtils.searchServices(services, '');
            expect(emptyResults).toHaveLength(3);
        });

        it('should group services by category correctly', () => {
            const services = [
                { name: 'Haircut', category: 'Hair' },
                { name: 'Massage', category: 'Wellness' },
                { name: 'Styling', category: 'Hair' },
                { name: 'Facial', category: 'Beauty' },
            ];
            
            const grouped = ServiceUtils.groupServicesByCategory(services);
            
            expect(Object.keys(grouped)).toHaveLength(3);
            expect(grouped.Hair).toHaveLength(2);
            expect(grouped.Wellness).toHaveLength(1);
            expect(grouped.Beauty).toHaveLength(1);
        });
    });

    describe('Staff Validation', () => {
        it('should validate time ranges correctly', () => {
            expect(StaffValidation.validateTimeRange('09:00', '17:00').isValid).toBe(true);
            expect(StaffValidation.validateTimeRange('09:00', '09:00').isValid).toBe(false); // Same time
            expect(StaffValidation.validateTimeRange('17:00', '09:00').isValid).toBe(false); // End before start
            expect(StaffValidation.validateTimeRange('25:00', '17:00').isValid).toBe(false); // Invalid format
        });

        it('should validate breaks correctly', () => {
            const breaks = [
                { startTime: '12:00', endTime: '13:00' },
                { startTime: '15:00', endTime: '15:30' },
            ];
            
            expect(StaffValidation.validateBreaks(breaks, '09:00', '17:00').isValid).toBe(true);
            
            // Break outside work hours
            const outsideBreaks = [
                { startTime: '08:00', endTime: '09:00' }, // Before work start
            ];
            expect(StaffValidation.validateBreaks(outsideBreaks, '09:00', '17:00').isValid).toBe(false);
            
            // Overlapping breaks
            const overlappingBreaks = [
                { startTime: '12:00', endTime: '13:30' },
                { startTime: '13:00', endTime: '14:00' }, // Overlaps
            ];
            expect(StaffValidation.validateBreaks(overlappingBreaks, '09:00', '17:00').isValid).toBe(false);
        });

        it('should validate weekly schedule correctly', () => {
            const validSchedule = [
                { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isWorking: true, breaks: [] },
                { dayOfWeek: 6, startTime: '09:00', endTime: '13:00', isWorking: true, breaks: [] },
                { dayOfWeek: 0, isWorking: false }, // Sunday off
            ];
            
            expect(StaffValidation.validateWeeklySchedule(validSchedule).isValid).toBe(true);
            
            // Duplicate days
            const duplicateSchedule = [
                { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isWorking: true },
                { dayOfWeek: 1, startTime: '10:00', endTime: '18:00', isWorking: true }, // Duplicate Monday
            ];
            expect(StaffValidation.validateWeeklySchedule(duplicateSchedule).isValid).toBe(false);
            
            // Invalid day
            const invalidDaySchedule = [
                { dayOfWeek: 8, startTime: '09:00', endTime: '17:00', isWorking: true }, // Invalid day
            ];
            expect(StaffValidation.validateWeeklySchedule(invalidDaySchedule).isValid).toBe(false);
        });

        it('should validate time off correctly', () => {
            const validTimeOff = {
                date: '2024-12-25T00:00:00Z',
                endDate: '2024-12-25T23:59:59Z',
                type: 'HOLIDAY',
            };
            
            expect(StaffValidation.validateTimeOff(validTimeOff).isValid).toBe(true);
            
            // End before start
            const invalidRangeTimeOff = {
                date: '2024-12-25T00:00:00Z',
                endDate: '2024-12-24T23:59:59Z',
            };
            expect(StaffValidation.validateTimeOff(invalidRangeTimeOff).isValid).toBe(false);
            
            // Too long period
            const tooLongTimeOff = {
                date: '2024-01-01T00:00:00Z',
                endDate: '2025-01-02T00:00:00Z', // Over 1 year
            };
            expect(StaffValidation.validateTimeOff(tooLongTimeOff).isValid).toBe(false);
        });
    });

    describe('Staff Utilities', () => {
        it('should check staff availability correctly', () => {
            const staffMember = {
                isActive: true,
                weeklySchedule: [
                    {
                        dayOfWeek: 1, // Monday
                        startTime: '09:00',
                        endTime: '17:00',
                        isWorking: true,
                        breaks: [],
                    },
                ],
                timeOffs: [],
            };
            
            // Available during working hours
            const availableTime = new Date('2024-01-01T10:00:00'); // Monday 10 AM
            expect(StaffUtils.isStaffAvailable(staffMember, availableTime)).toBe(true);
            
            // Not available outside working hours
            const unavailableTime = new Date('2024-01-01T18:00:00'); // Monday 6 PM
            expect(StaffUtils.isStaffAvailable(staffMember, unavailableTime)).toBe(false);
            
            // Not available on non-working day
            const nonWorkingDay = new Date('2024-01-07T10:00:00'); // Sunday
            expect(StaffUtils.isStaffAvailable(staffMember, nonWorkingDay)).toBe(false);
        });

        it('should handle time off in availability check', () => {
            const staff = {
                isActive: true,
                weeklySchedule: [
                    {
                        dayOfWeek: 1, // Monday
                        startTime: '09:00',
                        endTime: '17:00',
                        isWorking: true,
                        breaks: [],
                    },
                ],
                timeOffs: [
                    {
                        date: '2024-01-01T00:00:00Z',
                        endDate: '2024-01-01T23:59:59Z',
                        type: 'HOLIDAY',
                    },
                ],
            };
            
            const holidayTime = new Date('2024-01-01T10:00:00'); // Monday 10 AM on holiday
            expect(StaffUtils.isStaffAvailable(staff, holidayTime)).toBe(false);
        });

        it('should calculate available time slots correctly', () => {
            const staff = {
                isActive: true,
                weeklySchedule: [
                    {
                        dayOfWeek: 1, // Monday
                        startTime: '09:00',
                        endTime: '12:00',
                        isWorking: true,
                        breaks: [
                            { startTime: '10:00', endTime: '10:30' },
                        ],
                    },
                ],
                timeOffs: [],
            };
            
            const date = new Date('2024-01-01'); // Monday
            const slots = StaffUtils.getAvailableTimeSlots(staff, date, 60); // 1 hour service
            
            // Should have slots before and after break
            expect(slots.length).toBeGreaterThan(0);
            
            // First slot should be 9:00-10:00
            expect(slots[0].start).toBe('09:00');
            expect(slots[0].end).toBe('10:00');
            
            // Should not have slot during break (10:00-10:30)
            const breakSlot = slots.find(s => s.start === '10:00' && s.end === '11:00');
            expect(breakSlot).toBeUndefined();
        });

        it('should search staff correctly', () => {
            const staff = [
                { name: 'John Doe', email: 'john@test.com', title: 'Senior Stylist' },
                { name: 'Jane Smith', email: 'jane@test.com', department: 'Hair' },
                { name: 'Bob Wilson', title: 'Massage Therapist' },
            ];
            
            // Search by name
            const nameResults = StaffUtils.searchStaff(staff, 'john');
            expect(nameResults).toHaveLength(1);
            expect(nameResults[0].name).toBe('John Doe');
            
            // Search by title
            const titleResults = StaffUtils.searchStaff(staff, 'stylist');
            expect(titleResults).toHaveLength(1);
            expect(titleResults[0].title).toBe('Senior Stylist');
            
            // Search by department
            const deptResults = StaffUtils.searchStaff(staff, 'hair');
            expect(deptResults).toHaveLength(1);
            expect(deptResults[0].department).toBe('Hair');
        });

        it('should calculate working hours correctly', () => {
            const schedule = {
                isWorking: true,
                startTime: '09:00',
                endTime: '17:00',
                breaks: [
                    { startTime: '12:00', endTime: '13:00' }, // 1 hour lunch
                    { startTime: '15:00', endTime: '15:30' }, // 30 min break
                ],
            };
            
            const hours = StaffUtils.calculateWorkingHours(schedule);
            expect(hours).toBe(6.5); // 8 hours - 1 hour lunch - 0.5 hour break
        });

        it('should calculate weekly working hours correctly', () => {
            const staffMember = {
                weeklySchedule: [
                    {
                        dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isWorking: true, breaks: [] }, // 8 hours
                        { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isWorking: true, breaks: [] }, // 8 hours
                        { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', isWorking: true, breaks: [] }, // 8 hours
                        { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', isWorking: true, breaks: [] }, // 8 hours
                        { dayOfWeek: 5, startTime: '09:00', endTime: '17:00', isWorking: true, breaks: [] }, // 8 hours
                        { dayOfWeek: 6, startTime: '09:00', endTime: '13:00', isWorking: true, breaks: [] }, // 4 hours
                        { dayOfWeek: 0, isWorking: false }, // Sunday off
                    ],
                ],
            };
            
            const weeklyHours = StaffUtils.getWeeklyWorkingHours(staffMember);
            expect(weeklyHours).toBe(44); // 5 days × 8 hours + 4 hours Saturday
        });
    });

    describe('Performance Requirements', () => {
        it('should validate service duration under 1ms', () => {
            const start = Date.now();
            
            for (let i = 0; i < 1000; i++) {
                ServiceValidation.validateDuration(30);
            }
            
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(50); // Should be very fast
        });

        it('should validate staff schedule under 1ms', () => {
            const schedule = [
                { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isWorking: true, breaks: [] },
            ];
            
            const start = Date.now();
            
            for (let i = 0; i < 1000; i++) {
                StaffValidation.validateWeeklySchedule(schedule);
            }
            
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(100); // Should be fast
        });

        it('should check staff availability under 1ms', () => {
            const staff = {
                isActive: true,
                weeklySchedule: [
                    {
                        dayOfWeek: 1,
                        startTime: '09:00',
                        endTime: '17:00',
                        isWorking: true,
                        breaks: [],
                    },
                ],
                timeOffs: [],
            };
            
            const date = new Date('2024-01-01T10:00:00Z');
            const start = Date.now();
            
            for (let i = 0; i < 1000; i++) {
                StaffUtils.isStaffAvailable(staff, date);
            }
            
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(50); // Should be very fast
        });
    });
});
