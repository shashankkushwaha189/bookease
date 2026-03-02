"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.availabilityRepository = exports.AvailabilityRepository = void 0;
const prisma_1 = require("../../lib/prisma");
const client_1 = require("../../generated/client");
const date_fns_tz_1 = require("date-fns-tz");
class AvailabilityRepository {
    async getService(serviceId, tenantId) {
        return prisma_1.prisma.service.findFirst({
            where: { id: serviceId, tenantId, isActive: true },
        });
    }
    async getStaffAvailabilityData(staffId, tenantId, dayOfWeek, dateStr, timezone) {
        // Correctly calculate UTC bounds for the requested date in the business's timezone
        const startOfUtcDay = (0, date_fns_tz_1.fromZonedTime)(`${dateStr} 00:00:00`, timezone);
        const endOfUtcDay = (0, date_fns_tz_1.fromZonedTime)(`${dateStr} 23:59:59.999`, timezone);
        const [staff, appointments, locks] = await Promise.all([
            prisma_1.prisma.staff.findFirst({
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
            prisma_1.prisma.appointment.findMany({
                where: {
                    staffId,
                    tenantId,
                    status: { in: [client_1.AppointmentStatus.CONFIRMED, client_1.AppointmentStatus.BOOKED] },
                    startTimeUtc: { lte: endOfUtcDay },
                    endTimeUtc: { gte: startOfUtcDay }
                }
            }),
            prisma_1.prisma.slotLock.findMany({
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
    async getEligibleStaffForService(serviceId, tenantId) {
        const staffServices = await prisma_1.prisma.staffService.findMany({
            where: { serviceId, staff: { tenantId, isActive: true } },
            select: { staffId: true }
        });
        return staffServices.map(ss => ss.staffId);
    }
}
exports.AvailabilityRepository = AvailabilityRepository;
exports.availabilityRepository = new AvailabilityRepository();
