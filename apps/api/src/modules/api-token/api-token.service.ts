import { prisma } from '../../lib/prisma';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { AppError } from '../../lib/errors';
import { logger } from '@bookease/logger';

export interface ApiTokenResult {
    id: string;
    name: string;
    token: string; // Only returned once on creation
    createdAt: Date;
    lastUsed?: Date;
    expiresAt?: Date;
    isActive: boolean;
}

export interface ApiTokenInfo {
    id: string;
    name: string;
    lastUsed?: Date;
    expiresAt?: Date;
    isActive: boolean;
    createdAt: Date;
    usageCount?: number;
}

export interface TokenValidationResult {
    isValid: boolean;
    tenantId?: string;
    tokenId?: string;
    error?: string;
    rateLimitRemaining?: number;
}

export class ApiTokenService {

    /**
     * Create a new API token with enhanced security
     */
    async createToken(tenantId: string, name: string, options: {
        expiresAt?: Date;
        permissions?: string[];
    } = {}): Promise<ApiTokenResult> {
        // Validate token name
        if (!name || name.trim().length === 0) {
            throw new AppError('Token name is required', 400, 'INVALID_TOKEN_NAME');
        }

        if (name.length > 100) {
            throw new AppError('Token name too long (max 100 characters)', 400, 'INVALID_TOKEN_NAME');
        }

        // Check for existing tokens with same name
        const existingToken = await prisma.apiToken.findFirst({
            where: { tenantId, name: name.trim() }
        });

        if (existingToken) {
            throw new AppError('Token with this name already exists', 409, 'TOKEN_NAME_EXISTS');
        }

        // Generate secure random token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = await bcrypt.hash(rawToken, 12); // Higher rounds for API tokens

        const apiToken = await prisma.apiToken.create({
            data: {
                tenantId,
                name: name.trim(),
                tokenHash,
                expiresAt: options.expiresAt,
                permissions: options.permissions || []
            }
        });

        // The user MUST save this now, it won't be shown again!
        const fullToken = `${apiToken.id}.${rawToken}`;

        logger.info({
            tenantId,
            tokenId: apiToken.id,
            tokenName: name,
            expiresAt: options.expiresAt
        }, 'API token created');

        return {
            id: apiToken.id,
            name: apiToken.name,
            token: fullToken, // Only returned once
            createdAt: apiToken.createdAt,
            lastUsed: apiToken.lastUsed,
            expiresAt: apiToken.expiresAt,
            isActive: apiToken.isActive
        };
    }

