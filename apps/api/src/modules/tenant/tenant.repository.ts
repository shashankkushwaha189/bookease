import { prisma } from '../../lib/prisma';
import { CreateTenantInput, UpdateTenantInput } from './tenant.schema';

export class TenantRepository {
    async findById(id: string) {
        return prisma.tenant.findFirst({
            where: { id, deletedAt: null },
        });
    }

    async findBySlug(slug: string) {
        return prisma.tenant.findFirst({
            where: { slug, deletedAt: null },
        });
    }

    async findByDomain(domain: string) {
        return prisma.tenant.findFirst({
            where: { domain, deletedAt: null },
        });
    }

    async create(data: CreateTenantInput) {
        return prisma.tenant.create({
            data,
        });
    }

    async update(id: string, data: UpdateTenantInput) {
        return prisma.tenant.update({
            where: { id },
            data,
        });
    }

    async softDelete(id: string) {
        return prisma.tenant.update({
            where: { id },
            data: { deletedAt: new Date(), isActive: false },
        });
    }

    async restore(id: string) {
        return prisma.tenant.update({
            where: { id },
            data: { deletedAt: null, isActive: true },
        });
    }

    async list() {
        return prisma.tenant.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
        });
    }

    async listActive() {
        return prisma.tenant.findMany({
            where: { deletedAt: null, isActive: true },
            orderBy: { name: 'asc' },
        });
    }

    async search(query: string, limit: number = 10) {
        return prisma.tenant.findMany({
            where: {
                deletedAt: null,
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { slug: { contains: query, mode: 'insensitive' } },
                    { domain: { contains: query, mode: 'insensitive' } },
                ],
            },
            take: limit,
            orderBy: { name: 'asc' },
        });
    }
}
