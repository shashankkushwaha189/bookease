"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantRepository = void 0;
const prisma_1 = require("../../lib/prisma");
class TenantRepository {
    async findById(id) {
        return prisma_1.prisma.tenant.findFirst({
            where: { id, deletedAt: null },
        });
    }
    async findBySlug(slug) {
        return prisma_1.prisma.tenant.findFirst({
            where: { slug, deletedAt: null },
        });
    }
    async findByDomain(domain) {
        return prisma_1.prisma.tenant.findFirst({
            where: { domain, deletedAt: null },
        });
    }
    async create(data) {
        return prisma_1.prisma.tenant.create({
            data,
        });
    }
    async update(id, data) {
        return prisma_1.prisma.tenant.update({
            where: { id },
            data,
        });
    }
    async softDelete(id) {
        return prisma_1.prisma.tenant.update({
            where: { id },
            data: { deletedAt: new Date(), isActive: false },
        });
    }
    async restore(id) {
        return prisma_1.prisma.tenant.update({
            where: { id },
            data: { deletedAt: null, isActive: true },
        });
    }
    async list() {
        return prisma_1.prisma.tenant.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
        });
    }
    async listActive() {
        return prisma_1.prisma.tenant.findMany({
            where: { deletedAt: null, isActive: true },
            orderBy: { name: 'asc' },
        });
    }
    async search(query, limit = 10) {
        return prisma_1.prisma.tenant.findMany({
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
exports.TenantRepository = TenantRepository;
