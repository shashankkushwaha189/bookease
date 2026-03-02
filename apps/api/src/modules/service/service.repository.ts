import { prisma } from '../../lib/prisma';
import { Prisma } from '../../generated/client';

export class ServiceRepository {
    async findAll(tenantId: string, activeOnly: boolean = false) {
        return prisma.service.findMany({
            where: {
                tenantId,
                ...(activeOnly ? { isActive: true } : {}),
            },
            include: {
                appointments: true
            },
            orderBy: { name: 'asc' },
        });
    }

    async findById(id: string, tenantId: string) {
        return prisma.service.findFirst({
            where: { id, tenantId },
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
        return prisma.service.create({ data });
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
}
