"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportingArchivalEngine = void 0;
const reporting_schema_1 = require("./reporting.schema");
const prisma_1 = require("../../lib/prisma");
class ReportingArchivalEngine {
    metrics = {
        totalReportsGenerated: 0,
        averageReportGenerationTime: 0,
        totalExportsGenerated: 0,
        totalArchivedAppointments: 0,
        archivalJobsCompleted: 0,
        archivalJobsFailed: 0,
        lastReset: new Date().toISOString(),
    };
    // Generate report
    async generateReport(query) {
        const startTime = Date.now();
        try {
            // Validate query
            const validatedQuery = reporting_schema_1.reportQuerySchema.parse(query);
            let data;
            switch (validatedQuery.reportType) {
                case reporting_schema_1.ReportType.APPOINTMENTS_BY_SERVICE:
                    data = await this.generateServiceReport(validatedQuery);
                    break;
                case reporting_schema_1.ReportType.APPOINTMENTS_BY_STAFF:
                    data = await this.generateStaffReport(validatedQuery);
                    break;
                case reporting_schema_1.ReportType.NO_SHOW_RATE:
                    data = await this.generateNoShowReport(validatedQuery);
                    break;
                case reporting_schema_1.ReportType.PEAK_BOOKING_TIMES:
                    data = await this.generatePeakTimesReport(validatedQuery);
                    break;
                default:
                    throw new Error(`Unsupported report type: ${validatedQuery.reportType}`);
            }
            const endTime = Date.now();
            const generationTime = endTime - startTime;
            this.metrics.totalReportsGenerated++;
            this.updateAverageReportGenerationTime(generationTime);
            return {
                reportType: validatedQuery.reportType,
                generatedAt: new Date().toISOString(),
                data,
                summary: {
                    totalRecords: Array.isArray(data) ? data.length : 1,
                    generatedIn: generationTime,
                    hasMore: validatedQuery.offset + (Array.isArray(data) ? data.length : 1) >= validatedQuery.limit,
                    filters: validatedQuery.filters,
                },
                metadata: {
                    startDate: validatedQuery.startDate,
                    endDate: validatedQuery.endDate,
                    timePeriod: validatedQuery.timePeriod,
                    includeArchived: validatedQuery.includeArchived,
                },
            };
        }
        catch (error) {
            throw error;
        }
    }
    // Export report data
    async exportReport(request) {
        // Validate request
        const validatedRequest = reporting_schema_1.exportRequestSchema.parse(request);
        const filename = validatedRequest.filename || `${request.reportType}_${new Date().toISOString().split('T')[0]}.${request.format.toLowerCase()}`;
        let exportedData;
        let mimeType;
        switch (validatedRequest.format) {
            case reporting_schema_1.ExportFormat.CSV:
                exportedData = this.exportToCSV(validatedRequest.data, validatedRequest);
                mimeType = 'text/csv';
                break;
            case reporting_schema_1.ExportFormat.JSON:
                exportedData = JSON.stringify(validatedRequest.data, null, 2);
                mimeType = 'application/json';
                break;
            default:
                throw new Error(`Unsupported export format: ${validatedRequest.format}`);
        }
        this.metrics.totalExportsGenerated++;
        return {
            filename,
            data: exportedData,
            mimeType,
        };
    }
    // Configure archival settings
    async configureArchival(config) {
        const validatedConfig = reporting_schema_1.archivalConfigSchema.parse(config);
        // Check if configuration exists
        const existing = await prisma_1.prisma.archivalConfig.findFirst({
            where: { tenantId: validatedConfig.tenantId },
        });
        if (existing) {
            const updated = await prisma_1.prisma.archivalConfig.update({
                where: { id: existing.id },
                data: validatedConfig,
            });
            return updated;
        }
        else {
            const created = await prisma_1.prisma.archivalConfig.create({
                data: validatedConfig,
            });
            return created;
        }
    }
    // Get archival configuration
    async getArchivalConfig(tenantId) {
        const config = await prisma_1.prisma.archivalConfig.findFirst({
            where: { tenantId, enabled: true },
        });
        return config;
    }
    // Run archival job
    async runArchivalJob(tenantId) {
        const config = await this.getArchivalConfig(tenantId);
        if (!config) {
            throw new Error('Archival not configured for this tenant');
        }
        // Create archival job
        const job = await prisma_1.prisma.archivalJob.create({
            data: {
                tenantId,
                status: 'RUNNING',
                startedAt: new Date(),
                totalAppointments: 0,
                archivedAppointments: 0,
                failedAppointments: 0,
            },
        });
        // Run archival asynchronously (non-blocking)
        this.processArchivalJob(job.id, config).catch(error => {
            console.error('Archival job failed:', error);
        });
        return job;
    }
    // Search archived appointments
    async searchArchivedAppointments(search) {
        const validatedSearch = reporting_schema_1.archiveSearchSchema.parse(search);
        // Build where clause for archive search
        const where = {
            tenantId: validatedSearch.tenantId,
        };
        if (validatedSearch.query) {
            where.OR = [
                { customerName: { contains: validatedSearch.query, mode: 'insensitive' } },
                { customerEmail: { contains: validatedSearch.query, mode: 'insensitive' } },
                { staffName: { contains: validatedSearch.query, mode: 'insensitive' } },
                { serviceName: { contains: validatedSearch.query, mode: 'insensitive' } },
                { referenceId: { contains: validatedSearch.query, mode: 'insensitive' } },
            ];
        }
        if (validatedSearch.customerId) {
            where.customerId = validatedSearch.customerId;
        }
        if (validatedSearch.staffId) {
            where.staffId = validatedSearch.staffId;
        }
        if (validatedSearch.serviceId) {
            where.serviceId = validatedSearch.serviceId;
        }
        if (validatedSearch.referenceId) {
            where.referenceId = validatedSearch.referenceId;
        }
        if (validatedSearch.status) {
            where.status = validatedSearch.status;
        }
        if (validatedSearch.startDate || validatedSearch.endDate) {
            where.startTimeUtc = {};
            if (validatedSearch.startDate)
                where.startTimeUtc.gte = validatedSearch.startDate;
            if (validatedSearch.endDate)
                where.startTimeUtc.lte = validatedSearch.endDate;
        }
        // Get archived appointments and total count
        const [appointments, total] = await Promise.all([
            prisma_1.prisma.appointmentArchive.findMany({
                where,
                orderBy: { [validatedSearch.sortBy]: validatedSearch.sortOrder },
                take: validatedSearch.limit,
                skip: validatedSearch.offset,
            }),
            prisma_1.prisma.appointmentArchive.count({ where }),
        ]);
        // Generate summary
        const summary = await this.generateArchiveSummary(validatedSearch.tenantId, where);
        return {
            appointments: appointments.map(apt => ({
                id: apt.id,
                originalId: apt.originalId,
                customerId: apt.customerId,
                customerName: apt.customerName,
                customerEmail: apt.customerEmail,
                staffId: apt.staffId,
                staffName: apt.staffName,
                serviceId: apt.serviceId,
                serviceName: apt.serviceName,
                startTimeUtc: apt.startTimeUtc.toISOString(),
                endTimeUtc: apt.endTimeUtc.toISOString(),
                status: apt.status,
                referenceId: apt.referenceId,
                notes: apt.notes || undefined,
                totalAmount: apt.totalAmount || undefined,
                archivedAt: apt.archivedAt.toISOString(),
                archivedBy: apt.archivedBy || undefined,
            })),
            total,
            hasMore: validatedSearch.offset + appointments.length < total,
            summary,
        };
    }
    // Get archival job status
    async getArchivalJob(jobId) {
        const job = await prisma_1.prisma.archivalJob.findUnique({
            where: { id: jobId },
        });
        return job;
    }
    // Get archival jobs
    async getArchivalJobs(tenantId) {
        const jobs = await prisma_1.prisma.archivalJob.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        return jobs;
    }
    // Get metrics
    getMetrics() {
        return {
            ...this.metrics,
            averageReportGenerationTime: this.metrics.averageReportGenerationTime,
        };
    }
    // Reset metrics
    resetMetrics() {
        this.metrics = {
            totalReportsGenerated: 0,
            averageReportGenerationTime: 0,
            totalExportsGenerated: 0,
            totalArchivedAppointments: 0,
            archivalJobsCompleted: 0,
            archivalJobsFailed: 0,
            lastReset: new Date().toISOString(),
        };
    }
    // Private methods
    async generateServiceReport(query) {
        const where = this.buildWhereClause(query);
        const appointments = await prisma_1.prisma.appointment.findMany({
            where,
            include: {
                service: true,
            },
        });
        // Group by service
        const serviceData = appointments.reduce((acc, apt) => {
            const serviceId = apt.serviceId;
            if (!acc[serviceId]) {
                acc[serviceId] = {
                    serviceId,
                    serviceName: apt.service?.name || 'Unknown Service',
                    totalAppointments: 0,
                    completedAppointments: 0,
                    cancelledAppointments: 0,
                    noShowAppointments: 0,
                    revenue: 0,
                    ratings: [],
                    timeSlots: {},
                };
            }
            const service = acc[serviceId];
            service.totalAppointments++;
            switch (apt.status) {
                case 'COMPLETED':
                    service.completedAppointments++;
                    break;
                case 'CANCELLED':
                    service.cancelledAppointments++;
                    break;
                case 'NO_SHOW':
                    service.noShowAppointments++;
                    break;
            }
            // Add revenue (would come from payment records)
            service.revenue += 0; // Placeholder
            // Track time slots
            const hour = new Date(apt.startTimeUtc).getHours();
            service.timeSlots[hour] = (service.timeSlots[hour] || 0) + 1;
            return acc;
        }, {});
        // Convert to array and calculate popular time slots
        return Object.values(serviceData).map(service => ({
            ...service,
            averageRating: service.ratings.length > 0
                ? service.ratings.reduce((sum, rating) => sum + rating, 0) / service.ratings.length
                : undefined,
            popularTimeSlots: Object.entries(service.timeSlots)
                .map(([hour, count]) => ({ hour: parseInt(hour), count: count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5),
        }));
    }
    async generateStaffReport(query) {
        const where = this.buildWhereClause(query);
        const appointments = await prisma_1.prisma.appointment.findMany({
            where,
            include: {
                staff: true,
                service: true,
            },
        });
        // Group by staff
        const staffData = appointments.reduce((acc, apt) => {
            const staffId = apt.staffId;
            if (!acc[staffId]) {
                acc[staffId] = {
                    staffId,
                    staffName: apt.staff?.name || 'Unknown Staff',
                    totalAppointments: 0,
                    completedAppointments: 0,
                    cancelledAppointments: 0,
                    noShowAppointments: 0,
                    revenue: 0,
                    ratings: [],
                    totalHours: 0,
                    services: {},
                };
            }
            const staff = acc[staffId];
            staff.totalAppointments++;
            switch (apt.status) {
                case 'COMPLETED':
                    staff.completedAppointments++;
                    break;
                case 'CANCELLED':
                    staff.cancelledAppointments++;
                    break;
                case 'NO_SHOW':
                    staff.noShowAppointments++;
                    break;
            }
            // Calculate hours
            const duration = (new Date(apt.endTimeUtc).getTime() - new Date(apt.startTimeUtc).getTime()) / (1000 * 60 * 60);
            staff.totalHours += duration;
            // Track services
            const serviceName = apt.service?.name || 'Unknown Service';
            staff.services[serviceName] = (staff.services[serviceName] || 0) + 1;
            return acc;
        }, {});
        // Convert to array and calculate additional metrics
        return Object.values(staffData).map(staff => ({
            ...staff,
            averageRating: staff.ratings.length > 0
                ? staff.ratings.reduce((sum, rating) => sum + rating, 0) / staff.ratings.length
                : undefined,
            utilizationRate: staff.totalHours > 0 ? (staff.completedAppointments / staff.totalHours) * 100 : 0,
            topServices: Object.entries(staff.services)
                .map(([serviceName, count]) => ({ serviceName, count: count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .map((svc, index) => ({
                serviceId: `service-${index}`, // Placeholder
                serviceName: svc.serviceName,
                count: svc.count,
            })),
        }));
    }
    async generateNoShowReport(query) {
        const where = this.buildWhereClause(query);
        const appointments = await prisma_1.prisma.appointment.findMany({
            where,
            include: {
                service: true,
                staff: true,
                customer: true,
            },
        });
        // Calculate overall no-show rate
        const totalAppointments = appointments.length;
        const noShowCount = appointments.filter(apt => apt.status === 'NO_SHOW').length;
        const noShowRate = totalAppointments > 0 ? (noShowCount / totalAppointments) * 100 : 0;
        // Group by service
        const byService = appointments.reduce((acc, apt) => {
            const serviceId = apt.serviceId;
            if (!acc[serviceId]) {
                acc[serviceId] = {
                    serviceId,
                    serviceName: apt.service?.name || 'Unknown Service',
                    total: 0,
                    noShows: 0,
                };
            }
            acc[serviceId].total++;
            if (apt.status === 'NO_SHOW')
                acc[serviceId].noShows++;
            return acc;
        }, {});
        // Group by staff
        const byStaff = appointments.reduce((acc, apt) => {
            const staffId = apt.staffId;
            if (!acc[staffId]) {
                acc[staffId] = {
                    staffId,
                    staffName: apt.staff?.name || 'Unknown Staff',
                    total: 0,
                    noShows: 0,
                };
            }
            acc[staffId].total++;
            if (apt.status === 'NO_SHOW')
                acc[staffId].noShows++;
            return acc;
        }, {});
        // Group by time of day
        const byTimeOfDay = appointments.reduce((acc, apt) => {
            const hour = new Date(apt.startTimeUtc).getHours();
            if (!acc[hour]) {
                acc[hour] = { hour, total: 0, noShows: 0 };
            }
            acc[hour].total++;
            if (apt.status === 'NO_SHOW')
                acc[hour].noShows++;
            return acc;
        }, {});
        // Group by day of week
        const byDayOfWeek = appointments.reduce((acc, apt) => {
            const dayOfWeek = new Date(apt.startTimeUtc).getDay();
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            if (!acc[dayOfWeek]) {
                acc[dayOfWeek] = {
                    dayOfWeek,
                    dayName: dayNames[dayOfWeek],
                    total: 0,
                    noShows: 0,
                };
            }
            acc[dayOfWeek].total++;
            if (apt.status === 'NO_SHOW')
                acc[dayOfWeek].noShows++;
            return acc;
        }, {});
        return {
            period: `${query.startDate} to ${query.endDate}`,
            totalAppointments,
            noShowCount,
            noShowRate,
            byService: Object.values(byService).map(service => ({
                serviceId: service.serviceId,
                serviceName: service.serviceName,
                noShowRate: service.total > 0 ? (service.noShows / service.total) * 100 : 0,
                count: service.noShows,
            })),
            byStaff: Object.values(byStaff).map(staff => ({
                staffId: staff.staffId,
                staffName: staff.staffName,
                noShowRate: staff.total > 0 ? (staff.noShows / staff.total) * 100 : 0,
                count: staff.noShows,
            })),
            byTimeOfDay: Object.values(byTimeOfDay).map(time => ({
                hour: time.hour,
                noShowRate: time.total > 0 ? (time.noShows / time.total) * 100 : 0,
                count: time.noShows,
            })),
            byDayOfWeek: Object.values(byDayOfWeek).map(day => ({
                dayOfWeek: day.dayOfWeek,
                dayName: day.dayName,
                noShowRate: day.total > 0 ? (day.noShows / day.total) * 100 : 0,
                count: day.noShows,
            })),
        };
    }
    async generatePeakTimesReport(query) {
        const where = this.buildWhereClause(query);
        const appointments = await prisma_1.prisma.appointment.findMany({
            where,
        });
        // Analyze hourly patterns
        const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
            hour,
            appointmentCount: 0,
            revenue: 0,
            utilization: 0,
        }));
        appointments.forEach(apt => {
            const hour = new Date(apt.startTimeUtc).getHours();
            hourlyData[hour].appointmentCount++;
            hourlyData[hour].revenue += 0; // Placeholder
        });
        // Calculate utilization (simplified)
        hourlyData.forEach(hour => {
            hour.utilization = hour.appointmentCount > 0 ? (hour.appointmentCount / 10) * 100 : 0; // Assume 10 slots per hour
        });
        // Generate recommendations based on data
        const recommendations = this.generateRecommendations(hourlyData, appointments);
        return {
            hourlyData,
            dailyData: [], // Would implement daily aggregation
            weeklyData: [], // Would implement weekly aggregation
            monthlyData: [], // Would implement monthly aggregation
            recommendations,
        };
    }
    buildWhereClause(query) {
        const where = {
            tenantId: query.tenantId,
            startTimeUtc: {
                gte: new Date(query.startDate),
                lte: new Date(query.endDate),
            },
        };
        if (!query.includeArchived) {
            where.deletedAt = null;
        }
        if (query.filters) {
            if (query.filters.serviceIds?.length) {
                where.serviceId = { in: query.filters.serviceIds };
            }
            if (query.filters.staffIds?.length) {
                where.staffId = { in: query.filters.staffIds };
            }
            if (query.filters.customerIds?.length) {
                where.customerId = { in: query.filters.customerIds };
            }
            if (query.filters.statuses?.length) {
                where.status = { in: query.filters.statuses };
            }
        }
        return where;
    }
    exportToCSV(data, request) {
        if (!Array.isArray(data) || data.length === 0) {
            return '';
        }
        const headers = request.includeHeaders ? Object.keys(data[0]).join(',') : '';
        const rows = data.map(item => Object.values(item).map(value => typeof value === 'string' && value.includes(',') ? `"${value}"` : value).join(','));
        return [headers, ...rows].join('\n');
    }
    async processArchivalJob(jobId, config) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setMonth(cutoffDate.getMonth() - config.archiveAfterMonths);
            const excludeDate = new Date();
            excludeDate.setDate(excludeDate.getDate() - config.excludeRecentDays);
            // Find appointments to archive
            const appointmentsToArchive = await prisma_1.prisma.appointment.findMany({
                where: {
                    tenantId: config.tenantId,
                    status: { in: config.archiveStatuses },
                    startTimeUtc: { lt: cutoffDate },
                    startTimeUtc: { lt: excludeDate },
                    deletedAt: null,
                },
                take: config.batchSize,
            });
            if (appointmentsToArchive.length === 0) {
                await prisma_1.prisma.archivalJob.update({
                    where: { id: jobId },
                    data: {
                        status: 'COMPLETED',
                        completedAt: new Date(),
                    },
                });
                return;
            }
            // Archive appointments in batches
            let archivedCount = 0;
            let failedCount = 0;
            for (const apt of appointmentsToArchive) {
                try {
                    // Create archive record
                    await prisma_1.prisma.appointmentArchive.create({
                        data: {
                            originalId: apt.id,
                            tenantId: apt.tenantId,
                            customerId: apt.customerId,
                            customerName: '', // Would get from customer
                            customerEmail: '', // Would get from customer
                            staffId: apt.staffId,
                            staffName: '', // Would get from staff
                            serviceId: apt.serviceId,
                            serviceName: '', // Would get from service
                            startTimeUtc: apt.startTimeUtc,
                            endTimeUtc: apt.endTimeUtc,
                            status: apt.status,
                            referenceId: apt.referenceId,
                            notes: apt.notes,
                            totalAmount: 0, // Would get from payment
                            archivedAt: new Date(),
                            archivedBy: 'system',
                        },
                    });
                    // Soft delete original appointment
                    await prisma_1.prisma.appointment.update({
                        where: { id: apt.id },
                        data: { deletedAt: new Date() },
                    });
                    archivedCount++;
                }
                catch (error) {
                    failedCount++;
                    console.error('Failed to archive appointment:', apt.id, error);
                }
            }
            // Update job status
            await prisma_1.prisma.archivalJob.update({
                where: { id: jobId },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date(),
                    totalAppointments: appointmentsToArchive.length,
                    archivedAppointments: archivedCount,
                    failedAppointments: failedCount,
                },
            });
            this.metrics.totalArchivedAppointments += archivedCount;
            this.metrics.archivalJobsCompleted++;
            // Continue if there are more appointments to archive
            if (archivedCount === config.batchSize) {
                // Schedule next batch (non-blocking)
                setTimeout(() => this.processArchivalJob(jobId, config), 1000);
            }
        }
        catch (error) {
            await prisma_1.prisma.archivalJob.update({
                where: { id: jobId },
                data: {
                    status: 'FAILED',
                    completedAt: new Date(),
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                },
            });
            this.metrics.archivalJobsFailed++;
        }
    }
    async generateArchiveSummary(tenantId, where) {
        const [totalArchived, dateRange, statusBreakdown] = await Promise.all([
            prisma_1.prisma.appointmentArchive.count({ where }),
            prisma_1.prisma.appointmentArchive.aggregate({
                where,
                _min: { archivedAt: true },
                _max: { archivedAt: true },
            }),
            prisma_1.prisma.appointmentArchive.groupBy({
                where,
                by: ['status'],
                _count: { status: true },
            }),
        ]);
        return {
            totalArchived,
            dateRange: {
                earliest: dateRange._min.archivedAt?.toISOString() || '',
                latest: dateRange._max.archivedAt?.toISOString() || '',
            },
            statusBreakdown: statusBreakdown.reduce((acc, item) => {
                acc[item.status] = item._count.status;
                return acc;
            }, {}),
        };
    }
    generateRecommendations(hourlyData, appointments) {
        const recommendations = [];
        // Find peak hours
        const peakHours = hourlyData
            .filter(h => h.appointmentCount > 0)
            .sort((a, b) => b.appointmentCount - a.appointmentCount)
            .slice(0, 3);
        if (peakHours.length > 0) {
            const peakHoursList = peakHours.map(h => h.hour + ':00').join(', ');
            recommendations.push({
                type: 'STAFFING',
                priority: 'HIGH',
                title: 'Increase Staff During Peak Hours',
                description: 'Peak hours are ' + peakHoursList + '. Consider adding more staff during these times.',
                impact: 'Improved customer service and reduced wait times',
            });
        }
        // Find underutilized hours
        const underutilizedHours = hourlyData
            .filter(h => h.utilization < 30 && h.appointmentCount > 0)
            .sort((a, b) => a.utilization - b.utilization);
        if (underutilizedHours.length > 0) {
            const underutilizedHoursList = underutilizedHours.slice(0, 3).map(h => h.hour + ':00').join(', ');
            recommendations.push({
                type: 'MARKETING',
                priority: 'MEDIUM',
                title: 'Promote Off-Peak Hours',
                description: 'Hours ' + underutilizedHoursList + ' have low utilization. Consider offering discounts for these times.',
                impact: 'Better resource utilization and increased revenue',
            });
        }
        return recommendations;
    }
    updateAverageReportGenerationTime(newTime) {
        if (this.metrics.averageReportGenerationTime === 0) {
            this.metrics.averageReportGenerationTime = newTime;
        }
        else {
            this.metrics.averageReportGenerationTime =
                (this.metrics.averageReportGenerationTime + newTime) / 2;
        }
    }
}
exports.ReportingArchivalEngine = ReportingArchivalEngine;
