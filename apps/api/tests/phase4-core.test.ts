import { describe, it, expect } from 'vitest';
import { ServiceValidation, ServiceUtils } from '../src/modules/service/service.schema';
import { StaffValidation, StaffUtils } from '../src/modules/staff/staff.schema';

describe('Phase 4 - Core Validation Tests', () => {
    describe('Service Validation', () => {
        it('should validate service duration correctly', () => {
            expect(ServiceValidation.validateDuration(30)).toBe(true);
            expect(ServiceValidation.validateDuration(5)).toBe(true);
            expect(ServiceValidation.validateDuration(480)).toBe(true);
            expect(ServiceValidation.validateDuration(4)).toBe(false);
            expect(ServiceValidation.validateDuration(481)).toBe(false);
            expect(ServiceValidation.validateDuration(-10)).toBe(false);
        });

        it('should validate buffer times correctly', () => {
            expect(ServiceValidation.validateBuffer(0)).toBe(true);
            expect(ServiceValidation.validateBuffer(60)).toBe(true);
            expect(ServiceValidation.validateBuffer(120)).toBe(true);
            expect(ServiceValidation.validateBuffer(-1)).toBe(false);
            expect(ServiceValidation.validateBuffer(121)).toBe(false);
        });

        it('should validate total duration correctly', () => {
            expect(ServiceValidation.validateTotalDuration(30, 15, 15)).toBe(true);
            expect(ServiceValidation.validateTotalDuration(480, 60, 60)).toBe(true);
            expect(ServiceValidation.validateTotalDuration(480, 120, 120)).toBe(false);
        });

        it('should validate advance booking settings correctly', () => {
            expect(ServiceValidation.validateAdvanceBooking(1, 1)).toBe(true);
            expect(ServiceValidation.validateAdvanceBooking(0, 365)).toBe(true);
            expect(ServiceValidation.validateAdvanceBooking(-1, 365)).toBe(false);
            expect(ServiceValidation.validateAdvanceBooking(0, 366)).toBe(false);
            expect(ServiceValidation.validateAdvanceBooking(169, 1)).toBe(false);
        });
    });

    describe('Service Utilities', () => {
        it('should calculate total duration correctly', () => {
            const service = {
                durationMinutes: 30,
                bufferBefore: 10,
                bufferAfter: 15,
            };
            expect(ServiceUtils.calculateTotalDuration(service)).toBe(55);
        });

        it('should calculate end time correctly', () => {
            const service = {
                durationMinutes: 60,
                bufferBefore: 15,
                bufferAfter: 15,
            };
            const startTime = new Date('2024-01-01T10:00:00Z');
            const endTime = ServiceUtils.calculateEndTime(startTime, service);
            
            // Calculate expected end time manually to avoid timezone issues
            const expectedEnd = new Date(startTime.getTime() + (60 + 15 + 15) * 60 * 1000);
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
    });

    describe('Staff Validation', () => {
        it('should validate time ranges correctly', () => {
            expect(StaffValidation.validateTimeRange('09:00', '17:00').isValid).toBe(true);
            expect(StaffValidation.validateTimeRange('09:00', '09:00').isValid).toBe(false);
            expect(StaffValidation.validateTimeRange('17:00', '09:00').isValid).toBe(false);
            expect(StaffValidation.validateTimeRange('25:00', '17:00').isValid).toBe(false);
        });

        it('should validate breaks correctly', () => {
            const breaks = [
                { startTime: '12:00', endTime: '13:00' },
                { startTime: '15:00', endTime: '15:30' },
            ];
            expect(StaffValidation.validateBreaks(breaks, '09:00', '17:00').isValid).toBe(true);
            
            const outsideBreaks = [
                { startTime: '08:00', endTime: '09:00' },
            ];
            expect(StaffValidation.validateBreaks(outsideBreaks, '09:00', '17:00').isValid).toBe(false);
            
            const overlappingBreaks = [
                { startTime: '12:00', endTime: '13:30' },
                { startTime: '13:00', endTime: '14:00' },
            ];
            expect(StaffValidation.validateBreaks(overlappingBreaks, '09:00', '17:00').isValid).toBe(false);
        });

        it('should validate weekly schedule correctly', () => {
            const validSchedule = [
                { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isWorking: true, breaks: [] },
                { dayOfWeek: 6, startTime: '09:00', endTime: '13:00', isWorking: true, breaks: [] },
                { dayOfWeek: 0, isWorking: false },
            ];
            expect(StaffValidation.validateWeeklySchedule(validSchedule).isValid).toBe(true);
            
            const duplicateSchedule = [
                { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isWorking: true },
                { dayOfWeek: 1, startTime: '10:00', endTime: '18:00', isWorking: true },
            ];
            expect(StaffValidation.validateWeeklySchedule(duplicateSchedule).isValid).toBe(false);
            
            const invalidDaySchedule = [
                { dayOfWeek: 8, startTime: '09:00', endTime: '17:00', isWorking: true },
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
            
            const invalidRangeTimeOff = {
                date: '2024-12-25T00:00:00Z',
                endDate: '2024-12-24T23:59:59Z',
            };
            expect(StaffValidation.validateTimeOff(invalidRangeTimeOff).isValid).toBe(false);
            
            const tooLongTimeOff = {
                date: '2024-01-01T00:00:00Z',
                endDate: '2025-01-02T00:00:00Z',
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
                        dayOfWeek: 1,
                        startTime: '09:00',
                        endTime: '17:00',
                        isWorking: true,
                        breaks: [],
                    },
                ],
                timeOffs: [],
            };
            
            const availableTime = new Date('2024-01-01T10:00:00');
            expect(StaffUtils.isStaffAvailable(staffMember, availableTime)).toBe(true);
            
            const unavailableTime = new Date('2024-01-01T18:00:00');
            expect(StaffUtils.isStaffAvailable(staffMember, unavailableTime)).toBe(false);
            
            const nonWorkingDay = new Date('2024-01-07T10:00:00');
            expect(StaffUtils.isStaffAvailable(staffMember, nonWorkingDay)).toBe(false);
        });

        it('should calculate working hours correctly', () => {
            const schedule = {
                isWorking: true,
                startTime: '09:00',
                endTime: '17:00',
                breaks: [
                    { startTime: '12:00', endTime: '13:00' },
                    { startTime: '15:00', endTime: '15:30' },
                ],
            };
            const hours = StaffUtils.calculateWorkingHours(schedule);
            expect(hours).toBe(6.5);
        });

        it('should calculate weekly working hours correctly', () => {
            const staffMember = {
                weeklySchedule: [
                    { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isWorking: true, breaks: [] },
                    { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isWorking: true, breaks: [] },
                    { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', isWorking: true, breaks: [] },
                    { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', isWorking: true, breaks: [] },
                    { dayOfWeek: 5, startTime: '09:00', endTime: '17:00', isWorking: true, breaks: [] },
                    { dayOfWeek: 6, startTime: '09:00', endTime: '13:00', isWorking: true, breaks: [] },
                    { dayOfWeek: 0, isWorking: false },
                ],
            };
            
            const weeklyHours = StaffUtils.getWeeklyWorkingHours(staffMember);
            expect(weeklyHours).toBe(44);
        });
    });

    describe('Performance Requirements', () => {
        it('should validate service duration under 1ms', () => {
            const start = Date.now();
            for (let i = 0; i < 1000; i++) {
                ServiceValidation.validateDuration(30);
            }
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(50);
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
            expect(duration).toBeLessThan(100);
        });

        it('should check staff availability under 1ms', () => {
            const staffMember = {
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
                StaffUtils.isStaffAvailable(staffMember, date);
            }
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(50);
        });
    });
});
