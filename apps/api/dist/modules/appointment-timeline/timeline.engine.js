"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentTimelineEngine = void 0;
const timeline_schema_1 = require("./timeline.schema");
const prisma_1 = require("../../lib/prisma");
const crypto_1 = require("crypto");
class AppointmentTimelineEngine {
    correlationContexts = new Map();
    metrics = {
        totalTimelineEvents: 0,
        totalAuditLogs: 0,
        averageTimelineFetchTime: 0,
        averageAuditLogTime: 0,
        duplicateEventsPrevented: 0,
        asyncLoggingFailures: 0,
        lastReset: new Date().toISOString(),
    };
    // Create correlation context for a request
    createCorrelationContext(userId, userRole, metadata) {
        const context = {
            correlationId: (0, crypto_1.randomUUID)(),
            userId,
            userRole,
            sessionId: metadata?.sessionId,
            ipAddress: metadata?.ipAddress,
            userAgent: metadata?.userAgent,
            requestId: metadata?.requestId,
            startTime: new Date().toISOString(),
        };
        this.correlationContexts.set(context.correlationId, context);
        return context;
    }
    // Add timeline event
    async addTimelineEvent(appointmentId, eventType, userId, userRole, data, options) {
        const correlationId = options?.correlationId || this.createCorrelationContext(userId, userRole).correlationId;
        const eventData = {
            appointmentId,
            eventType,
            timestamp: new Date().toISOString(),
            userId,
            userRole,
            data,
            metadata: {
                correlationId,
                ipAddress: this.correlationContexts.get(correlationId)?.ipAddress,
                userAgent: this.correlationContexts.get(correlationId)?.userAgent,
                sessionId: this.correlationContexts.get(correlationId)?.sessionId,
            },
            previousState: options?.previousState,
            newState: options?.newState,
            reason: options?.reason,
            isSystemGenerated: options?.isSystemGenerated || false,
            createdAt: new Date().toISOString(),
        };
        // Validate event data
        const validatedEvent = timeline_schema_1.timelineEventSchema.parse(eventData);
        // Check for duplicates (prevent duplicate logs)
        const isDuplicate = await this.checkForDuplicateEvent(validatedEvent);
        if (isDuplicate) {
            this.metrics.duplicateEventsPrevented++;
            return validatedEvent;
        }
        // Create timeline event asynchronously
        this.createTimelineEventAsync(validatedEvent);
        this.metrics.totalTimelineEvents++;
        return validatedEvent;
    }
    // Add audit log
    async addAuditLog(action, entityType, entityId, userId, userRole, details, options) {
        const correlationId = options?.correlationId || this.createCorrelationContext(userId, userRole).correlationId;
        const auditData = {
            action,
            entityType,
            entityId,
            userId,
            userRole,
            timestamp: new Date().toISOString(),
            details,
            metadata: {
                correlationId,
                ipAddress: this.correlationContexts.get(correlationId)?.ipAddress,
                userAgent: this.correlationContexts.get(correlationId)?.userAgent,
                sessionId: this.correlationContexts.get(correlationId)?.sessionId,
                requestId: this.correlationContexts.get(correlationId)?.requestId,
                apiEndpoint: options?.apiEndpoint,
                httpMethod: options?.httpMethod,
                responseTime: options?.responseTime,
                statusCode: options?.statusCode,
            },
            success: options?.success !== false, // Default to true
            errorMessage: options?.errorMessage,
            aiUsage: options?.aiUsage,
            createdAt: new Date().toISOString(),
        };
        // Validate audit data
        const validatedAudit = timeline_schema_1.auditLogSchema.parse(auditData);
        // Create audit log asynchronously (non-blocking)
        this.createAuditLogAsync(validatedAudit);
        this.metrics.totalAuditLogs++;
    }
    // Track AI usage
    async trackAIUsage(correlationId, model, prompt, response, tokensUsed, processingTime, confidence, success = true, errorMessage, metadata) {
        const aiUsageData = {
            correlationId,
            model,
            prompt,
            response,
            tokensUsed,
            processingTime,
            confidence,
            success,
            errorMessage,
            metadata,
            createdAt: new Date().toISOString(),
        };
        // Validate AI usage data
        const validatedAIUsage = timeline_schema_1.aiUsageTrackingSchema.parse(aiUsageData);
        // Track AI usage asynchronously
        this.trackAIUsageAsync(validatedAIUsage);
    }
    // Get appointment timeline
    async getTimeline(query) {
        const startTime = Date.now();
        try {
            // Validate query
            const validatedQuery = timeline_schema_1.timelineQuerySchema.parse(query);
            // Build where clause
            const where = { appointmentId: validatedQuery.appointmentId };
            if (validatedQuery.eventTypes?.length) {
                where.eventType = { in: validatedQuery.eventTypes };
            }
            if (validatedQuery.startDate || validatedQuery.endDate) {
                where.timestamp = {};
                if (validatedQuery.startDate)
                    where.timestamp.gte = validatedQuery.startDate;
                if (validatedQuery.endDate)
                    where.timestamp.lte = validatedQuery.endDate;
            }
            if (validatedQuery.userId) {
                where.userId = validatedQuery.userId;
            }
            if (validatedQuery.userRole) {
                where.userRole = validatedQuery.userRole;
            }
            // Get events and total count in parallel
            const [events, total] = await Promise.all([
                prisma_1.prisma.timelineEvent.findMany({
                    where,
                    orderBy: { timestamp: 'desc' },
                    take: validatedQuery.limit,
                    skip: validatedQuery.offset,
                }),
                prisma_1.prisma.timelineEvent.count({ where }),
            ]);
            // Generate summary
            const summary = await this.generateTimelineSummary(validatedQuery.appointmentId);
            const endTime = Date.now();
            const fetchTime = endTime - startTime;
            this.updateAverageTimelineFetchTime(fetchTime);
            return {
                events: events,
                total,
                hasMore: validatedQuery.offset + events.length < total,
                appointmentId: validatedQuery.appointmentId,
                summary,
            };
        }
        catch (error) {
            throw error;
        }
    }
    // Get audit logs
    async getAuditLogs(query) {
        const startTime = Date.now();
        try {
            // Validate query
            const validatedQuery = timeline_schema_1.auditQuerySchema.parse(query);
            // Build where clause
            const where = {};
            if (validatedQuery.entityType)
                where.entityType = validatedQuery.entityType;
            if (validatedQuery.entityId)
                where.entityId = validatedQuery.entityId;
            if (validatedQuery.userId)
                where.userId = validatedQuery.userId;
            if (validatedQuery.userRole)
                where.userRole = validatedQuery.userRole;
            if (validatedQuery.action)
                where.action = validatedQuery.action;
            if (validatedQuery.correlationId)
                where.metadata = { correlationId: validatedQuery.correlationId };
            if (!validatedQuery.includeFailures) {
                where.success = true;
            }
            if (validatedQuery.startDate || validatedQuery.endDate) {
                where.timestamp = {};
                if (validatedQuery.startDate)
                    where.timestamp.gte = validatedQuery.startDate;
                if (validatedQuery.endDate)
                    where.timestamp.lte = validatedQuery.endDate;
            }
            // Get logs and total count in parallel
            const [logs, total] = await Promise.all([
                prisma_1.prisma.auditLog.findMany({
                    where,
                    orderBy: { timestamp: 'desc' },
                    take: validatedQuery.limit,
                    skip: validatedQuery.offset,
                }),
                prisma_1.prisma.auditLog.count({ where }),
            ]);
            // Generate summary
            const summary = await this.generateAuditSummary(where);
            const endTime = Date.now();
            const logTime = endTime - startTime;
            this.updateAverageAuditLogTime(logTime);
            return {
                logs: logs,
                total,
                hasMore: validatedQuery.offset + logs.length < total,
                summary,
            };
        }
        catch (error) {
            throw error;
        }
    }
    // Get metrics
    getMetrics() {
        return {
            ...this.metrics,
            activeCorrelationContexts: this.correlationContexts.size,
        };
    }
    // Reset metrics
    resetMetrics() {
        this.metrics = {
            totalTimelineEvents: 0,
            totalAuditLogs: 0,
            averageTimelineFetchTime: 0,
            averageAuditLogTime: 0,
            duplicateEventsPrevented: 0,
            asyncLoggingFailures: 0,
            lastReset: new Date().toISOString(),
        };
    }
    // Private methods
    async checkForDuplicateEvent(event) {
        // Check for duplicate event in last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const duplicate = await prisma_1.prisma.timelineEvent.findFirst({
            where: {
                appointmentId: event.appointmentId,
                eventType: event.eventType,
                userId: event.userId,
                timestamp: { gte: fiveMinutesAgo },
                data: event.data || {},
            },
        });
        return !!duplicate;
    }
    async createTimelineEventAsync(event) {
        try {
            await prisma_1.prisma.timelineEvent.create({
                data: event,
            });
        }
        catch (error) {
            this.metrics.asyncLoggingFailures++;
            // Log error but don't throw - async logging should not block requests
            console.error('Failed to create timeline event:', error);
        }
    }
    async createAuditLogAsync(audit) {
        try {
            await prisma_1.prisma.auditLog.create({
                data: audit,
            });
        }
        catch (error) {
            this.metrics.asyncLoggingFailures++;
            // Log error but don't throw - async logging should not block requests
            console.error('Failed to create audit log:', error);
        }
    }
    async trackAIUsageAsync(aiUsage) {
        try {
            await prisma_1.prisma.aiUsageTracking.create({
                data: aiUsage,
            });
        }
        catch (error) {
            this.metrics.asyncLoggingFailures++;
            // Log error but don't throw - async tracking should not block requests
            console.error('Failed to track AI usage:', error);
        }
    }
    async generateTimelineSummary(appointmentId) {
        const summary = await prisma_1.prisma.timelineEvent.groupBy({
            by: ['eventType'],
            where: { appointmentId },
            _count: { eventType: true },
            _max: { timestamp: true },
            _min: { timestamp: true },
        });
        const events = summary.reduce((acc, item) => {
            acc[item.eventType] = item._count.eventType;
            return acc;
        }, {});
        const timestamps = await prisma_1.prisma.timelineEvent.aggregate({
            where: { appointmentId },
            _min: { timestamp: true },
            _max: { timestamp: true },
        });
        return {
            created: timestamps._min.timestamp,
            lastModified: timestamps._max.timestamp,
            statusChanges: events[timeline_schema_1.TimelineEventType.STATUS_CHANGED] || 0,
            reschedules: events[timeline_schema_1.TimelineEventType.RESCHEDULED] || 0,
            cancellations: events[timeline_schema_1.TimelineEventType.CANCELLED] || 0,
            completions: events[timeline_schema_1.TimelineEventType.COMPLETED] || 0,
            noShows: events[timeline_schema_1.TimelineEventType.NO_SHOW] || 0,
            aiSummaries: events[timeline_schema_1.TimelineEventType.AI_SUMMARY_GENERATED] || 0,
        };
    }
    async generateAuditSummary(where) {
        const [actionCounts, aiStats, userStats] = await Promise.all([
            prisma_1.prisma.auditLog.groupBy({
                by: ['action'],
                where,
                _count: { action: true },
                orderBy: { _count: { action: 'desc' } },
                take: 5,
            }),
            prisma_1.prisma.auditLog.aggregate({
                where: { ...where, aiUsage: { not: null } },
                _count: { aiUsage: true },
                _sum: {
                    'aiUsage': {
                        tokensUsed: true,
                        processingTime: true,
                    },
                },
                _avg: {
                    'aiUsage': {
                        processingTime: true,
                        confidence: true,
                    },
                },
            }),
            prisma_1.prisma.auditLog.groupBy({
                by: ['userId'],
                where,
                _count: { userId: true },
                orderBy: { _count: { userId: 'desc' } },
                take: 5,
            }),
        ]);
        const totalActions = actionCounts.reduce((sum, item) => sum + item._count.action, 0);
        const successfulActions = await prisma_1.prisma.auditLog.count({ where: { ...where, success: true } });
        const failedActions = totalActions - successfulActions;
        return {
            totalActions,
            successfulActions,
            failedActions,
            aiUsage: {
                totalRequests: aiStats._count.aiUsage || 0,
                totalTokens: aiStats._sum.aiUsage?.tokensUsed || 0,
                averageProcessingTime: aiStats._avg.aiUsage?.processingTime || 0,
                averageConfidence: aiStats._avg.aiUsage?.confidence || 0,
            },
            topActions: actionCounts.map(item => ({
                action: item.action,
                count: item._count.action,
            })),
            topUsers: userStats.map(item => ({
                userId: item.userId,
                actionCount: item._count.userId,
            })),
        };
    }
    updateAverageTimelineFetchTime(newTime) {
        if (this.metrics.totalTimelineEvents === 0) {
            this.metrics.averageTimelineFetchTime = newTime;
        }
        else {
            this.metrics.averageTimelineFetchTime =
                (this.metrics.averageTimelineFetchTime + newTime) / 2;
        }
    }
    updateAverageAuditLogTime(newTime) {
        if (this.metrics.totalAuditLogs === 0) {
            this.metrics.averageAuditLogTime = newTime;
        }
        else {
            this.metrics.averageAuditLogTime =
                (this.metrics.averageAuditLogTime + newTime) / 2;
        }
    }
    // Cleanup old correlation contexts (memory management)
    cleanupCorrelationContexts(maxAgeHours = 24) {
        const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
        for (const [correlationId, context] of this.correlationContexts.entries()) {
            if (new Date(context.startTime) < cutoffTime) {
                this.correlationContexts.delete(correlationId);
            }
        }
    }
}
exports.AppointmentTimelineEngine = AppointmentTimelineEngine;
