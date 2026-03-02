import { format, addMinutes, parse, startOfDay, endOfDay, isWithinInterval, areIntervalsOverlapping, parseISO } from 'date-fns';
import { formatInTimeZone, toDate, fromZonedTime, toZonedTime } from 'date-fns-tz';
import { availabilityRepository } from './availability.repository';
import { logger } from '@bookease/logger';

export type AvailableSlot = {
    staffId: string;
    staffName: string;
    startTimeUtc: string;
    endTimeUtc: string;
    startTimeLocal: string;
    endTimeLocal: string;
};

export class AvailabilityService {
    async generateSlots(input: {
        tenantId: string;
        serviceId: string;
        staffId?: string;
        date: string; // YYYY-MM-DD
        businessTimezone: string;
    }): Promise<AvailableSlot[]> {
        const { tenantId, serviceId, staffId, date, businessTimezone } = input;

        // 1. Get service details
        const service = await availabilityRepository.getService(serviceId, tenantId);
        if (!service) throw new Error('Service not found');

        // 2. Identify staff members to check
        let staffIds: string[] = [];
        if (staffId) {
            staffIds = [staffId];
        } else {
            staffIds = await availabilityRepository.getEligibleStaffForService(serviceId, tenantId);
        }

        const requestedDate = parse(date, 'yyyy-MM-dd', new Date());
        const dayOfWeek = requestedDate.getDay();
        const allSlots: AvailableSlot[] = [];

        // 3. Process each staff member
        for (const id of staffIds) {
            const data = await availabilityRepository.getStaffAvailabilityData(id, tenantId, dayOfWeek, date, businessTimezone);
            if (!data.staff || data.staff.weeklySchedule.length === 0) continue;

            // Check for time-off - if ANY time-off matches this day, they are unavailable
            if (data.staff.timeOffs.length > 0) continue;

            const schedule = data.staff.weeklySchedule[0];
            const staffName = data.staff.name;

            // Convert work hours to absolute Date objects in business timezone
            const workStart = fromZonedTime(`${date} ${schedule.startTime}:00`, businessTimezone);
            const workEnd = fromZonedTime(`${date} ${schedule.endTime}:00`, businessTimezone);

            const duration = service.durationMinutes;
            const bufferBefore = service.bufferBefore;
            const bufferAfter = service.bufferAfter;

            let currentSlotStart = workStart;

            // A slot is bookable if [slotStartTime, slotEndTime] is free.
            // We advance currentSlotStart by (bufferBefore + duration + bufferAfter).
            while (addMinutes(currentSlotStart, bufferBefore + duration + bufferAfter) <= workEnd) {
                const slotStartTime = addMinutes(currentSlotStart, bufferBefore);
                const slotEndTime = addMinutes(slotStartTime, duration);

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
                        startTimeLocal: formatInTimeZone(slotStartTime, businessTimezone, 'HH:mm'),
                        endTimeLocal: formatInTimeZone(slotEndTime, businessTimezone, 'HH:mm')
                    });
                }

                // Advance
                currentSlotStart = addMinutes(currentSlotStart, bufferBefore + duration + bufferAfter);
            }
        }

        return allSlots.sort((a, b) => a.startTimeUtc.localeCompare(b.startTimeUtc));
    }

    private isSlotBlocked(slot: { start: Date, end: Date }, breaks: any[], bookings: any[], locks: any[], date: string, timezone: string): boolean {
        // 1. Check breaks
        for (const b of breaks) {
            const breakStart = fromZonedTime(`${date} ${b.startTime}:00`, timezone);
            const breakEnd = fromZonedTime(`${date} ${b.endTime}:00`, timezone);
            if (areIntervalsOverlapping(slot, { start: breakStart, end: breakEnd })) return true;
        }

        // 2. Check bookings (appointments)
        for (const booking of bookings) {
            if (areIntervalsOverlapping(slot, { start: booking.startTimeUtc, end: booking.endTimeUtc })) return true;
        }

        // 3. Check locks
        for (const lock of locks) {
            if (areIntervalsOverlapping(slot, { start: lock.startTimeUtc, end: lock.endTimeUtc })) return true;
        }

        return false;
    }
}

export const availabilityService = new AvailabilityService();
