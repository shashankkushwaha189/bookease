"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartSchedulingService = void 0;
const prisma_1 = require("../../lib/prisma");
const logger_1 = require("@bookease/logger");
class SmartSchedulingService {
    // Time Slot Optimization - Fill gaps intelligently
    async getOptimizedTimeSlots(tenantId, serviceId, date) {
        try {
            // Get service details
            const service = await prisma_1.prisma.service.findFirst({
                where: { id: serviceId, tenantId },
                include: {
                    staffServices: {
                        include: {
                            staff: {
                                include: {
                                    user: true
                                }
                            }
                        }
                    }
                }
            });
            if (!service)
                throw new Error('Service not found');
            // Get all staff schedules for this service
            const staffIds = service.staffServices.map(ss => ss.staffId);
            const staffSchedules = await prisma_1.prisma.weeklySchedule.findMany({
                where: {
                    staffId: { in: staffIds },
                    isWorking: true
                }
            });
            // Get existing appointments for the day
            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);
            const existingAppointments = await prisma_1.prisma.appointment.findMany({
                where: {
                    tenantId,
                    startTimeUtc: { gte: dayStart, lte: dayEnd },
                    status: { not: 'CANCELLED' }
                },
                include: { staff: true }
            });
            // Generate available time slots
            const availableSlots = this.generateAvailableSlots(staffSchedules, existingAppointments, service.durationMinutes, date);
            // Optimize slots by finding gaps and suggesting best times
            const optimizedSlots = this.optimizeTimeSlots(availableSlots, service.durationMinutes);
            return {
                success: true,
                data: {
                    service,
                    availableSlots: optimizedSlots,
                    recommendations: this.generateSlotRecommendations(optimizedSlots)
                }
            };
        }
        catch (error) {
            logger_1.logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error getting optimized time slots');
            throw error;
        }
    }
    // Staff Recommendations - Skills-based matching
    async getRecommendedStaff(tenantId, serviceId, customerPreferences) {
        try {
            // Get service and associated staff
            const service = await prisma_1.prisma.service.findFirst({
                where: { id: serviceId, tenantId },
                include: {
                    staffServices: {
                        include: {
                            staff: {
                                include: {
                                    user: true,
                                    appointments: {
                                        where: {
                                            status: 'COMPLETED',
                                            startTimeUtc: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });
            if (!service)
                throw new Error('Service not found');
            // Calculate staff scores based on multiple factors
            const staffScores = service.staffServices.map(ss => {
                const staff = ss.staff;
                const completedAppointments = staff.appointments.length;
                const totalStaff = service.staffServices.length;
                // Base score from completed appointments (performance)
                const performanceScore = completedAppointments > 0 ? Math.min(completedAppointments / 10, 1) : 0.1;
                // Availability score (check if they have working hours today)
                const availabilityScore = this.calculateAvailabilityScore(staff.id);
                // Workload balance (prefer staff with fewer appointments today)
                const workloadScore = this.calculateWorkloadScore(staff.id);
                // Skills match score (if staff has specific skills for this service)
                const skillsScore = this.calculateSkillsScore(staff, service);
                // Final weighted score
                const finalScore = (performanceScore * 0.3 +
                    availabilityScore * 0.3 +
                    workloadScore * 0.2 +
                    skillsScore * 0.2);
                return {
                    staff: {
                        id: staff.id,
                        name: staff.name,
                        email: staff.user?.email,
                        photoUrl: staff.photoUrl,
                        bio: staff.bio
                    },
                    score: Math.round(finalScore * 100),
                    reasons: {
                        performance: Math.round(performanceScore * 100),
                        availability: Math.round(availabilityScore * 100),
                        workload: Math.round(workloadScore * 100),
                        skills: Math.round(skillsScore * 100)
                    }
                };
            });
            // Sort by score (highest first)
            staffScores.sort((a, b) => b.score - a.score);
            return {
                success: true,
                data: {
                    recommendations: staffScores.slice(0, 5), // Top 5 recommendations
                    totalStaff: service.staffServices.length
                }
            };
        }
        catch (error) {
            logger_1.logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error getting staff recommendations');
            throw error;
        }
    }
    // Peak Hour Detection - Historical pattern analysis
    async getPeakHours(tenantId, serviceId, days = 30) {
        try {
            const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            // Get appointment data for analysis
            const appointments = await prisma_1.prisma.appointment.findMany({
                where: {
                    tenantId,
                    startTimeUtc: { gte: startDate },
                    status: 'COMPLETED',
                    ...(serviceId && { serviceId })
                },
                include: {
                    service: true,
                    staff: true
                }
            });
            // Analyze patterns by hour of day
            const hourlyData = this.analyzeHourlyPatterns(appointments);
            // Analyze patterns by day of week
            const weeklyData = this.analyzeWeeklyPatterns(appointments);
            // Detect peak hours and days
            const peakHours = this.detectPeakHours(hourlyData);
            const peakDays = this.detectPeakDays(weeklyData);
            // Generate recommendations
            const recommendations = this.generateSchedulingRecommendations(peakHours, peakDays, appointments.length);
            return {
                success: true,
                data: {
                    analysis: {
                        totalAppointments: appointments.length,
                        period: `${days} days`,
                        hourlyData,
                        weeklyData
                    },
                    insights: {
                        peakHours,
                        peakDays,
                        recommendations
                    }
                }
            };
        }
        catch (error) {
            logger_1.logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error analyzing peak hours');
            throw error;
        }
    }
    // Helper methods
    generateAvailableSlots(schedules, appointments, duration, date) {
        const slots = [];
        const workingHours = { start: 8, end: 20 }; // 8am to 8pm
        for (let hour = workingHours.start; hour < workingHours.end; hour++) {
            const slotStart = new Date(date);
            slotStart.setHours(hour, 0, 0, 0);
            const slotEnd = new Date(date);
            slotEnd.setHours(hour + 1, 0, 0, 0);
            // Check if slot conflicts with existing appointments
            const isAvailable = !appointments.some((apt) => (apt.startTimeUtc < slotEnd && apt.endTimeUtc > slotStart));
            if (isAvailable) {
                slots.push({
                    startTime: slotStart,
                    endTime: slotEnd,
                    available: true
                });
            }
        }
        return slots;
    }
    optimizeTimeSlots(slots, duration) {
        // Find gaps and suggest optimal booking times
        const optimized = slots.map((slot, index) => {
            const gapBefore = index > 0 ?
                slot.startTime.getTime() - slots[index - 1].endTime.getTime() :
                0;
            const gapAfter = index < slots.length - 1 ?
                slots[index + 1].startTime.getTime() - slot.endTime.getTime() :
                0;
            return {
                ...slot,
                optimization: {
                    gapBefore: Math.round(gapBefore / (1000 * 60)), // in minutes
                    gapAfter: Math.round(gapAfter / (1000 * 60)),
                    score: this.calculateSlotScore(gapBefore, gapAfter, index, slots.length)
                }
            };
        });
        // Sort by optimization score
        return optimized.sort((a, b) => b.optimization.score - a.optimization.score);
    }
    calculateSlotScore(gapBefore, gapAfter, index, total) {
        // Higher score for slots that fill gaps
        let score = 50; // Base score
        if (gapBefore > 30 * 60 * 1000)
            score += 20; // Large gap before
        if (gapAfter > 30 * 60 * 1000)
            score += 20; // Large gap after
        // Prefer middle slots during peak times
        if (index >= total * 0.3 && index <= total * 0.7)
            score += 10;
        return Math.min(score, 100);
    }
    generateSlotRecommendations(slots) {
        return slots
            .filter(slot => slot.optimization.score > 70)
            .slice(0, 3)
            .map(slot => ({
            time: slot.startTime,
            reason: this.getRecommendationReason(slot.optimization),
            score: slot.optimization.score
        }));
    }
    getRecommendationReason(optimization) {
        if (optimization.gapBefore > 30 * 60 * 1000 && optimization.gapAfter > 30 * 60 * 1000) {
            return "Fills a large gap in the schedule";
        }
        if (optimization.gapBefore > 30 * 60 * 1000) {
            return "Optimal after previous appointment";
        }
        if (optimization.gapAfter > 30 * 60 * 1000) {
            return "Optimal before next appointment";
        }
        return "Good time slot";
    }
    calculateAvailabilityScore(staffId) {
        // Simplified: check if staff has working hours today
        // In real implementation, check actual schedule
        return 0.8; // Placeholder
    }
    calculateWorkloadScore(staffId) {
        // Simplified: check current workload for today
        // In real implementation, count today's appointments
        return 0.7; // Placeholder
    }
    calculateSkillsScore(staff, service) {
        // Simplified: check if staff has relevant skills
        // In real implementation, check staff skills vs service requirements
        return 0.9; // Placeholder
    }
    analyzeHourlyPatterns(appointments) {
        const hourlyData = {};
        for (let hour = 0; hour < 24; hour++) {
            hourlyData[hour] = 0;
        }
        appointments.forEach(apt => {
            const hour = new Date(apt.startTimeUtc).getHours();
            hourlyData[hour]++;
        });
        return hourlyData;
    }
    analyzeWeeklyPatterns(appointments) {
        const weeklyData = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
        appointments.forEach(apt => {
            const day = new Date(apt.startTimeUtc).getDay();
            const adjustedDay = day === 0 ? 6 : day - 1; // Convert to Mon=0 format
            weeklyData[adjustedDay]++;
        });
        return weeklyData;
    }
    detectPeakHours(hourlyData) {
        const maxAppointments = Math.max(...Object.values(hourlyData));
        const threshold = maxAppointments * 0.7; // 70% of peak
        return Object.entries(hourlyData)
            .filter(([_, count]) => count >= threshold)
            .map(([hour, count]) => ({
            hour: parseInt(hour),
            appointments: count,
            peak: count === maxAppointments
        }))
            .sort((a, b) => b.appointments - a.appointments);
    }
    detectPeakDays(weeklyData) {
        const maxAppointments = Math.max(...weeklyData);
        const threshold = maxAppointments * 0.7;
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return weeklyData
            .map((count, index) => ({
            day: dayNames[index],
            dayIndex: index,
            appointments: count,
            peak: count === maxAppointments
        }))
            .filter(day => day.appointments >= threshold)
            .sort((a, b) => b.appointments - a.appointments);
    }
    generateSchedulingRecommendations(peakHours, peakDays, totalAppointments) {
        const recommendations = [];
        if (peakHours.length > 0) {
            recommendations.push({
                type: 'staffing',
                message: `Schedule more staff during peak hours: ${peakHours.map(h => `${h.hour}:00`).join(', ')}`,
                priority: 'high'
            });
        }
        if (peakDays.length > 0) {
            recommendations.push({
                type: 'marketing',
                message: `Promote services during peak days: ${peakDays.map(d => d.day).join(', ')}`,
                priority: 'medium'
            });
        }
        if (totalAppointments < 100) {
            recommendations.push({
                type: 'growth',
                message: 'Consider running promotions to increase booking volume',
                priority: 'low'
            });
        }
        return recommendations;
    }
}
exports.SmartSchedulingService = SmartSchedulingService;
