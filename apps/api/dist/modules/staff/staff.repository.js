"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffRepository = void 0;
const prisma_1 = require("../../lib/prisma");
class StaffRepository {
    async findAll(tenantId, activeOnly = false) {
        const whereCondition = {
            tenantId,
            ...(activeOnly && { isActive: true, deletedAt: null })
        };
        return prisma_1.prisma.staff.findMany({
            where: whereCondition,
            include: {
                staffServices: {
                    include: {
                        service: {
                            select: {
                                id: true,
                                name: true,
                                isActive: true,
                            },
                        },
                    },
                },
                weeklySchedule: {
                    include: { breaks: true },
                },
                timeOffs: {
                    orderBy: { date: 'asc' },
                },
            },
            orderBy: { name: 'asc' },
        });
    }
    async findById(id, tenantId) {
        return prisma_1.prisma.staff.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: {
                staffServices: {
                    include: { service: true },
                },
                weeklySchedule: {
                    include: { breaks: true },
                },
                timeOffs: {
                    orderBy: { date: 'asc' },
                },
            },
        });
    }
    async findByEmail(tenantId, email) {
        return prisma_1.prisma.staff.findFirst({
            where: {
                tenantId,
                email: {
                    equals: email,
                    mode: 'insensitive',
                },
                deletedAt: null,
            },
        });
    }
    async findByIds(staffIds, tenantId) {
        return prisma_1.prisma.staff.findMany({
            where: {
                id: { in: staffIds },
                tenantId,
                isActive: true,
                deletedAt: null,
            },
            select: {
                id: true,
                name: true,
            },
        });
    }
    async create(data) {
        return prisma_1.prisma.staff.create({
            data,
            include: {
                staffServices: {
                    include: {
                        service: true,
                    },
                },
                weeklySchedule: {
                    include: { breaks: true },
                },
                timeOffs: true,
            },
        });
    }
    async update(id, tenantId, data) {
        return prisma_1.prisma.staff.updateMany({
            where: { id, tenantId },
            data,
        });
    }
    async softDelete(id, tenantId) {
        return prisma_1.prisma.staff.updateMany({
            where: { id, tenantId },
            data: { isActive: false, deletedAt: new Date() },
        });
    }
    async updateSchedule(staffId, schedules) {
        return prisma_1.prisma.$transaction(async (tx) => {
            // Clear existing schedule and breaks
            await tx.staffBreak.deleteMany({
                where: { weeklySchedule: { staffId } },
            });
            await tx.weeklySchedule.deleteMany({
                where: { staffId },
            });
            // Create new ones
            for (const s of schedules) {
                const schedule = await tx.weeklySchedule.create({
                    data: {
                        staffId,
                        dayOfWeek: s.dayOfWeek,
                        startTime: s.startTime,
                        endTime: s.endTime,
                        isWorking: s.isWorking,
                        maxAppointments: s.maxAppointments,
                    },
                });
                if (s.breaks && s.breaks.length > 0) {
                    await tx.staffBreak.createMany({
                        data: s.breaks.map((b) => ({
                            weeklyScheduleId: schedule.id,
                            startTime: b.startTime,
                            endTime: b.endTime,
                            title: b.title,
                        })),
                    });
                }
            }
        });
    }
    async assignServices(staffId, serviceIds) {
        return prisma_1.prisma.$transaction(async (tx) => {
            await tx.staffService.deleteMany({ where: { staffId } });
            await tx.staffService.createMany({
                data: serviceIds.map(id => ({ staffId, serviceId: id })),
                skipDuplicates: true,
            });
        });
    }
    async addTimeOff(staffId, data) {
        return prisma_1.prisma.staffTimeOff.create({
            data: {
                staffId,
                date: new Date(data.date),
                endDate: data.endDate ? new Date(data.endDate) : null,
                reason: data.reason,
                type: data.type,
                isPaid: data.isPaid,
            },
        });
    }
    async getAppointmentCount(staffId) {
        const result = await prisma_1.prisma.appointment.aggregate({
            where: {
                staffId,
                status: {
                    in: ['BOOKED', 'CONFIRMED'],
                },
            },
            _count: {
                id: true,
            },
        });
        return result._count.id || 0;
    }
    async getUpcomingTimeOff(staffId, daysAhead = 30) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + daysAhead);
        return prisma_1.prisma.staffTimeOff.findMany({
            where: {
                staffId,
                OR: [
                    {
                        date: {
                            gte: startDate,
                        },
                    },
                    {
                        endDate: {
                            gte: startDate,
                        },
                    },
                ],
            },
            orderBy: { date: 'asc' },
        });
    }
    async searchStaff(tenantId, query, activeOnly = true) {
        return prisma_1.prisma.staff.findMany({
            where: {
                tenantId,
                ...(activeOnly && { isActive: true, deletedAt: null }),
                OR: [
                    {
                        name: {
                            contains: query,
                            mode: 'insensitive',
                        },
                    },
                    {
                        email: {
                            contains: query,
                            mode: 'insensitive',
                        },
                    },
                    {
                        title: {
                            contains: query,
                            mode: 'insensitive',
                        },
                    },
                    {
                        department: {
                            contains: query,
                            mode: 'insensitive',
                        },
                    },
                ],
            },
            include: {
                staffServices: {
                    include: {
                        service: {
                            select: {
                                id: true,
                                name: true,
                                isActive: true,
                            },
                        },
                    },
                },
                weeklySchedule: {
                    include: { breaks: true },
                },
                timeOffs: {
                    orderBy: { date: 'asc' },
                },
            },
            orderBy: { name: 'asc' },
        });
    }
    async getStaffByDepartment(tenantId, department) {
        return prisma_1.prisma.staff.findMany({
            where: {
                tenantId,
                department: {
                    contains: department,
                    mode: 'insensitive',
                },
                isActive: true,
                deletedAt: null,
            },
            include: {
                staffServices: {
                    include: {
                        service: {
                            select: {
                                id: true,
                                name: true,
                                isActive: true,
                            },
                        },
                    },
                },
                weeklySchedule: {
                    include: { breaks: true },
                },
            },
            orderBy: { name: 'asc' },
        });
    }
    async getStaffStats(tenantId) {
        const [total, active, withSchedule, withAppointments] = await Promise.all([
            prisma_1.prisma.staff.count({
                where: { tenantId, deletedAt: null },
            }),
            prisma_1.prisma.staff.count({
                where: {
                    tenantId,
                    isActive: true,
                    deletedAt: null,
                },
            }),
            prisma_1.prisma.staff.count({
                where: {
                    tenantId,
                    weeklySchedule: {
                        some: {},
                    },
                    deletedAt: null,
                },
            }),
            prisma_1.prisma.staff.count({
                where: {
                    tenantId,
                    appointments: {
                        some: {
                            status: {
                                in: ['BOOKED', 'CONFIRMED'],
                            },
                        },
                    },
                    deletedAt: null,
                },
            }),
        ]);
        return {
            total,
            active,
            withSchedule,
            withAppointments,
            inactive: total - active,
        };
    }
    async getStaffWithServices(tenantId, serviceId) {
        return prisma_1.prisma.staff.findMany({
            where: {
                tenantId,
                isActive: true,
                deletedAt: null,
                staffServices: {
                    some: {
                        serviceId,
                        service: {
                            isActive: true,
                        },
                    },
                },
            },
            include: {
                staffServices: {
                    include: {
                        service: true,
                    },
                },
                weeklySchedule: {
                    include: { breaks: true },
                },
                timeOffs: {
                    orderBy: { date: 'asc' },
                },
            },
            orderBy: { name: 'asc' },
        });
    }
}
exports.StaffRepository = StaffRepository;
