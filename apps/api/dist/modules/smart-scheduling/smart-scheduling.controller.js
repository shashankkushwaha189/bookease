"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.smartSchedulingController = exports.SmartSchedulingController = void 0;
const smart_scheduling_service_1 = require("./smart-scheduling.service");
const logger_1 = require("@bookease/logger");
class SmartSchedulingController {
    smartSchedulingService;
    constructor() {
        this.smartSchedulingService = new smart_scheduling_service_1.SmartSchedulingService();
    }
    // Get optimized time slots for a service
    async getOptimizedTimeSlots(req, res) {
        try {
            const { tenantId } = req;
            const { serviceId } = req.params;
            const serviceIdStr = Array.isArray(serviceId) ? serviceId[0] : serviceId;
            const { date } = req.query;
            if (!serviceId || !date) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'BAD_REQUEST',
                        message: 'Service ID and date are required'
                    }
                });
            }
            const result = await this.smartSchedulingService.getOptimizedTimeSlots(tenantId, serviceIdStr, new Date(date));
            res.json({
                success: true,
                data: result.data
            });
        }
        catch (error) {
            logger_1.logger.error('Error in getOptimizedTimeSlots:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to get optimized time slots'
                }
            });
        }
    }
    // Get staff recommendations for a service
    async getStaffRecommendations(req, res) {
        try {
            const { tenantId } = req;
            const { serviceId } = req.params;
            const serviceIdStr = Array.isArray(serviceId) ? serviceId[0] : serviceId;
            if (!serviceId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'BAD_REQUEST',
                        message: 'Service ID is required'
                    }
                });
            }
            const result = await this.smartSchedulingService.getRecommendedStaff(tenantId, serviceIdStr, req.body.customerPreferences);
            res.json({
                success: true,
                data: result.data
            });
        }
        catch (error) {
            logger_1.logger.error('Error in getStaffRecommendations:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to get staff recommendations'
                }
            });
        }
    }
    // Get peak hours analysis
    async getPeakHours(req, res) {
        try {
            const { tenantId } = req;
            const { serviceId } = req.query;
            const { days = 30 } = req.query;
            const result = await this.smartSchedulingService.getPeakHours(tenantId, serviceId, parseInt(days));
            res.json({
                success: true,
                data: result.data
            });
        }
        catch (error) {
            logger_1.logger.error('Error in getPeakHours:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to analyze peak hours'
                }
            });
        }
    }
}
exports.SmartSchedulingController = SmartSchedulingController;
exports.smartSchedulingController = new SmartSchedulingController();
