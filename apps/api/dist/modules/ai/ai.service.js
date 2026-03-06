"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiService = exports.AiService = void 0;
const prisma_1 = require("../../lib/prisma");
const errors_1 = require("../../lib/errors");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const logger_1 = require("@bookease/logger");
const AiResponseSchema = zod_1.z.object({
    summary: zod_1.z.string(),
    customerIntent: zod_1.z.string().nullable().optional(),
    followUpSuggestion: zod_1.z.string().nullable().optional(),
    confidence: zod_1.z.number().min(0).max(1), // Changed to numeric confidence score
    keyPoints: zod_1.z.array(zod_1.z.string()).optional(),
    sentiment: zod_1.z.object({
        score: zod_1.z.number().min(-1).max(1),
        label: zod_1.z.enum(['positive', 'neutral', 'negative']),
        confidence: zod_1.z.number().min(0).max(1),
    }).optional(),
});
class AiService {
    async getConfiguration(tenantId) {
        try {
            const tenant = await prisma_1.prisma.tenant.findUnique({
                where: { id: tenantId },
                select: {
                    aiEnabled: true,
                    aiModel: true,
                    aiMaxTokens: true,
                    aiTemperature: true,
                    aiAutoGenerate: true,
                    aiDataRetentionDays: true,
                }
            });
            if (!tenant) {
                throw new errors_1.AppError('Tenant not found', 404, 'TENANT_NOT_FOUND');
            }
            return {
                tenantId,
                enabled: tenant.aiEnabled || false,
                model: tenant.aiModel || 'gpt-3.5-turbo',
                maxTokens: tenant.aiMaxTokens || 1000,
                temperature: tenant.aiTemperature || 0.7,
                includeKeyPoints: true,
                includeActionItems: true,
                includeSentiment: true,
                autoGenerate: tenant.aiAutoGenerate || false,
                dataRetentionDays: tenant.aiDataRetentionDays || 30,
                timeoutMs: 30000,
                maxRetries: 3,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get AI configuration', { tenantId, error });
            throw error;
        }
    }
    async updateConfiguration(tenantId, config) {
        try {
            await prisma_1.prisma.tenant.update({
                where: { id: tenantId },
                data: {
                    aiEnabled: config.enabled,
                    aiModel: config.model,
                    aiMaxTokens: config.maxTokens,
                    aiTemperature: config.temperature,
                    aiAutoGenerate: config.autoGenerate,
                    aiDataRetentionDays: config.dataRetentionDays,
                }
            });
            return await this.getConfiguration(tenantId);
        }
        catch (error) {
            logger_1.logger.error('Failed to update AI configuration', { tenantId, config, error });
            throw error;
        }
    }
    async generateSummary(appointmentId, tenantId, request) {
        // 1. Guard check config - AI disabled tenant cannot access
        const config = await this.getConfiguration(tenantId);
        if (!config.enabled) {
            throw new errors_1.AppError('AI features are disabled for this tenant', 403, 'AI_DISABLED');
        }
        // 2. Guard check appointment - Summary only after completion
        const appointment = await prisma_1.prisma.appointment.findFirst({
            where: { id: appointmentId, tenantId },
            include: {
                service: true,
                customer: { select: { name: true } },
                staff: { select: { name: true } }
            }
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
        // 4. Build prompt strictly without PII - No PII logged
        const prompt = this.buildSafePrompt(appointment, request || config);
        // 5. Call external provider with timeout and retry safety
        const aiResponse = await this.callAIProviderWithRetry(prompt, config);
        // 6. DB Persistence with confidence score
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            const newSummary = await tx.aiSummary.create({
                data: {
                    appointmentId,
                    tenantId,
                    summary: aiResponse.summary,
                    customerIntent: aiResponse.customerIntent,
                    followUpSuggestion: aiResponse.followUpSuggestion,
                    confidence: aiResponse.confidence,
                    keyPoints: aiResponse.keyPoints,
                    sentimentScore: aiResponse.sentiment?.score,
                    sentimentLabel: aiResponse.sentiment?.label,
                    sentimentConfidence: aiResponse.sentiment?.confidence,
                    model: config.model,
                    processingTime: aiResponse.processingTime || 0,
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
        // Log without PII - AI data retention limited
        logger_1.logger.info('AI summary generated', {
            tenantId,
            appointmentId,
            summaryLength: aiResponse.summary.length,
            confidence: aiResponse.confidence,
            hasKeyPoints: !!aiResponse.keyPoints,
            hasSentiment: !!aiResponse.sentiment,
            processingTime: aiResponse.processingTime,
        });
        return result;
    }
    buildSafePrompt(appointment, request) {
        // Build prompt without any PII - no customer names, staff names, etc.
        const prompt = `An appointment for service ${appointment.service.name} lasting ${appointment.service.durationMinutes} minutes was completed.
Staff notes: ${appointment.notes || 'None'}.
Generate a brief structured summary with: (1) summary of interaction, (2) inferred customer intent, (3) suggested follow-up action`;
        if (request.includeKeyPoints) {
            prompt += `, (4) key points from the interaction`;
        }
        if (request.includeActionItems) {
            prompt += `, (5) recommended action items`;
        }
        if (request.includeSentiment) {
            prompt += `, (6) sentiment analysis with score (-1 to 1), label (positive/neutral/negative), and confidence (0 to 1)`;
        }
        prompt += `. Respond in JSON format.`;
        return prompt;
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
    async callAIProviderWithRetry(prompt, config, maxRetries) {
        const retries = maxRetries || config.maxRetries;
        let attempt = 0;
        let lastError;
        while (attempt <= retries) {
            try {
                // AI timeout handled - use config timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);
                const response = await this.executeMockNetworkRequest(prompt, controller.signal, config);
                clearTimeout(timeoutId);
                // Zod validate JSON response
                const parsed = AiResponseSchema.parse(JSON.parse(response));
                return parsed;
            }
            catch (error) {
                lastError = error;
                attempt++;
                // Retry safety with exponential backoff
                if (attempt <= retries) {
                    const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }
        }
        throw new errors_1.AppError('AI service unavailable', 503, 'AI_SERVICE_UNAVAILABLE', lastError);
    }
    // Extracted strictly so test files can mock this prototype network envelope out
    async executeMockNetworkRequest(prompt, signal, config) {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
        // Generate mock response based on request
        const baseResponse = {
            summary: "Completed standard check-in service. The patient was cooperative and the examination proceeded smoothly.",
            customerIntent: "Requested routine health maintenance and preventive care.",
            followUpSuggestion: "Schedule routine follow-up in 6 months or as needed based on findings.",
            confidence: 0.85, // Numeric confidence score
            processingTime: 750 + Math.floor(Math.random() * 500),
        };
        // Add optional features based on configuration
        if (config.includeKeyPoints) {
            baseResponse.keyPoints = [
                "Patient arrived on time for scheduled appointment",
                "Vital signs within normal ranges",
                "No acute concerns identified",
                "Preventive care discussed"
            ];
        }
        if (config.includeSentiment) {
            baseResponse.sentiment = {
                score: 0.6,
                label: "positive",
                confidence: 0.9
            };
        }
        return JSON.stringify(baseResponse);
    }
    async getSummary(tenantId, appointmentId) {
        // Check if AI is enabled for tenant
        const config = await this.getConfiguration(tenantId);
        if (!config.enabled) {
            throw new errors_1.AppError('AI features are disabled for this tenant', 403, 'AI_DISABLED');
        }
        const summary = await prisma_1.prisma.aiSummary.findUnique({
            where: { appointmentId }
        });
        return summary;
    }
    async updateSummary(tenantId, appointmentId, updates) {
        // Check if AI is enabled for tenant
        const config = await this.getConfiguration(tenantId);
        if (!config.enabled) {
            throw new errors_1.AppError('AI features are disabled for this tenant', 403, 'AI_DISABLED');
        }
        const summary = await prisma_1.prisma.aiSummary.update({
            where: { appointmentId },
            data: {
                summary: updates.summary,
                keyPoints: updates.keyPoints,
                actionItems: updates.actionItems,
                updatedAt: new Date(),
            }
        });
        return summary;
    }
    async deleteSummary(tenantId, appointmentId) {
        // Check if AI is enabled for tenant
        const config = await this.getConfiguration(tenantId);
        if (!config.enabled) {
            throw new errors_1.AppError('AI features are disabled for this tenant', 403, 'AI_DISABLED');
        }
        await prisma_1.prisma.aiSummary.delete({
            where: { appointmentId }
        });
        logger_1.logger.info('AI summary deleted', { tenantId, appointmentId });
    }
    async batchGenerateSummaries(tenantId, appointmentIds) {
        const results = {
            successful: [],
            failed: [],
        };
        for (const appointmentId of appointmentIds) {
            try {
                const summary = await this.generateSummary(appointmentId, tenantId);
                results.successful.push(summary);
            }
            catch (error) {
                results.failed.push({
                    appointmentId,
                    error: error.message || 'Unknown error',
                });
            }
        }
        logger_1.logger.info('Batch AI summary generation completed', {
            tenantId,
            total: appointmentIds.length,
            successful: results.successful.length,
            failed: results.failed.length,
        });
        return {
            ...results,
            total: appointmentIds.length,
        };
    }
    async cleanupOldSummaries(tenantId) {
        try {
            const config = await this.getConfiguration(tenantId);
            const retentionDays = config.dataRetentionDays;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
            const result = await prisma_1.prisma.aiSummary.deleteMany({
                where: {
                    tenantId,
                    createdAt: {
                        lt: cutoffDate,
                    },
                },
            });
            logger_1.logger.info('AI summaries cleanup completed', {
                tenantId,
                retentionDays,
                cleaned: result.count,
                cutoffDate,
            });
            return { cleaned: result.count };
        }
        catch (error) {
            logger_1.logger.error('Failed to cleanup old AI summaries', { tenantId, error });
            throw error;
        }
    }
    async getUsageStats(tenantId, days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const summaries = await prisma_1.prisma.aiSummary.findMany({
                where: {
                    tenantId,
                    createdAt: {
                        gte: startDate,
                    },
                },
            });
            const totalSummaries = summaries.length;
            const averageConfidence = summaries.reduce((sum, s) => sum + s.confidence, 0) / totalSummaries || 0;
            const averageProcessingTime = summaries.reduce((sum, s) => sum + (s.processingTime || 0), 0) / totalSummaries || 0;
            // Group by day
            const summariesByDay = summaries.reduce((acc, summary) => {
                const date = summary.createdAt.toISOString().split('T')[0];
                acc[date] = (acc[date] || 0) + 1;
                return acc;
            }, {});
            // Sentiment distribution
            const sentimentDistribution = summaries.reduce((acc, summary) => {
                const label = summary.sentimentLabel || 'unknown';
                acc[label] = (acc[label] || 0) + 1;
                return acc;
            }, {});
            return {
                totalSummaries,
                averageConfidence,
                averageProcessingTime,
                summariesByDay: Object.entries(summariesByDay).map(([date, count]) => ({ date, count })),
                sentimentDistribution,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get AI usage stats', { tenantId, days, error });
            throw error;
        }
    }
}
exports.AiService = AiService;
exports.aiService = new AiService();
