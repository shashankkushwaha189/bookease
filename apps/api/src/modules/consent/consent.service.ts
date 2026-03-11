import { ConsentRepository } from './consent.repository';
import { prisma } from '../../lib/prisma';

// Simple logger replacement since @bookease/logger is not available
const logger = {
  info: (message: any, context?: string) => console.log(`[INFO] ${context}:`, message),
  error: (error: any, context?: string) => console.error(`[ERROR] ${context}:`, error),
  warn: (message: any, context?: string) => console.warn(`[WARN] ${context}:`, message)
};

export class ConsentService {
    constructor(private repository: ConsentRepository) { }

    async captureConsent(
        tenantId: string,
        customerId: string,
        ipAddress: string
    ) {
        // 1. Fetch exact policy text from BusinessProfile at this moment
        const profile = await prisma.businessProfile.findUnique({
            where: { tenantId },
        });

        const consentText = profile?.policyText || 'Standard Booking Consent';

        // 2. Snapshot the consent
        const record = await this.repository.create({
            customerId,
            type: 'TERMS_OF_SERVICE',
            version: '1.0',
            given: true,
            ipAddress,
            notes: consentText,
        });

        logger.info(
            { tenantId, customerId, recordId: record.id },
            'Consent captured'
        );

        return record;
    }
}
