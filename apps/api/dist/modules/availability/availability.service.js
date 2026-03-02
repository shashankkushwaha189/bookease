"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.availabilityService = exports.AvailabilityService = void 0;
const date_fns_1 = require("date-fns");
const date_fns_tz_1 = require("date-fns-tz");
const availability_repository_1 = require("./availability.repository");
class AvailabilityService {
    async generateSlots(input) {
        const { tenantId, serviceId, staffId, date, businessTimezone } = input;
        // 1. Get service details
        const service = await availability_repository_1.availabilityRepository.getService(serviceId, tenantId);
        if (!service)
            throw new Error('Service not found');
        // 2. Identify staff members to check
        let staffIds = [];
        if (staffId) {
            staffIds = [staffId];
        }
        else {
            staffIds = await availability_repository_1.availabilityRepository.getEligibleStaffForService(serviceId, tenantId);
        }
        const requestedDate = (0, date_fns_1.parse)(date, 'yyyy-MM-dd', new Date());
        const dayOfWeek = requestedDate.getDay();
        const allSlots = [];
        // 3. Process each staff member
        for (const id of staffIds) {
            const data = await availability_repository_1.availabilityRepository.getStaffAvailabilityData(id, tenantId, dayOfWeek, date, businessTimezone);
            if (!data.staff || data.staff.weeklySchedule.length === 0)
                continue;
            // Check for time-off - if ANY time-off matches this day, they are unavailable
            if (data.staff.timeOffs.length > 0)
                continue;
            const schedule = data.staff.weeklySchedule[0];
            const staffName = data.staff.name;
            // Convert work hours to absolute Date objects in business timezone
            const workStart = (0, date_fns_tz_1.fromZonedTime)(`${date} ${schedule.startTime}:00`, businessTimezone);
            const workEnd = (0, date_fns_tz_1.fromZonedTime)(`${date} ${schedule.endTime}:00`, businessTimezone);
            const duration = service.durationMinutes;
            const bufferBefore = service.bufferBefore;
            const bufferAfter = service.bufferAfter;
            let currentSlotStart = workStart;
            // A slot is bookable if [slotStartTime, slotEndTime] is free.
            // We advance currentSlotStart by (bufferBefore + duration + bufferAfter).
            while ((0, date_fns_1.addMinutes)(currentSlotStart, bufferBefore + duration + bufferAfter) <= workEnd) {
                const slotStartTime = (0, date_fns_1.addMinutes)(currentSlotStart, bufferBefore);
                const slotEndTime = (0, date_fns_1.addMinutes)(slotStartTime, duration);
                const potentialSlot = {
                    start: slotStartTime,
                    end: slotEndTime
                };
                // Check overlays
                const isBlocked = this.isSlotBlocked(potentialSlot, schedule.breaks, data.bookings, data.locks, date, businessTimezone);
                if (!isBlocked) {
                    allSlots.push({
                        staffId: id,
                        staffName,
                        startTimeUtc: slotStartTime.toISOString(),
                        endTimeUtc: slotEndTime.toISOString(),
                        startTimeLocal: (0, date_fns_tz_1.formatInTimeZone)(slotStartTime, businessTimezone, 'HH:mm'),
                        endTimeLocal: (0, date_fns_tz_1.formatInTimeZone)(slotEndTime, businessTimezone, 'HH:mm')
                    });
                }
                // Advance
                currentSlotStart = (0, date_fns_1.addMinutes)(currentSlotStart, bufferBefore + duration + bufferAfter);
            }
        }
        return allSlots.sort((a, b) => a.startTimeUtc.localeCompare(b.startTimeUtc));
    }
    isSlotBlocked(slot, breaks, bookings, locks, date, timezone) {
        // 1. Check breaks
        for (const b of breaks) {
            const breakStart = (0, date_fns_tz_1.fromZonedTime)(`${date} ${b.startTime}:00`, timezone);
            const breakEnd = (0, date_fns_tz_1.fromZonedTime)(`${date} ${b.endTime}:00`, timezone);
            if ((0, date_fns_1.areIntervalsOverlapping)(slot, { start: breakStart, end: breakEnd }))
                return true;
        }
        // 2. Check bookings (appointments)
        for (const booking of bookings) {
            if ((0, date_fns_1.areIntervalsOverlapping)(slot, { start: booking.startTimeUtc, end: booking.endTimeUtc }))
                return true;
        }
        // 3. Check locks
        for (const lock of locks) {
            if ((0, date_fns_1.areIntervalsOverlapping)(slot, { start: lock.startTimeUtc, end: lock.endTimeUtc }))
                return true;
        }
        return false;
    }
}
exports.AvailabilityService = AvailabilityService;
exports.availabilityService = new AvailabilityService();
