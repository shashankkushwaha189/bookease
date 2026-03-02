"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsentService = void 0;
const prisma_1 = require("../../lib/prisma");
const logger_1 = require("@bookease/logger");
class ConsentService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async captureConsent(tenantId, customerEmail, ipAddress) {
        // 1. Fetch exact policy text from BusinessProfile at this moment
        const profile = await prisma_1.prisma.businessProfile.findUnique({
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
        logger_1.logger.info({ tenantId, customerEmail, recordId: record.id }, 'Consent captured');
        return record;
    }
}
exports.ConsentService = ConsentService;
