import { prisma } from '../../lib/prisma';
import { CreateBusinessProfileInput, UpdateBusinessProfileInput } from './business-profile.schema';

export class BusinessProfileRepository {
    async findByTenantId(tenantId: string) {
        return prisma.businessProfile.findUnique({
            where: { tenantId },
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
}
