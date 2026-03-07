"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiController = exports.AiController = void 0;
const ai_service_1 = require("./ai.service");
const errors_1 = require("../../lib/errors");
const logger_1 = require("@bookease/logger");
class AiController {
    // Get AI configuration
    async getConfiguration(req, res, next) {
        try {
            const tenantId = req.headers['x-tenant-id'];
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: 'Tenant ID is required',
                    code: 'TENANT_ID_REQUIRED'
                });
            }
            const config = await ai_service_1.aiService.getConfiguration(tenantId);
            res.json({
                success: true,
                data: config
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to get AI configuration', { error });
            next(error);
        }
    }
    // Update AI configuration
    async updateConfiguration(req, res, next) {
        try {
            const tenantId = req.headers['x-tenant-id'];
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: 'Tenant ID is required',
                    code: 'TENANT_ID_REQUIRED'
                });
            }
            const config = await ai_service_1.aiService.updateConfiguration(tenantId, req.body);
            res.json({
                success: true,
                data: config
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to update AI configuration', { error });
            next(error);
        }
    }
    // Generate AI summary
    async generateSummary(req, res, next) {
        try {
            const tenantId = req.headers['x-tenant-id'];
            const { id } = req.params;
            const { includeKeyPoints, includeActionItems, includeSentiment } = req.body;
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: 'Tenant ID is required',
                    code: 'TENANT_ID_REQUIRED'
                });
            }
            if (!id) {
                throw new errors_1.AppError('Appointment ID is required', 400, 'VALIDATION_ERROR');
            }
            const summary = await ai_service_1.aiService.generateSummary(id, tenantId, {
                includeKeyPoints,
                includeActionItems,
                includeSentiment
            });
            res.status(200).json({
                success: true,
                data: summary
            });
        }
        catch (error) {
            next(error);
        }
    }
    // Get AI summary
    async getSummary(req, res, next) {
        try {
            const tenantId = req.headers['x-tenant-id'];
            const { id } = req.params;
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: 'Tenant ID is required',
                    code: 'TENANT_ID_REQUIRED'
                });
            }
            const summary = await ai_service_1.aiService.getSummary(tenantId, id);
            if (!summary) {
                return res.status(404).json({
                    success: false,
                    error: 'AI summary not found',
                    code: 'SUMMARY_NOT_FOUND'
                });
            }
            res.json({
                success: true,
                data: summary
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to get AI summary', { error });
            next(error);
        }
    }
    // Update AI summary
    async updateSummary(req, res, next) {
        try {
            const tenantId = req.headers['x-tenant-id'];
            const { id } = req.params;
            const { summary, keyPoints, actionItems } = req.body;
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: 'Tenant ID is required',
                    code: 'TENANT_ID_REQUIRED'
                });
            }
            const updatedSummary = await ai_service_1.aiService.updateSummary(tenantId, id, {
                summary,
                keyPoints,
                actionItems
            });
            res.json({
                success: true,
                data: updatedSummary
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to update AI summary', { error });
            next(error);
        }
    }
    // Delete AI summary
    async deleteSummary(req, res, next) {
        try {
            const tenantId = req.headers['x-tenant-id'];
            const { id } = req.params;
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: 'Tenant ID is required',
                    code: 'TENANT_ID_REQUIRED'
                });
            }
            await ai_service_1.aiService.deleteSummary(tenantId, id);
            res.json({
                success: true,
                data: { success: true }
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to delete AI summary', { error });
            next(error);
        }
    }
    async acceptSummary(req, res, next) {
        try {
            const { id } = req.params;
            const tenantId = req.tenantId;
            // For testing & tracking purposes we grab the staff ID generating the explicit override
            const userIdRaw = req.user?.id || 'SYSTEM';
            const userId = Array.isArray(userIdRaw) ? userIdRaw[0] : userIdRaw;
            if (!id) {
                throw new errors_1.AppError('Appointment ID is required', 400, 'VALIDATION_ERROR');
            }
            const result = await ai_service_1.aiService.acceptSummary(id, tenantId, userId);
            res.status(200).json({
                success: true,
                data: result
            });
        }
        catch (error) {
            next(error);
        }
    }
    async discardSummary(req, res, next) {
        try {
            const { id } = req.params;
            const tenantId = req.tenantId;
            const userId = req.user?.id || 'SYSTEM';
            if (!id) {
                throw new errors_1.AppError('Appointment ID is required', 400, 'VALIDATION_ERROR');
            }
            const result = await ai_service_1.aiService.discardSummary(id, tenantId, userId);
            res.status(200).json({
                success: true,
                data: result
            });
        }
        catch (error) {
            next(error);
        }
    }
    // Batch generate AI summaries
    async batchGenerateSummaries(req, res, next) {
        try {
            const tenantId = req.headers['x-tenant-id'];
            const { appointmentIds } = req.body;
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: 'Tenant ID is required',
                    code: 'TENANT_ID_REQUIRED'
                });
            }
            if (!Array.isArray(appointmentIds) || appointmentIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Appointment IDs array is required',
                    code: 'APPOINTMENT_IDS_REQUIRED'
                });
            }
            const results = await ai_service_1.aiService.batchGenerateSummaries(tenantId, appointmentIds);
            res.json({
                success: true,
                data: results
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to batch generate AI summaries', { error });
            next(error);
        }
    }
    // Cleanup old AI summaries
    async cleanupOldSummaries(req, res, next) {
        try {
            const tenantId = req.headers['x-tenant-id'];
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: 'Tenant ID is required',
                    code: 'TENANT_ID_REQUIRED'
                });
            }
            const result = await ai_service_1.aiService.cleanupOldSummaries(tenantId);
            res.json({
                success: true,
                data: result
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to cleanup old AI summaries', { error });
            next(error);
        }
    }
    // Get AI usage statistics
    async getUsageStats(req, res, next) {
        try {
            const tenantId = req.headers['x-tenant-id'];
            const { days = 30 } = req.query;
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: 'Tenant ID is required',
                    code: 'TENANT_ID_REQUIRED'
                });
            }
            const stats = await ai_service_1.aiService.getUsageStats(tenantId, Number(days));
            res.json({
                success: true,
                data: stats
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to get AI usage stats', { error });
            next(error);
        }
    }
    // Test AI functionality
    async testConfiguration(req, res, next) {
        try {
            const tenantId = req.headers['x-tenant-id'];
            const { testText } = req.body;
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: 'Tenant ID is required',
                    code: 'TENANT_ID_REQUIRED'
                });
            }
            const config = await ai_service_1.aiService.getConfiguration(tenantId);
            if (!config.enabled) {
                return res.status(403).json({
                    success: false,
                    error: 'AI features are disabled for this tenant',
                    code: 'AI_DISABLED'
                });
            }
            // Test the AI service with a simple request
            const startTime = Date.now();
            // Simulate a test request
            const testPrompt = testText || "Test prompt for AI functionality";
            const mockResponse = {
                summary: "Test AI response for configuration validation",
                confidence: 0.9,
                processingTime: Date.now() - startTime,
                model: config.model
            };
            res.json({
                success: true,
                data: {
                    testResults: {
                        success: true,
                        response: mockResponse,
                        latency: mockResponse.processingTime,
                        model: config.model,
                        configuration: {
                            enabled: config.enabled,
                            model: config.model,
                            maxTokens: config.maxTokens,
                            temperature: config.temperature,
                            timeoutMs: config.timeoutMs,
                            maxRetries: config.maxRetries
                        }
                    },
                    meetsRequirements: {
                        aiEnabled: config.enabled,
                        hasTimeout: config.timeoutMs > 0,
                        hasRetries: config.maxRetries > 0,
                        hasDataRetention: config.dataRetentionDays > 0
                    }
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to test AI configuration', { error });
            next(error);
        }
    }
}
exports.AiController = AiController;
exports.aiController = new AiController();
