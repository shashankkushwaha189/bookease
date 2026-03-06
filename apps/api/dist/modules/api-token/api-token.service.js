"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiTokenService = exports.ApiTokenService = void 0;
const prisma_1 = require("../../lib/prisma");
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const errors_1 = require("../../lib/errors");
const logger_1 = require("@bookease/logger");
class ApiTokenService {
    /**
     * Create a new API token with enhanced security
     */
    async createToken(tenantId, name, options = {}) {
        // Validate token name
        if (!name || name.trim().length === 0) {
            throw new errors_1.AppError('Token name is required', 400, 'INVALID_TOKEN_NAME');
        }
        if (name.length > 100) {
            throw new errors_1.AppError('Token name too long (max 100 characters)', 400, 'INVALID_TOKEN_NAME');
        }
        // Check for existing tokens with same name
        const existingToken = await prisma_1.prisma.apiToken.findFirst({
            where: { tenantId, name: name.trim() }
        });
        if (existingToken) {
            throw new errors_1.AppError('Token with this name already exists', 409, 'TOKEN_NAME_EXISTS');
        }
        // Generate secure random token
        const rawToken = crypto_1.default.randomBytes(32).toString('hex');
        const tokenHash = await bcrypt_1.default.hash(rawToken, 12); // Higher rounds for API tokens
        const apiToken = await prisma_1.prisma.apiToken.create({
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
        logger_1.logger.info({
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
    async listTokens(tenantId) {
        const tokens = await prisma_1.prisma.apiToken.findMany({
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
    async revokeToken(tenantId, tokenId) {
        const token = await prisma_1.prisma.apiToken.findFirst({
            where: { id: tokenId, tenantId }
        });
        if (!token) {
            throw new errors_1.AppError('Token not found', 404, 'NOT_FOUND');
        }
        const revoked = await prisma_1.prisma.apiToken.update({
            where: { id: tokenId },
            data: { isActive: false }
        });
        logger_1.logger.info({
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
    async validateToken(fullToken, options = {}) {
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
        const apiToken = await prisma_1.prisma.apiToken.findUnique({
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
            const recentUsage = await prisma_1.prisma.auditLog.count({
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
        const isValid = await bcrypt_1.default.compare(rawToken, apiToken.tokenHash);
        if (isValid) {
            // Async update lastUsed (fire and forget to save latency)
            prisma_1.prisma.apiToken.update({
                where: { id: tokenId },
                data: { lastUsed: new Date() }
            }).catch(error => {
                logger_1.logger.error({
                    error: error.message,
                    tokenId
                }, 'Failed to update token last used timestamp');
            });
            // Log token usage for rate limiting
            if (checkRateLimit) {
                prisma_1.prisma.auditLog.create({
                    data: {
                        tenantId: apiToken.tenantId,
                        action: 'api_token.used',
                        resourceType: 'api_token',
                        resourceId: tokenId,
                        correlationId: crypto_1.default.randomUUID(),
                        ipAddress: 'SYSTEM', // Would be passed in real implementation
                        createdAt: new Date()
                    }
                }).catch(error => {
                    logger_1.logger.error({
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
    async getTokenUsage(tenantId, tokenId, days = 30) {
        const token = await prisma_1.prisma.apiToken.findFirst({
            where: { id: tokenId, tenantId }
        });
        if (!token) {
            throw new errors_1.AppError('Token not found', 404, 'NOT_FOUND');
        }
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const [totalUsage, auditLogs, rateLimitHits] = await Promise.all([
            // Total usage count
            prisma_1.prisma.auditLog.count({
                where: {
                    tenantId,
                    resourceType: 'api_token',
                    resourceId: tokenId,
                    createdAt: { gte: startDate }
                }
            }),
            // Daily usage
            prisma_1.prisma.auditLog.groupBy({
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
            prisma_1.prisma.auditLog.count({
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
        const dailyUsageMap = new Map();
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
        const topEndpoints = [];
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
    async updateToken(tenantId, tokenId, updates) {
        const token = await prisma_1.prisma.apiToken.findFirst({
            where: { id: tokenId, tenantId }
        });
        if (!token) {
            throw new errors_1.AppError('Token not found', 404, 'NOT_FOUND');
        }
        // Validate name if being updated
        if (updates.name) {
            if (updates.name.trim().length === 0) {
                throw new errors_1.AppError('Token name is required', 400, 'INVALID_TOKEN_NAME');
            }
            if (updates.name.length > 100) {
                throw new errors_1.AppError('Token name too long (max 100 characters)', 400, 'INVALID_TOKEN_NAME');
            }
            // Check for name conflicts
            const existingToken = await prisma_1.prisma.apiToken.findFirst({
                where: {
                    tenantId,
                    name: updates.name.trim(),
                    id: { not: tokenId }
                }
            });
            if (existingToken) {
                throw new errors_1.AppError('Token with this name already exists', 409, 'TOKEN_NAME_EXISTS');
            }
        }
        const updatedToken = await prisma_1.prisma.apiToken.update({
            where: { id: tokenId },
            data: {
                ...(updates.name && { name: updates.name.trim() }),
                ...(updates.expiresAt !== undefined && { expiresAt: updates.expiresAt }),
                ...(updates.isActive !== undefined && { isActive: updates.isActive }),
                ...(updates.permissions && { permissions: updates.permissions })
            }
        });
        logger_1.logger.info({
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
    async cleanupExpiredTokens() {
        const result = await prisma_1.prisma.apiToken.updateMany({
            where: {
                expiresAt: { lt: new Date() },
                isActive: true
            },
            data: { isActive: false }
        });
        if (result.count > 0) {
            logger_1.logger.info({
                cleaned: result.count
            }, 'Expired API tokens cleaned up');
        }
        return { cleaned: result.count };
    }
}
exports.ApiTokenService = ApiTokenService;
exports.apiTokenService = new ApiTokenService();
