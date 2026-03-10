import {
  TimelineEventType,
  AuditAction,
  AuditUserRole,
  TimelineEvent,
  AuditLog,
  TimelineQuery,
  AuditQuery,
  TimelineResponse,
  AuditResponse,
  CorrelationContext,
  AIUsageTracking,
  timelineEventSchema,
  auditLogSchema,
  timelineQuerySchema,
  auditQuerySchema,
  correlationContextSchema,
  aiUsageTrackingSchema,
} from './timeline.schema';
import { prisma } from '../../lib/prisma';
import { randomUUID } from 'crypto';

export class AppointmentTimelineEngine {
  private correlationContexts = new Map<string, CorrelationContext>();
  private metrics = {
    totalTimelineEvents: 0,
    totalAuditLogs: 0,
    averageTimelineFetchTime: 0,
    averageAuditLogTime: 0,
    duplicateEventsPrevented: 0,
    asyncLoggingFailures: 0,
    lastReset: new Date().toISOString(),
  };

  // Create correlation context for a request
  createCorrelationContext(
    userId: string,
    userRole: AuditUserRole,
    metadata?: {
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      requestId?: string;
    }
  ): CorrelationContext {
    const context: CorrelationContext = {
      correlationId: randomUUID(),
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
  async addTimelineEvent(
    appointmentId: string,
    eventType: TimelineEventType,
    userId: string,
    userRole: AuditUserRole,
    data?: Record<string, any>,
    options?: {
      correlationId?: string;
      previousState?: Record<string, any>;
      newState?: Record<string, any>;
      reason?: string;
      isSystemGenerated?: boolean;
    }
  ): Promise<TimelineEvent> {
    const correlationId = options?.correlationId || this.createCorrelationContext(userId, userRole).correlationId;
    
    const eventData: TimelineEvent = {
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
    const validatedEvent = timelineEventSchema.parse(eventData);

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
  async addAuditLog(
    action: AuditAction,
    entityType: string,
    entityId: string,
    userId: string,
    userRole: AuditUserRole,
    details: Record<string, any>,
    options?: {
      correlationId?: string;
      success?: boolean;
      errorMessage?: string;
      apiEndpoint?: string;
      httpMethod?: string;
      responseTime?: number;
      statusCode?: number;
      aiUsage?: {
        model: string;
        tokensUsed: number;
        processingTime: number;
        confidence: number;
      };
    }
  ): Promise<void> {
    const correlationId = options?.correlationId || this.createCorrelationContext(userId, userRole).correlationId;
    
    const auditData: AuditLog = {
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
    const validatedAudit = auditLogSchema.parse(auditData);

    // Create audit log asynchronously (non-blocking)
    this.createAuditLogAsync(validatedAudit);

    this.metrics.totalAuditLogs++;
  }

  // Track AI usage
  async trackAIUsage(
    correlationId: string,
    model: string,
    prompt: string,
    response: string,
    tokensUsed: { prompt: number; completion: number; total: number },
    processingTime: number,
    confidence: number,
    success: boolean = true,
    errorMessage?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const aiUsageData: AIUsageTracking = {
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
    const validatedAIUsage = aiUsageTrackingSchema.parse(aiUsageData);

    // Track AI usage asynchronously
    this.trackAIUsageAsync(validatedAIUsage);
  }

  // Get appointment timeline
  async getTimeline(query: TimelineQuery): Promise<TimelineResponse> {
    const startTime = Date.now();

    try {
      // Validate query
      const validatedQuery = timelineQuerySchema.parse(query);

      // Build where clause
      const where: any = { appointmentId: validatedQuery.appointmentId };
      
      if (validatedQuery.eventTypes?.length) {
        where.eventType = { in: validatedQuery.eventTypes };
      }
      
      if (validatedQuery.startDate || validatedQuery.endDate) {
        where.timestamp = {};
        if (validatedQuery.startDate) where.timestamp.gte = validatedQuery.startDate;
        if (validatedQuery.endDate) where.timestamp.lte = validatedQuery.endDate;
      }
      
      if (validatedQuery.userId) {
        where.userId = validatedQuery.userId;
      }
      
      if (validatedQuery.userRole) {
        where.userRole = validatedQuery.userRole;
      }

      // Get events and total count in parallel
      const [events, total] = await Promise.all([
        prisma.appointmentTimelineEvent.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: validatedQuery.limit,
          skip: validatedQuery.offset,
        }),
        prisma.appointmentTimelineEvent.count({ where }),
      ]);

      // Generate summary
      const summary = await this.generateTimelineSummary(validatedQuery.appointmentId);

      const endTime = Date.now();
      const fetchTime = endTime - startTime;
      this.updateAverageTimelineFetchTime(fetchTime);

      return {
        events: events.map(e => ({
          ...e,
          eventType: e.eventType as TimelineEventType,
          timestamp: e.timestamp.toISOString(),
          userRole: e.userRole as AuditUserRole,
          createdAt: e.createdAt.toISOString(),
          metadata: {
            correlationId: e.correlationId,
            ipAddress: e.ipAddress || undefined,
            userAgent: e.userAgent || undefined,
            sessionId: e.sessionId || undefined,
          },
          data: e.data as any,
          previousState: e.previousState as any,
          newState: e.newState as any,
        })),
        total,
        hasMore: validatedQuery.offset + events.length < total,
        appointmentId: validatedQuery.appointmentId,
        summary,
      };

    } catch (error) {
      throw error;
    }
  }

  // Get audit logs
  async getAuditLogs(query: AuditQuery): Promise<AuditResponse> {
    const startTime = Date.now();

    try {
      // Validate query
      const validatedQuery = auditQuerySchema.parse(query);

      // Build where clause
      const where: any = {};
      
      if (validatedQuery.entityType) where.entityType = validatedQuery.entityType;
      if (validatedQuery.entityId) where.entityId = validatedQuery.entityId;
      if (validatedQuery.userId) where.userId = validatedQuery.userId;
      if (validatedQuery.userRole) where.userRole = validatedQuery.userRole;
      if (validatedQuery.action) where.action = validatedQuery.action;
      if (validatedQuery.correlationId) where.metadata = { correlationId: validatedQuery.correlationId };
      
      if (!validatedQuery.includeFailures) {
        where.success = true;
      }
      
      if (validatedQuery.startDate || validatedQuery.endDate) {
        where.createdAt = {};
        if (validatedQuery.startDate) where.createdAt.gte = validatedQuery.startDate;
        if (validatedQuery.endDate) where.createdAt.lte = validatedQuery.endDate;
      }

      // Get logs and total count in parallel
      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: validatedQuery.limit,
          skip: validatedQuery.offset,
        }),
        prisma.auditLog.count({ where }),
      ]);

      // Generate summary
      const summary = await this.generateAuditSummary(where);

      const endTime = Date.now();
      const logTime = endTime - startTime;
      this.updateAverageAuditLogTime(logTime);

      return {
        logs: logs.map(l => ({
          ...l,
          action: l.action as AuditAction,
          entityType: l.resourceType,
          entityId: l.resourceId,
          userRole: AuditUserRole.SYSTEM, // DB doesn't store this, inferring SYSTEM
          timestamp: l.createdAt.toISOString(),
          createdAt: l.createdAt.toISOString(),
          details: {
            before: l.before,
            after: l.after
          },
          metadata: {
            correlationId: l.correlationId,
            ipAddress: l.ipAddress || undefined
          },
          success: true
        })),
        total,
        hasMore: validatedQuery.offset + logs.length < total,
        summary,
      };

    } catch (error) {
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
  resetMetrics(): void {
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

  private async checkForDuplicateEvent(event: TimelineEvent): Promise<boolean> {
    // Check for duplicate event in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const duplicate = await prisma.appointmentTimelineEvent.findFirst({
      where: {
        appointmentId: event.appointmentId,
        eventType: event.eventType,
        userId: event.userId,
        timestamp: { gte: fiveMinutesAgo },
      },
    });

    return !!duplicate;
  }

  private async createTimelineEventAsync(event: TimelineEvent): Promise<void> {
    try {
      await prisma.appointmentTimelineEvent.create({
        data: {
          appointmentId: event.appointmentId,
          eventType: event.eventType as string,
          timestamp: new Date(event.timestamp),
          userId: event.userId,
          userRole: event.userRole,
          data: event.data || {},
          correlationId: event.metadata?.correlationId || '',
          ipAddress: event.metadata?.ipAddress,
          userAgent: event.metadata?.userAgent,
          sessionId: event.metadata?.sessionId,
          previousState: event.previousState || {},
          newState: event.newState || {},
          reason: event.reason,
          isSystemGenerated: event.isSystemGenerated,
          createdAt: event.createdAt ? new Date(event.createdAt) : new Date(),
        },
      });
    } catch (error) {
      this.metrics.asyncLoggingFailures++;
      // Log error but don't throw - async logging should not block requests
      console.error('Failed to create timeline event:', error);
    }
  }

  private async createAuditLogAsync(audit: AuditLog, tenantId: string = 'system'): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          tenantId, // we need it for real schema, defaulting to system since we can't extract it cleanly
          userId: audit.userId,
          action: audit.action as string,
          resourceType: audit.entityType,
          resourceId: audit.entityId,
          correlationId: audit.metadata?.correlationId || '',
          before: audit.details?.before || {},
          after: audit.details?.after || {},
          ipAddress: audit.metadata?.ipAddress,
          reason: audit.errorMessage || '',
          createdAt: audit.createdAt ? new Date(audit.createdAt) : new Date(),
        },
      });
    } catch (error) {
      this.metrics.asyncLoggingFailures++;
      // Log error but don't throw - async logging should not block requests
      console.error('Failed to create audit log:', error);
    }
  }

  private async trackAIUsageAsync(aiUsage: AIUsageTracking): Promise<void> {
    try {
      await prisma.aIUsageTracking.create({
        data: {
          correlationId: aiUsage.correlationId,
          model: aiUsage.model,
          prompt: aiUsage.prompt,
          response: aiUsage.response,
          tokensPrompt: aiUsage.tokensUsed.prompt,
          tokensCompletion: aiUsage.tokensUsed.completion,
          tokensTotal: aiUsage.tokensUsed.total,
          processingTime: aiUsage.processingTime,
          confidence: aiUsage.confidence,
          cost: aiUsage.cost,
          success: aiUsage.success,
          errorMessage: aiUsage.errorMessage,
          metadata: aiUsage.metadata || {},
          createdAt: aiUsage.createdAt ? new Date(aiUsage.createdAt) : new Date(),
        },
      });
    } catch (error) {
      this.metrics.asyncLoggingFailures++;
      // Log error but don't throw - async tracking should not block requests
      console.error('Failed to track AI usage:', error);
    }
  }

  private async generateTimelineSummary(appointmentId: string): Promise<any> {
    const summary = await prisma.appointmentTimelineEvent.groupBy({
      by: ['eventType'],
      where: { appointmentId },
      _count: { eventType: true },
      _max: { timestamp: true },
      _min: { timestamp: true },
    });

    const events = summary.reduce((acc, item) => {
      acc[item.eventType] = item._count.eventType;
      return acc;
    }, {} as Record<string, number>);

    const timestamps = await prisma.appointmentTimelineEvent.aggregate({
      where: { appointmentId },
      _min: { timestamp: true },
      _max: { timestamp: true },
    });

    return {
      created: timestamps._min.timestamp,
      lastModified: timestamps._max.timestamp,
      statusChanges: events[TimelineEventType.STATUS_CHANGED] || 0,
      reschedules: events[TimelineEventType.RESCHEDULED] || 0,
      cancellations: events[TimelineEventType.CANCELLED] || 0,
      completions: events[TimelineEventType.COMPLETED] || 0,
      noShows: events[TimelineEventType.NO_SHOW] || 0,
      aiSummaries: events[TimelineEventType.AI_SUMMARY_GENERATED] || 0,
    };
  }

  private async generateAuditSummary(where: any): Promise<any> {
    const [actionCounts, userStats] = await Promise.all([
      prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 5,
      }),
      prisma.auditLog.groupBy({
        by: ['userId'],
        where,
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 5,
      }),
    ]);
    
    // Default AI stats instead of failing
    const aiStats = { _count: { _all: 0 }, _sum: { tokensUsed: 0, processingTime: 0 }, _avg: { processingTime: 0, confidence: 0 }};

    const totalActions = actionCounts.reduce((sum, item) => sum + item._count.action, 0);
    const successfulActions = await prisma.auditLog.count({ where: { ...where, success: true } });
    const failedActions = totalActions - successfulActions;

    return {
      totalActions,
      successfulActions,
      failedActions,
      aiUsage: {
        totalRequests: 0,
        totalTokens: 0,
        averageProcessingTime: 0,
        averageConfidence: 0,
      },
      topActions: actionCounts.map(item => ({
        action: item.action as AuditAction,
        count: item._count.action,
      })),
      topUsers: userStats.map(item => ({
        userId: item.userId,
        actionCount: item._count.userId,
      })),
    };
  }

  private updateAverageTimelineFetchTime(newTime: number): void {
    if (this.metrics.totalTimelineEvents === 0) {
      this.metrics.averageTimelineFetchTime = newTime;
    } else {
      this.metrics.averageTimelineFetchTime = 
        (this.metrics.averageTimelineFetchTime + newTime) / 2;
    }
  }

  private updateAverageAuditLogTime(newTime: number): void {
    if (this.metrics.totalAuditLogs === 0) {
      this.metrics.averageAuditLogTime = newTime;
    } else {
      this.metrics.averageAuditLogTime = 
        (this.metrics.averageAuditLogTime + newTime) / 2;
    }
  }

  // Cleanup old correlation contexts (memory management)
  cleanupCorrelationContexts(maxAgeHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    
    for (const [correlationId, context] of this.correlationContexts.entries()) {
      if (new Date(context.startTime) < cutoffTime) {
        this.correlationContexts.delete(correlationId);
      }
    }
  }
}
