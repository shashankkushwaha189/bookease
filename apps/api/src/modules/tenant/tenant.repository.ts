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

    async list() {
        return prisma.tenant.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
        });
    }
}
