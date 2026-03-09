import {
  ImportType,
  ImportStatus,
  RowValidationStatus,
  ApiTokenType,
  RateLimitTier,
  ImportJob,
  ImportReport,
  RowValidationResult,
  CustomerCsvMapping,
  ServiceCsvMapping,
  StaffCsvMapping,
  ApiToken,
  ApiTokenResponse,
  RateLimit,
  RateLimitResponse,
  BookingRequest,
  BookingResponse,
  AvailabilityRequest,
  AvailabilityResponse,
  ImportQuery,
  ApiTokenQuery,
  importJobSchema,
  rowValidationSchema,
  importReportSchema,
  customerCsvMappingSchema,
  serviceCsvMappingSchema,
  staffCsvMappingSchema,
  apiTokenSchema,
  apiTokenResponseSchema,
  rateLimitSchema,
  rateLimitResponseSchema,
  bookingRequestSchema,
  bookingResponseSchema,
  availabilityRequestSchema,
  availabilityResponseSchema,
  importQuerySchema,
  apiTokenQuerySchema,
} from './integration.schema';
import { prisma } from '../../lib/prisma';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import { parse } from 'csv-parse';
import { validate as uuidValidate } from 'uuid';
import { isEmail, isNumeric, isMobilePhone } from 'validator';

export class IntegrationEngine {
  private metrics = {
    totalImports: 0,
    successfulImports: 0,
    partialImports: 0,
    failedImports: 0,
    totalApiCalls: 0,
    rateLimitHits: 0,
    averageProcessingTime: 0,
    lastReset: new Date().toISOString(),
  };

