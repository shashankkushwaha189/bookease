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
    async findByTenantSlug(tenantSlug) {
        return prisma_1.prisma.businessProfile.findFirst({
            where: {
                tenant: {
                    slug: tenantSlug,
                    isActive: true,
                    deletedAt: null,
                }
            },
        });
    }
    async findByTenantIdWithTenant(tenantId) {
        return prisma_1.prisma.businessProfile.findUnique({
            where: { tenantId },
            include: {
                tenant: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        domain: true,
                        timezone: true,
                        isActive: true,
                    }
                }
            }
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
    async search(query, limit = 10) {
        return prisma_1.prisma.businessProfile.findMany({
            where: {
                tenant: {
                    isActive: true,
                    deletedAt: null,
                },
                OR: [
                    { businessName: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                    { tenant: { name: { contains: query, mode: 'insensitive' } } },
                ],
            },
            include: {
                tenant: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        domain: true,
                    }
                }
            },
            take: limit,
            orderBy: { businessName: 'asc' },
        });
    }
    async listActive(limit = 50) {
        return prisma_1.prisma.businessProfile.findMany({
            where: {
                tenant: {
                    isActive: true,
                    deletedAt: null,
                }
            },
            include: {
                tenant: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        domain: true,
                    }
                }
            },
            take: limit,
            orderBy: { businessName: 'asc' },
        });
    }
    async getPublicProfiles(limit = 50) {
        return prisma_1.prisma.businessProfile.findMany({
            where: {
                tenant: {
                    isActive: true,
                    deletedAt: null,
                }
            },
            select: {
                businessName: true,
                logoUrl: true,
                description: true,
                phone: true,
                email: true,
                address: true,
                brandColor: true,
                accentColor: true,
                policyText: true,
                seoTitle: true,
                seoDescription: true,
                tenant: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        domain: true,
                        timezone: true,
                    }
                }
            },
            take: limit,
            orderBy: { businessName: 'asc' },
        });
    }
}
exports.BusinessProfileRepository = BusinessProfileRepository;
