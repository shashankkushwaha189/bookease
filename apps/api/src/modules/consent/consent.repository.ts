import { prisma } from '../../lib/prisma';
import { ConsentRecord } from '@prisma/client';

export class ConsentRepository {
    async create(data: {
        tenantId: string;
        customerEmail: string;
        ipAddress: string;
        consentText: string;
    }): Promise<ConsentRecord> {
        return (await prisma.consentRecord.create({
            data,
        })) as ConsentRecord;
    }

    async findByCustomer(tenantId: string, customerEmail: string): Promise<ConsentRecord[]> {
        return (await prisma.consentRecord.findMany({
            where: {
                tenantId,
                customerEmail,
            },
            orderBy: {
                givenAt: 'desc',
            },
        })) as ConsentRecord[];
    }
}
