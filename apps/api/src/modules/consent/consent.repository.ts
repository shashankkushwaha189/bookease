import { prisma } from '../../lib/prisma';
import { ConsentRecord } from '@prisma/client';

export class ConsentRepository {
    async create(data: {
        customerId: string;
        type: string;
        version: string;
        given: boolean;
        ipAddress: string;
        notes: string;
    }) {
        return prisma.consentRecord.create({
            data: {
                customerId: data.customerId,
                type: data.type,
                version: data.version,
                given: data.given,
                givenAt: new Date(),
                ipAddress: data.ipAddress,
                notes: data.notes
            }
        });
    }

    async findLatest(customerId: string, type: string) {
        return prisma.consentRecord.findFirst({
            where: { customerId, type },
            orderBy: { givenAt: 'desc' }
        });
    }
}

export const consentRepository = new ConsentRepository();
