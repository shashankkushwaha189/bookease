import { prisma } from '../../lib/prisma';
import { Prisma } from '@prisma/client';

export class ServiceRepository {
    async findAll(tenantId: string | undefined, activeOnly: boolean = false) {
        return prisma.service.findMany({
            where: {
                ...(tenantId ? { tenantId } : {}),
                ...(activeOnly ? { isActive: true } : {}),
            },
            include: {
                appointments: {
                    select: {
                        id: true,
                        status: true,
                    },
                },
                staffServices: {
                    include: {
                        staff: {
                            select: {
                                id: true,
                                name: true,
                                isActive: true,
                            },
                        },
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
    }

    async findById(id: string, tenantId: string) {
        return prisma.service.findFirst({
            where: { id, tenantId },
            include: {
                appointments: {
                    select: {
                        id: true,
                        status: true,
                    },
                },
                staffServices: {
                    include: {
                        staff: {
                            select: {
                                id: true,
                                name: true,
                                isActive: true,
                            },
                        },
                    },
                },
            },
        });
    }

    async findByName(tenantId: string, name: string) {
        return prisma.service.findFirst({
            where: {
                tenantId,
                name: {
                    equals: name,
                    mode: 'insensitive',
                },
            },
        });
    }

    async create(data: any) {
        return prisma.service.create({ 
            data,
            include: {
                staffServices: {
                    include: {
                        staff: true,
                    },
                },
            },
        });
    }

    async update(id: string, tenantId: string, data: any) {
        return prisma.service.updateMany({
            where: { id, tenantId },
            data,
        });
    }

    async delete(id: string, tenantId: string) {
        return prisma.service.updateMany({
            where: { id, tenantId },
            data: { isActive: false },
        });
    }

    async getAppointmentCount(serviceId: string): Promise<number> {
        const result = await prisma.appointment.aggregate({
            where: {
                serviceId,
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

    async validateStaffIds(staffIds: string[], tenantId: string) {
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

    async assignServiceToStaff(serviceId: string, staffIds: string[]) {
        return prisma.$transaction(async (tx) => {
            // Remove existing assignments
            await tx.staffService.deleteMany({
                where: { serviceId },
            });

            // Create new assignments
            if (staffIds.length > 0) {
                await tx.staffService.createMany({
                    data: staffIds.map(staffId => ({
                        serviceId,
                        staffId,
                    })),
                    skipDuplicates: true,
                });
            }
        });
    }

    async getServiceStaff(serviceId: string, tenantId: string) {
        return prisma.staffService.findMany({
            where: {
                serviceId,
                staff: {
                    tenantId,
                    isActive: true,
                    deletedAt: null,
                },
            },
            include: {
                staff: {
                    include: {
                        weeklySchedule: {
                            include: {
                                breaks: true,
                            },
                        },
                        timeOffs: true,
                    },
                },
                service: true,
            },
        });
    }

    async searchServices(tenantId: string, query: string, activeOnly: boolean = true) {
        return prisma.service.findMany({
            where: {
                tenantId,
                ...(activeOnly ? { isActive: true } : {}),
                OR: [
                    {
                        name: {
                            contains: query,
                            mode: 'insensitive',
                        },
                    },
                    {
                        description: {
                            contains: query,
                            mode: 'insensitive',
                        },
                    },
                    {
                        category: {
                            contains: query,
                            mode: 'insensitive',
                        },
                    },
                ],
            },
            include: {
                staffServices: {
                    include: {
                        staff: {
                            select: {
                                id: true,
                                name: true,
                                isActive: true,
                            },
                        },
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
    }

    async getServicesByCategory(tenantId: string, activeOnly: boolean = true) {
        return prisma.service.groupBy({
            by: ['category'],
            where: {
                tenantId,
                ...(activeOnly ? { isActive: true } : {}),
            },
            _count: {
                category: true,
            },
        });
    }

    async getActiveServicesCount(tenantId: string): Promise<number> {
        const result = await prisma.service.aggregate({
            where: {
                tenantId,
                isActive: true,
            },
            _count: {
                id: true,
            },
        });
        return result._count.id || 0;
    }

    async getServiceStats(tenantId: string) {
        const [total, active, withAppointments] = await Promise.all([
            prisma.service.count({
                where: { tenantId },
            }),
            prisma.service.count({
                where: {
                    tenantId,
                    isActive: true,
                },
            }),
            prisma.service.count({
                where: {
                    tenantId,
                    appointments: {
                        some: {
                            status: {
                                in: ['BOOKED', 'CONFIRMED'],
                            },
                        },
                    },
                },
            }),
        ]);

        return {
            total,
            active,
            withAppointments,
            inactive: total - active,
        };
    }
}
