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
        customerEmail: string,
        ipAddress: string
    ) {
        // 1. Fetch exact policy text from BusinessProfile at this moment
        const profile = await prisma.businessProfile.findUnique({
            where: { tenantId },
        });

        const consentText = profile?.policyText || 'Standard Booking Consent';

        // 2. Snapshot the consent
        const record = await this.repository.create({
            tenantId,
            customerEmail,
            ipAddress,
            consentText,
        });

        logger.info(
            { tenantId, customerEmail, recordId: record.id },
            'Consent captured'
        );

        return record;
    }
}
