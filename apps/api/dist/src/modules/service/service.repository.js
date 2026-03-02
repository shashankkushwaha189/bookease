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
                appointments: true
            },
            orderBy: { name: 'asc' },
        });
    }
    async findById(id, tenantId) {
        return prisma_1.prisma.service.findFirst({
            where: { id, tenantId },
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
        return prisma_1.prisma.service.create({ data });
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
}
exports.ServiceRepository = ServiceRepository;
