"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigRepository = void 0;
const prisma_1 = require("../../lib/prisma");
class ConfigRepository {
    async findCurrent(tenantId) {
        return prisma_1.prisma.tenantConfig.findFirst({
            where: {
                tenantId,
                isActive: true,
            },
            orderBy: {
                version: 'desc',
            },
        });
    }
    async findByVersion(tenantId, version) {
        return prisma_1.prisma.tenantConfig.findUnique({
            where: {
                tenantId_version: {
                    tenantId,
                    version,
                },
            },
        });
    }
    async listHistory(tenantId) {
        return prisma_1.prisma.tenantConfig.findMany({
            where: { tenantId },
            orderBy: { version: 'desc' },
            select: {
                id: true,
                tenantId: true,
                version: true,
                createdBy: true,
                note: true,
                isActive: true,
                createdAt: true,
                // config omitted for list view
            },
        });
    }
    async getLatestVersion(tenantId) {
        const latest = await prisma_1.prisma.tenantConfig.findFirst({
            where: { tenantId },
            orderBy: { version: 'desc' },
            select: { version: true },
        });
        return latest?.version ?? 0;
    }
    async deactivateAll(tenantId) {
        await prisma_1.prisma.tenantConfig.updateMany({
            where: {
                tenantId,
                isActive: true,
            },
            data: { isActive: false },
        });
    }
    async create(data) {
        return prisma_1.prisma.tenantConfig.create({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: data, // Cast for JSON handling
        });
    }
}
exports.ConfigRepository = ConfigRepository;
