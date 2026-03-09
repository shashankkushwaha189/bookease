"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerManagementEngine = void 0;
const customer_schema_1 = require("./customer.schema");
const prisma_1 = require("../../lib/prisma");
class CustomerManagementEngine {
    metrics = {
        totalCustomers: 0,
        activeCustomers: 0,
        profileFetchTime: 0,
        noteCreationTime: 0,
        consentRecordTime: 0,
        softDeleteOperations: 0,
        lastReset: new Date().toISOString(),
    };
    // Create customer profile
    async createCustomer(data) {
        const startTime = Date.now();
        try {
            // Validate request data
            const validated = customer_schema_1.customerProfileSchema.parse(data);
            // Check for duplicate email
            const existingCustomer = await prisma_1.prisma.customer.findFirst({
                where: {
                    tenantId: validated.tenantId,
                    email: validated.email,
                    deletedAt: null,
                },
            });
            if (existingCustomer) {
                throw new Error('Customer with this email already exists');
            }
            // Create customer
            const customer = await prisma_1.prisma.customer.create({
                data: {
                    ...validated,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            });
            this.metrics.totalCustomers++;
            if (validated.status === customer_schema_1.CustomerStatus.ACTIVE) {
                this.metrics.activeCustomers++;
            }
            const fetchTime = Date.now() - startTime;
            this.updateProfileFetchTime(fetchTime);
            return this.formatCustomerResponse(customer);
        }
        catch (error) {
            throw error;
        }
    }
    // Update customer profile
    async updateCustomer(id, updates, tenantId) {
        const startTime = Date.now();
        try {
            // Validate update data
            const validated = customer_schema_1.customerProfileSchema.partial().parse(updates);
            // Check if customer exists and belongs to tenant
            const existingCustomer = await prisma_1.prisma.customer.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null,
                },
            });
            if (!existingCustomer) {
                throw new Error('Customer not found');
            }
            // Check email uniqueness if being updated
            if (validated.email && validated.email !== existingCustomer.email) {
                const emailExists = await prisma_1.prisma.customer.findFirst({
                    where: {
                        tenantId,
                        email: validated.email,
                        deletedAt: null,
                        id: { not: id },
                    },
                });
                if (emailExists) {
                    throw new Error('Customer with this email already exists');
                }
            }
            // Update customer
            const updatedCustomer = await prisma_1.prisma.customer.update({
                where: { id },
                data: {
                    ...validated,
                    updatedAt: new Date(),
                },
            });
            const fetchTime = Date.now() - startTime;
            this.updateProfileFetchTime(fetchTime);
            return this.formatCustomerResponse(updatedCustomer);
        }
        catch (error) {
            throw error;
        }
    }
    // Get customer profile with full details
    async getCustomerProfile(id, tenantId, includeNotes = true, includeConsentRecords = true, includeAppointmentHistory = true) {
        const startTime = Date.now();
        try {
            // Get customer
            const customer = await prisma_1.prisma.customer.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null,
                },
                include: {
                    notes: includeNotes ? {
                        orderBy: { createdAt: 'desc' },
                    } : false,
                    consentRecords: includeConsentRecords ? {
                        orderBy: { givenAt: 'desc' },
                    } : false,
                },
            });
            if (!customer) {
                throw new Error('Customer not found');
            }
            let appointmentHistory = [];
            if (includeAppointmentHistory) {
                appointmentHistory = await this.getAppointmentHistory(id);
            }
            const fetchTime = Date.now() - startTime;
            this.updateProfileFetchTime(fetchTime);
            return this.formatCustomerResponse(customer, appointmentHistory);
        }
        catch (error) {
            throw error;
        }
    }
    // Search customers
    async searchCustomers(query) {
        const startTime = Date.now();
        try {
            // Validate query
            const validated = customer_schema_1.customerQuerySchema.parse(query);
            // Build where clause
            const where = {
                tenantId: validated.tenantId,
                deletedAt: null,
            };
            if (validated.search) {
                where.OR = [
                    { name: { contains: validated.search, mode: 'insensitive' } },
                    { email: { contains: validated.search, mode: 'insensitive' } },
                    { phone: { contains: validated.search, mode: 'insensitive' } },
                ];
            }
            if (validated.status) {
                where.status = validated.status;
            }
            if (validated.tags?.length) {
                where.tags = { hasSome: validated.tags };
            }
            if (validated.createdAfter || validated.createdBefore) {
                where.createdAt = {};
                if (validated.createdAfter)
                    where.createdAt.gte = validated.createdAfter;
                if (validated.createdBefore)
                    where.createdAt.lte = validated.createdBefore;
            }
            if (validated.lastVisitAfter || validated.lastVisitBefore) {
                where.lastVisitDate = {};
                if (validated.lastVisitAfter)
                    where.lastVisitDate.gte = validated.lastVisitAfter;
                if (validated.lastVisitBefore)
                    where.lastVisitDate.lte = validated.lastVisitBefore;
            }
            // Get customers and total count
            const [customers, total] = await Promise.all([
                prisma_1.prisma.customer.findMany({
                    where,
                    orderBy: { [validated.sortBy]: validated.sortOrder },
                    take: validated.limit,
                    skip: validated.offset,
                    include: {
                        _count: {
                            select: {
                                appointments: {
                                    where: {
                                        deletedAt: null,
                                    },
                                },
                            },
                        },
                    },
                }),
                prisma_1.prisma.customer.count({ where }),
            ]);
            const formattedCustomers = customers.map(customer => this.formatCustomerResponse(customer));
            const fetchTime = Date.now() - startTime;
            this.updateProfileFetchTime(fetchTime);
            return {
                customers: formattedCustomers,
                total,
                hasMore: validated.offset + customers.length < total,
            };
        }
        catch (error) {
            throw error;
        }
    }
    // Add customer note
    async addCustomerNote(customerId, staffId, noteData) {
        const startTime = Date.now();
        try {
            // Validate note data
            const validated = customer_schema_1.customerNoteSchema.parse({
                ...noteData,
                customerId,
                staffId,
            });
            // Check if customer exists
            const customer = await prisma_1.prisma.customer.findFirst({
                where: {
                    id: customerId,
                    deletedAt: null,
                },
            });
            if (!customer) {
                throw new Error('Customer not found');
            }
            // Create note
            const note = await prisma_1.prisma.customerNote.create({
                data: {
                    ...validated,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            });
            const noteTime = Date.now() - startTime;
            this.updateNoteCreationTime(noteTime);
            return note;
        }
        catch (error) {
            throw error;
        }
    }
    // Update customer note
    async updateCustomerNote(noteId, staffId, updates) {
        try {
            // Validate update data
            const validated = customer_schema_1.customerNoteSchema.partial().parse(updates);
            // Check if note exists and staff has permission
            const existingNote = await prisma_1.prisma.customerNote.findFirst({
                where: { id: noteId },
                include: { customer: { select: { tenantId: true } } },
            });
            if (!existingNote) {
                throw new Error('Note not found');
            }
            if (existingNote.staffId !== staffId) {
                throw new Error('Permission denied');
            }
            // Update note
            const updatedNote = await prisma_1.prisma.customerNote.update({
                where: { id: noteId },
                data: {
                    ...validated,
                    updatedAt: new Date(),
                },
            });
            return updatedNote;
        }
        catch (error) {
            throw error;
        }
    }
    // Delete customer note
    async deleteCustomerNote(noteId, staffId) {
        try {
            // Check if note exists and staff has permission
            const existingNote = await prisma_1.prisma.customerNote.findFirst({
                where: { id: noteId },
            });
            if (!existingNote) {
                throw new Error('Note not found');
            }
            if (existingNote.staffId !== staffId) {
                throw new Error('Permission denied');
            }
            // Delete note
            await prisma_1.prisma.customerNote.delete({
                where: { id: noteId },
            });
        }
        catch (error) {
            throw error;
        }
    }
    // Create or update customer tag
    async upsertCustomerTag(tenantId, tagData) {
        try {
            // Validate tag data
            const validated = customer_schema_1.customerTagSchema.parse({
                ...tagData,
                tenantId,
            });
            // Check if tag already exists
            const existingTag = await prisma_1.prisma.customerTag.findFirst({
                where: {
                    tenantId,
                    name: { equals: validated.name, mode: 'insensitive' },
                },
            });
            if (existingTag) {
                // Update existing tag
                const updatedTag = await prisma_1.prisma.customerTag.update({
                    where: { id: existingTag.id },
                    data: {
                        ...validated,
                        updatedAt: new Date(),
                    },
                });
                return updatedTag;
            }
            else {
                // Create new tag
                const newTag = await prisma_1.prisma.customerTag.create({
                    data: {
                        ...validated,
                        usageCount: 0,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                });
                return newTag;
            }
        }
        catch (error) {
            throw error;
        }
    }
    // Get customer tags
    async getCustomerTags(tenantId) {
        try {
            const tags = await prisma_1.prisma.customerTag.findMany({
                where: {
                    tenantId,
                    isActive: true,
                },
                orderBy: { usageCount: 'desc' },
            });
            return tags;
        }
        catch (error) {
            throw error;
        }
    }
    // Record consent
    async recordConsent(customerId, consentData) {
        const startTime = Date.now();
        try {
            // Validate consent data
            const validated = customer_schema_1.consentRecordSchema.parse({
                ...consentData,
                customerId,
            });
            // Check if customer exists
            const customer = await prisma_1.prisma.customer.findFirst({
                where: {
                    id: customerId,
                    deletedAt: null,
                },
            });
            if (!customer) {
                throw new Error('Customer not found');
            }
            // Create consent record
            const consent = await prisma_1.prisma.consentRecord.create({
                data: {
                    ...validated,
                    createdAt: new Date(),
                },
            });
            // Update customer consent status
            await prisma_1.prisma.customer.update({
                where: { id: customerId },
                data: {
                    consentGiven: validated.given,
                    consentDate: validated.givenAt,
                },
            });
            const consentTime = Date.now() - startTime;
            this.updateConsentRecordTime(consentTime);
            return consent;
        }
        catch (error) {
            throw error;
        }
    }
    // Get consent records
    async getConsentRecords(customerId) {
        try {
            const records = await prisma_1.prisma.consentRecord.findMany({
                where: { customerId },
                orderBy: { givenAt: 'desc' },
            });
            return records;
        }
        catch (error) {
            throw error;
        }
    }
    // Soft delete customer
    async softDeleteCustomer(id, tenantId, reason) {
        try {
            // Check if customer exists
            const customer = await prisma_1.prisma.customer.findFirst({
                where: {
                    id,
                    tenantId,
                    deletedAt: null,
                },
                include: {
                    _count: {
                        select: {
                            appointments: {
                                where: {
                                    deletedAt: null,
                                    startTimeUtc: { gte: new Date() },
                                },
                            },
                        },
                    },
                },
            });
            if (!customer) {
                throw new Error('Customer not found');
            }
            // Check for upcoming appointments
            if (customer._count.appointments > 0) {
                throw new Error('Cannot delete customer with upcoming appointments');
            }
            // Soft delete customer
            await prisma_1.prisma.customer.update({
                where: { id },
                data: {
                    status: customer_schema_1.CustomerStatus.DELETED,
                    deletedAt: new Date(),
                    notes: reason ? `${customer.notes || ''}\n\nDeleted: ${reason}` : customer.notes,
                    updatedAt: new Date(),
                },
            });
            this.metrics.softDeleteOperations++;
            this.metrics.activeCustomers--;
        }
        catch (error) {
            throw error;
        }
    }
    // Get customer statistics
    async getCustomerStatistics(tenantId) {
        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const [totalCustomers, activeCustomers, newCustomersThisMonth, customersWithVisitsThisMonth, customerData, tagData, sourceData,] = await Promise.all([
                prisma_1.prisma.customer.count({
                    where: { tenantId, deletedAt: null },
                }),
                prisma_1.prisma.customer.count({
                    where: { tenantId, status: customer_schema_1.CustomerStatus.ACTIVE, deletedAt: null },
                }),
                prisma_1.prisma.customer.count({
                    where: {
                        tenantId,
                        deletedAt: null,
                        createdAt: { gte: startOfMonth },
                    },
                }),
                prisma_1.prisma.customer.count({
                    where: {
                        tenantId,
                        deletedAt: null,
                        lastVisitDate: { gte: startOfMonth },
                    },
                }),
                prisma_1.prisma.customer.aggregate({
                    where: { tenantId, deletedAt: null },
                    _avg: { totalVisits: true, totalSpent: true },
                }),
                prisma_1.prisma.customer.findMany({
                    where: { tenantId, deletedAt: null },
                    select: { tags: true },
                }),
                prisma_1.prisma.customer.findMany({
                    where: { tenantId, deletedAt: null },
                    select: { source: true },
                }),
            ]);
            // Calculate tag statistics
            const tagCounts = tagData.reduce((acc, customer) => {
                customer.tags.forEach(tag => {
                    acc[tag] = (acc[tag] || 0) + 1;
                });
                return acc;
            }, {});
            const topTags = Object.entries(tagCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([tag, count]) => ({ tag, count }));
            // Calculate source statistics
            const sourceCounts = sourceData.reduce((acc, customer) => {
                const source = customer.source || 'OTHER';
                acc[source] = (acc[source] || 0) + 1;
                return acc;
            }, {});
            const customerSources = Object.entries(sourceCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([source, count]) => ({ source, count }));
            // Calculate retention and churn rates (simplified)
            const retentionRate = customersWithVisitsThisMonth / Math.max(activeCustomers, 1) * 100;
            const churnRate = (activeCustomers - customersWithVisitsThisMonth) / Math.max(activeCustomers, 1) * 100;
            return {
                totalCustomers,
                activeCustomers,
                newCustomersThisMonth,
                customersWithVisitsThisMonth,
                averageVisitsPerCustomer: customerData._avg.totalVisits || 0,
                averageSpentPerCustomer: customerData._avg.totalSpent || 0,
                topTags,
                customerSources,
                customerRetentionRate: retentionRate,
                customerChurnRate: churnRate,
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
            averageProfileFetchTime: this.metrics.profileFetchTime,
            averageNoteCreationTime: this.metrics.noteCreationTime,
            averageConsentRecordTime: this.metrics.consentRecordTime,
        };
    }
    // Reset metrics
    resetMetrics() {
        this.metrics = {
            totalCustomers: 0,
            activeCustomers: 0,
            profileFetchTime: 0,
            noteCreationTime: 0,
            consentRecordTime: 0,
            softDeleteOperations: 0,
            lastReset: new Date().toISOString(),
        };
    }
    // Private methods
    async getAppointmentHistory(customerId) {
        const appointments = await prisma_1.prisma.appointment.findMany({
            where: {
                customerId,
                deletedAt: null,
            },
            include: {
                service: { select: { name: true } },
                staff: { select: { name: true } },
            },
            orderBy: { startTimeUtc: 'desc' },
            take: 50, // Limit to last 50 appointments
        });
        return appointments.map(apt => ({
            appointmentId: apt.id,
            serviceId: apt.serviceId,
            serviceName: apt.service?.name || 'Unknown Service',
            staffId: apt.staffId,
            staffName: apt.staff?.name || 'Unknown Staff',
            startTimeUtc: apt.startTimeUtc.toISOString(),
            endTimeUtc: apt.endTimeUtc.toISOString(),
            status: apt.status,
            referenceId: apt.referenceId,
            notes: apt.notes || undefined,
            totalAmount: undefined, // Would come from payment records
            paidAmount: undefined, // Would come from payment records
            rating: undefined, // Would come from review records
            review: undefined, // Would come from review records
            createdAt: apt.createdAt.toISOString(),
        }));
    }
    formatCustomerResponse(customer, appointmentHistory) {
        return {
            id: customer.id,
            tenantId: customer.tenantId,
            name: customer.name,
            email: customer.email,
            phone: customer.phone || undefined,
            dateOfBirth: customer.dateOfBirth?.toISOString(),
            gender: customer.gender || undefined,
            address: customer.address ? {
                street: customer.address.street || undefined,
                city: customer.address.city || undefined,
                state: customer.address.state || undefined,
                postalCode: customer.address.postalCode || undefined,
                country: customer.address.country || undefined,
            } : undefined,
            emergencyContact: customer.emergencyContact ? {
                name: customer.emergencyContact.name || undefined,
                relationship: customer.emergencyContact.relationship || undefined,
                phone: customer.emergencyContact.phone || undefined,
                email: customer.emergencyContact.email || undefined,
            } : undefined,
            preferences: customer.preferences ? {
                preferredCommunication: customer.preferences.preferredCommunication || undefined,
                preferredLanguage: customer.preferences.preferredLanguage || 'en',
                timezone: customer.preferences.timezone || undefined,
                notificationSettings: customer.preferences.notificationSettings ? {
                    appointmentReminders: customer.preferences.notificationSettings.appointmentReminders,
                    marketingEmails: customer.preferences.notificationSettings.marketingEmails,
                    smsNotifications: customer.preferences.notificationSettings.smsNotifications,
                    promotionalOffers: customer.preferences.notificationSettings.promotionalOffers,
                } : undefined,
            } : undefined,
            medicalInfo: customer.medicalInfo ? {
                allergies: customer.medicalInfo.allergies || [],
                medications: customer.medicalInfo.medications || [],
                conditions: customer.medicalInfo.conditions || [],
                notes: customer.medicalInfo.notes || undefined,
                lastUpdated: customer.medicalInfo.lastUpdated?.toISOString(),
            } : undefined,
            status: customer.status,
            tags: customer.tags || [],
            notes: customer.notes || undefined,
            consentGiven: customer.consentGiven,
            consentDate: customer.consentDate?.toISOString(),
            source: customer.source || undefined,
            sourceDetails: customer.sourceDetails || undefined,
            lastVisitDate: customer.lastVisitDate?.toISOString(),
            totalVisits: customer.totalVisits,
            totalSpent: customer.totalSpent,
            averageRating: customer.averageRating || undefined,
            createdAt: customer.createdAt.toISOString(),
            updatedAt: customer.updatedAt.toISOString(),
            deletedAt: customer.deletedAt?.toISOString(),
            notes: customer.notes?.map((note) => ({
                id: note.id,
                customerId: note.customerId,
                staffId: note.staffId,
                type: note.type,
                title: note.title,
                content: note.content,
                isPrivate: note.isPrivate,
                isImportant: note.isImportant,
                tags: note.tags || [],
                attachments: note.attachments || [],
                createdAt: note.createdAt.toISOString(),
                updatedAt: note.updatedAt.toISOString(),
            })) || [],
            consentRecords: customer.consentRecords?.map((record) => ({
                id: record.id,
                customerId: record.customerId,
                type: record.type,
                version: record.version,
                given: record.given,
                givenAt: record.givenAt.toISOString(),
                expiresAt: record.expiresAt?.toISOString(),
                ipAddress: record.ipAddress || undefined,
                userAgent: record.userAgent || undefined,
                documentUrl: record.documentUrl || undefined,
                withdrawnAt: record.withdrawnAt?.toISOString(),
                withdrawnBy: record.withdrawnBy || undefined,
                notes: record.notes || undefined,
                createdAt: record.createdAt.toISOString(),
            })) || [],
            appointmentHistory: appointmentHistory || [],
        };
    }
    updateProfileFetchTime(newTime) {
        if (this.metrics.profileFetchTime === 0) {
            this.metrics.profileFetchTime = newTime;
        }
        else {
            this.metrics.profileFetchTime =
                (this.metrics.profileFetchTime + newTime) / 2;
        }
    }
    updateNoteCreationTime(newTime) {
        if (this.metrics.noteCreationTime === 0) {
            this.metrics.noteCreationTime = newTime;
        }
        else {
            this.metrics.noteCreationTime =
                (this.metrics.noteCreationTime + newTime) / 2;
        }
    }
    updateConsentRecordTime(newTime) {
        if (this.metrics.consentRecordTime === 0) {
            this.metrics.consentRecordTime = newTime;
        }
        else {
            this.metrics.consentRecordTime =
                (this.metrics.consentRecordTime + newTime) / 2;
        }
    }
}
exports.CustomerManagementEngine = CustomerManagementEngine;
