"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timelineController = exports.TimelineController = void 0;
const timeline_service_1 = require("./timeline.service");
const logger_1 = require("@bookease/logger");
class TimelineController {
    /**
     * Get timeline for a specific appointment
     */
    getTimeline = async (req, res) => {
        try {
            const appointmentId = req.params.id;
            const tenantId = String(req.headers['x-tenant-id'] || '');
            const { limit, offset, eventType } = req.query;
            // Validate required parameters
            if (!appointmentId || !tenantId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_PARAMETERS',
                        message: 'Appointment ID and tenant ID are required'
                    }
                });
            }
            const query = {
                appointmentId,
                tenantId,
                limit: limit ? Number(limit) : undefined,
                offset: offset ? Number(offset) : undefined,
                eventType: eventType
            };
            const result = await timeline_service_1.timelineService.getTimeline(query);
            res.json({
                success: true,
                data: result
            });
        }
        catch (error) {
            logger_1.logger.error({
                error: error.message,
                appointmentId: req.params.id,
                tenantId: req.headers['x-tenant-id']
            }, 'Get timeline failed');
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to get timeline'
                }
            });
        }
    };
    /**
     * Get timeline summary for analytics
     */
    getTimelineSummary = async (req, res) => {
        try {
            const appointmentId = req.params.id;
            const tenantId = String(req.headers['x-tenant-id'] || '');
            // Validate required parameters
            if (!appointmentId || !tenantId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_PARAMETERS',
                        message: 'Appointment ID and tenant ID are required'
                    }
                });
            }
            const summary = await timeline_service_1.timelineService.getTimelineSummary(appointmentId, tenantId);
            res.json({
                success: true,
                data: summary
            });
        }
        catch (error) {
            logger_1.logger.error({
                error: error.message,
                appointmentId: req.params.id,
                tenantId: req.headers['x-tenant-id']
            }, 'Get timeline summary failed');
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to get timeline summary'
                }
            });
        }
    };
    /**
     * Verify timeline immutability (admin only)
     */
    verifyImmutability = async (req, res) => {
        try {
            const appointmentId = req.params.id;
            const tenantId = String(req.headers['x-tenant-id'] || '');
            // Validate required parameters
            if (!appointmentId || !tenantId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_PARAMETERS',
                        message: 'Appointment ID and tenant ID are required'
                    }
                });
            }
            // Check admin role (basic check - in production, use proper auth middleware)
            const userRole = req.user?.role || req.headers['x-user-role'];
            if (userRole !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin access required to verify timeline immutability'
                    }
                });
            }
            const verification = await timeline_service_1.timelineService.verifyImmutability(appointmentId, tenantId);
            res.json({
                success: true,
                data: verification
            });
        }
        catch (error) {
            logger_1.logger.error({
                error: error.message,
                appointmentId: req.params.id,
                tenantId: req.headers['x-tenant-id']
            }, 'Verify timeline immutability failed');
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to verify timeline immutability'
                }
            });
        }
    };
    /**
     * Test timeline performance (admin only)
     */
    testPerformance = async (req, res) => {
        try {
            const tenantId = String(req.headers['x-tenant-id'] || '');
            const { appointmentId, iterations = 100 } = req.body;
            // Check admin role
            const userRole = req.user?.role || req.headers['x-user-role'];
            if (userRole !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin access required to test performance'
                    }
                });
            }
            if (!appointmentId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_APPOINTMENT_ID',
                        message: 'Appointment ID is required for performance testing'
                    }
                });
            }
            const results = [];
            for (let i = 0; i < iterations; i++) {
                const startTime = Date.now();
                await timeline_service_1.timelineService.getTimeline({
                    appointmentId,
                    tenantId,
                    limit: 50,
                    offset: 0
                });
                const duration = Date.now() - startTime;
                results.push(duration);
            }
            const avgDuration = results.reduce((sum, duration) => sum + duration, 0) / results.length;
            const maxDuration = Math.max(...results);
            const minDuration = Math.min(...results);
            const under200ms = results.filter(duration => duration < 200).length;
            const performanceResult = {
                iterations,
                averageDuration: `${avgDuration.toFixed(2)}ms`,
                maxDuration: `${maxDuration}ms`,
                minDuration: `${minDuration}ms`,
                under200msCount: under200ms,
                under200msPercentage: `${((under200ms / iterations) * 100).toFixed(1)}%`,
                meetsRequirement: avgDuration < 200
            };
            logger_1.logger.info({
                tenantId,
                appointmentId,
                ...performanceResult
            }, 'Timeline performance test completed');
            res.json({
                success: true,
                data: performanceResult
            });
        }
        catch (error) {
            logger_1.logger.error({
                error: error.message,
                tenantId: req.headers['x-tenant-id']
            }, 'Timeline performance test failed');
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to test timeline performance'
                }
            });
        }
    };
}
exports.TimelineController = TimelineController;
exports.timelineController = new TimelineController();