  // CSV Import Methods
  async createImportJob(jobData: ImportJob): Promise<ImportReport> {
    try {
      const validatedJob = importJobSchema.parse(jobData);

      const job = await prisma.importJob.create({
        data: {
          id: randomUUID(),
          tenantId: validatedJob.tenantId,
          importType: validatedJob.importType,
          fileName: validatedJob.fileName,
          fileSize: validatedJob.fileSize,
          totalRows: validatedJob.totalRows,
          status: ImportStatus.PENDING,
          options: validatedJob.options,
          startedAt: new Date(),
        },
      });

      this.metrics.totalImports++;

      return {
        jobId: job.id,
        importType: job.importType as ImportType,
        status: job.status as ImportStatus,
        startedAt: job.startedAt.toISOString(),
        totalRows: job.totalRows,
        processedRows: 0,
        successfulRows: 0,
        failedRows: 0,
        skippedRows: 0,
        duplicateRows: 0,
        validationResults: [],
        errors: [],
        summary: {
          successRate: 0,
          errorRate: 0,
          processingTime: 0,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async processImport(jobId: string, csvData: Buffer | Readable): Promise<ImportReport> {
    const startTime = Date.now();

    try {
      const job = await prisma.importJob.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new Error('Import job not found');
      }

      await prisma.importJob.update({
        where: { id: jobId },
        data: { status: ImportStatus.PROCESSING },
      });

      const results = await this.parseAndValidateCSV(job, csvData);
      const importResults = await this.importData(job, results);

      const endTime = Date.now();
      const processingTime = (endTime - startTime) / 1000;

      const finalStatus = this.determineImportStatus(importResults);
      
      await prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: finalStatus,
          completedAt: new Date(),
          processedRows: importResults.processedRows,
          successfulRows: importResults.successfulRows,
          failedRows: importResults.failedRows,
          skippedRows: importResults.skippedRows,
          duplicateRows: importResults.duplicateRows,
        },
      });

      this.updateImportMetrics(finalStatus, processingTime);

      return {
        jobId,
        importType: job.importType as ImportType,
        status: finalStatus,
        startedAt: job.startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        totalRows: job.totalRows,
        processedRows: importResults.processedRows,
        successfulRows: importResults.successfulRows,
        failedRows: importResults.failedRows,
        skippedRows: importResults.skippedRows,
        duplicateRows: importResults.duplicateRows,
        validationResults: importResults.validationResults,
        errors: importResults.errors,
        summary: {
          successRate: importResults.successfulRows / importResults.processedRows * 100,
          errorRate: importResults.failedRows / importResults.processedRows * 100,
          processingTime,
        },
      };
    } catch (error) {
      await prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: ImportStatus.FAILED,
          completedAt: new Date(),
        },
      });

      this.metrics.failedImports++;
      throw error;
    }
  }

  private async parseAndValidateCSV(job: any, csvData: Buffer | Readable): Promise<{
    validationResults: RowValidationResult[];
    validRows: any[];
    errors: string[];
  }> {
    const validationResults: RowValidationResult[] = [];
    const validRows: any[] = [];
    const errors: string[] = [];
    let rowNumber = 0;

    return new Promise((resolve, reject) => {
      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      parser.on('readable', () => {
        let record;
        while ((record = parser.read()) !== null) {
          rowNumber++;
          const validation = this.validateRow(record, job.importType, rowNumber);
          validationResults.push(validation);

          if (validation.isValid) {
            validRows.push(validation.data);
          }
        }
      });

      parser.on('error', (error) => {
        errors.push(`CSV parsing error: ${error.message}`);
      });

      parser.on('end', () => {
        resolve({ validationResults, validRows, errors });
      });

      if (csvData instanceof Buffer) {
        parser.write(csvData);
        parser.end();
      } else {
        csvData.pipe(parser);
      }
    });
  }

  private validateRow(record: any, importType: ImportType, rowNumber: number): RowValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (importType) {
      case ImportType.CUSTOMERS:
        return this.validateCustomerRow(record, rowNumber, errors, warnings);
      case ImportType.SERVICES:
        return this.validateServiceRow(record, rowNumber, errors, warnings);
      case ImportType.STAFF:
        return this.validateStaffRow(record, rowNumber, errors, warnings);
      default:
        throw new Error(`Unsupported import type: ${importType}`);
    }
  }

  private validateCustomerRow(record: any, rowNumber: number, errors: string[], warnings: string[]): RowValidationResult {
    // Required fields
    if (!record.name || record.name.trim() === '') {
      errors.push('Name is required');
    }

    if (!record.email || record.email.trim() === '') {
      errors.push('Email is required');
    } else if (!isEmail(record.email)) {
      errors.push('Invalid email format');
    }

    // Optional fields validation
    if (record.phone && !isMobilePhone(record.phone, 'any')) {
      warnings.push('Invalid phone format');
    }

    if (record.dateOfBirth) {
      const date = new Date(record.dateOfBirth);
      if (isNaN(date.getTime())) {
        errors.push('Invalid date of birth format');
      }
    }

    return {
      rowNumber,
      status: errors.length > 0 ? RowValidationStatus.INVALID : RowValidationStatus.VALID,
      data: record,
      errors,
      warnings,
      isValid: errors.length === 0,
    };
  }

  private validateServiceRow(record: any, rowNumber: number, errors: string[], warnings: string[]): RowValidationResult {
    // Required fields
    if (!record.name || record.name.trim() === '') {
      errors.push('Service name is required');
    }

    if (!record.duration || record.duration.trim() === '') {
      errors.push('Duration is required');
    } else if (!isNumeric(record.duration)) {
      errors.push('Duration must be a number (in minutes)');
    }

    if (!record.price || record.price.trim() === '') {
      errors.push('Price is required');
    } else if (!isNumeric(record.price)) {
      errors.push('Price must be a number');
    }

    return {
      rowNumber,
      status: errors.length > 0 ? RowValidationStatus.INVALID : RowValidationStatus.VALID,
      data: record,
      errors,
      warnings,
      isValid: errors.length === 0,
    };
  }

  private validateStaffRow(record: any, rowNumber: number, errors: string[], warnings: string[]): RowValidationResult {
    // Required fields
    if (!record.name || record.name.trim() === '') {
      errors.push('Staff name is required');
    }

    if (!record.email || record.email.trim() === '') {
      errors.push('Email is required');
    } else if (!isEmail(record.email)) {
      errors.push('Invalid email format');
    }

    // Optional fields validation
    if (record.phone && !isMobilePhone(record.phone, 'any')) {
      warnings.push('Invalid phone format');
    }

    return {
      rowNumber,
      status: errors.length > 0 ? RowValidationStatus.INVALID : RowValidationStatus.VALID,
      data: record,
      errors,
      warnings,
      isValid: errors.length === 0,
    };
  }

  private async importData(job: any, validationResults: { validationResults: RowValidationResult[]; validRows: any[]; errors: string[] }) {
    const { validationResults, validRows, errors } = validationResults;
    let successfulRows = 0;
    let failedRows = 0;
    let skippedRows = 0;
    let duplicateRows = 0;

    for (const validation of validationResults) {
      if (!validation.isValid) {
        failedRows++;
        continue;
      }

      try {
        const isDuplicate = await this.checkForDuplicate(validation.data, job.importType, job.tenantId);
        
        if (isDuplicate) {
          if (job.options.skipDuplicates) {
            skippedRows++;
            duplicateRows++;
            continue;
          } else {
            failedRows++;
            validation.errors.push('Duplicate record found');
            continue;
          }
        }

        await this.createRecord(validation.data, job.importType, job.tenantId);
        successfulRows++;
      } catch (error) {
        failedRows++;
        validation.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      validationResults,
      processedRows: validationResults.length,
      successfulRows,
      failedRows,
      skippedRows,
      duplicateRows,
      errors,
    };
  }

  private async checkForDuplicate(data: any, importType: ImportType, tenantId: string): Promise<boolean> {
    switch (importType) {
      case ImportType.CUSTOMERS:
        const existingCustomer = await prisma.customer.findFirst({
          where: {
            tenantId,
            email: data.email,
            deletedAt: null,
          },
        });
        return !!existingCustomer;

      case ImportType.SERVICES:
        const existingService = await prisma.service.findFirst({
          where: {
            tenantId,
            name: data.name,
            deletedAt: null,
          },
        });
        return !!existingService;

      case ImportType.STAFF:
        const existingStaff = await prisma.staff.findFirst({
          where: {
            tenantId,
            email: data.email,
            deletedAt: null,
          },
        });
        return !!existingStaff;

      default:
        return false;
    }
  }

  private async createRecord(data: any, importType: ImportType, tenantId: string) {
    switch (importType) {
      case ImportType.CUSTOMERS:
        await prisma.customer.create({
          data: {
            tenantId,
            name: data.name,
            email: data.email,
            phone: data.phone || null,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
            address: data.address ? JSON.parse(data.address) : null,
            notes: data.notes || null,
            status: 'ACTIVE',
            tags: [],
            consentGiven: false,
            totalVisits: 0,
            totalSpent: 0,
          },
        });
        break;

      case ImportType.SERVICES:
        await prisma.service.create({
          data: {
            tenantId,
            name: data.name,
            description: data.description || null,
            duration: parseInt(data.duration),
            price: parseFloat(data.price),
            category: data.category || 'GENERAL',
            color: data.color || '#007bff',
            isActive: true,
            allowOnlineBooking: true,
            requiresConfirmation: false,
            tags: [],
          },
        });
        break;

      case ImportType.STAFF:
        await prisma.staff.create({
          data: {
            tenantId,
            name: data.name,
            email: data.email,
            phone: data.phone || null,
            title: data.title || null,
            department: data.department || null,
            bio: data.bio || null,
            isActive: true,
            roles: ['STAFF'],
          },
        });
        break;
    }
  }

  private determineImportStatus(results: any): ImportStatus {
    if (results.failedRows === 0) {
      return ImportStatus.COMPLETED;
    } else if (results.successfulRows > 0) {
      return ImportStatus.PARTIAL_SUCCESS;
    } else {
      return ImportStatus.FAILED;
    }
  }

  private updateImportMetrics(status: ImportStatus, processingTime: number): void {
    switch (status) {
      case ImportStatus.COMPLETED:
        this.metrics.successfulImports++;
        break;
      case ImportStatus.PARTIAL_SUCCESS:
        this.metrics.partialImports++;
        break;
      case ImportStatus.FAILED:
        this.metrics.failedImports++;
        break;
    }

    if (this.metrics.averageProcessingTime === 0) {
      this.metrics.averageProcessingTime = processingTime;
    } else {
      this.metrics.averageProcessingTime = 
        (this.metrics.averageProcessingTime + processingTime) / 2;
    }
  }

  // API Token Management
  async createApiToken(tokenData: ApiToken): Promise<ApiTokenResponse> {
    try {
      const validatedToken = apiTokenSchema.parse(tokenData);
      const token = this.generateApiToken();

      const created = await prisma.apiToken.create({
        data: {
          tenantId: validatedToken.tenantId,
          name: validatedToken.name,
          tokenHash: this.hashToken(token),
          tokenType: validatedToken.tokenType,
          rateLimitTier: validatedToken.rateLimitTier,
          permissions: validatedToken.permissions,
          expiresAt: validatedToken.expiresAt ? new Date(validatedToken.expiresAt) : null,
          allowedIps: validatedToken.allowedIps,
          isActive: true,
          createdAt: new Date(),
        },
      });

      return {
        id: created.id,
        name: created.name,
        token, // Only returned on creation
        tokenType: created.tokenType as ApiTokenType,
        rateLimitTier: created.rateLimitTier as RateLimitTier,
        permissions: created.permissions,
        expiresAt: created.expiresAt?.toISOString(),
        createdAt: created.createdAt.toISOString(),
        lastUsed: created.lastUsed?.toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  async validateApiToken(token: string, tenantId: string): Promise<ApiToken | null> {
    const tokenHash = this.hashToken(token);

    const apiToken = await prisma.apiToken.findFirst({
      where: {
        tokenHash,
        tenantId,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (apiToken) {
      // Update last used timestamp
      await prisma.apiToken.update({
        where: { id: apiToken.id },
        data: { lastUsed: new Date() },
      });
    }

    return apiToken as ApiToken | null;
  }

  async revokeApiToken(tokenId: string, tenantId: string): Promise<void> {
    await prisma.apiToken.updateMany({
      where: {
        id: tokenId,
        tenantId,
      },
      data: {
        isActive: false,
      },
    });
  }

  // Rate Limiting
  async checkRateLimit(request: RateLimit): Promise<RateLimitResponse> {
    const tierLimits = {
      [RateLimitTier.BASIC]: { limit: 100, windowMs: 60000 },    // 100/minute
      [RateLimitTier.STANDARD]: { limit: 500, windowMs: 60000 },  // 500/minute
      [RateLimitTier.PREMIUM]: { limit: 2000, windowMs: 60000 },  // 2000/minute
      [RateLimitTier.ENTERPRISE]: { limit: 10000, windowMs: 60000 }, // 10000/minute
    };

    // Get token to determine rate limit tier
    let tier = RateLimitTier.BASIC; // Default tier
    if (request.tokenId) {
      const token = await prisma.apiToken.findUnique({
        where: { id: request.tokenId },
      });
      if (token) {
        tier = token.rateLimitTier as RateLimitTier;
      }
    }

    const limits = tierLimits[tier];
    const key = this.generateRateLimitKey(request);
    
    // This would typically use Redis for distributed rate limiting
    // For now, we'll simulate with in-memory tracking
    const currentTime = Date.now();
    const windowStart = currentTime - limits.windowMs;

    // Check if rate limit is exceeded
    const isAllowed = await this.checkRateLimitExceeded(key, limits.limit, windowStart);

    if (!isAllowed) {
      this.metrics.rateLimitHits++;
    }

    this.metrics.totalApiCalls++;

    return {
      allowed: isAllowed,
      remaining: Math.max(0, limits.limit - (isAllowed ? 1 : limits.limit)),
      resetTime: new Date(currentTime + limits.windowMs).toISOString(),
      limit: limits.limit,
      windowMs: limits.windowMs,
    };
  }

  // Booking API
  async createBooking(request: BookingRequest): Promise<BookingResponse> {
    const startTime = Date.now();

    try {
      const validatedRequest = bookingRequestSchema.parse(request);

      // Check availability
      const isAvailable = await this.checkBookingAvailability(
        validatedRequest.serviceId,
        validatedRequest.staffId,
        validatedRequest.startTimeUtc
      );

      if (!isAvailable) {
        return {
          success: false,
          errors: ['Requested time slot is not available'],
          warnings: [],
          bookingTime: Date.now() - startTime,
        };
      }

      // Create appointment (would use existing appointment engine)
      const appointment = await prisma.appointment.create({
        data: {
          tenantId: validatedRequest.tenantId,
          customerId: validatedRequest.customerId,
          serviceId: validatedRequest.serviceId,
          staffId: validatedRequest.staffId,
          startTimeUtc: new Date(validatedRequest.startTimeUtc),
          endTimeUtc: new Date(
            new Date(validatedRequest.startTimeUtc).getTime() + 
            this.getServiceDuration(validatedRequest.serviceId) * 60000
          ),
          status: 'CONFIRMED',
          referenceId: this.generateReferenceId(),
          source: validatedRequest.source,
        },
      });

      return {
        success: true,
        appointmentId: appointment.id,
        referenceId: appointment.referenceId,
        errors: [],
        warnings: [],
        bookingTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        bookingTime: Date.now() - startTime,
      };
    }
  }

  async checkAvailability(request: AvailabilityRequest): Promise<AvailabilityResponse> {
    const startTime = Date.now();

    try {
      const validatedRequest = availabilityRequestSchema.parse(request);

      // Get available slots (would use existing availability engine)
      const availableSlots = await this.getAvailableSlots(
        validatedRequest.serviceId,
        validatedRequest.staffId,
        validatedRequest.startDate,
        validatedRequest.endDate,
        validatedRequest.duration
      );

      return {
        availableSlots,
        totalSlots: availableSlots.length,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      throw error;
    }
  }

  // Query Methods
  async getImportJobs(query: ImportQuery): Promise<{ jobs: ImportReport[]; total: number; hasMore: boolean }> {
    const validatedQuery = importQuerySchema.parse(query);

    const where: any = { tenantId: validatedQuery.tenantId };
    if (validatedQuery.importType) where.importType = validatedQuery.importType;
    if (validatedQuery.status) where.status = validatedQuery.status;

    const jobs = await prisma.importJob.findMany({
      where,
      orderBy: { [validatedQuery.sortBy]: validatedQuery.sortOrder },
      take: validatedQuery.limit,
      skip: validatedQuery.offset,
    });

    const total = await prisma.importJob.count({ where });

    return {
      jobs: jobs.map(job => ({
        jobId: job.id,
        importType: job.importType as ImportType,
        status: job.status as ImportStatus,
        startedAt: job.startedAt.toISOString(),
        completedAt: job.completedAt?.toISOString(),
        totalRows: job.totalRows,
        processedRows: job.processedRows || 0,
        successfulRows: job.successfulRows || 0,
        failedRows: job.failedRows || 0,
        skippedRows: job.skippedRows || 0,
        duplicateRows: job.duplicateRows || 0,
        validationResults: [],
        errors: [],
        summary: {
          successRate: job.processedRows > 0 ? (job.successfulRows || 0) / job.processedRows * 100 : 0,
          errorRate: job.processedRows > 0 ? (job.failedRows || 0) / job.processedRows * 100 : 0,
          processingTime: 0,
        },
      })),
      total,
      hasMore: validatedQuery.offset + jobs.length < total,
    };
  }

  async getApiTokens(query: ApiTokenQuery): Promise<{ tokens: ApiTokenResponse[]; total: number; hasMore: boolean }> {
    const validatedQuery = apiTokenQuerySchema.parse(query);

    const where: any = { tenantId: validatedQuery.tenantId };
    if (validatedQuery.tokenType) where.tokenType = validatedQuery.tokenType;
    if (validatedQuery.isActive !== undefined) where.isActive = validatedQuery.isActive;

    const tokens = await prisma.apiToken.findMany({
      where,
      orderBy: { [validatedQuery.sortBy]: validatedQuery.sortOrder },
      take: validatedQuery.limit,
      skip: validatedQuery.offset,
    });

    const total = await prisma.apiToken.count({ where });

    return {
      tokens: tokens.map(token => ({
        id: token.id,
        name: token.name,
        token: '***', // Never return the actual token in queries
        tokenType: token.tokenType as ApiTokenType,
        rateLimitTier: token.rateLimitTier as RateLimitTier,
        permissions: token.permissions,
        expiresAt: token.expiresAt?.toISOString(),
        createdAt: token.createdAt.toISOString(),
        lastUsed: token.lastUsed?.toISOString(),
      })),
      total,
      hasMore: validatedQuery.offset + tokens.length < total,
    };
  }

  // Metrics
  getMetrics() {
    return {
      ...this.metrics,
      averageProcessingTime: this.metrics.averageProcessingTime,
    };
  }

  resetMetrics(): void {
    this.metrics = {
      totalImports: 0,
      successfulImports: 0,
      partialImports: 0,
      failedImports: 0,
      totalApiCalls: 0,
      rateLimitHits: 0,
      averageProcessingTime: 0,
      lastReset: new Date().toISOString(),
    };
  }

  // Private helper methods
  private generateApiToken(): string {
    return randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
  }

  private hashToken(token: string): string {
    // In production, use a proper hashing algorithm like bcrypt
    return require('crypto').createHash('sha256').update(token).digest('hex');
  }

  private generateRateLimitKey(request: RateLimit): string {
    const parts = [request.tenantId, request.endpoint];
    if (request.tokenId) parts.push(request.tokenId);
    if (request.ip) parts.push(request.ip);
    return parts.join(':');
  }

  private async checkRateLimitExceeded(key: string, limit: number, windowStart: number): Promise<boolean> {
    // This would typically use Redis for distributed rate limiting
    // For now, we'll always return true (allow request)
    return true;
  }

  private async checkBookingAvailability(serviceId: string, staffId: string, startTimeUtc: string): Promise<boolean> {
    // Check if the time slot is available
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        serviceId,
        staffId,
        startTimeUtc: new Date(startTimeUtc),
        status: { not: 'CANCELLED' },
        deletedAt: null,
      },
    });

    return !existingAppointment;
  }

  private async getServiceDuration(serviceId: string): Promise<number> {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { duration: true },
    });

    return service?.duration || 60; // Default 60 minutes
  }

  private generateReferenceId(): string {
    return 'BK-' + Date.now().toString(36).toUpperCase();
  }

  private async getAvailableSlots(
    serviceId: string,
    staffId: string | undefined,
    startDate: string,
    endDate: string,
    duration: number
  ): Promise<any[]> {
    // This would use the existing availability engine
    // For now, return empty array
    return [];
  }
}
