import api from './client';
import type { ApiSuccessResponse } from '../types/api';

export interface OptimizedTimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  optimization: {
    gapBefore: number;
    gapAfter: number;
    score: number;
  };
}

export interface StaffRecommendation {
  staff: {
    id: string;
    name: string;
    email?: string;
    photoUrl?: string;
    bio?: string;
  };
  score: number;
  reasons: {
    performance: number;
    availability: number;
    workload: number;
    skills: number;
  };
}

export interface PeakHour {
  hour: number;
  appointments: number;
  peak: boolean;
}

export interface PeakDay {
  day: string;
  dayIndex: number;
  appointments: number;
  peak: boolean;
}

export interface SchedulingRecommendation {
  type: 'staffing' | 'marketing' | 'growth';
  message: string;
  priority: 'high' | 'medium' | 'low';
}

export const smartSchedulingApi = {
  /**
   * Get optimized time slots for a service
   */
  getOptimizedTimeSlots: (serviceId: string, date: string) => 
    api.get<ApiSuccessResponse<{
      service: any;
      availableSlots: OptimizedTimeSlot[];
      recommendations: Array<{
        time: string;
        reason: string;
        score: number;
      }>;
    }>>(`/smart-scheduling/time-slots/${serviceId}?date=${date}`),

  /**
   * Get staff recommendations for a service
   */
  getStaffRecommendations: (serviceId: string, customerPreferences?: any) => 
    api.post<ApiSuccessResponse<{
      recommendations: StaffRecommendation[];
      totalStaff: number;
    }>>(`/smart-scheduling/staff-recommendations/${serviceId}`, customerPreferences),

  /**
   * Get peak hours analysis
   */
  getPeakHours: (params?: {
    serviceId?: string;
    days?: number;
  }) => 
    api.get<ApiSuccessResponse<{
      analysis: {
        totalAppointments: number;
        period: string;
        hourlyData: { [hour: number]: number };
        weeklyData: number[];
      };
      insights: {
        peakHours: PeakHour[];
        peakDays: PeakDay[];
        recommendations: SchedulingRecommendation[];
      };
    }>>('/smart-scheduling/peak-hours', params),
};
