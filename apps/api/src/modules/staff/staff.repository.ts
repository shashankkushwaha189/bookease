import { prisma } from '../../lib/prisma';
import { Prisma } from '@prisma/client';

export class StaffRepository {
    async findAll(tenantId: string, activeOnly: boolean = false) {
        const whereCondition: any = {
            tenantId,
            ...(activeOnly && { isActive: true, deletedAt: null })
        };
        
        return prisma.staff.findMany({
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

    async findById(id: string, tenantId: string) {
        return prisma.staff.findFirst({
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

    async findByEmail(tenantId: string, email: string) {
        return prisma.staff.findFirst({
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

    async findByIds(staffIds: string[], tenantId: string) {
        return prisma.staff.findMany({
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

    async create(data: any) {
        return prisma.staff.create({ 
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

    async update(id: string, tenantId: string, data: any) {
        return prisma.staff.updateMany({
            where: { id, tenantId },
            data,
        });
    }

    async softDelete(id: string, tenantId: string) {
        return prisma.staff.updateMany({
            where: { id, tenantId },
            data: { isActive: false, deletedAt: new Date() },
        });
    }

    async updateSchedule(staffId: string, schedules: any[]) {
        return prisma.$transaction(async (tx) => {
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
                        data: s.breaks.map((b: any) => ({
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

    async assignServices(staffId: string, serviceIds: string[]) {
        return prisma.$transaction(async (tx) => {
            await tx.staffService.deleteMany({ where: { staffId } });
            await tx.staffService.createMany({
                data: serviceIds.map(id => ({ staffId, serviceId: id })),
                skipDuplicates: true,
            });
        });
    }

    async addTimeOff(staffId: string, data: any) {
        return prisma.staffTimeOff.create({
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

    async getAppointmentCount(staffId: string): Promise<number> {
        const result = await prisma.appointment.aggregate({
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

    async getUpcomingTimeOff(staffId: string, daysAhead: number = 30) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + daysAhead);

        return prisma.staffTimeOff.findMany({
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

    async searchStaff(tenantId: string, query: string, activeOnly: boolean = true) {
        return prisma.staff.findMany({
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

    async getStaffByDepartment(tenantId: string, department: string) {
        return prisma.staff.findMany({
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

    async getStaffStats(tenantId: string) {
        const [total, active, withSchedule, withAppointments] = await Promise.all([
            prisma.staff.count({
                where: { tenantId, deletedAt: null },
            }),
            prisma.staff.count({
                where: {
                    tenantId,
                    isActive: true,
                    deletedAt: null,
                },
            }),
            prisma.staff.count({
                where: {
                    tenantId,
                    weeklySchedule: {
                        some: {},
                    },
                    deletedAt: null,
                },
            }),
            prisma.staff.count({
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

    async getStaffWithServices(tenantId: string, serviceId: string) {
        return prisma.staff.findMany({
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
