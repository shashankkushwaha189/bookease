import { prisma } from '../../lib/prisma';
import { BookEaseConfig } from './config.schema';
import { Prisma } from '@prisma/client';

export class ConfigRepository {
    async findCurrent(tenantId: string) {
        return prisma.tenantConfig.findFirst({
            where: {
                tenantId,
                isActive: true,
            },
            orderBy: {
                version: 'desc',
            },
        });
    }

    async findByVersion(tenantId: string, version: number) {
        return prisma.tenantConfig.findUnique({
            where: {
                tenantId_version: {
                    tenantId,
                    version,
                },
            },
        });
    }

    async listHistory(tenantId: string) {
        return prisma.tenantConfig.findMany({
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

    async getLatestVersion(tenantId: string): Promise<number> {
        const latest = await prisma.tenantConfig.findFirst({
            where: { tenantId },
            orderBy: { version: 'desc' },
            select: { version: true },
        });
        return latest?.version ?? 0;
    }

    async deactivateAll(tenantId: string) {
        await prisma.tenantConfig.updateMany({
            where: {
                tenantId,
                isActive: true,
            },
            data: { isActive: false },
        });
    }

    async create(data: {
        tenantId: string;
        version: number;
        config: BookEaseConfig;
        createdBy: string;
        note?: string;
        isActive: boolean;
    }) {
        return prisma.tenantConfig.create({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: data as any, // Cast for JSON handling
        });
    }
}
