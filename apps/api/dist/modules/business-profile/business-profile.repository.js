"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessProfileRepository = void 0;
const prisma_1 = require("../../lib/prisma");
class BusinessProfileRepository {
    async findByTenantId(tenantId) {
        return prisma_1.prisma.businessProfile.findUnique({
            where: { tenantId },
        });
    }
    async create(tenantId, data) {
        return prisma_1.prisma.businessProfile.create({
            data: {
                ...data,
                tenantId,
            },
        });
    }
    async update(tenantId, data) {
        return prisma_1.prisma.businessProfile.update({
            where: { tenantId },
            data,
        });
    }
    async delete(tenantId) {
        return prisma_1.prisma.businessProfile.delete({
            where: { tenantId },
        });
    }
}
exports.BusinessProfileRepository = BusinessProfileRepository;
