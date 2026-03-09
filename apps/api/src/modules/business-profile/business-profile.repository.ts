import { prisma } from '../../lib/prisma';
import { CreateBusinessProfileInput, UpdateBusinessProfileInput } from './business-profile.schema';

export class BusinessProfileRepository {
    async findByTenantId(tenantId: string) {
        return prisma.businessProfile.findUnique({
            where: { tenantId },
        });
    }

    async findByTenantSlug(tenantSlug: string) {
        return prisma.businessProfile.findFirst({
            where: {
                tenant: {
                    slug: tenantSlug,
                    isActive: true,
                    deletedAt: null,
                }
            },
        });
    }

    async findByTenantIdWithTenant(tenantId: string) {
        return prisma.businessProfile.findUnique({
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

    async create(tenantId: string, data: CreateBusinessProfileInput) {
        return prisma.businessProfile.create({
            data: {
                ...data,
                tenantId,
            },
        });
    }

    async update(tenantId: string, data: UpdateBusinessProfileInput) {
        return prisma.businessProfile.update({
            where: { tenantId },
            data,
        });
    }

    async delete(tenantId: string) {
        return prisma.businessProfile.delete({
            where: { tenantId },
        });
    }

    async search(query: string, limit: number = 10) {
        return prisma.businessProfile.findMany({
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

    async listActive(limit: number = 50) {
        return prisma.businessProfile.findMany({
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

    async getPublicProfiles(limit: number = 50) {
        return prisma.businessProfile.findMany({
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
