"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportService = exports.ReportService = void 0;
const prisma_1 = require("../../lib/prisma");
const errors_1 = require("../../lib/errors");
class ReportService {
    async getSummary(tenantId, fromDate, toDate) {
        // Exclude archived by default (archive module handles older data)
        const appointments = await prisma_1.prisma.appointment.findMany({
            where: {
                tenantId,
                startTimeUtc: {
                    gte: fromDate,
                    lte: toDate,
                },
            },
            include: {
                service: true,
                staff: true,
            },
        });
        const totalAppointments = appointments.length;
        let completedCount = 0;
        let cancelledCount = 0;
        let noShowCount = 0;
        const bookingsByServiceMap = new Map();
        const bookingsByStaffMap = new Map();
        for (const appt of appointments) {
            if (appt.status === 'COMPLETED')
                completedCount++;
            if (appt.status === 'CANCELLED')
                cancelledCount++;
            if (appt.status === 'NO_SHOW')
                noShowCount++;
            // Service grouping
            const serviceName = appt.service?.name || 'Unknown';
            bookingsByServiceMap.set(serviceName, (bookingsByServiceMap.get(serviceName) || 0) + 1);
            // Staff grouping
            const staffName = appt.staff?.name || 'Unknown';
            bookingsByStaffMap.set(staffName, (bookingsByStaffMap.get(staffName) || 0) + 1);
        }
        const noShowRate = totalAppointments > 0 ? (noShowCount / totalAppointments) * 100 : 0;
        return {
            totalAppointments,
            completedCount,
            cancelledCount,
            noShowCount,
            noShowRate,
            bookingsByService: Array.from(bookingsByServiceMap.entries()).map(([name, count]) => ({ name, count })),
            bookingsByStaff: Array.from(bookingsByStaffMap.entries()).map(([name, count]) => ({ name, count })),
        };
    }
    async getPeakTimes(tenantId, fromDate, toDate) {
        // Usually calculate peak times from COMPLETE or BOOKED, let's use all to show overall traffic
        const appointments = await prisma_1.prisma.appointment.findMany({
            where: {
                tenantId,
                status: { not: 'CANCELLED' },
                startTimeUtc: {
                    gte: fromDate,
                    lte: toDate,
                },
            },
            select: { startTimeUtc: true },
        });
        const heatmapMap = new Map();
        for (const appt of appointments) {
            const dayOfWeek = appt.startTimeUtc.getUTCDay();
            const hour = appt.startTimeUtc.getUTCHours();
            const key = `${dayOfWeek}-${hour}`;
            heatmapMap.set(key, (heatmapMap.get(key) || 0) + 1);
        }
        const heatmap = [];
        for (let day = 0; day <= 6; day++) {
            for (let hour = 0; hour <= 23; hour++) {
                const count = heatmapMap.get(`${day}-${hour}`) || 0;
                heatmap.push({ dayOfWeek: day, hour, count });
            }
        }
        return heatmap;
    }
    async getStaffUtilization(tenantId, fromDate, toDate) {
        // Fetch all staff and their appointments in the period
        const staffList = await prisma_1.prisma.staff.findMany({
            where: { tenantId },
            include: {
                weeklySchedule: true,
                appointments: {
                    where: {
                        startTimeUtc: { gte: fromDate, lte: toDate },
                        status: { not: 'CANCELLED' },
                    },
                },
            },
        });
        const daysDiff = (toDate.getTime() - fromDate.getTime()) / (1000 * 3600 * 24);
        const weeksDiff = Math.max(1, Math.ceil(daysDiff / 7));
        const result = staffList.map(staff => {
            const bookedSlots = staff.appointments.length;
            // Approximate total slots:
            // Calculate total working hours in a standard week
            let weeklyWorkingHours = 0;
            for (const sched of staff.weeklySchedule) {
                if (sched.isWorking) {
                    const startHour = parseInt(sched.startTime.split(':')[0], 10);
                    const endHour = parseInt(sched.endTime.split(':')[0], 10);
                    weeklyWorkingHours += (endHour - startHour);
                }
            }
            // Estimate total slots assuming 1 hour per slot over the selected period
            let totalSlots = weeklyWorkingHours * weeksDiff;
            if (totalSlots === 0 && bookedSlots > 0)
                totalSlots = bookedSlots; // fallback
            if (totalSlots < bookedSlots)
                totalSlots = bookedSlots; // sanity check
            const utilizationPct = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;
            return {
                staffId: staff.id,
                name: staff.name,
                totalSlots,
                bookedSlots,
                utilizationPct,
            };
        });
        return result;
    }
    async getExportData(tenantId, type, fromDate, toDate) {
        if (type === 'appointments') {
            const appointments = await prisma_1.prisma.appointment.findMany({
                where: {
                    tenantId,
                    startTimeUtc: { gte: fromDate, lte: toDate },
                },
                include: { customer: true, service: true, staff: true },
                orderBy: { startTimeUtc: 'desc' },
            });
            const header = ['referenceId', 'customerName', 'email', 'service', 'staff', 'date', 'startTime', 'status', 'createdAt'];
            const rows = appointments.map(a => [
                a.referenceId,
                a.customer?.name || '',
                a.customer?.email || '',
                a.service?.name || '',
                a.staff?.name || '',
                a.startTimeUtc.toISOString().split('T')[0],
                a.startTimeUtc.toISOString().split('T')[1].substring(0, 5),
                a.status,
                a.createdAt.toISOString()
            ]);
            return this.buildCsv(header, rows);
        }
        else if (type === 'customers') {
            const customers = await prisma_1.prisma.customer.findMany({
                where: { tenantId },
                include: {
                    appointments: {
                        orderBy: { startTimeUtc: 'desc' },
                        take: 1
                    },
                    _count: {
                        select: { appointments: true }
                    }
                }
            });
            const header = ['name', 'email', 'phone', 'tags', 'totalAppointments', 'lastVisit'];
            const rows = customers.map(c => [
                c.name,
                c.email,
                c.phone || '',
                c.tags.join('; '),
                c._count.appointments.toString(),
                c.appointments.length > 0 ? c.appointments[0].startTimeUtc.toISOString() : ''
            ]);
            return this.buildCsv(header, rows);
        }
        else {
            throw new errors_1.AppError('Invalid export type', 400, 'INVALID_EXPORT_TYPE');
        }
    }
    buildCsv(headers, rows) {
        const escapeCsv = (val) => {
            if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        };
        const headerRow = headers.map(escapeCsv).join(',');
        const dataRows = rows.map(row => row.map(escapeCsv).join(','));
        return [headerRow, ...dataRows].join('\n');
    }
}
exports.ReportService = ReportService;
exports.reportService = new ReportService();