    /**
     * List all tokens for a tenant with usage information
     */
    async listTokens(tenantId: string): Promise<ApiTokenInfo[]> {
        const tokens = await prisma.apiToken.findMany({
            where: { tenantId },
            select: {
                id: true,
                name: true,
                lastUsed: true,
                expiresAt: true,
                isActive: true,
                createdAt: true,
                _count: {
                    select: { auditLogs: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return tokens.map(token => ({
            id: token.id,
            name: token.name,
            lastUsed: token.lastUsed,
            expiresAt: token.expiresAt,
            isActive: token.isActive,
            createdAt: token.createdAt,
            usageCount: token._count.auditLogs
        }));
    }

    /**
     * Revoke a token (soft delete)
     */
    async revokeToken(tenantId: string, tokenId: string): Promise<{ success: boolean; id: string }> {
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

        logger.info({
            tenantId,
            tokenId,
            tokenName: token.name,
            revokedAt: new Date()
        }, 'API token revoked');

        return { success: true, id: revoked.id };
    }

    /**
     * Enhanced token validation with rate limiting
     */
    async validateToken(fullToken: string, options: {
        checkRateLimit?: boolean;
        rateLimitWindow?: number; // minutes
        rateLimitMax?: number;
    } = {}): Promise<TokenValidationResult> {
        const { checkRateLimit = true, rateLimitWindow = 15, rateLimitMax = 1000 } = options;

        // format: <id>.<rawSecretToken>
        const parts = fullToken.split('.');
        if (parts.length !== 2) {
            return { isValid: false, error: 'Invalid token format' };
        }

        const [tokenId, rawToken] = parts;

        if (!tokenId || !rawToken) {
            return { isValid: false, error: 'Invalid token format' };
        }

        const apiToken = await prisma.apiToken.findUnique({
            where: { id: tokenId },
            include: {
                _count: {
                    select: { auditLogs: true }
                }
            }
        });

        if (!apiToken) {
            return { isValid: false, error: 'Token not found' };
        }

        if (!apiToken.isActive) {
            return { isValid: false, error: 'Token is inactive' };
        }

        if (apiToken.expiresAt && apiToken.expiresAt < new Date()) {
            return { isValid: false, error: 'Token has expired' };
        }

        // Check rate limiting if enabled
        let rateLimitRemaining = rateLimitMax;
        if (checkRateLimit) {
            const windowStart = new Date(Date.now() - rateLimitWindow * 60 * 1000);
            const recentUsage = await prisma.auditLog.count({
                where: {
                    tenantId: apiToken.tenantId,
                    createdAt: { gte: windowStart },
                    resourceType: 'api_token',
                    resourceId: tokenId
                }
            });

            if (recentUsage >= rateLimitMax) {
                return { 
                    isValid: false, 
                    error: 'Rate limit exceeded',
                    rateLimitRemaining: 0
                };
            }

            rateLimitRemaining = rateLimitMax - recentUsage;
        }

        // Validate token hash
        const isValid = await bcrypt.compare(rawToken, apiToken.tokenHash);

        if (isValid) {
            // Async update lastUsed (fire and forget to save latency)
            prisma.apiToken.update({
                where: { id: tokenId },
                data: { lastUsed: new Date() }
            }).catch(error => {
                logger.error({
                    error: error.message,
                    tokenId
                }, 'Failed to update token last used timestamp');
            });

            // Log token usage for rate limiting
            if (checkRateLimit) {
                prisma.auditLog.create({
                    data: {
                        tenantId: apiToken.tenantId,
                        action: 'api_token.used',
                        resourceType: 'api_token',
                        resourceId: tokenId,
                        correlationId: crypto.randomUUID(),
                        ipAddress: 'SYSTEM', // Would be passed in real implementation
                        createdAt: new Date()
                    }
                }).catch(error => {
                    logger.error({
                        error: error.message,
                        tokenId
                    }, 'Failed to log token usage');
                });
            }

            return { 
                isValid: true, 
                tenantId: apiToken.tenantId, 
                tokenId,
                rateLimitRemaining
            };
        }

        return { isValid: false, error: 'Invalid token' };
    }

    /**
     * Get token usage statistics
     */
    async getTokenUsage(tenantId: string, tokenId: string, days: number = 30): Promise<{
        totalUsage: number;
        dailyUsage: Array<{ date: string; count: number }>;
        topEndpoints: Array<{ endpoint: string; count: number }>;
        rateLimitHits: number;
    }> {
        const token = await prisma.apiToken.findFirst({
            where: { id: tokenId, tenantId }
        });

        if (!token) {
            throw new AppError('Token not found', 404, 'NOT_FOUND');
        }

        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const [
            totalUsage,
            auditLogs,
            rateLimitHits
        ] = await Promise.all([
            // Total usage count
            prisma.auditLog.count({
                where: {
                    tenantId,
                    resourceType: 'api_token',
                    resourceId: tokenId,
                    createdAt: { gte: startDate }
                }
            }),
            
            // Daily usage
            prisma.auditLog.groupBy({
                by: ['createdAt'],
                where: {
                    tenantId,
                    resourceType: 'api_token',
                    resourceId: tokenId,
                    createdAt: { gte: startDate }
                },
                _count: true,
                orderBy: { createdAt: 'asc' }
            }),
            
            // Rate limit hits
            prisma.auditLog.count({
                where: {
                    tenantId,
                    action: 'api_token.rate_limited',
                    resourceType: 'api_token',
                    resourceId: tokenId,
                    createdAt: { gte: startDate }
                }
            })
        ]);

        // Process daily usage
        const dailyUsageMap = new Map<string, number>();
        auditLogs.forEach(log => {
            const date = log.createdAt.toISOString().split('T')[0];
            dailyUsageMap.set(date, (dailyUsageMap.get(date) || 0) + log._count);
        });

        const dailyUsage = Array.from(dailyUsageMap.entries()).map(([date, count]) => ({
            date,
            count
        }));

        // For top endpoints, we'd need to parse action or metadata
        // For now, return empty array
        const topEndpoints: Array<{ endpoint: string; count: number }> = [];

        return {
            totalUsage,
            dailyUsage,
            topEndpoints,
            rateLimitHits
        };
    }

    /**
     * Update token settings
     */
    async updateToken(tenantId: string, tokenId: string, updates: {
        name?: string;
        expiresAt?: Date | null;
        isActive?: boolean;
        permissions?: string[];
    }): Promise<ApiTokenInfo> {
        const token = await prisma.apiToken.findFirst({
            where: { id: tokenId, tenantId }
        });

        if (!token) {
            throw new AppError('Token not found', 404, 'NOT_FOUND');
        }

        // Validate name if being updated
        if (updates.name) {
            if (updates.name.trim().length === 0) {
                throw new AppError('Token name is required', 400, 'INVALID_TOKEN_NAME');
            }

            if (updates.name.length > 100) {
                throw new AppError('Token name too long (max 100 characters)', 400, 'INVALID_TOKEN_NAME');
            }

            // Check for name conflicts
            const existingToken = await prisma.apiToken.findFirst({
                where: { 
                    tenantId, 
                    name: updates.name.trim(),
                    id: { not: tokenId }
                }
            });

            if (existingToken) {
                throw new AppError('Token with this name already exists', 409, 'TOKEN_NAME_EXISTS');
            }
        }

        const updatedToken = await prisma.apiToken.update({
            where: { id: tokenId },
            data: {
                ...(updates.name && { name: updates.name.trim() }),
                ...(updates.expiresAt !== undefined && { expiresAt: updates.expiresAt }),
                ...(updates.isActive !== undefined && { isActive: updates.isActive }),
                ...(updates.permissions && { permissions: updates.permissions })
            }
        });

        logger.info({
            tenantId,
            tokenId,
            updates
        }, 'API token updated');

        return {
            id: updatedToken.id,
            name: updatedToken.name,
            lastUsed: updatedToken.lastUsed,
            expiresAt: updatedToken.expiresAt,
            isActive: updatedToken.isActive,
            createdAt: updatedToken.createdAt
        };
    }

    /**
     * Clean up expired tokens
     */
    async cleanupExpiredTokens(): Promise<{ cleaned: number }> {
        const result = await prisma.apiToken.updateMany({
            where: {
                expiresAt: { lt: new Date() },
                isActive: true
            },
            data: { isActive: false }
        });

        if (result.count > 0) {
            logger.info({
                cleaned: result.count
            }, 'Expired API tokens cleaned up');
        }

        return { cleaned: result.count };
    }
}

export const apiTokenService = new ApiTokenService();
