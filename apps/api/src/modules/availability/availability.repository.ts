import { prisma } from '../../lib/prisma';
import { AppointmentStatus } from '../../generated/client';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { startOfDay, endOfDay } from 'date-fns';

export class AvailabilityRepository {
    async getService(serviceId: string, tenantId: string) {
        return prisma.service.findFirst({
            where: { id: serviceId, tenantId, isActive: true },
        });
    }

    async getStaffAvailabilityData(staffId: string, tenantId: string, dayOfWeek: number, dateStr: string, timezone: string) {
        // Correctly calculate UTC bounds for the requested date in the business's timezone
        const startOfUtcDay = fromZonedTime(`${dateStr} 00:00:00`, timezone);
        const endOfUtcDay = fromZonedTime(`${dateStr} 23:59:59.999`, timezone);

        const [staff, appointments, locks] = await Promise.all([
            prisma.staff.findFirst({
                where: { id: staffId, tenantId, isActive: true },
                include: {
                    weeklySchedule: {
                        where: { dayOfWeek, isWorking: true },
                        include: { breaks: true },
                    },
                    timeOffs: {
                        where: {
                            date: { lte: endOfUtcDay },
                            OR: [
                                { endDate: null },
                                { endDate: { gte: startOfUtcDay } }
                            ]
                        }
                    }
                }
            }),
            prisma.appointment.findMany({
                where: {
                    staffId,
                    tenantId,
                    status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.BOOKED] },
                    startTimeUtc: { lte: endOfUtcDay },
                    endTimeUtc: { gte: startOfUtcDay }
                }
            }),
            prisma.slotLock.findMany({
                where: {
                    staffId,
                    tenantId,
                    expiresAt: { gt: new Date() },
                    startTimeUtc: { lte: endOfUtcDay },
                    endTimeUtc: { gte: startOfUtcDay }
                }
            })
        ]);

        return { staff, bookings: appointments, locks };
    }

    async getEligibleStaffForService(serviceId: string, tenantId: string) {
        const staffServices = await prisma.staffService.findMany({
            where: { serviceId, staff: { tenantId, isActive: true } },
            select: { staffId: true }
        });
        return staffServices.map(ss => ss.staffId);
    }
}

export const availabilityRepository = new AvailabilityRepository();
