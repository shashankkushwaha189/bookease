import { Request, Response } from 'express';
import { SmartSchedulingService } from './smart-scheduling.service';
import { logger } from '@bookease/logger';

export class SmartSchedulingController {
  private smartSchedulingService: SmartSchedulingService;

  constructor() {
    this.smartSchedulingService = new SmartSchedulingService();
  }

  // Get optimized time slots for a service
  async getOptimizedTimeSlots(req: Request, res: Response) {
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

      const result = await this.smartSchedulingService.getOptimizedTimeSlots(
        tenantId!,
        serviceIdStr,
        new Date(date as string)
      );

      res.json({
        success: true,
        data: result.data
      });
    } catch (error: any) {
      logger.error('Error in getOptimizedTimeSlots:', error);
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
  async getStaffRecommendations(req: Request, res: Response) {
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

      const result = await this.smartSchedulingService.getRecommendedStaff(
        tenantId!,
        serviceIdStr,
        req.body.customerPreferences
      );

      res.json({
        success: true,
        data: result.data
      });
    } catch (error: any) {
      logger.error('Error in getStaffRecommendations:', error);
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
  async getPeakHours(req: Request, res: Response) {
    try {
      const { tenantId } = req;
      const { serviceId } = req.query;
      const { days = 30 } = req.query;

      const result = await this.smartSchedulingService.getPeakHours(
        tenantId!,
        serviceId as string,
        parseInt(days as string)
      );

      res.json({
        success: true,
        data: result.data
      });
    } catch (error: any) {
      logger.error('Error in getPeakHours:', error);
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

export const smartSchedulingController = new SmartSchedulingController();
