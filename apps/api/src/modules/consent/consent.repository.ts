import { prisma } from '../../lib/prisma';
import { ConsentRecord } from '@prisma/client';

export class ConsentRepository {
    async create(data: {
        tenantId: string;
        customerEmail: string;
        ipAddress: string;
        consentText: string;
    }) {
        return prisma.consentRecord.create({
            data
        });
    }

    async findLatest(tenantId: string, customerEmail: string) {
        return prisma.consentRecord.findFirst({
            where: { tenantId, customerEmail },
            orderBy: { givenAt: 'desc' }
        });
    }
}

export const consentRepository = new ConsentRepository();
