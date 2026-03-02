"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiService = exports.AiService = void 0;
const prisma_1 = require("../../lib/prisma");
const errors_1 = require("../../lib/errors");
const client_1 = require("../../generated/client");
const zod_1 = require("zod");
const AiResponseSchema = zod_1.z.object({
    summary: zod_1.z.string(),
    customerIntent: zod_1.z.string().nullable().optional(),
    followUpSuggestion: zod_1.z.string().nullable().optional(),
    confidence: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH']),
});
class AiService {
    async generateSummary(appointmentId, tenantId) {
        // 1. Guard check config
        const tenantConfig = await prisma_1.prisma.tenantConfig.findFirst({
            where: { tenantId, isActive: true },
            orderBy: { version: 'desc' }
        });
        const configData = tenantConfig?.config;
        if (!configData?.features?.aiSummaryEnabled) {
            throw new errors_1.AppError('AI Summary feature is disabled for this tenant', 403, 'FEATURE_DISABLED');
        }
        // 2. Guard check appointment
        const appointment = await prisma_1.prisma.appointment.findFirst({
            where: { id: appointmentId, tenantId },
            include: { service: true }
        });
        if (!appointment) {
            throw new errors_1.AppError('Appointment not found', 404, 'NOT_FOUND');
        }
        if (appointment.status !== 'COMPLETED') {
            throw new errors_1.AppError('AI Summaries can only be generated for COMPLETED appointments', 400, 'INVALID_STATUS');
        }
        // 3. Guard check existing summary
        const existingSummary = await prisma_1.prisma.aiSummary.findUnique({
            where: { appointmentId }
        });
        if (existingSummary) {
            return existingSummary;
        }
        // 4. Build prompt strictly without PII
        const prompt = `An appointment for service ${appointment.service.name} lasting ${appointment.service.durationMinutes} minutes was completed.
Staff notes: ${appointment.notes || 'None'}.
Generate a brief structured summary with: (1) summary of interaction, (2) inferred customer intent, (3) suggested follow-up action.
Respond in JSON: { "summary": "...", "customerIntent": "...", "followUpSuggestion": "...", "confidence": "LOW|MEDIUM|HIGH" }`;
        // 5. Call external provider with wrapping
        const aiResponse = await this.callAIProviderWithRetry(prompt);
        // 6. DB Persistence
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            const newSummary = await tx.aiSummary.create({
                data: {
                    appointmentId,
                    tenantId,
                    summary: aiResponse.summary,
                    customerIntent: aiResponse.customerIntent,
                    followUpSuggestion: aiResponse.followUpSuggestion,
                    confidence: aiResponse.confidence,
                    model: process.env.AI_PROVIDER || 'mock-model'
                }
            });
            await tx.appointmentTimeline.create({
                data: {
                    appointmentId,
                    tenantId,
                    eventType: client_1.TimelineEvent.AI_SUMMARY_GENERATED,
                    performedBy: 'SYSTEM',
                    note: 'AI Summary generated'
                }
            });
            return newSummary;
        });
        return result;
    }
    async acceptSummary(appointmentId, tenantId, userId) {
        return this.updateSummaryStatus(appointmentId, tenantId, userId, true, client_1.TimelineEvent.AI_SUMMARY_ACCEPTED);
    }
    async discardSummary(appointmentId, tenantId, userId) {
        return this.updateSummaryStatus(appointmentId, tenantId, userId, false, client_1.TimelineEvent.AI_SUMMARY_DISCARDED);
    }
    async updateSummaryStatus(appointmentId, tenantId, userId, accepted, eventType) {
        const summary = await prisma_1.prisma.aiSummary.findFirst({
            where: { appointmentId, tenantId }
        });
        if (!summary) {
            throw new errors_1.AppError('AI Summary not found', 404, 'NOT_FOUND');
        }
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            const updated = await tx.aiSummary.update({
                where: { id: summary.id },
                data: { accepted }
            });
            await tx.appointmentTimeline.create({
                data: {
                    appointmentId,
                    tenantId,
                    eventType,
                    performedBy: userId,
                    note: `AI Summary ${accepted ? 'accepted' : 'discarded'}`
                }
            });
            return updated;
        });
        return result;
    }
    async callAIProviderWithRetry(prompt, maxRetries = 2) {
        let attempt = 0;
        let lastError;
        while (attempt <= maxRetries) {
            try {
                // AbortController for 10s exact timeout requirement
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                const response = await this.executeMockNetworkRequest(prompt, controller.signal);
                clearTimeout(timeoutId);
                // Zod validate JSON response
                const parsed = AiResponseSchema.parse(JSON.parse(response));
                return parsed;
            }
            catch (error) {
                lastError = error;
                attempt++;
                if (attempt <= maxRetries) {
                    const delayMs = Math.pow(2, attempt) * 500; // Exponential backoff
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }
        }
        throw new errors_1.AppError('AI service unavailable', 503, 'AI_SERVICE_UNAVAILABLE', lastError);
    }
    // Extracted strictly so test files can mock this prototype network envelope out
    async executeMockNetworkRequest(prompt, signal) {
        return JSON.stringify({
            summary: "Completed standard check-in service.",
            customerIntent: "Requested standard maintenance.",
            followUpSuggestion: "None immediately.",
            confidence: "HIGH"
        });
    }
}
exports.AiService = AiService;
exports.aiService = new AiService();
