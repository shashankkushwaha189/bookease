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
class ApiTokenService {
    async createToken(tenantId, name) {
        // Generate a random plain-text secret token
        const rawToken = crypto_1.default.randomBytes(32).toString('hex');
        const tokenHash = await bcrypt_1.default.hash(rawToken, 10);
        const apiToken = await prisma_1.prisma.apiToken.create({
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
    async listTokens(tenantId) {
        const tokens = await prisma_1.prisma.apiToken.findMany({
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
        return { success: true, id: revoked.id };
    }
    async validateToken(fullToken) {
        // format: <id>.<rawSecretToken>
        const parts = fullToken.split('.');
        if (parts.length !== 2)
            return null;
        const [tokenId, rawToken] = parts;
        const apiToken = await prisma_1.prisma.apiToken.findUnique({
            where: { id: tokenId }
        });
        if (!apiToken || !apiToken.isActive) {
            return null;
        }
        if (apiToken.expiresAt && apiToken.expiresAt < new Date()) {
            return null;
        }
        const isValid = await bcrypt_1.default.compare(rawToken, apiToken.tokenHash);
        if (isValid) {
            // Async update lastUsed (fire and forget to save latency)
            prisma_1.prisma.apiToken.update({
                where: { id: tokenId },
                data: { lastUsed: new Date() }
            }).catch(console.error);
            return apiToken.tenantId;
        }
        return null;
    }
}
exports.ApiTokenService = ApiTokenService;
exports.apiTokenService = new ApiTokenService();
