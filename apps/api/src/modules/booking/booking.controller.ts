import { Request, Response, NextFunction } from 'express';
import { ConsentService } from '../consent/consent.service';
import { availabilityController } from '../availability/availability.controller';
import { logger } from '@bookease/logger';

export class BookingController {
    constructor(private consentService: ConsentService) { }

    createPublicBooking = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { customerEmail, consentGiven } = req.body;

            // 1. Consent is mandatory (handled by validateBody middleware, but extra safety)
            if (!consentGiven) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'CONSENT_REQUIRED',
                        message: 'Consent must be given to proceed with booking',
                    },
                });
            }

            // 2. Capture and store consent snapshot
            const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0') as string;

            await this.consentService.captureConsent(
                req.tenantId!,
                customerEmail,
                ipAddress
            );

            // 3. Invalidate availability cache for this tenant since booking changes availability
            const invalidatedCount = availabilityController.invalidateCache(req.tenantId!);
            logger.info({ 
                tenantId: req.tenantId, 
                customerEmail, 
                invalidatedCount 
            }, 'Availability cache invalidated after booking');

            // 4. (Mock) Create booking logic...
            // For this task, we focus on the consent capture part
            logger.info({ tenantId: req.tenantId, customerEmail }, 'Public booking created with consent');

            res.status(201).json({
                success: true,
                message: 'Booking created successfully',
                cacheInvalidated: {
                    invalidatedCount,
                    message: 'Availability cache refreshed'
                }
            });
        } catch (error) {
            next(error);
        }
    };
}
