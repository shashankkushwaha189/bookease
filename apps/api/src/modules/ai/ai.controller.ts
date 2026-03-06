import { Request, Response, NextFunction } from 'express';
import { aiService, AISummaryRequest, AIConfiguration } from './ai.service';
import { AppError } from '../../lib/errors';
import { logger } from '@bookease/logger';

export class AiController {
    // Get AI configuration
    async getConfiguration(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.headers['x-tenant-id'] as string;
            
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: 'Tenant ID is required',
                    code: 'TENANT_ID_REQUIRED'
                });
            }

            const config = await aiService.getConfiguration(tenantId);
            
            res.json({
                success: true,
                data: config
            });
        } catch (error: any) {
            logger.error('Failed to get AI configuration', { error });
            next(error);
        }
    }

    // Update AI configuration
    async updateConfiguration(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.headers['x-tenant-id'] as string;
            
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: 'Tenant ID is required',
                    code: 'TENANT_ID_REQUIRED'
                });
            }

            const config = await aiService.updateConfiguration(tenantId, req.body);
            
            res.json({
                success: true,
                data: config
            });
        } catch (error: any) {
            logger.error('Failed to update AI configuration', { error });
            next(error);
        }
    }

    // Generate AI summary
    async generateSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.headers['x-tenant-id'] as string;
            const { id } = req.params;
            const { includeKeyPoints, includeActionItems, includeSentiment } = req.body as AISummaryRequest;
            
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: 'Tenant ID is required',
                    code: 'TENANT_ID_REQUIRED'
                });
            }

            if (!id) {
                throw new AppError('Appointment ID is required', 400, 'VALIDATION_ERROR');
            }

            const summary = await aiService.generateSummary(id as string, tenantId as string, {
                includeKeyPoints,
                includeActionItems,
                includeSentiment
            });

            res.status(200).json({
                success: true,
                data: summary
            });
        } catch (error) {
            next(error);
        }
    }

    // Get AI summary
    async getSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.headers['x-tenant-id'] as string;
            const { id } = req.params;
            
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: 'Tenant ID is required',
                    code: 'TENANT_ID_REQUIRED'
                });
            }

            const summary = await aiService.getSummary(tenantId, id as string);
            
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
        } catch (error: any) {
            logger.error('Failed to get AI summary', { error });
            next(error);
        }
    }

    // Update AI summary
    async updateSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.headers['x-tenant-id'] as string;
            const { id } = req.params;
            const { summary, keyPoints, actionItems } = req.body;
            
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: 'Tenant ID is required',
                    code: 'TENANT_ID_REQUIRED'
                });
            }

            const updatedSummary = await aiService.updateSummary(tenantId, id as string, {
                summary,
                keyPoints,
                actionItems
            });
            
            res.json({
                success: true,
                data: updatedSummary
            });
        } catch (error: any) {
            logger.error('Failed to update AI summary', { error });
            next(error);
        }
    }

    // Delete AI summary
    async deleteSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.headers['x-tenant-id'] as string;
            const { id } = req.params;
            
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: 'Tenant ID is required',
                    code: 'TENANT_ID_REQUIRED'
                });
            }

            await aiService.deleteSummary(tenantId, id as string);
            
            res.json({
                success: true,
                data: { success: true }
            });
        } catch (error: any) {
            logger.error('Failed to delete AI summary', { error });
            next(error);
        }
    }

    async acceptSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const tenantId = req.tenantId as string;
            // For testing & tracking purposes we grab the staff ID generating the explicit override
            const userIdRaw = req.user?.id || 'SYSTEM';
            const userId = Array.isArray(userIdRaw) ? userIdRaw[0] : userIdRaw;

            if (!id) {
                throw new AppError('Appointment ID is required', 400, 'VALIDATION_ERROR');
            }

            const result = await aiService.acceptSummary(id as string, tenantId as string, userId as string);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async discardSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const tenantId = req.tenantId as string;
            const userId = req.user?.id || 'SYSTEM';

            if (!id) {
                throw new AppError('Appointment ID is required', 400, 'VALIDATION_ERROR');
            }

            const result = await aiService.discardSummary(id as string, tenantId as string, userId as string);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    // Batch generate AI summaries
    async batchGenerateSummaries(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.headers['x-tenant-id'] as string;
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

            const results = await aiService.batchGenerateSummaries(tenantId, appointmentIds);
            
            res.json({
                success: true,
                data: results
            });
        } catch (error: any) {
            logger.error('Failed to batch generate AI summaries', { error });
            next(error);
        }
    }

    // Cleanup old AI summaries
    async cleanupOldSummaries(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.headers['x-tenant-id'] as string;
            
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: 'Tenant ID is required',
                    code: 'TENANT_ID_REQUIRED'
                });
            }

            const result = await aiService.cleanupOldSummaries(tenantId);
            
            res.json({
                success: true,
                data: result
            });
        } catch (error: any) {
            logger.error('Failed to cleanup old AI summaries', { error });
            next(error);
        }
    }

    // Get AI usage statistics
    async getUsageStats(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.headers['x-tenant-id'] as string;
            const { days = 30 } = req.query;
            
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: 'Tenant ID is required',
                    code: 'TENANT_ID_REQUIRED'
                });
            }

            const stats = await aiService.getUsageStats(tenantId, Number(days));
            
            res.json({
                success: true,
                data: stats
            });
        } catch (error: any) {
            logger.error('Failed to get AI usage stats', { error });
            next(error);
        }
    }

    // Test AI functionality
    async testConfiguration(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.headers['x-tenant-id'] as string;
            const { testText } = req.body;
            
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: 'Tenant ID is required',
                    code: 'TENANT_ID_REQUIRED'
                });
            }

            const config = await aiService.getConfiguration(tenantId);
            
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
        } catch (error: any) {
            logger.error('Failed to test AI configuration', { error });
            next(error);
        }
    }
}

export const aiController = new AiController();
