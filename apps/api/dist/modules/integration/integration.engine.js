"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationEngine = void 0;
const integration_schema_1 = require("./integration.schema");
const prisma_1 = require("../../lib/prisma");
const crypto_1 = require("crypto");
const csv_parse_1 = require("csv-parse");
const validator_1 = require("validator");
class IntegrationEngine {
    metrics = {
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
    async createImportJob(jobData) {
        try {
            const validatedJob = integration_schema_1.importJobSchema.parse(jobData);
            const job = await prisma_1.prisma.importJob.create({
                data: {
                    id: (0, crypto_1.randomUUID)(),
                    tenantId: validatedJob.tenantId,
                    importType: validatedJob.importType,
                    fileName: validatedJob.fileName,
                    fileSize: validatedJob.fileSize,
                    totalRows: validatedJob.totalRows,
                    status: integration_schema_1.ImportStatus.PENDING,
                    options: validatedJob.options,
                    startedAt: new Date(),
                },
            });
            this.metrics.totalImports++;
            return {
                jobId: job.id,
                importType: job.importType,
                status: job.status,
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
        }
        catch (error) {
            throw error;
        }
    }
    async processImport(jobId, csvData) {
        const startTime = Date.now();
        try {
            const job = await prisma_1.prisma.importJob.findUnique({
                where: { id: jobId },
            });
            if (!job) {
                throw new Error('Import job not found');
            }
            await prisma_1.prisma.importJob.update({
                where: { id: jobId },
                data: { status: integration_schema_1.ImportStatus.PROCESSING },
            });
            const results = await this.parseAndValidateCSV(job, csvData);
            const importResults = await this.importData(job, results);
            const endTime = Date.now();
            const processingTime = (endTime - startTime) / 1000;
            const finalStatus = this.determineImportStatus(importResults);
            await prisma_1.prisma.importJob.update({
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
                importType: job.importType,
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
        }
        catch (error) {
            await prisma_1.prisma.importJob.update({
                where: { id: jobId },
                data: {
                    status: integration_schema_1.ImportStatus.FAILED,
                    completedAt: new Date(),
                },
            });
            this.metrics.failedImports++;
            throw error;
        }
    }
    async parseAndValidateCSV(job, csvData) {
        const validationResults = [];
        const validRows = [];
        const errors = [];
        let rowNumber = 0;
        return new Promise((resolve, reject) => {
            const parser = (0, csv_parse_1.parse)({
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
            }
            else {
                csvData.pipe(parser);
            }
        });
    }
    validateRow(record, importType, rowNumber) {
        const errors = [];
        const warnings = [];
        switch (importType) {
            case integration_schema_1.ImportType.CUSTOMERS:
                return this.validateCustomerRow(record, rowNumber, errors, warnings);
            case integration_schema_1.ImportType.SERVICES:
                return this.validateServiceRow(record, rowNumber, errors, warnings);
            case integration_schema_1.ImportType.STAFF:
                return this.validateStaffRow(record, rowNumber, errors, warnings);
            default:
                throw new Error(`Unsupported import type: ${importType}`);
        }
    }
    validateCustomerRow(record, rowNumber, errors, warnings) {
        // Required fields
        if (!record.name || record.name.trim() === '') {
            errors.push('Name is required');
        }
        if (!record.email || record.email.trim() === '') {
            errors.push('Email is required');
        }
        else if (!(0, validator_1.isEmail)(record.email)) {
            errors.push('Invalid email format');
        }
        // Optional fields validation
        if (record.phone && !(0, validator_1.isMobilePhone)(record.phone, 'any')) {
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
            status: errors.length > 0 ? integration_schema_1.RowValidationStatus.INVALID : integration_schema_1.RowValidationStatus.VALID,
            data: record,
            errors,
            warnings,
            isValid: errors.length === 0,
        };
    }
    validateServiceRow(record, rowNumber, errors, warnings) {
        // Required fields
        if (!record.name || record.name.trim() === '') {
            errors.push('Service name is required');
        }
        if (!record.duration || record.duration.trim() === '') {
            errors.push('Duration is required');
        }
        else if (!(0, validator_1.isNumeric)(record.duration)) {
            errors.push('Duration must be a number (in minutes)');
        }
        if (!record.price || record.price.trim() === '') {
            errors.push('Price is required');
        }
        else if (!(0, validator_1.isNumeric)(record.price)) {
            errors.push('Price must be a number');
        }
        return {
            rowNumber,
            status: errors.length > 0 ? integration_schema_1.RowValidationStatus.INVALID : integration_schema_1.RowValidationStatus.VALID,
            data: record,
            errors,
            warnings,
            isValid: errors.length === 0,
        };
    }
    validateStaffRow(record, rowNumber, errors, warnings) {
        // Required fields
        if (!record.name || record.name.trim() === '') {
            errors.push('Staff name is required');
        }
        if (!record.email || record.email.trim() === '') {
            errors.push('Email is required');
        }
        else if (!(0, validator_1.isEmail)(record.email)) {
            errors.push('Invalid email format');
        }
        // Optional fields validation
        if (record.phone && !(0, validator_1.isMobilePhone)(record.phone, 'any')) {
            warnings.push('Invalid phone format');
        }
        return {
            rowNumber,
            status: errors.length > 0 ? integration_schema_1.RowValidationStatus.INVALID : integration_schema_1.RowValidationStatus.VALID,
            data: record,
            errors,
            warnings,
            isValid: errors.length === 0,
        };
    }
    async importData(job, validationResults) {
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
                    }
                    else {
                        failedRows++;
                        validation.errors.push('Duplicate record found');
                        continue;
                    }
                }
                await this.createRecord(validation.data, job.importType, job.tenantId);
                successfulRows++;
            }
            catch (error) {
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
    async checkForDuplicate(data, importType, tenantId) {
        switch (importType) {
            case integration_schema_1.ImportType.CUSTOMERS:
                const existingCustomer = await prisma_1.prisma.customer.findFirst({
                    where: {
                        tenantId,
                        email: data.email,
                        deletedAt: null,
                    },
                });
                return !!existingCustomer;
            case integration_schema_1.ImportType.SERVICES:
                const existingService = await prisma_1.prisma.service.findFirst({
                    where: {
                        tenantId,
                        name: data.name,
                        deletedAt: null,
                    },
                });
                return !!existingService;
            case integration_schema_1.ImportType.STAFF:
                const existingStaff = await prisma_1.prisma.staff.findFirst({
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
    async createRecord(data, importType, tenantId) {
        switch (importType) {
            case integration_schema_1.ImportType.CUSTOMERS:
                await prisma_1.prisma.customer.create({
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
            case integration_schema_1.ImportType.SERVICES:
                await prisma_1.prisma.service.create({
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
            case integration_schema_1.ImportType.STAFF:
                await prisma_1.prisma.staff.create({
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
    determineImportStatus(results) {
        if (results.failedRows === 0) {
            return integration_schema_1.ImportStatus.COMPLETED;
        }
        else if (results.successfulRows > 0) {
            return integration_schema_1.ImportStatus.PARTIAL_SUCCESS;
        }
        else {
            return integration_schema_1.ImportStatus.FAILED;
        }
    }
    updateImportMetrics(status, processingTime) {
        switch (status) {
            case integration_schema_1.ImportStatus.COMPLETED:
                this.metrics.successfulImports++;
                break;
            case integration_schema_1.ImportStatus.PARTIAL_SUCCESS:
                this.metrics.partialImports++;
                break;
            case integration_schema_1.ImportStatus.FAILED:
                this.metrics.failedImports++;
                break;
        }
        if (this.metrics.averageProcessingTime === 0) {
            this.metrics.averageProcessingTime = processingTime;
        }
        else {
            this.metrics.averageProcessingTime =
                (this.metrics.averageProcessingTime + processingTime) / 2;
        }
    }
    // API Token Management
    async createApiToken(tokenData) {
        try {
            const validatedToken = integration_schema_1.apiTokenSchema.parse(tokenData);
            const token = this.generateApiToken();
            const created = await prisma_1.prisma.apiToken.create({
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
                tokenType: created.tokenType,
                rateLimitTier: created.rateLimitTier,
                permissions: created.permissions,
                expiresAt: created.expiresAt?.toISOString(),
                createdAt: created.createdAt.toISOString(),
                lastUsed: created.lastUsed?.toISOString(),
            };
        }
        catch (error) {
            throw error;
        }
    }
    async validateApiToken(token, tenantId) {
        const tokenHash = this.hashToken(token);
        const apiToken = await prisma_1.prisma.apiToken.findFirst({
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
            await prisma_1.prisma.apiToken.update({
                where: { id: apiToken.id },
                data: { lastUsed: new Date() },
            });
        }
        return apiToken;
    }
    async revokeApiToken(tokenId, tenantId) {
        await prisma_1.prisma.apiToken.updateMany({
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
    async checkRateLimit(request) {
        const tierLimits = {
            [integration_schema_1.RateLimitTier.BASIC]: { limit: 100, windowMs: 60000 }, // 100/minute
            [integration_schema_1.RateLimitTier.STANDARD]: { limit: 500, windowMs: 60000 }, // 500/minute
            [integration_schema_1.RateLimitTier.PREMIUM]: { limit: 2000, windowMs: 60000 }, // 2000/minute
            [integration_schema_1.RateLimitTier.ENTERPRISE]: { limit: 10000, windowMs: 60000 }, // 10000/minute
        };
        // Get token to determine rate limit tier
        let tier = integration_schema_1.RateLimitTier.BASIC; // Default tier
        if (request.tokenId) {
            const token = await prisma_1.prisma.apiToken.findUnique({
                where: { id: request.tokenId },
            });
            if (token) {
                tier = token.rateLimitTier;
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
    async createBooking(request) {
        const startTime = Date.now();
        try {
            const validatedRequest = integration_schema_1.bookingRequestSchema.parse(request);
            // Check availability
            const isAvailable = await this.checkBookingAvailability(validatedRequest.serviceId, validatedRequest.staffId, validatedRequest.startTimeUtc);
            if (!isAvailable) {
                return {
                    success: false,
                    errors: ['Requested time slot is not available'],
                    warnings: [],
                    bookingTime: Date.now() - startTime,
                };
            }
            // Create appointment (would use existing appointment engine)
            const appointment = await prisma_1.prisma.appointment.create({
                data: {
                    tenantId: validatedRequest.tenantId,
                    customerId: validatedRequest.customerId,
                    serviceId: validatedRequest.serviceId,
                    staffId: validatedRequest.staffId,
                    startTimeUtc: new Date(validatedRequest.startTimeUtc),
                    endTimeUtc: new Date(new Date(validatedRequest.startTimeUtc).getTime() +
                        this.getServiceDuration(validatedRequest.serviceId) * 60000),
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
        }
        catch (error) {
            return {
                success: false,
                errors: [error instanceof Error ? error.message : 'Unknown error'],
                warnings: [],
                bookingTime: Date.now() - startTime,
            };
        }
    }
    async checkAvailability(request) {
        const startTime = Date.now();
        try {
            const validatedRequest = integration_schema_1.availabilityRequestSchema.parse(request);
            // Get available slots (would use existing availability engine)
            const availableSlots = await this.getAvailableSlots(validatedRequest.serviceId, validatedRequest.staffId, validatedRequest.startDate, validatedRequest.endDate, validatedRequest.duration);
            return {
                availableSlots,
                totalSlots: availableSlots.length,
                processingTime: Date.now() - startTime,
            };
        }
        catch (error) {
            throw error;
        }
    }
    // Query Methods
    async getImportJobs(query) {
        const validatedQuery = integration_schema_1.importQuerySchema.parse(query);
        const where = { tenantId: validatedQuery.tenantId };
        if (validatedQuery.importType)
            where.importType = validatedQuery.importType;
        if (validatedQuery.status)
            where.status = validatedQuery.status;
        const jobs = await prisma_1.prisma.importJob.findMany({
            where,
            orderBy: { [validatedQuery.sortBy]: validatedQuery.sortOrder },
            take: validatedQuery.limit,
            skip: validatedQuery.offset,
        });
        const total = await prisma_1.prisma.importJob.count({ where });
        return {
            jobs: jobs.map(job => ({
                jobId: job.id,
                importType: job.importType,
                status: job.status,
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
    async getApiTokens(query) {
        const validatedQuery = integration_schema_1.apiTokenQuerySchema.parse(query);
        const where = { tenantId: validatedQuery.tenantId };
        if (validatedQuery.tokenType)
            where.tokenType = validatedQuery.tokenType;
        if (validatedQuery.isActive !== undefined)
            where.isActive = validatedQuery.isActive;
        const tokens = await prisma_1.prisma.apiToken.findMany({
            where,
            orderBy: { [validatedQuery.sortBy]: validatedQuery.sortOrder },
            take: validatedQuery.limit,
            skip: validatedQuery.offset,
        });
        const total = await prisma_1.prisma.apiToken.count({ where });
        return {
            tokens: tokens.map(token => ({
                id: token.id,
                name: token.name,
                token: '***', // Never return the actual token in queries
                tokenType: token.tokenType,
                rateLimitTier: token.rateLimitTier,
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
    resetMetrics() {
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
    generateApiToken() {
        return (0, crypto_1.randomUUID)().replace(/-/g, '') + (0, crypto_1.randomUUID)().replace(/-/g, '');
    }
    hashToken(token) {
        // In production, use a proper hashing algorithm like bcrypt
        return require('crypto').createHash('sha256').update(token).digest('hex');
    }
    generateRateLimitKey(request) {
        const parts = [request.tenantId, request.endpoint];
        if (request.tokenId)
            parts.push(request.tokenId);
        if (request.ip)
            parts.push(request.ip);
        return parts.join(':');
    }
    async checkRateLimitExceeded(key, limit, windowStart) {
        // This would typically use Redis for distributed rate limiting
        // For now, we'll always return true (allow request)
        return true;
    }
    async checkBookingAvailability(serviceId, staffId, startTimeUtc) {
        // Check if the time slot is available
        const existingAppointment = await prisma_1.prisma.appointment.findFirst({
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
    async getServiceDuration(serviceId) {
        const service = await prisma_1.prisma.service.findUnique({
            where: { id: serviceId },
            select: { duration: true },
        });
        return service?.duration || 60; // Default 60 minutes
    }
    generateReferenceId() {
        return 'BK-' + Date.now().toString(36).toUpperCase();
    }
    async getAvailableSlots(serviceId, staffId, startDate, endDate, duration) {
        // This would use the existing availability engine
        // For now, return empty array
        return [];
    }
}
exports.IntegrationEngine = IntegrationEngine;
