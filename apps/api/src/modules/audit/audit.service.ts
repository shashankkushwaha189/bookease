import { prisma } from '../../lib/prisma';

export class AuditService {
  /**
   * Fire-and-forget logic for logging events.
   * This should NOT be awaited in the request path.
   */
  logEvent(params: {
    tenantId: string;
    userId?: string;
    action: string;
    resourceType: string;
    resourceId: string;
    correlationId: string;
    before?: any;
    after?: any;
    ipAddress?: string;
    reason?: string;
  }): void {
    // Fire and forget
    prisma.auditLog.create({
      data: params,
    }).catch(err => {
      console.error('[AuditService] Failed to log audit event:', err);
    });
  }

  async getLogs(params: {
    tenantId: string;
    action?: string;
    page: number;
    limit: number;
  }) {
    const skip = (params.page - 1) * params.limit;
    const where: any = { tenantId: params.tenantId };
    if (params.action) {
      where.action = params.action;
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
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

export const auditService = new AuditService();
