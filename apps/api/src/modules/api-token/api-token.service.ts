import { prisma } from '../../lib/prisma';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { AppError } from '../../lib/errors';

export class ApiTokenService {

    async createToken(tenantId: string, name: string) {
        // Generate a random plain-text secret token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = await bcrypt.hash(rawToken, 10);

        const apiToken = await prisma.apiToken.create({
            data: {
                tenantId,
                name,
                tokenHash
            }
        });

        // The user MUST save this now, it won't be shown again!
        const fullToken = `${apiToken.id}.${rawToken}`;

        return {
            id: apiToken.id,
            name: apiToken.name,
            createdAt: apiToken.createdAt,
            token: fullToken // Only returned once
        };
    }

    async listTokens(tenantId: string) {
        const tokens = await prisma.apiToken.findMany({
            where: { tenantId },
            select: {
                id: true,
                name: true,
                lastUsed: true,
                expiresAt: true,
                isActive: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return tokens;
    }

    async revokeToken(tenantId: string, tokenId: string) {
        const token = await prisma.apiToken.findFirst({
            where: { id: tokenId, tenantId }
        });

        if (!token) {
            throw new AppError('Token not found', 404, 'NOT_FOUND');
        }

        const revoked = await prisma.apiToken.update({
            where: { id: tokenId },
            data: { isActive: false }
        });

        return { success: true, id: revoked.id };
    }

    async validateToken(fullToken: string): Promise<string | null> {
        // format: <id>.<rawSecretToken>
        const parts = fullToken.split('.');
        if (parts.length !== 2) return null;

        const [tokenId, rawToken] = parts;

        const apiToken = await prisma.apiToken.findUnique({
            where: { id: tokenId }
        });

        if (!apiToken || !apiToken.isActive) {
            return null;
        }

        if (apiToken.expiresAt && apiToken.expiresAt < new Date()) {
            return null;
        }

        const isValid = await bcrypt.compare(rawToken, apiToken.tokenHash);

        if (isValid) {
            // Async update lastUsed (fire and forget to save latency)
            prisma.apiToken.update({
                where: { id: tokenId },
                data: { lastUsed: new Date() }
            }).catch(console.error);

            return apiToken.tenantId;
        }

        return null;
    }
}

export const apiTokenService = new ApiTokenService();
