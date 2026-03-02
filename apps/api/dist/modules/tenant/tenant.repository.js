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
    async list() {
        return prisma_1.prisma.tenant.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
        });
    }
}
exports.TenantRepository = TenantRepository;
