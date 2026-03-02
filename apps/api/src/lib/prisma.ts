import { PrismaClient } from '../generated/client';
import { Pool } from 'pg';
import { logger } from '@bookease/logger';
import { env } from '../config/env';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const pool = new Pool({ connectionString: env.DATABASE_URL });

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log:
            env.NODE_ENV === 'development'
                ? ['query', 'info', 'warn', 'error']
                : ['error'],
    });

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
