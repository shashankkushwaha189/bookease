"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditService = exports.AuditService = void 0;
const prisma_1 = require("../../lib/prisma");
class AuditService {
    /**
     * Fire-and-forget logic for logging events.
     * This should NOT be awaited in the request path.
     */
    logEvent(params) {
        // Fire and forget
        prisma_1.prisma.auditLog.create({
            data: params,
        }).catch(err => {
            console.error('[AuditService] Failed to log audit event:', err);
        });
    }
    async getLogs(params) {
        const skip = (params.page - 1) * params.limit;
        const where = { tenantId: params.tenantId };
        if (params.action) {
            where.action = params.action;
        }
        const [items, total] = await Promise.all([
            prisma_1.prisma.auditLog.findMany({
                where,
                skip,
                take: params.limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.prisma.auditLog.count({ where }),
        ]);
        return {
            items,
            total,
            page: params.page,
            limit: params.limit,
            totalPages: Math.ceil(total / params.limit),
        };
    }
}
exports.AuditService = AuditService;
exports.auditService = new AuditService();
