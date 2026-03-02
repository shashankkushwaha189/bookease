import { Request, Response } from 'express';
import { availabilityService } from './availability.service';
import { logger } from '@bookease/logger';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';

const availabilityQuerySchema = z.object({
    serviceId: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    staffId: z.string().uuid().optional(),
});

// Simple in-memory cache
const cache = new Map<string, { data: any, expires: number }>();
const CACHE_TTL_MS = 60000; // 60 seconds

export class AvailabilityController {
    async getAvailability(req: Request, res: Response) {
        try {
            const validated = availabilityQuerySchema.safeParse(req.query);
            if (!validated.success) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid query parameters',
                        details: validated.error.format(),
                    },
                });
            }

            const { serviceId, date, staffId } = validated.data;
            const tenantId = req.tenantId!;

            // Fetch tenant to get the correct business timezone
            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { timezone: true }
            });

            if (!tenant) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Tenant not found' }
                });
            }

            const businessTimezone = tenant.timezone;

            const cacheKey = `${tenantId}:${serviceId}:${staffId || 'any'}:${date}`;
            const cached = process.env.NODE_ENV !== 'test' ? cache.get(cacheKey) : null;
            if (cached && cached.expires > Date.now()) {
                return res.json({
                    success: true,
                    data: {
                        slots: cached.data,
                        date,
                        serviceId,
                        timezone: businessTimezone,
                        cached: true
                    }
                });
            }

            const slots = await availabilityService.generateSlots({
                tenantId,
                serviceId,
                staffId,
                date,
                businessTimezone
            });

            // Store in cache if not in test env
            if (process.env.NODE_ENV !== 'test') {
                cache.set(cacheKey, { data: slots, expires: Date.now() + CACHE_TTL_MS });
            }

            res.json({
                success: true,
                data: {
                    slots,
                    date,
                    serviceId,
                    timezone: businessTimezone
                }
            });
        } catch (error: any) {
            logger.error({ err: error, tenantId: req.tenantId }, 'Error getting availability');
            res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch availability' },
            });
        }
    }

    // Export invalidation method for use in other modules
    invalidateCache(tenantId: string) {
        for (const key of cache.keys()) {
            if (key.startsWith(`${tenantId}:`)) {
                cache.delete(key);
            }
        }
    }
}

export const availabilityController = new AvailabilityController();
