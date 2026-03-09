"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceRepository = void 0;
const prisma_1 = require("../../lib/prisma");
class ServiceRepository {
    async findAll(tenantId, activeOnly = false) {
        return prisma_1.prisma.service.findMany({
            where: {
                tenantId,
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
    async findById(id, tenantId) {
        return prisma_1.prisma.service.findFirst({
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
    async findByName(tenantId, name) {
        return prisma_1.prisma.service.findFirst({
            where: {
                tenantId,
                name: {
                    equals: name,
                    mode: 'insensitive',
                },
            },
        });
    }
    async create(data) {
        return prisma_1.prisma.service.create({
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
    async update(id, tenantId, data) {
        return prisma_1.prisma.service.updateMany({
            where: { id, tenantId },
            data,
        });
    }
    async delete(id, tenantId) {
        return prisma_1.prisma.service.updateMany({
            where: { id, tenantId },
            data: { isActive: false },
        });
    }
    async getAppointmentCount(serviceId) {
        const result = await prisma_1.prisma.appointment.aggregate({
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
    async validateStaffIds(staffIds, tenantId) {
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
    async assignServiceToStaff(serviceId, staffIds) {
        return prisma_1.prisma.$transaction(async (tx) => {
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
    async getServiceStaff(serviceId, tenantId) {
        return prisma_1.prisma.staffService.findMany({
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
    async searchServices(tenantId, query, activeOnly = true) {
        return prisma_1.prisma.service.findMany({
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
    async getServicesByCategory(tenantId, activeOnly = true) {
        return prisma_1.prisma.service.groupBy({
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
    async getActiveServicesCount(tenantId) {
        const result = await prisma_1.prisma.service.aggregate({
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
    async getServiceStats(tenantId) {
        const [total, active, withAppointments] = await Promise.all([
            prisma_1.prisma.service.count({
                where: { tenantId },
            }),
            prisma_1.prisma.service.count({
                where: {
                    tenantId,
                    isActive: true,
                },
            }),
            prisma_1.prisma.service.count({
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
exports.ServiceRepository = ServiceRepository;
